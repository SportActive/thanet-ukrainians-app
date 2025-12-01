const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  // Налаштування для Railway, щоб не відхиляло SSL-сертифікати
  // Ми залишаємо це, щоб уникнути проблем із самопідписаними сертифікатами SSL на Railway
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Додаємо обробку помилок лише для пулу, щоб помилка не вилітала в продакшені
pool.on('error', (err) => {
  console.error('Неочікувана помилка в пулі бази даних:', err);
  // Не завершуємо процес, щоб інші клієнти могли працювати
});

module.exports = {
  // Функція для виконання запитів
  query: (text, params) => pool.query(text, params),
};