const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// --- ДОДАНІ ІМПОРТИ (ПЕРЕВІРТЕ ШЛЯХИ, ЯКЩО БУДЕ ПОМИЛКА) ---
const pool = require('./db'); // Підключення до бази даних
const bcrypt = require('bcrypt'); // Для шифрування паролів
const authenticateToken = require('./middleware/authorization'); // Для перевірки прав адміна
// -------------------------------------------------------------

// Завантаження змінних (для локального запуску)
dotenv.config({ path: '../.env' }); 

const app = express();

// --- 1. СПОЧАТКУ JSON ---
app.use(express.json()); 

// --- 2. НАЛАШТУВАННЯ CORS ---
const allowedOrigins = [
    process.env.CLIENT_URL,                            // Змінна з Railway
    'https://alert-prosperity-production.up.railway.app', // Твій фронтенд
    'http://localhost:5173',                           // Локальний фронтенд
    'http://localhost:8080'                            // Локальний бекенд
];

app.use(cors({
    origin: function (origin, callback) {
        // Дозволяємо, якщо origin є в списку, АБО якщо це серверний запит (без origin)
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

// Логування запитів
app.use((req, res, next) => {
  console.log(`📥 Запит: ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
  next();
});

// --- 3. МАРШРУТИ ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');
const newsRoutes = require('./routes/newsRoutes'); 

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);
app.use('/api/news', newsRoutes); 

// === НОВИЙ МАРШРУТ: СКИДАННЯ ПАРОЛЯ ===
app.post('/api/admin/reset-password', authenticateToken, async (req, res) => {
    // 1. Перевіряємо, чи це адмін
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Тільки адмін може це робити!" });
    }

    const { userId } = req.body;
    const tempPassword = '12345'; // <-- ЦЕ БУДЕ НОВИЙ ПАРОЛЬ

    try {
        // 2. Шифруємо пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // 3. Оновлюємо в базі даних
        // УВАГА: Переконайтесь, що таблиця називається 'users' і колонка 'password_hash'
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [hashedPassword, userId]
        );

        res.json({ success: true, message: `Пароль скинуто на: ${tempPassword}` });

    } catch (err) {
        console.error("Помилка скидання:", err);
        res.status(500).json({ message: "Помилка сервера при зміні пароля" });
    }
});
// =====================================

// Головна сторінка
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