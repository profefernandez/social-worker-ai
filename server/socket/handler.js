const { pool } = require('../config/db');
const { encrypt } = require('../middleware/encryption');
const { parseCrisisSignal } = require('../services/crisis');
const { callAgent, AGENT_ROLES } = require('../services/agentOrchestrator');
const { proxyToProvider } = require('../services/aiProxy');
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

        // 4. If Jason has taken over, don't send to any AI
        if (session.active_agent_id === 'ADMIN') {
          io.to('dashboard').emit('session:update', {
            sessionId,
            crisisActive: !!session.crisis_active,
          });
          return;
        }

        // 5. If crisis already active, route to Social Worker AI (it's the active responder)
        if (session.crisis_active) {
          let aiResponse = '';
          try {
            const result = await callAgent(AGENT_ROLES.SOCIAL_WORKER, message, session.lemonade_conversation_id);
            if (!session.lemonade_conversation_id && result.conversationId) {
              await pool.execute(
                'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
                [result.conversationId, sessionId]
              );
            }
            aiResponse = result.response || "I'm here with you. Can you tell me more about what you're going through?";
          } catch {
            aiResponse = "I'm here with you. Can you tell me more about what you're going through?";
          }

          const swEnc = encrypt(aiResponse);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
            [sessionId, 'social_worker_ai', swEnc.encrypted, swEnc.iv]
          );
          socket.emit('ai:message', { sessionId, message: aiResponse, sender: 'social_worker_ai' });
          io.to('dashboard').emit('session:update', { sessionId, crisisActive: true });
          return;
        }

        // 6. Normal mode: send to Company's AI AND Social Worker AI (silent monitor) in parallel
        const useProxy = !!process.env.OPENAI_API_KEY;

        const chatbotCall = useProxy
          ? proxyToProvider(message, [], {
              provider: 'openai',
              apiKey: process.env.OPENAI_API_KEY,
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || '',
            })
          : callAgent(AGENT_ROLES.CHATBOT, message, session.lemonade_conversation_id);

        const [chatbotResult, monitorResult] = await Promise.allSettled([
          chatbotCall,
          callAgent(AGENT_ROLES.SOCIAL_WORKER, message),
        ]);

        // 7. Process chatbot response — this is what the user sees
        let aiResponse = '';
        if (chatbotResult.status === 'fulfilled') {
          if (useProxy) {
            // Proxy mode — response is a string directly
            aiResponse = chatbotResult.value || "I'm here to help. What would you like to work on?";
          } else {
            // Lemonade mode — response is an object
            const result = chatbotResult.value;
            if (!session.lemonade_conversation_id && result.conversationId) {
              await pool.execute(
                'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
                [result.conversationId, sessionId]
              );
            }
            aiResponse = result.response || "I'm here to support you. Can you tell me more?";
          }
        } else {
          aiResponse = useProxy
            ? "I'm here to help. What would you like to work on?"
            : "I'm here to support you. Can you tell me more?";
        }

        // 8. Check Social Worker AI monitoring response for crisis signal
        let crisisTriggered = false;
        if (monitorResult.status === 'fulfilled' && monitorResult.value.response) {
          const { isCrisis } = parseCrisisSignal(monitorResult.value.response);
          crisisTriggered = isCrisis;
        }

        // 9. If crisis detected by the agent, activate protocol BEFORE sending chatbot response
        if (crisisTriggered) {
          await activateCrisisProtocol(session, sessionId, message, therapist, io);
          // Don't send the regular chatbot response — Social Worker AI takes over
          return;
        }

        // 10. No crisis — save and emit the regular chatbot response
        const aiEnc = encrypt(aiResponse);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
          [sessionId, 'ai', aiEnc.encrypted, aiEnc.iv]
        );
        socket.emit('ai:message', { sessionId, message: aiResponse, sender: 'ai' });

        // 11. Notify dashboard of session activity
        io.to('dashboard').emit('session:update', {
          sessionId,
          crisisActive: false,
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

    // Jason takes over the conversation from Social Worker AI
    socket.on('admin:takeover', async ({ sessionId }) => {
      if (socket.userType !== 'admin') return;
      if (!sessionId || !validateUUID(sessionId)) return;

      try {
        const [rows] = await pool.execute(
          'SELECT * FROM sessions WHERE id = ? AND crisis_active = 1',
          [sessionId]
        );
        if (rows.length === 0) return;

        // Set active agent to ADMIN — stops AI from responding
        await pool.execute(
          'UPDATE sessions SET active_agent_id = ? WHERE id = ?',
          ['ADMIN', sessionId]
        );

        // Audit
        await pool.execute(
          'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
          [sessionId, socket.user.email, 'admin_takeover', 'Jason entered the conversation']
        );

        // Notify chatbot + dashboard
        io.to(`session:${sessionId}`).emit('agent:joined', {
          sessionId,
          agentName: 'Jason Fernandez, LMSW',
        });

        // Notify audit agent
        callAgent(AGENT_ROLES.AUDIT, `ADMIN TAKEOVER. Jason Fernandez entered session ${sessionId} at ${new Date().toISOString()}.`)
          .then((result) => {
            io.to('dashboard').emit('agent:output', {
              sessionId,
              agentRole: 'audit',
              content: result.response || 'Admin takeover logged.',
              timestamp: new Date().toISOString(),
            });
          })
          .catch((err) => console.error('Audit agent failed on takeover:', err.message));

      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('admin:takeover error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

async function activateCrisisProtocol(session, sessionId, triggerMessage, therapist, io) {
  try {
    // 1. Mark session crisis-active and switch to Social Worker AI
    const socialWorkerId = process.env.LEMONADE_AGENT_SOCIAL_WORKER_ID;
    await pool.execute(
      'UPDATE sessions SET crisis_active = 1, crisis_activated_at = NOW(), active_agent_id = ? WHERE id = ?',
      [socialWorkerId, sessionId]
    );

    // 2. Audit log
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [sessionId, 'system', 'crisis_activated', 'Social Worker AI agent triggered crisis protocol']
    );

    const summary = `Crisis detected in session ${sessionId}. Social Worker AI agent activated protocol.`;

    // 3. Emit agent:joined to chatbot + dashboard
    io.to(`session:${sessionId}`).emit('agent:joined', {
      sessionId,
      agentName: 'Social Worker AI',
    });
    io.to('dashboard').emit('crisis:activated', {
      sessionId,
      therapistEmail: therapist ? therapist.email : null,
      summary,
      timestamp: new Date().toISOString(),
    });

    // 4. Fire all parallel actions — agents + notifications
    const parallelActions = [];

    // Social Worker AI responds to the user
    parallelActions.push(
      callAgent(AGENT_ROLES.SOCIAL_WORKER, triggerMessage, session.lemonade_conversation_id)
        .then(async (result) => {
          const response = result.response || 'I hear you, and I want you to know you are not alone. I am here with you right now.';
          const enc = encrypt(response);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, content_encrypted, iv) VALUES (?, ?, ?, ?)',
            [sessionId, 'social_worker_ai', enc.encrypted, enc.iv]
          );
          io.to(`session:${sessionId}`).emit('ai:message', {
            sessionId,
            message: response,
            sender: 'social_worker_ai',
          });
          if (result.conversationId && !session.lemonade_conversation_id) {
            await pool.execute(
              'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
              [result.conversationId, sessionId]
            );
          }
        })
        .catch((err) => console.error('Social Worker AI agent failed:', err.message))
    );

    // Search Agent — find the user
    parallelActions.push(
      callAgent(AGENT_ROLES.SEARCH, `Crisis in session ${sessionId}. Client identifier: ${session.client_identifier || 'unknown'}. Find any available information about this user.`)
        .then((result) => {
          io.to('dashboard').emit('agent:output', {
            sessionId,
            agentRole: 'search',
            content: result.response || 'Searching for user information...',
            timestamp: new Date().toISOString(),
          });
        })
        .catch((err) => console.error('Search agent failed:', err.message))
    );

    // Comms Agent — notify Jason + company owner
    parallelActions.push(
      callAgent(AGENT_ROLES.COMMS, `CRISIS ACTIVATED. Session: ${sessionId}. ${summary}. Therapist: ${therapist ? therapist.email : 'unknown'}. Notify all parties.`)
        .then((result) => {
          io.to('dashboard').emit('agent:output', {
            sessionId,
            agentRole: 'comms',
            content: result.response || 'Notifications dispatched.',
            timestamp: new Date().toISOString(),
          });
        })
        .catch((err) => console.error('Comms agent failed:', err.message))
    );

    // Audit Agent — log the crisis activation
    parallelActions.push(
      callAgent(AGENT_ROLES.AUDIT, `CRISIS ACTIVATED. Session: ${sessionId}. Social Worker AI agent triggered protocol. Time: ${new Date().toISOString()}. Log this event.`)
        .then((result) => {
          io.to('dashboard').emit('agent:output', {
            sessionId,
            agentRole: 'audit',
            content: result.response || 'Crisis activation logged.',
            timestamp: new Date().toISOString(),
          });
        })
        .catch((err) => console.error('Audit agent failed:', err.message))
    );

    // Twilio SMS
    const monitoringPhone = process.env.TWILIO_MONITOR_PHONE || process.env.TWILIO_PHONE_NUMBER;
    if (monitoringPhone && process.env.TWILIO_ACCOUNT_SID) {
      parallelActions.push(
        sendSms(monitoringPhone, `[CRISIS ALERT] ${summary}`)
          .then(async (smsSid) => {
            await pool.execute(
              'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
              [sessionId, 'sms', monitoringPhone, smsSid ? 'sent' : 'failed']
            );
          })
          .catch((err) => console.error('Twilio SMS failed:', err.message))
      );

      // Twilio voice call
      parallelActions.push(
        makeCall(monitoringPhone, 'Crisis alert. A user needs immediate assistance. Check the dashboard now.')
          .then(async (callSid) => {
            await pool.execute(
              'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
              [sessionId, 'call', monitoringPhone, callSid ? 'sent' : 'failed']
            );
          })
          .catch((err) => console.error('Twilio call failed:', err.message))
      );
    }

    // SendGrid email
    const monitoringEmail = process.env.SENDGRID_MONITOR_EMAIL || process.env.SENDGRID_FROM_EMAIL;
    if (monitoringEmail && process.env.SENDGRID_API_KEY) {
      parallelActions.push(
        sendCrisisEmail(monitoringEmail, sessionId, summary)
          .then(async () => {
            await pool.execute(
              'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
              [sessionId, 'email', monitoringEmail, 'sent']
            );
          })
          .catch((err) => console.error('SendGrid failed:', err.message))
      );
    }

    // Fire all in parallel — don't let any single failure stop the rest
    await Promise.allSettled(parallelActions);

  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Crisis protocol activation failed:', err.message);
  }
}

module.exports = { setupSocketHandlers };
