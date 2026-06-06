const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const achievementRoutes = require('./routes/achievements');
const uploadRoutes = require('./routes/upload');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');
const userRoutes = require('./routes/users');
const botRoutes = require('./routes/bot');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const statsRoutes = require('./routes/stats');
const friendRoutes = require('./routes/friends');
const bookmarkRoutes = require('./routes/bookmarks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Статическая раздача загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Главная страница API
app.get('/', (req, res) => {
  res.json({ 
    message: 'Сервер работает! 🎉',
    project: 'Студенттердің жетістіктерін басқару жүйесі'
  });
});

// Проверка здоровья базы данных
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
});

// Production: фронтенд статикасын раздаём
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  // SPA роутинг — барлық API емес сұраныстарды index.html-ге жіберу
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Auto-run SQL migration for social features tables
  try {
    const migPath = path.join(__dirname, '..', 'add_social_features.sql');
    if (fs.existsSync(migPath)) {
      const sql = fs.readFileSync(migPath, 'utf8');
      await pool.query(sql);
      console.log('Migration: social tables OK');
    }
  } catch (e) {
    console.log('Migration note:', e.message);
  }
});