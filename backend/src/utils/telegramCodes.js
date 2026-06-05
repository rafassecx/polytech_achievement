// Хранилище одноразовых кодов для привязки Telegram
// (в памяти; на проде заменить на Redis)

const codes = new Map(); // code -> { user_id, expires_at }

const generateCode = (user_id) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 цифр
  const expires_at = Date.now() + 10 * 60 * 1000; // 10 минут
  codes.set(code, { user_id, expires_at });
  return { code, expires_at: new Date(expires_at).toISOString() };
};

const consumeCode = (code) => {
  const entry = codes.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expires_at) {
    codes.delete(code);
    return null;
  }
  codes.delete(code); // одноразовый — сразу удаляем
  return entry.user_id;
};

// Каждую минуту чистим просроченные коды
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of codes.entries()) {
    if (now > entry.expires_at) codes.delete(code);
  }
}, 60 * 1000);

module.exports = { generateCode, consumeCode };