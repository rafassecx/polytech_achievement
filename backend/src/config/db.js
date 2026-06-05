const { Pool } = require('pg');
require('dotenv').config();

// Railway даёт DATABASE_URL, локалда жеке параметрлер
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on('connect', () => {
  console.log('✅ База данных подключена');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка базы данных:', err);
});

module.exports = pool;