const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: '../.env' }); 

const app = express();

// --- СПОЧАТКУ JSON MIDDLEWARE ---
app.use(express.json()); 

// --- ПОТІМ CORS ---
//const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

// СТАНЕ (Додамо масив дозволених адрес):
const allowedOrigins = [
    process.env.CLIENT_URL, 
    'https://alert-prosperity-production.up.railway.app', // Твій фронтенд "жорстко"
    'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    // Дозволяємо, якщо origin є в списку АБО якщо це серверний запит (без origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS заблоковано для: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  // ... решта коду без змін


// Логування для дебагу
app.use((req, res, next) => {
  console.log(`Запит від origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Дозволяємо запити без origin (Postman, curl) та від нашого фронтенду
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      console.log(`❌ CORS заблоковано для: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Явна обробка preflight
app.options('*', cors());

// Підключення маршрутів
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.send(`Server is running! Allowed Origin: ${allowedOrigin}`);
});

// Жорстко ставимо порт 8080 і слухаємо всі IP (0.0.0.0)
const HARD_PORT = 8080;

// --- ТЕСТОВИЙ МАРШРУТ (Ping) ---
app.get('/api/ping', (req, res) => {
    // 1. Цей рядок ми будемо шукати в логах Railway
    console.log('🔔 [PING] Отримано запит з браузера/фронтенду!'); 
    
    // 2. Відповідь для браузера
    res.json({ 
        message: 'PONG! Сервер живий і чує тебе.', 
        timestamp: new Date().toISOString() 
    });
});

app.listen(HARD_PORT, '0.0.0.0', () => {
  console.log(`!!! SERVER STARTED FORCEFULLY ON PORT ${HARD_PORT} !!!`);

});