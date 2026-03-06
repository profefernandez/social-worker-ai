const express = require('express');
const { pool } = require('../config/db');
const { authenticateAdmin, authenticateToken } = require('../middleware/auth');
const { decrypt } = require('../middleware/encryption');

const router = express.Router();

// GET /api/admin/sessions — list all crisis-active sessions (admin only)
router.get('/sessions', authenticateAdmin, async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      `SELECT s.id, s.user_id, s.client_identifier, s.crisis_active, s.crisis_activated_at,
              u.email AS therapist_email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.crisis_active = 1
       ORDER BY s.crisis_activated_at DESC`
    );
    return res.json({ sessions });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/admin/sessions/:sessionId/messages — admin reads a crisis session
router.get('/sessions/:sessionId/messages', authenticateAdmin, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const [sessions] = await pool.execute(
      'SELECT * FROM sessions WHERE id = ? AND crisis_active = 1',
      [sessionId]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Crisis session not found' });
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

    // Log access in audit trail
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [sessionId, req.user.email, 'viewed', 'Admin viewed crisis session messages']
    );

    return res.json({ messages: decrypted });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/admin/audit — audit trail (admin only)
router.get('/audit', authenticateAdmin, async (req, res) => {
  const { sessionId } = req.query;
  try {
    let query = 'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200';
    let params = [];
    if (sessionId) {
      query =
        'SELECT * FROM audit_log WHERE session_id = ? ORDER BY created_at DESC LIMIT 200';
      params = [sessionId];
    }
    const [rows] = await pool.execute(query, params);
    return res.json({ audit: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/admin/notifications — notification log
router.get('/notifications', authenticateToken, async (req, res) => {
  const { sessionId } = req.query;
  try {
    let query = 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200';
    let params = [];
    if (sessionId) {
      query =
        'SELECT * FROM notifications WHERE session_id = ? ORDER BY created_at DESC LIMIT 200';
      params = [sessionId];
    }
    const [rows] = await pool.execute(query, params);
    return res.json({ notifications: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;
