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
const { answerCallback, editMessageText } = require('./utils/notifications');

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

// Telegram webhook — принимает callback_query от inline-кнопок
app.post('/api/tg-hook', async (req, res) => {
  res.sendStatus(200); // сразу отвечаем Telegram'у

  const update = req.body;
  const cbq = update?.callback_query;
  if (!cbq) return;

  const { id: callbackId, data, from, message } = cbq;
  if (!data || !data.startsWith('fa_')) return;

  const [, action, friendshipIdStr] = data.split('_');
  const friendshipId = parseInt(friendshipIdStr);
  if (isNaN(friendshipId)) {
    await answerCallback(callbackId, 'Қате');
    return;
  }

  try {
    // Кто нажал кнопку — находим по telegram_id
    const userRes = await pool.query(
      'SELECT id, full_name FROM users WHERE telegram_id = $1',
      [String(from.id)]
    );
    if (userRes.rows.length === 0) {
      await answerCallback(callbackId, 'Пайдаланушы табылмады');
      return;
    }
    const me = userRes.rows[0];

    if (action === 'accept') {
      const upd = await pool.query(`
        UPDATE friendships SET status = 'accepted'
        WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
        RETURNING requester_id
      `, [friendshipId, me.id]);

      if (upd.rows.length === 0) {
        await answerCallback(callbackId, 'Сұрау табылмады немесе бұрын өңделді');
        return;
      }

      await answerCallback(callbackId, '✅ Достық қабылданды!');
      await editMessageText(
        from.id,
        message.message_id,
        `✅ <b>${me.full_name}</b> достық сұрауын қабылдады`
      );
    } else if (action === 'reject') {
      await pool.query(
        `DELETE FROM friendships WHERE id = $1 AND (addressee_id = $2 OR requester_id = $2)`,
        [friendshipId, me.id]
      );
      await answerCallback(callbackId, 'Бас тартылды');
      await editMessageText(
        from.id,
        message.message_id,
        `❌ Достық сұрауы бас тартылды`
      );
    }
  } catch (err) {
    console.error('tg-hook error:', err.message);
    await answerCallback(callbackId, 'Сервер қатесі');
  }
});

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

// Обработчик одного Telegram update (callback_query от inline-кнопок)
async function handleTelegramUpdate(update) {
  const cbq = update?.callback_query;
  if (!cbq) return;

  const { id: callbackId, data, from, message } = cbq;
  if (!data || !data.startsWith('fa_')) return;

  const [, action, friendshipIdStr] = data.split('_');
  const friendshipId = parseInt(friendshipIdStr);
  if (isNaN(friendshipId)) {
    await answerCallback(callbackId, 'Қате');
    return;
  }

  try {
    const userRes = await pool.query(
      'SELECT id, full_name FROM users WHERE telegram_id = $1',
      [String(from.id)]
    );
    if (userRes.rows.length === 0) {
      await answerCallback(callbackId, 'Пайдаланушы табылмады');
      return;
    }
    const me = userRes.rows[0];

    if (action === 'accept') {
      const upd = await pool.query(`
        UPDATE friendships SET status = 'accepted'
        WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
        RETURNING requester_id
      `, [friendshipId, me.id]);

      if (upd.rows.length === 0) {
        await answerCallback(callbackId, 'Бұрын өңделді');
        return;
      }
      await answerCallback(callbackId, '✅ Достық қабылданды!');
      await editMessageText(from.id, message.message_id,
        `✅ <b>${me.full_name}</b> достық сұрауын қабылдады`);

    } else if (action === 'reject') {
      await pool.query(
        `DELETE FROM friendships WHERE id = $1 AND (addressee_id = $2 OR requester_id = $2)`,
        [friendshipId, me.id]
      );
      await answerCallback(callbackId, 'Бас тартылды');
      await editMessageText(from.id, message.message_id,
        `❌ Достық сұрауы бас тартылды`);
    }
  } catch (err) {
    console.error('tg callback error:', err.message);
  }
}

// Telegram message-reply өңдеу (ForceReply жауаптары)
async function handleTelegramMessage(msg) {
  // Тек reply-хабарламалар ғана бізге қажет
  if (!msg.reply_to_message || !msg.text) return;

  const replyToId = msg.reply_to_message.message_id;
  const chatId = msg.chat.id;

  try {
    // Контексті табамыз
    const ctx = await pool.query(
      'SELECT app_sender_id, app_receiver_id FROM tg_reply_context WHERE tg_message_id = $1 AND tg_chat_id = $2',
      [replyToId, chatId]
    );
    if (ctx.rows.length === 0) return;

    const { app_sender_id, app_receiver_id } = ctx.rows[0];

    // Кім жазып жатыр — оның app id-ін Telegram id арқылы табамыз
    const userRes = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [String(msg.from.id)]
    );
    if (userRes.rows.length === 0) return;
    const replyUserId = userRes.rows[0].id;

    // Жауапты кімге жіберу керек: контексттегі app_sender_id (хабарлама жіберген адам)
    const toUserId = String(replyUserId) === String(app_receiver_id) ? app_sender_id : app_receiver_id;

    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)`,
      [replyUserId, toUserId, msg.text.trim()]
    );

    // Контексті жойып тастаймыз (бір рет қолданылады)
    await pool.query(
      'DELETE FROM tg_reply_context WHERE tg_message_id = $1 AND tg_chat_id = $2',
      [replyToId, chatId]
    );
  } catch (err) {
    console.error('tg message reply error:', err.message);
  }
}

// Polling — домен болмаса да жұмыс істейді
async function startPolling() {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return;

  // Егер webhook орнатылған болса алдымен жойу керек
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  } catch { /* тыныш */ }

  let offset = 0;
  console.log('Telegram polling started');

  const poll = async () => {
    try {
      const allowed = JSON.stringify(['callback_query', 'message']);
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(allowed)}`,
        { signal: AbortSignal.timeout(30000) }
      );
      if (!res.ok) { setTimeout(poll, 5000); return; }
      const { ok, result } = await res.json();
      if (ok && result.length > 0) {
        for (const update of result) {
          offset = update.update_id + 1;
          if (update.callback_query) {
            handleTelegramUpdate(update).catch(() => {});
          } else if (update.message) {
            handleTelegramMessage(update.message).catch(() => {});
          }
        }
      }
    } catch { /* timeout немесе желі қатесі */ }
    poll();
  };

  poll();
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

  // Telegram polling — webhook орнатылмаса автоматты іске қосылады
  startPolling();
});