const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/bookmarks/:achievementId — тоггл (добавить/убрать)
router.post('/:achievementId', async (req, res) => {
  const me = req.user.id;
  const achId = parseInt(req.params.achievementId);
  if (isNaN(achId)) return res.status(400).json({ message: 'Қате ID' });

  try {
    const exists = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND achievement_id = $2',
      [me, achId]
    );
    if (exists.rows.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND achievement_id = $2', [me, achId]);
      return res.json({ bookmarked: false });
    }
    await pool.query('INSERT INTO bookmarks (user_id, achievement_id) VALUES ($1, $2)', [me, achId]);
    res.json({ bookmarked: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/bookmarks — мои сохранённые достижения
router.get('/', async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(`
      SELECT a.*, u.full_name AS author_name, u.group_name AS author_group,
             (SELECT file_url FROM achievement_files
              WHERE achievement_id = a.id AND file_type = 'image' LIMIT 1) AS preview_image,
             (SELECT COUNT(*)::int FROM likes WHERE achievement_id = a.id) AS likes_count,
             (SELECT COUNT(*)::int FROM comments WHERE achievement_id = a.id) AS comments_count
      FROM bookmarks b
      JOIN achievements a ON a.id = b.achievement_id
      JOIN users u ON u.id = a.user_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [me]);
    res.json({ bookmarks: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/bookmarks/check/:achievementId — проверить, сохранено ли
router.get('/check/:achievementId', async (req, res) => {
  const me = req.user.id;
  const achId = parseInt(req.params.achievementId);
  try {
    const result = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND achievement_id = $2',
      [me, achId]
    );
    res.json({ bookmarked: result.rows.length > 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

module.exports = router;
