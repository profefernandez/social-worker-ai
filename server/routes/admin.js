const express = require('express');
const { pool } = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');
const { decrypt } = require('../middleware/encryption');
const { validateUUID } = require('../middleware/validation');

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

    // Audit: log that admin listed crisis sessions
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [null, req.user.email, 'listed_crisis_sessions', `${sessions.length} sessions returned`]
    );

    return res.json({ sessions });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/admin/sessions/:sessionId/messages — admin reads a crisis session
router.get('/sessions/:sessionId/messages', authenticateAdmin, async (req, res) => {
  const { sessionId } = req.params;
  if (!validateUUID(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }
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

// GET /api/admin/notifications — notification log (admin only)
router.get('/notifications', authenticateAdmin, async (req, res) => {
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

// POST /api/admin/sessions/:sessionId/end-crisis — end crisis protocol (admin only)
router.post('/sessions/:sessionId/end-crisis', authenticateAdmin, async (req, res) => {
  const { sessionId } = req.params;
  if (!validateUUID(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM sessions WHERE id = ? AND crisis_active = 1',
      [sessionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Active crisis session not found' });
    }

    // End crisis
    await pool.execute(
      'UPDATE sessions SET crisis_active = 0, active_agent_id = NULL WHERE id = ?',
      [sessionId]
    );

    // Audit
    await pool.execute(
      'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
      [sessionId, req.user.email, 'crisis_ended', 'Crisis protocol ended by admin']
    );

    // Notify via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`session:${sessionId}`).emit('crisis:ended', {
        sessionId,
        endedBy: req.user.email,
        timestamp: new Date().toISOString(),
      });
      io.to('dashboard').emit('crisis:ended', {
        sessionId,
        endedBy: req.user.email,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: 'Crisis protocol ended' });
  } catch {
    return res.status(500).json({ error: 'Failed to end crisis' });
  }
});

module.exports = router;
