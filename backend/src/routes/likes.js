const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// POST /api/likes/:achievement_id
router.post('/:achievement_id', authMiddleware, async (req, res) => {
  try {
    const { achievement_id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM likes WHERE achievement_id = $1 AND user_id = $2',
      [achievement_id, req.user.id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE id = $1', [existing.rows[0].id]);
    } else {
      await pool.query(
        'INSERT INTO likes (achievement_id, user_id) VALUES ($1, $2)',
        [achievement_id, req.user.id]
      );

      const ownerRes = await pool.query(
        'SELECT user_id, title FROM achievements WHERE id = $1',
        [achievement_id]
      );
      const ach = ownerRes.rows[0];
      if (ach && ach.user_id !== req.user.id) {
        const likerRes = await pool.query(
          'SELECT full_name FROM users WHERE id = $1',
          [req.user.id]
        );
        const likerName = likerRes.rows[0]?.full_name || 'Біреу';
        createNotification({
          user_id: ach.user_id,
          type: 'like',
          title: 'Жаңа ұнатушы ❤️',
          message: `${likerName} сіздің "${ach.title}" жетістігіңізді ұнатты`,
          related_id: achievement_id,
        }).catch(() => {});
      }
    }

    const count = await pool.query(
      'SELECT COUNT(*)::int AS count FROM likes WHERE achievement_id = $1',
      [achievement_id]
    );

    res.json({
      liked: existing.rows.length === 0,
      count: count.rows[0].count
    });
  } catch (error) {
    console.error('Ошибка лайка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/likes/:achievement_id
router.get('/:achievement_id', async (req, res) => {
  try {
    const { achievement_id } = req.params;

    const count = await pool.query(
      'SELECT COUNT(*)::int AS count FROM likes WHERE achievement_id = $1',
      [achievement_id]
    );

    let liked = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
          'SELECT id FROM likes WHERE achievement_id = $1 AND user_id = $2',
          [achievement_id, decoded.id]
        );
        liked = result.rows.length > 0;
      } catch (e) { /* токен невалидный — просто игнорируем */ }
    }

    res.json({ count: count.rows[0].count, liked });
  } catch (error) {
    console.error('Ошибка получения лайков:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;