const { pool } = require('../config/db');
const { encrypt } = require('../middleware/encryption');
const { detectCrisis } = require('../services/crisis');
const { callAgent, AGENT_ROLES } = require('../services/agentOrchestrator');
const { sendSms, makeCall } = require('../services/twilio');
const { sendCrisisEmail } = require('../services/sendgrid');
const { verifySocketToken } = require('../middleware/auth');
const { validateUUID, validateMessageLength } = require('../middleware/validation');

// All authenticated dashboard sockets join the 'dashboard' room so crisis events
// are broadcast only to authorized users.

function setupSocketHandlers(io) {
  // Authenticate all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Unauthenticated — chatbot client
      socket.userType = 'client';
      return next();
    }
    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error('Unauthorized'));
    }
    socket.user = decoded;
    socket.userType = decoded.role === 'admin' ? 'admin' : 'therapist';
    return next();
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`Socket connected: ${socket.id} (${socket.userType})`);

    if (socket.userType === 'admin' || socket.userType === 'therapist') {
      // All dashboard users join a shared room for crisis broadcasts
      socket.join('dashboard');

      // Dashboard clients subscribe to a specific session room
      // — therapists may only subscribe to their own sessions
      // — admins may only subscribe to crisis-active sessions
      socket.on('subscribe:session', async (sessionId) => {
        if (!sessionId) return;
        try {
          const [rows] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
          if (rows.length === 0) return;
          const session = rows[0];

          if (socket.userType === 'therapist' && session.user_id !== socket.user.id) return;
          if (socket.userType === 'admin' && !session.crisis_active) return;

          socket.join(`session:${sessionId}`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('subscribe:session error:', err.message);
        }
      });
    }

    // Chatbot clients join their session room after the server validates the session exists
    if (socket.userType === 'client') {
      socket.on('client:join', async (sessionId) => {
        if (!sessionId || !validateUUID(sessionId)) {
          return socket.emit('error', { message: 'Invalid session ID' });
        }
        try {
          const [rows] = await pool.execute(
            'SELECT id FROM sessions WHERE id = ?',
            [sessionId]
          );
          if (rows.length === 0) return; // unknown session — reject silently
          socket.join(`session:${sessionId}`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('client:join error:', err.message);
        }
      });
    }

    // Chatbot client sends a message
    socket.on('client:message', async (data) => {
      const { sessionId, message } = data;
      if (!sessionId || !message) return;
      if (!validateUUID(sessionId) || !validateMessageLength(message)) {
        return socket.emit('error', { message: 'Invalid input' });
      }

      try {
        // 1. Validate session first to avoid wasted work on invalid IDs
        const [sessions] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (sessions.length === 0) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }
        const session = sessions[0];

        // 2. Get therapist info for API key and notifications
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [session.user_id]);
        const therapist = users[0];

        // 3. Save the client message encrypted
        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'client', encrypted, iv]
        );

        // 4. Detect crisis
        const { isCrisis, triggers } = detectCrisis(message);

        // 5. If crisis and not already active, activate protocol
        if (isCrisis && !session.crisis_active) {
          await activateCrisisProtocol(session, sessionId, message, triggers, therapist, io);
        }

        // 6. Determine which agent should respond
        const activeRole = session.active_agent_id
          ? (session.active_agent_id === process.env.LEMONADE_AGENT_SOCIAL_WORKER_ID
              ? AGENT_ROLES.SOCIAL_WORKER
              : AGENT_ROLES.CHATBOT)
          : AGENT_ROLES.CHATBOT;

        // If Jason has taken over (active_agent_id === 'ADMIN'), don't send to any AI
        if (session.active_agent_id === 'ADMIN') {
          // Just save the message, no AI response — Jason responds manually
          // Still notify dashboard of activity
          io.to('dashboard').emit('session:update', {
            sessionId,
            crisisActive: isCrisis || !!session.crisis_active,
          });
          return;
        }

        let aiResponse = '';
        let senderType = activeRole === AGENT_ROLES.SOCIAL_WORKER ? 'social_worker_ai' : 'ai';

        try {
          const result = await callAgent(activeRole, message, session.lemonade_conversation_id);

          if (!session.lemonade_conversation_id && result.conversationId) {
            await pool.execute(
              'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
              [result.conversationId, sessionId]
            );
          }

          aiResponse = result.response || "I'm here to support you. Can you tell me more?";
        } catch {
          aiResponse = "I'm here to support you. Can you tell me more?";
        }

        // 7. Save AI response with correct sender type
        const aiEnc = encrypt(aiResponse);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, senderType, aiEnc.encrypted, aiEnc.iv]
        );

        // 8. Emit AI response directly back to the chatbot client
        socket.emit('ai:message', { sessionId, message: aiResponse, sender: senderType });

        // 9. Notify dashboard of session activity (no plaintext content — dashboard polls messages)
        io.to('dashboard').emit('session:update', {
          sessionId,
          crisisActive: isCrisis || !!session.crisis_active,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling client message:', err.message);
      }
    });

    // Admin/therapist sends an intercept message into a crisis session
    socket.on('admin:intercept', async (data) => {
      if (socket.userType !== 'admin' && socket.userType !== 'therapist') return;
      const { sessionId, message } = data;
      if (!sessionId || !message) return;
      if (!validateUUID(sessionId) || !validateMessageLength(message)) {
        return socket.emit('error', { message: 'Invalid input' });
      }

      try {
        // Verify the session exists, is crisis-active, and belongs to the right user
        const [rows] = await pool.execute(
          'SELECT * FROM sessions WHERE id = ? AND crisis_active = 1',
          [sessionId]
        );
        if (rows.length === 0) return;
        const session = rows[0];

        // Therapists may only intercept their own sessions
        if (socket.userType === 'therapist' && session.user_id !== socket.user.id) return;

        // Save intercept message encrypted
        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'admin', encrypted, iv]
        );

        // Audit log — record metadata only, not plaintext content
        await pool.execute(
          'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
          [sessionId, socket.user.email, 'intercepted', `Message sent (${message.length} chars)`]
        );

        // Deliver intercept to all subscribers of this session (chatbot client + dashboard)
        io.to(`session:${sessionId}`).emit('admin:message', { sessionId, message });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling admin intercept:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

async function activateCrisisProtocol(session, sessionId, triggerMessage, triggers, therapist, io) {
  try {
    // Mark session as crisis-active
    await pool.execute(
      'UPDATE sessions SET crisis_active = 1, crisis_activated_at = NOW() WHERE id = ?',
      [sessionId]
    );

    // Audit log — record trigger keywords only, not full user message
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [sessionId, 'system', 'crisis_activated', `Triggers: ${triggers.join(', ')}`]
    );

    const summary = `Crisis detected in session ${sessionId}. Keywords: ${triggers.join(', ')}.`;

    // Notify via Twilio SMS
    const monitoringPhone = process.env.TWILIO_MONITOR_PHONE || process.env.TWILIO_PHONE_NUMBER;
    if (monitoringPhone && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const smsSid = await sendSms(
          monitoringPhone,
          `[CRISIS ALERT] Session ${sessionId} — ${summary}`
        );
        await pool.execute(
          'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
          [sessionId, 'sms', monitoringPhone, smsSid ? 'sent' : 'failed']
        );

        const callSid = await makeCall(
          monitoringPhone,
          `Crisis alert. A user needs immediate assistance. Please check the dashboard now.`
        );
        await pool.execute(
          'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
          [sessionId, 'call', monitoringPhone, callSid ? 'sent' : 'failed']
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Twilio notification failed:', err.message);
      }
    }

    // Notify via SendGrid email
    const monitoringEmail = process.env.SENDGRID_MONITOR_EMAIL || process.env.SENDGRID_FROM_EMAIL;
    if (monitoringEmail && process.env.SENDGRID_API_KEY) {
      try {
        await sendCrisisEmail(monitoringEmail, sessionId, summary);
        await pool.execute(
          'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
          [sessionId, 'email', monitoringEmail, 'sent']
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('SendGrid notification failed:', err.message);
      }
    }

    // Broadcast crisis activation only to authenticated dashboard users
    io.to('dashboard').emit('crisis:activated', {
      sessionId,
      therapistEmail: therapist ? therapist.email : null,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Crisis protocol activation failed:', err.message);
  }
}

module.exports = { setupSocketHandlers };
