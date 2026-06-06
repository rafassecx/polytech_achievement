const pool = require('../config/db');

const BOT_TOKEN = process.env.BOT_TOKEN;

// Отправить сообщение в Telegram (если есть BOT_TOKEN и telegram_id)
const sendTelegramMessage = async (telegramId, text) => {
  if (!BOT_TOKEN || !telegramId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('Telegram push failed:', body.slice(0, 200));
    }
  } catch (err) {
    console.warn('Telegram push error:', err.message);
  }
};

// Создать уведомление в БД + опционально продублировать в Telegram
const createNotification = async ({
  user_id,
  type,
  title,
  message,
  related_id = null,
  send_telegram = true,
}) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, type, title, message, related_id]
    );

    if (send_telegram) {
      const result = await pool.query(
        'SELECT telegram_id FROM users WHERE id = $1',
        [user_id]
      );
      const telegramId = result.rows[0]?.telegram_id;
      if (telegramId) {
        const tgText = `<b>${title}</b>\n${message}`;
        // не ждём (fire and forget)
        sendTelegramMessage(telegramId, tgText).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Ошибка создания уведомления:', err);
  }
};

// Уведомить всех кураторов и админов (для нового pending)
const notifyAllCurators = async ({ achievement_id, title, author_name }) => {
  try {
    const result = await pool.query(
      `SELECT id FROM users WHERE role IN ('curator', 'admin') AND is_active = TRUE`
    );
    for (const c of result.rows) {
      createNotification({
        user_id: c.id,
        type: 'new_pending',
        title: 'Жаңа модерация',
        message: `${author_name} жаңа жетістік қосты: "${title}"`,
        related_id: achievement_id,
        send_telegram: false, // не спамим Telegram'ом
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Ошибка уведомления кураторов:', err);
  }
};

// Отправить DM-уведомление с ForceReply и сохранить контекст для ответа
const sendTelegramForceReply = async (telegramId, text, { appSenderId, appReceiverId }) => {
  if (!BOT_TOKEN || !telegramId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true },
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok) return;

    // Контекстті сақтаймыз: кімнің хабарламасы, кімге жіберілді
    const msgId = data.result.message_id;
    const chatId = data.result.chat.id;
    await pool.query(
      `INSERT INTO tg_reply_context (tg_message_id, tg_chat_id, app_sender_id, app_receiver_id)
       VALUES ($1, $2, $3, $4)`,
      [msgId, chatId, appSenderId, appReceiverId]
    );
  } catch (err) {
    console.warn('sendTelegramForceReply error:', err.message);
  }
};

// Отправить Telegram-сообщение с inline-кнопками
const sendTelegramWithButtons = async (telegramId, text, buttons) => {
  if (!BOT_TOKEN || !telegramId) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? data.result : null;
  } catch {
    return null;
  }
};

// Ответить на callback_query (убрать "часики" у кнопки)
const answerCallback = async (callbackQueryId, text = '') => {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch { /* тыныш */ }
};

// Отредактировать текст уже отправленного сообщения
const editMessageText = async (chatId, messageId, text) => {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch { /* тыныш */ }
};

module.exports = {
  createNotification,
  notifyAllCurators,
  sendTelegramMessage,
  sendTelegramWithButtons,
  sendTelegramForceReply,
  answerCallback,
  editMessageText,
};