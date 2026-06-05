const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { generateCode } = require('../utils/telegramCodes');

const router = express.Router();

// Папка для аватаров
const avatarDir = 'uploads/avatars';
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Аватар должен быть картинкой'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ===== СПИСОК ПОЛЬЗОВАТЕЛЕЙ (admin/curator) =====
// GET /api/users?role=student&group_name=P22-2B&search=иванов
router.get('/', authMiddleware, checkRole('curator', 'admin'), async (req, res) => {
  try {
    const { role, group_name, search, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT id, email, full_name, role, group_name, avatar_url, 
             telegram_id, telegram_username, is_active, created_at
      FROM users WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (role)       { query += ` AND role = $${i++}`;       params.push(role); }
    if (group_name) { query += ` AND group_name = $${i++}`; params.push(group_name); }
    if (search)     { query += ` AND (full_name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${search}%`); i++; }

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Ошибка списка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ОБНОВИТЬ СВОЙ ПРОФИЛЬ =====
// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio, group_name } = req.body;
    const result = await pool.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name),
          bio = COALESCE($2, bio),
          group_name = COALESCE($3, group_name),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, full_name, role, group_name, avatar_url, bio
    `, [full_name, bio, group_name, req.user.id]);

    res.json({ message: 'Профиль обновлён', user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== СМЕНА ПАРОЛЯ =====
// POST /api/users/me/password
router.post('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Барлық өрістерді толтырыңыз' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Жаңа құпиясөз кемінде 6 таңбадан тұруы керек' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ message: 'Ағымдағы құпиясөз қате' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ message: 'Құпиясөз сәтті өзгертілді' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ПОЛУЧИТЬ КОД ДЛЯ ПРИВЯЗКИ TELEGRAM =====
// POST /api/users/me/telegram-code
router.post('/me/telegram-code', authMiddleware, async (req, res) => {
  try {
    const { code, expires_at } = generateCode(req.user.id);
    res.json({
      code,
      expires_at,
      message: `Введите в боте: /link ${code}`
    });
  } catch (error) {
    console.error('Ошибка генерации кода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ОТВЯЗАТЬ TELEGRAM ОТ АККАУНТА =====
// POST /api/users/me/telegram-unlink
router.post('/me/telegram-unlink', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET telegram_id = NULL, telegram_username = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [req.user.id]
    );
    res.json({ message: 'Telegram отвязан' });
  } catch (error) {
    console.error('Ошибка отвязки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ЗАГРУЗИТЬ АВАТАР =====
// POST /api/users/me/avatar
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });

    const avatarUrl = '/' + req.file.path.replace(/\\/g, '/');

    // Удаляем старый аватар
    const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
    if (old.rows[0]?.avatar_url) {
      const oldPath = old.rows[0].avatar_url.replace(/^\//, '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const result = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING avatar_url`,
      [avatarUrl, req.user.id]
    );

    res.json({ message: 'Аватар обновлён', avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error('Ошибка аватара:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера' });
  }
});

// ===== ПОЛУЧИТЬ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ =====
// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, email, full_name, role, group_name, avatar_url, bio, 
             telegram_username, created_at,
             (SELECT COUNT(*)::int FROM achievements 
              WHERE user_id = users.id AND status = 'approved') AS achievements_count
      FROM users WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== СМЕНИТЬ РОЛЬ (только admin) =====
// PATCH /api/users/:id/role
router.patch('/:id/role', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'curator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, full_name, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ message: `Роль изменена на ${role}`, user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка смены роли:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== БЛОКИРОВКА / РАЗБЛОКИРОВКА (только admin) =====
// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING id, full_name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({
      message: result.rows[0].is_active ? 'Разблокирован' : 'Заблокирован',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка блокировки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;