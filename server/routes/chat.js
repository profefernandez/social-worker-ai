const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../middleware/encryption');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/chat/session — create a new session
router.post('/session', apiLimiter, authenticateToken, async (req, res) => {
  const sessionId = uuidv4();
  const { clientIdentifier } = req.body;
  try {
    await pool.execute(
      'INSERT INTO sessions (id, user_id, client_identifier) VALUES (?, ?, ?)',
      [sessionId, req.user.id, clientIdentifier || null]
    );
    return res.status(201).json({ sessionId });
  } catch {
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/chat/session/:sessionId/messages
router.get('/session/:sessionId/messages', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Verify session belongs to user (or admin)
    const [sessions] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessions[0];
    if (session.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Admin can only access crisis sessions
    if (req.user.role === 'admin' && !session.crisis_active) {
      return res.status(403).json({ error: 'Access denied — not a crisis session' });
    }

    const [messages] = await pool.execute(
      'SELECT id, sender, content_encrypted, iv, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );

    const decrypted = messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: decrypt(m.content_encrypted, m.iv),
      createdAt: m.created_at,
    }));

    return res.json({ messages: decrypted });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

module.exports = router;
