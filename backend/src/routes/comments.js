const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// POST /api/comments
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { achievement_id, content } = req.body;

    if (!achievement_id || !content || content.trim().length === 0) {
      return res.status(400).json({ message: 'achievement_id и текст обязательны' });
    }

    const check = await pool.query('SELECT id FROM achievements WHERE id = $1', [achievement_id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Достижение не найдено' });
    }

    const result = await pool.query(
      `INSERT INTO comments (achievement_id, user_id, content) 
       VALUES ($1, $2, $3) RETURNING id`,
      [achievement_id, req.user.id, content.trim()]
    );

    const enriched = await pool.query(`
      SELECT c.*, u.full_name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    const ownerRes = await pool.query(
      'SELECT user_id, title FROM achievements WHERE id = $1',
      [achievement_id]
    );
    const ach = ownerRes.rows[0];
    if (ach && ach.user_id !== req.user.id) {
      const comment = enriched.rows[0];
      createNotification({
        user_id: ach.user_id,
        type: 'comment',
        title: 'Жаңа пікір',
        message: `«${ach.title}» постына ${comment.author_name} пікір жазды:\n${comment.content.slice(0, 80)}`,
        related_id: achievement_id,
      }).catch(() => {});
    }

    res.status(201).json({ message: 'Комментарий добавлен', comment: enriched.rows[0] });
  } catch (error) {
    console.error('Ошибка комментария:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/comments/:achievement_id
router.get('/:achievement_id', async (req, res) => {
  try {
    const { achievement_id } = req.params;
    const result = await pool.query(`
      SELECT c.*, u.full_name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.achievement_id = $1
      ORDER BY c.created_at DESC
    `, [achievement_id]);

    res.json({ comments: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Комментарий не найден' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Ошибка удаления:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;