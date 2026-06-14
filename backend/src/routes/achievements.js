const express = require('express');
const pool = require('../config/db');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { createNotification, notifyAllCurators } = require('../utils/notifications');

const router = express.Router();

// POST /api/achievements
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, event_date, target_user_id } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: 'Название и категория обязательны' });
    }

    // куратор/admin жасаса — бірден approved, студент жасаса — pending
    let user_id = req.user.id;
    let status = 'pending';

    if (target_user_id && (req.user.role === 'curator' || req.user.role === 'admin')) {
      user_id = target_user_id;
      status = 'approved';
    }

    const result = await pool.query(
      `INSERT INTO achievements (user_id, title, description, category, event_date, status, source) 
       VALUES ($1, $2, $3, $4, $5, $6, 'website') 
       RETURNING *`,
      [user_id, title, description || null, category, event_date || null, status]
    );

    const created = result.rows[0];
    
    if (created.status === 'pending') {
      const authorRes = await pool.query(
        'SELECT full_name FROM users WHERE id = $1',
        [created.user_id]
      );
      notifyAllCurators({
        achievement_id: created.id,
        title: created.title,
        author_name: authorRes.rows[0]?.full_name || 'Студент',
      }).catch(() => {});
    }

    else if (created.user_id !== req.user.id) {
      createNotification({
        user_id: created.user_id,
        type: 'achievement_approved',
        title: 'Сізге жетістік қосылды ✅',
        message: `Куратор сіздің атыңызға "${created.title}" жетістігін тіркеді`,
        related_id: created.id,
      }).catch(() => {});
    }

    res.status(201).json({
      message: 'Достижение создано',
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка создания достижения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/achievements?status=approved&category=academic&user_id=1&group_name=P22-2B
router.get('/', async (req, res) => {
  try {
    const { status, category, user_id, group_name, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.*,
        u.full_name AS author_name,
        u.group_name AS author_group,
        u.avatar_url AS author_avatar,
        (SELECT COUNT(*)::int FROM likes WHERE achievement_id = a.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE achievement_id = a.id) AS comments_count,
        (SELECT file_url FROM files 
         WHERE achievement_id = a.id AND file_type = 'image' 
         ORDER BY uploaded_at LIMIT 1) AS preview_image
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status)     { query += ` AND a.status = $${i++}`;       params.push(status); }
    if (category)   { query += ` AND a.category = $${i++}`;     params.push(category); }
    if (user_id)    { query += ` AND a.user_id = $${i++}`;      params.push(user_id); }
    if (group_name) { query += ` AND u.group_name = $${i++}`;   params.push(group_name); }

    query += ` ORDER BY a.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ achievements: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Ошибка получения списка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/achievements/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const aResult = await pool.query(`
      SELECT 
        a.*,
        u.full_name AS author_name,
        u.group_name AS author_group,
        u.avatar_url AS author_avatar,
        (SELECT COUNT(*)::int FROM likes WHERE achievement_id = a.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE achievement_id = a.id) AS comments_count
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (aResult.rows.length === 0) {
      return res.status(404).json({ message: 'Достижение не найдено' });
    }

    const achievement = aResult.rows[0];
    const filesResult = await pool.query(
      'SELECT * FROM files WHERE achievement_id = $1 ORDER BY uploaded_at',
      [id]
    );
    achievement.files = filesResult.rows;

    res.json(achievement);
  } catch (error) {
    console.error('Ошибка получения достижения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PATCH /api/achievements/:id/moderate
router.patch('/:id/moderate', authMiddleware, checkRole('curator', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderator_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status должен быть approved или rejected' });
    }

    const result = await pool.query(
      `UPDATE achievements 
       SET status = $1, moderator_id = $2, moderator_comment = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, moderator_comment || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Достижение не найдено' });
    }

    const moderated = result.rows[0];
    
    if (status === 'approved') {
      createNotification({
        user_id: moderated.user_id,
        type: 'achievement_approved',
        title: 'Жетістік бекітілді ✅',
        message: `Сіздің "${moderated.title}" жетістігіңіз расталды!`,
        related_id: moderated.id,
      }).catch(() => {});
    } else if (status === 'rejected') {
      createNotification({
        user_id: moderated.user_id,
        type: 'achievement_rejected',
        title: 'Жетістік бас тартылды ❌',
        message: moderator_comment
          ? `"${moderated.title}" расталмады. Себебі: ${moderator_comment}`
          : `"${moderated.title}" расталмады.`,
        related_id: moderated.id,
      }).catch(() => {});
    }

    res.json({
      message: `Достижение ${status === 'approved' ? 'одобрено' : 'отклонено'}`,
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка модерации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/achievements/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query('SELECT user_id FROM achievements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Достижение не найдено' });
    }

    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await pool.query('DELETE FROM achievements WHERE id = $1', [id]);
    res.json({ message: 'Достижение удалено' });
  } catch (error) {
    console.error('Ошибка удаления:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;