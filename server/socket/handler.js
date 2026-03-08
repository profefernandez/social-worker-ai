const { pool } = require('../config/db');
const { encrypt, decrypt } = require('../middleware/encryption');
const { proxyToProvider } = require('../services/aiProxy');
const { handleProfeCalls } = require('../services/profeHandler');
const { verifySocketToken } = require('../middleware/auth');
const { validateUUID, validateMessageLength } = require('../middleware/validation');

const PROFE_COMMAND = '@profe';

// Require env vars — no hardcoded agent IDs in source
const KIDDO_AGENT_ID = process.env.MISTRAL_KIDDO_AGENT_ID;
const PROFE_AGENT_ID = process.env.MISTRAL_AGENT_ID;
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;

/**
 * Load recent conversation history from DB for Mistral.
 * Returns messages as [{role: 'user'|'assistant', content}]
 */
async function loadConversationHistory(sessionId, limit = 20) {
  const [rows] = await pool.execute(
    'SELECT sender, content_encrypted, iv FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?',
    [sessionId, limit]
  );
  return rows.reverse().map((row) => {
    const content = decrypt(row.content_encrypted, row.iv);
    const role = row.sender === 'client' ? 'user' : 'assistant';
    return { role, content };
  });
}

function setupSocketHandlers(io) {
  // Validate Mistral config on startup
  if (!MISTRAL_KEY) {
    // eslint-disable-next-line no-console
    console.warn('WARNING: MISTRAL_API_KEY not set — AI features will not work');
  }
  if (!KIDDO_AGENT_ID) {
    // eslint-disable-next-line no-console
    console.warn('WARNING: MISTRAL_KIDDO_AGENT_ID not set — chatbot will not work');
  }
  if (!PROFE_AGENT_ID) {
    // eslint-disable-next-line no-console
    console.warn('WARNING: MISTRAL_AGENT_ID not set — Profe will not work');
  }

  // Authenticate all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
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
      socket.join('dashboard');

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

          if (rows.length === 0) {
            if (process.env.DEMO_MODE === 'true') {
              const demoUserId = parseInt(process.env.DEMO_USER_ID, 10) || 1;
              await pool.execute(
                'INSERT INTO sessions (id, user_id, client_identifier) VALUES (?, ?, ?)',
                [sessionId, demoUserId, 'demo-judge']
              );
            } else {
              return;
            }
          }

          socket.join(`session:${sessionId}`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('client:join error:', err.message);
        }
      });
    }

    // ── Client sends a message ──
    socket.on('client:message', async (data) => {
      const { sessionId, message } = data;
      if (!sessionId || !message) return;
      if (!validateUUID(sessionId) || !validateMessageLength(message)) {
        return socket.emit('error', { message: 'Invalid input' });
      }

      try {
        // 1. Validate session
        const [sessions] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (sessions.length === 0) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }
        const session = sessions[0];

        // 2. Save the client message encrypted
        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
          [sessionId, 'client', 'user', encrypted, iv]
        );

        // 3. If Jason has taken over, don't send to any AI
        if (session.active_agent_id === 'ADMIN') {
          io.to('dashboard').emit('session:update', {
            sessionId,
            crisisActive: !!session.crisis_active,
          });
          return;
        }

        // 4. Check Mistral config
        if (!MISTRAL_KEY || !KIDDO_AGENT_ID) {
          socket.emit('ai:message', {
            sessionId,
            message: 'AI is not configured. Please set MISTRAL_API_KEY and MISTRAL_KIDDO_AGENT_ID.',
            sender: 'system',
          });
          return;
        }

        // 5. Check for @profe command — route directly to Profe agent
        const isProfeCommand = message.toLowerCase().includes(PROFE_COMMAND);
        if (isProfeCommand) {
          if (!PROFE_AGENT_ID) {
            socket.emit('ai:message', {
              sessionId,
              message: 'Profe is not available right now. Please set MISTRAL_AGENT_ID to enable Profe.',
              sender: 'system',
            });
            return;
          }
          let profeResponse = '';
          try {
            const history = await loadConversationHistory(sessionId);
            profeResponse = await proxyToProvider(message, history, {
              provider: 'mistral',
              apiKey: MISTRAL_KEY,
              agentId: PROFE_AGENT_ID,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('@profe Mistral call failed:', err.message);
            profeResponse = "Hey, I'm Profe! I'm here to help you understand AI better. What's on your mind?";
          }

          const profeEnc = encrypt(profeResponse);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'profe', 'profe', profeEnc.encrypted, profeEnc.iv]
          );

          // Audit trail for @profe command
          await pool.execute(
            'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
            [sessionId, 'system', 'profe_command', `@profe invoked (${message.length} chars)`]
          );

          socket.emit('ai:message', { sessionId, message: profeResponse, sender: 'profe' });
          io.to('dashboard').emit('session:update', { sessionId, crisisActive: false });
          return;
        }

        // 6. Normal mode — SEQUENTIAL: Kiddo first, then Profe monitors the response
        const history = await loadConversationHistory(sessionId);

        // 6a. Call Kiddo chatbot agent
        let aiResponse = '';
        try {
          aiResponse = await proxyToProvider(message, history, {
            provider: 'mistral',
            apiKey: MISTRAL_KEY,
            agentId: KIDDO_AGENT_ID,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Kiddo agent failed:', err.message);
          aiResponse = "I'm here to help. What would you like to work on?";
        }

        if (!aiResponse) {
          aiResponse = "I'm here to help. What would you like to work on?";
        }

        // 6b. Send BOTH user message AND kiddo response to Profe for monitoring
        //     Profe needs to see what the AI said to evaluate safety/sycophancy
        let profeIntervened = false;
        let interventionMessage = null;

        if (PROFE_AGENT_ID) {
          try {
            const profeInput = `[USER MESSAGE]: ${message}\n\n[AI RESPONSE]: ${aiResponse}`;
            const profeResult = await proxyToProvider(profeInput, history, {
              provider: 'mistral',
              apiKey: MISTRAL_KEY,
              agentId: PROFE_AGENT_ID,
              returnFullResponse: true,
            });

            if (profeResult?.toolCalls?.length > 0) {
              const profeOutcome = await handleProfeCalls(profeResult.toolCalls, sessionId, io);
              profeIntervened = profeOutcome.intervention;
              interventionMessage = profeOutcome.interventionMessage;
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Profe monitor failed:', err.message);
            // Profe failure should not block the kiddo response
          }
        }

        // 7. Profe intervention — replace kiddo response
        if (profeIntervened && interventionMessage) {
          // Save Profe's intervention message
          const profeEnc = encrypt(interventionMessage);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'profe', 'profe', profeEnc.encrypted, profeEnc.iv]
          );

          // Save the kiddo response too (for the record) but don't show it
          const aiEnc = encrypt(aiResponse);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'kiddo_ai', 'kiddo_ai', aiEnc.encrypted, aiEnc.iv]
          );

          // Send Profe's message to the user instead
          socket.emit('ai:message', { sessionId, message: interventionMessage, sender: 'profe' });
          io.to('dashboard').emit('session:update', { sessionId, crisisActive: false });
          return;
        }

        // 8. No intervention — save and emit the regular kiddo response
        const aiEnc = encrypt(aiResponse);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
          [sessionId, 'kiddo_ai', 'kiddo_ai', aiEnc.encrypted, aiEnc.iv]
        );
        socket.emit('ai:message', { sessionId, message: aiResponse, sender: 'ai' });

        // 9. Notify dashboard of session activity
        io.to('dashboard').emit('session:update', {
          sessionId,
          crisisActive: false,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling client message:', err.message);
      }
    });

    // ── Admin intercept message ──
    // Admin (Jason) may intercept any session for educational intervention.
    // Therapists (company owners) are restricted to their own sessions.
    // Admin intercept on non-crisis sessions is intentional: Profe intervenes
    // for AI-literacy reasons, not only for mental-health emergencies.
    socket.on('admin:intercept', async (data) => {
      if (socket.userType !== 'admin' && socket.userType !== 'therapist') return;
      const { sessionId, message } = data;
      if (!sessionId || !message) return;
      if (!validateUUID(sessionId) || !validateMessageLength(message)) {
        return socket.emit('error', { message: 'Invalid input' });
      }

      try {
        const [rows] = await pool.execute(
          'SELECT * FROM sessions WHERE id = ?',
          [sessionId]
        );
        if (rows.length === 0) return;
        const session = rows[0];

        if (socket.userType === 'therapist' && session.user_id !== socket.user.id) return;

        const { encrypted, iv } = encrypt(message);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
          [sessionId, 'admin', 'admin', encrypted, iv]
        );

        await pool.execute(
          'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
          [sessionId, socket.user.email, 'intercepted', `Message sent (${message.length} chars)`]
        );

        io.to(`session:${sessionId}`).emit('admin:message', { sessionId, message });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling admin intercept:', err.message);
      }
    });

    // ── Jason takes over the conversation ──
    socket.on('admin:takeover', async ({ sessionId }) => {
      if (socket.userType !== 'admin') return;
      if (!sessionId || !validateUUID(sessionId)) return;

      try {
        const [rows] = await pool.execute(
          'SELECT * FROM sessions WHERE id = ?',
          [sessionId]
        );
        if (rows.length === 0) return;

        await pool.execute(
          'UPDATE sessions SET active_agent_id = ? WHERE id = ?',
          ['ADMIN', sessionId]
        );

        await pool.execute(
          'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
          [sessionId, socket.user.email, 'admin_takeover', 'Jason entered the conversation']
        );

        io.to(`session:${sessionId}`).emit('agent:joined', {
          sessionId,
          agentName: 'Jason Fernandez, LMSW',
        });
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

module.exports = { setupSocketHandlers };
