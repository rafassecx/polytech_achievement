const codes = new Map();

const generateCode = (user_id) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = Date.now() + 10 * 60 * 1000;
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
  codes.delete(code);
  return entry.user_id;
};

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of codes.entries()) {
    if (now > entry.expires_at) codes.delete(code);
  }
}, 60 * 1000);

module.exports = { generateCode, consumeCode };