const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();
router.use(authMiddleware);

// GET /api/friends — принятые друзья
router.get('/', async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.avatar_url, u.role, u.group_name,
             (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND status = 'approved') AS achievements_count
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
      WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
      ORDER BY u.full_name
    `, [me]);
    res.json({ friends: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/friends/requests — входящие заявки
router.get('/requests', async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(`
      SELECT f.id, f.created_at,
             u.id AS user_id, u.full_name, u.avatar_url, u.group_name
      FROM friendships f
      JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [me]);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/friends/status/:userId — статус с конкретным юзером
router.get('/status/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  if (isNaN(other)) return res.json({ status: 'none' });
  try {
    const result = await pool.query(`
      SELECT id, status, requester_id FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
    `, [me, other]);
    if (result.rows.length === 0) return res.json({ status: 'none' });
    const f = result.rows[0];
    res.json({
      status: f.status,
      direction: f.requester_id === me ? 'sent' : 'received',
      friendship_id: f.id,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// POST /api/friends/request/:userId — отправить заявку
router.post('/request/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  if (me === other) return res.status(400).json({ message: 'Өзіңізді дос қоса алмайсыз' });

  try {
    const exists = await pool.query(`
      SELECT id FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
    `, [me, other]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Сұрау бұрын жіберілген' });

    await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)`,
      [me, other]
    );

    const meInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [me]);
    createNotification({
      user_id: other,
      type: 'new_pending',
      title: 'Достық сұрауы',
      message: `${meInfo.rows[0]?.full_name} сізді достарына қосқысы келеді`,
      related_id: null,
    }).catch(() => {});

    res.status(201).json({ message: 'Сұрау жіберілді' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// PATCH /api/friends/request/:id/accept
router.patch('/request/:id/accept', async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(`
      UPDATE friendships SET status = 'accepted'
      WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
      RETURNING requester_id
    `, [req.params.id, me]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Сұрау табылмады' });

    const meInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [me]);
    createNotification({
      user_id: result.rows[0].requester_id,
      type: 'achievement_approved',
      title: 'Достық қабылданды',
      message: `${meInfo.rows[0]?.full_name} сіздің достық сұрауыңызды қабылдады`,
      related_id: null,
    }).catch(() => {});

    res.json({ message: 'Достық қабылданды' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// PATCH /api/friends/request/:id/reject — отклонить или отменить
router.patch('/request/:id/reject', async (req, res) => {
  const me = req.user.id;
  try {
    await pool.query(
      `DELETE FROM friendships WHERE id = $1 AND (addressee_id = $2 OR requester_id = $2)`,
      [req.params.id, me]
    );
    res.json({ message: 'Бас тартылды' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// DELETE /api/friends/:userId — удалить из друзей
router.delete('/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  try {
    await pool.query(`
      DELETE FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
    `, [me, other]);
    res.json({ message: 'Достықтан шығарылды' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

module.exports = router;
