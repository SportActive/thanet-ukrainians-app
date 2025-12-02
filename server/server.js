const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Завантаження змінних (для локального запуску)
dotenv.config({ path: '../.env' }); 

const app = express();

// --- 1. СПОЧАТКУ JSON ---
app.use(express.json()); 

// --- 2. НАЛАШТУВАННЯ CORS (ЄДИНЕ І ПРАВИЛЬНЕ) ---
const allowedOrigins = [
    process.env.CLIENT_URL,                            // Змінна з Railway
    'https://alert-prosperity-production.up.railway.app', // Твій новий фронтенд
    'http://localhost:5173',                           // Локальний фронтенд
    'http://localhost:8080'                            // Локальний бекенд
];

app.use(cors({
    origin: function (origin, callback) {
        // Дозволяємо, якщо origin є в списку, АБО якщо це серверний запит (без origin, як Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`❌ БЛОКУВАННЯ CORS. Запит прийшов від: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Явна обробка preflight запитів
app.options('*', cors());

// Логування запитів (щоб бачити в логах Railway, хто стукає)
app.use((req, res, next) => {
  console.log(`📥 Запит: ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
  next();
});

// --- 3. МАРШРУТИ ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);

// Головна сторінка (перевірка життя сервера)
app.get('/', (req, res) => {
  res.send(`Server is running! 🚀`);
});

// Ping endpoint
app.get('/api/ping', (req, res) => {
    res.json({ message: 'PONG! Сервер працює коректно.', timestamp: new Date() });
});

// --- 4. ЗАПУСК ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`!!! SERVER STARTED ON PORT ${PORT} !!!`);
});