const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { generateCode } = require('../utils/telegramCodes');
const { createNotification, notifyAllCurators } = require('../utils/notifications');

const router = express.Router();

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
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== ОБНОВИТЬ ПРОФИЛЬ =====
// Студенттер топты тікелей өзгерте алмайды — group_name игнорируется
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio, group_name } = req.body;
    const isStudent = req.user.role === 'student';

    const result = await pool.query(`
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          bio = COALESCE($2, bio),
          group_name = CASE WHEN $3::boolean THEN COALESCE($4, group_name) ELSE group_name END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, email, full_name, role, group_name, avatar_url, bio
    `, [full_name, bio, !isStudent, group_name, req.user.id]);

    res.json({ message: 'Профиль сақталды', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== СМЕНА ПАРОЛЯ =====
router.post('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Барлық өрістерді толтырыңыз' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Жаңа құпиясөз кемінде 6 таңба' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) return res.status(400).json({ message: 'Ағымдағы құпиясөз қате' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);
    res.json({ message: 'Құпиясөз сәтті өзгертілді' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== TELEGRAM КОД =====
router.post('/me/telegram-code', authMiddleware, async (req, res) => {
  try {
    const { code, expires_at } = generateCode(req.user.id);
    res.json({ code, expires_at, message: `Введите в боте: /link ${code}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== TELEGRAM ОТВЯЗАТЬ =====
router.post('/me/telegram-unlink', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET telegram_id = NULL, telegram_username = NULL, updated_at = NOW() WHERE id = $1`,
      [req.user.id]
    );
    res.json({ message: 'Telegram отвязан' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== АВАТАР =====
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
    const avatarUrl = '/' + req.file.path.replace(/\\/g, '/');

    const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
    if (old.rows[0]?.avatar_url) {
      const oldPath = old.rows[0].avatar_url.replace(/^\//, '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const result = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url`,
      [avatarUrl, req.user.id]
    );
    res.json({ message: 'Аватар обновлён', avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Ошибка сервера' });
  }
});

// ===== ТЕКУЩИЙ ЗАПРОС НА СМЕНУ ГРУППЫ =====
router.get('/me/group-request', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM group_change_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ request: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ПОДАТЬ ЗАПРОС НА СМЕНУ ГРУППЫ =====
router.post('/me/group-request', authMiddleware, async (req, res) => {
  const { requested_group } = req.body;
  if (!requested_group?.trim()) return res.status(400).json({ message: 'Топ атын жазыңыз' });

  try {
    const pending = await pool.query(
      `SELECT id FROM group_change_requests WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    if (pending.rows.length > 0) return res.status(400).json({ message: 'Күтудегі сұрауыңыз бар' });

    const me = await pool.query('SELECT group_name, full_name FROM users WHERE id = $1', [req.user.id]);
    const { group_name: current, full_name } = me.rows[0];

    if (current?.trim() === requested_group.trim()) {
      return res.status(400).json({ message: 'Сіз осы топта тұрсыз' });
    }

    await pool.query(
      `INSERT INTO group_change_requests (user_id, current_group, requested_group) VALUES ($1, $2, $3)`,
      [req.user.id, current, requested_group.trim()]
    );

    // Барлық кураторлар мен adminдерді хабардар ету
    const curators = await pool.query(
      `SELECT id FROM users WHERE role IN ('curator', 'admin') AND is_active = TRUE AND id != $1`,
      [req.user.id]
    );
    for (const c of curators.rows) {
      createNotification({
        user_id: c.id,
        type: 'new_pending',
        title: 'Топ ауыстыру сұрауы',
        message: `${full_name}: «${current || '—'}» → «${requested_group.trim()}»`,
        related_id: null,
        send_telegram: false,
      }).catch(() => {});
    }

    res.status(201).json({ message: 'Сұрау жіберілді' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ОТМЕНИТЬ СВОЙ ЗАПРОС =====
router.delete('/me/group-request', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM group_change_requests WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    res.json({ message: 'Сұрау жойылды' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== СПИСОК ЗАПРОСОВ НА СМЕНУ ГРУППЫ (curator/admin) =====
router.get('/group-requests', authMiddleware, checkRole('curator', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gcr.*, u.full_name, u.email, u.avatar_url
      FROM group_change_requests gcr
      JOIN users u ON u.id = gcr.user_id
      WHERE gcr.status = 'pending'
      ORDER BY gcr.created_at ASC
    `);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ОДОБРИТЬ ЗАПРОС =====
router.patch('/group-requests/:id/approve', authMiddleware, checkRole('curator', 'admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const reqRow = await pool.query(
      `SELECT * FROM group_change_requests WHERE id = $1 AND status = 'pending'`, [id]
    );
    if (!reqRow.rows[0]) return res.status(404).json({ message: 'Сұрау табылмады' });
    const r = reqRow.rows[0];

    await pool.query(
      `UPDATE group_change_requests SET status = 'approved', reviewed_by = $1, updated_at = NOW() WHERE id = $2`,
      [req.user.id, id]
    );
    await pool.query(`UPDATE users SET group_name = $1, updated_at = NOW() WHERE id = $2`, [r.requested_group, r.user_id]);

    createNotification({
      user_id: r.user_id,
      type: 'achievement_approved',
      title: 'Топ өзгертілді',
      message: `Сіздің топыңыз «${r.requested_group}» деп өзгертілді`,
      related_id: null,
    }).catch(() => {});

    res.json({ message: 'Бекітілді' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ОТКЛОНИТЬ ЗАПРОС =====
router.patch('/group-requests/:id/reject', authMiddleware, checkRole('curator', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { moderator_comment } = req.body;
  try {
    const reqRow = await pool.query(
      `SELECT * FROM group_change_requests WHERE id = $1 AND status = 'pending'`, [id]
    );
    if (!reqRow.rows[0]) return res.status(404).json({ message: 'Сұрау табылмады' });
    const r = reqRow.rows[0];

    await pool.query(
      `UPDATE group_change_requests SET status = 'rejected', reviewed_by = $1, moderator_comment = $2, updated_at = NOW() WHERE id = $3`,
      [req.user.id, moderator_comment || null, id]
    );

    createNotification({
      user_id: r.user_id,
      type: 'achievement_rejected',
      title: 'Топ ауыстыру бас тартылды',
      message: moderator_comment
        ? `«${r.requested_group}» топына ауысу бас тартылды. Себебі: ${moderator_comment}`
        : `«${r.requested_group}» топына ауысу сұрауы бас тартылды`,
      related_id: null,
    }).catch(() => {});

    res.json({ message: 'Бас тартылды' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== УЧАСТНИКИ ГРУППЫ (публичный) =====
router.get('/group/:groupName', async (req, res) => {
  const { groupName } = req.params;
  try {
    const result = await pool.query(`
      SELECT id, full_name, role, avatar_url,
             (SELECT COUNT(*)::int FROM achievements WHERE user_id = users.id AND status = 'approved') AS achievements_count
      FROM users
      WHERE group_name = $1 AND is_active = TRUE
      ORDER BY full_name
    `, [groupName]);

    const total = result.rows.reduce((s, m) => s + (m.achievements_count || 0), 0);
    res.json({
      group_name: groupName,
      members: result.rows,
      member_count: result.rows.length,
      total_achievements: total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// ===== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (публичный) =====
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, full_name, role, group_name, avatar_url, bio, created_at,
             (SELECT COUNT(*)::int FROM achievements WHERE user_id = users.id AND status = 'approved') AS achievements_count
      FROM users WHERE id = $1 AND is_active = TRUE
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Пайдаланушы табылмады' });

    const user = { ...result.rows[0], friends_count: 0 };

    // friendships кестесі жоқ болуы мүмкін — қате болса 0 қайтарамыз
    try {
      const fr = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM friendships WHERE (requester_id=$1 OR addressee_id=$1) AND status='accepted'`,
        [id]
      );
      user.friends_count = fr.rows[0].cnt;
    } catch { /* table not created yet */ }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== СПИСОК ДРУЗЕЙ ПОЛЬЗОВАТЕЛЯ (публичный) =====
router.get('/:id/friends', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.avatar_url, u.role, u.group_name,
             (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND status = 'approved') AS achievements_count
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.requester_id = $1::int THEN f.addressee_id ELSE f.requester_id END
      WHERE (f.requester_id = $1::int OR f.addressee_id = $1::int) AND f.status = 'accepted'
        AND u.is_active = TRUE
      ORDER BY u.full_name
    `, [id]);
    res.json({ friends: result.rows });
  } catch (err) {
    res.json({ friends: [] });
  }
});

// ===== СМЕНИТЬ РОЛЬ (admin) =====
router.patch('/:id/role', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['student', 'curator', 'admin'].includes(role)) return res.status(400).json({ message: 'Рұқсат етілмеген рөл' });

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role`,
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Пайдаланушы табылмады' });
    res.json({ message: `Рөл өзгертілді`, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== БЛОКИРОВКА / РАЗБЛОКИРОВКА (admin) =====
router.patch('/:id/toggle-active', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, full_name, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Пайдаланушы табылмады' });
    res.json({ message: result.rows[0].is_active ? 'Белсендірілді' : 'Блокталды', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
