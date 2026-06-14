const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, group_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, пароль и ФИО обязательны' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть минимум 6 символов' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // роль student — admin/curator назначает отдельно
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, group_name, role) 
       VALUES ($1, $2, $3, $4, 'student') 
       RETURNING id, email, full_name, role, group_name, created_at`,
      [email, password_hash, full_name, group_name || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ message: 'Регистрация успешна', user, token });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Аккаунт заблокирован' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    delete user.password_hash;
    res.json({ message: 'Вход выполнен', user, token });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, group_name, avatar_url, bio, 
              telegram_id, telegram_username, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;