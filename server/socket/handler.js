const { pool } = require('../config/db');
const { encrypt } = require('../middleware/encryption');
const { detectCrisis } = require('../services/crisis');
const { runAssistant } = require('../services/lemonade');
const { sendSms, makeCall } = require('../services/twilio');
const { sendCrisisEmail } = require('../services/sendgrid');
const { verifySocketToken } = require('../middleware/auth');

// Map of sessionId -> socket for crisis intercept
const dashboardSockets = new Map();

function setupSocketHandlers(io) {
  // Authenticate all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Unauthenticated — allowed only for chatbot clients (no JWT)
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
      // Dashboard clients subscribe to crisis sessions
      socket.on('subscribe:session', (sessionId) => {
        socket.join(`session:${sessionId}`);
        dashboardSockets.set(sessionId, socket);
      });
    }

    // Chatbot client sends a message
    socket.on('client:message', async (data) => {
      const { sessionId, message } = data;
      if (!sessionId || !message) return;

      try {
        // 1. Save the client message encrypted
        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'client', encrypted, iv]
        );

        // 2. Detect crisis
        const { isCrisis, triggers } = detectCrisis(message);

        // 3. Get session info
        const [sessions] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (sessions.length === 0) return;
        const session = sessions[0];

        // 4. Get therapist info for notifications
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [session.user_id]);
        const therapist = users[0];

        // 5. If crisis and not already active, activate protocol
        if (isCrisis && !session.crisis_active) {
          await activateCrisisProtocol(session, sessionId, message, triggers, therapist, io);
        }

        // 6. Send to Launch Lemonade AI
        let aiResponse = '';
        try {
          const lemonadeApiKey = therapist
            ? therapist.lemonade_api_key_encrypted
            : null;
          const result = await runAssistant(message, session.lemonade_conversation_id, lemonadeApiKey);

          // Update conversation ID if new
          if (!session.lemonade_conversation_id && result.conversationId) {
            await pool.execute(
              'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
              [result.conversationId, sessionId]
            );
          }

          aiResponse = result.responseId
            ? `Response received (ID: ${result.responseId})`
            : 'I\'m here to support you. Can you tell me more?';
        } catch {
          aiResponse = 'I\'m here to support you. Can you tell me more?';
        }

        // 7. Save AI response
        const aiEnc = encrypt(aiResponse);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'ai', aiEnc.encrypted, aiEnc.iv]
        );

        // 8. Emit AI response back to client
        socket.emit('ai:message', { sessionId, message: aiResponse });

        // 9. Broadcast to dashboard subscribers
        io.to(`session:${sessionId}`).emit('session:update', {
          sessionId,
          clientMessage: message,
          aiMessage: aiResponse,
          crisisActive: isCrisis || session.crisis_active,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling client message:', err.message);
      }
    });

    // Admin sends an intercept message into a crisis session
    socket.on('admin:intercept', async (data) => {
      if (socket.userType !== 'admin' && socket.userType !== 'therapist') return;
      const { sessionId, message } = data;
      if (!sessionId || !message) return;

      try {
        // Save admin message
        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'admin', encrypted, iv]
        );

        // Audit log
        await pool.execute(
          'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
          [sessionId, socket.user.email, 'intercepted', message.substring(0, 200)]
        );

        // Emit to the chatbot client in this session
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

    // Audit log
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [sessionId, 'system', 'crisis_activated', `Triggers: ${triggers.join(', ')}`]
    );

    const summary = `Crisis detected in session ${sessionId}. Trigger message: "${triggerMessage.substring(0, 200)}". Keywords: ${triggers.join(', ')}.`;

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
          `Crisis alert. A user in session ${sessionId} needs immediate assistance. Please check the dashboard now.`
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

    // Broadcast crisis activation to dashboard
    io.emit('crisis:activated', {
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
