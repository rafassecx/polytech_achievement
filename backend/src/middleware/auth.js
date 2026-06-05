const jwt = require('jsonwebtoken');

// Проверка JWT-токена
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Недействительный или просроченный токен' });
  }
};

// Проверка роли пользователя
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Недостаточно прав' });
    }
    next();
  };
};

// Проверка ключа бота (X-Bot-API-Key)
const botAuthMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-bot-api-key'];

  if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
    return res.status(401).json({ message: 'Неверный ключ бота' });
  }

  next();
};

module.exports = { authMiddleware, checkRole, botAuthMiddleware };