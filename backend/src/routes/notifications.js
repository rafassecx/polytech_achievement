const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ notifications: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// PATCH /api/notifications/read-all — маршрут /:id/read-тан жоғары болуы керек
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'Барлығы оқылған' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Оқылған' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;