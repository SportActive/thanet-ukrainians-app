const { Pool } = require('pg');
const dotenv = require('dotenv');

// Завантажуємо змінні, якщо ми локально
dotenv.config();

const pool = new Pool({
    // Railway автоматично надає DATABASE_URL
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Це важливо для підключення до Railway Postgres
    }
});

// Перевірка підключення при запуску
pool.connect()
    .then(() => console.log('✅ Успішне підключення до PostgreSQL на Railway'))
    .catch(err => console.error('❌ Помилка підключення до БД:', err.message));

module.exports = {
    query: (text, params) => pool.query(text, params),
};