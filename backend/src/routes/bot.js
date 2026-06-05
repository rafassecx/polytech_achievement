const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../config/db');
const { botAuthMiddleware } = require('../middleware/auth');
const { consumeCode } = require('../utils/telegramCodes');
const { notifyAllCurators } = require('../utils/notifications');

const router = express.Router();

// Все эндпоинты бота требуют ключ
router.use(botAuthMiddleware);

// Настройка загрузки файлов (как в upload.js)
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};

['uploads/images', 'uploads/videos', 'uploads/documents'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = getFileType(file.mimetype);
    const folder = type === 'image' ? 'uploads/images'
                 : type === 'video' ? 'uploads/videos'
                 : 'uploads/documents';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ===== ПРИВЯЗКА АККАУНТА =====
// POST /api/bot/link
router.post('/link', async (req, res) => {
  try {
    const { code, telegram_id, telegram_username } = req.body;

    if (!code || !telegram_id) {
      return res.status(400).json({ message: 'code и telegram_id обязательны' });
    }

    const user_id = consumeCode(code);
    if (!user_id) {
      return res.status(400).json({ message: 'Код недействителен или просрочен' });
    }

    // Проверим, не привязан ли уже этот telegram_id к другому юзеру
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE telegram_id = $1 AND id != $2',
      [telegram_id, user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: `Этот Telegram уже привязан к другому аккаунту (${existing.rows[0].email})`
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET telegram_id = $1, telegram_username = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, email, full_name, role, group_name`,
      [telegram_id, telegram_username || null, user_id]
    );

    res.json({ message: 'Аккаунт привязан', user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка привязки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ПОИСК ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID =====
// GET /api/bot/users/by-telegram/:telegram_id
router.get('/users/by-telegram/:telegram_id', async (req, res) => {
  try {
    const { telegram_id } = req.params;
    const result = await pool.query(
      `SELECT id, email, full_name, role, group_name, avatar_url, bio, 
              telegram_id, telegram_username
       FROM users WHERE telegram_id = $1`,
      [telegram_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не привязан' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== СОЗДАТЬ ДОСТИЖЕНИЕ ОТ ИМЕНИ ПОЛЬЗОВАТЕЛЯ =====
// POST /api/bot/achievements
router.post('/achievements', async (req, res) => {
  try {
    const { telegram_id, title, description, category, event_date } = req.body;

    if (!telegram_id || !title || !category) {
      return res.status(400).json({ message: 'telegram_id, title, category обязательны' });
    }

    // Находим пользователя по telegram_id
    const userResult = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не привязан. Привяжите аккаунт через /link' });
    }

    const user_id = userResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO achievements (user_id, title, description, category, event_date, status, source) 
       VALUES ($1, $2, $3, $4, $5, 'pending', 'telegram') 
       RETURNING *`,
      [user_id, title, description || null, category, event_date || null]
    );

    const created = result.rows[0];
    const authorRes = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [created.user_id]
    );
    notifyAllCurators({
      achievement_id: created.id,
      title: created.title,
      author_name: authorRes.rows[0]?.full_name || 'Студент',
    }).catch(() => {});

    res.status(201).json({ message: 'Достижение создано', achievement: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ЗАГРУЗИТЬ ФАЙЛЫ К ДОСТИЖЕНИЮ ИЗ БОТА =====
// POST /api/bot/achievements/:id/upload
router.post('/achievements/:id/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { telegram_id } = req.body;

    // Проверим, что достижение принадлежит этому telegram_id
    const check = await pool.query(`
      SELECT a.id FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1 AND u.telegram_id = $2
    `, [id, telegram_id]);

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Достижение не найдено или не ваше' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Файлы не загружены' });
    }

    const savedFiles = [];
    for (const file of req.files) {
      const fileType = getFileType(file.mimetype);
      const fileUrl = '/' + file.path.replace(/\\/g, '/');

      const result = await pool.query(
        `INSERT INTO files (achievement_id, file_url, file_type, file_name, file_size, mime_type) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [id, fileUrl, fileType, file.originalname, file.size, file.mimetype]
      );
      savedFiles.push(result.rows[0]);
    }

    res.status(201).json({ message: `Загружено: ${savedFiles.length}`, files: savedFiles });
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ЛЕНТА ДЛЯ БОТА =====
// GET /api/bot/feed?limit=10
router.get('/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await pool.query(`
      SELECT a.id, a.title, a.description, a.category, a.event_date, a.created_at,
             u.full_name AS author_name, u.group_name AS author_group,
             (SELECT file_url FROM files 
              WHERE achievement_id = a.id AND file_type = 'image' 
              ORDER BY uploaded_at LIMIT 1) AS preview_image
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'approved'
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Ошибка ленты:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== МОИ ДОСТИЖЕНИЯ ДЛЯ БОТА =====
// GET /api/bot/my-achievements/:telegram_id
router.get('/my-achievements/:telegram_id', async (req, res) => {
  try {
    const { telegram_id } = req.params;
    const result = await pool.query(`
      SELECT a.*, 
             (SELECT file_url FROM files 
              WHERE achievement_id = a.id AND file_type = 'image' 
              ORDER BY uploaded_at LIMIT 1) AS preview_image
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE u.telegram_id = $1
      ORDER BY a.created_at DESC
    `, [telegram_id]);

    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Ошибка моих достижений:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;