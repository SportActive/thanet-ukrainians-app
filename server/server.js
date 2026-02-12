const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs'); // <--- ЗМІНА ТУТ (було 'bcrypt')

// Якщо знову буде помилка про authorization, закоментуйте рядок нижче
const authenticateToken = require('./middleware/authorization');

// Завантаження змінних
dotenv.config({ path: '../.env' }); 

const app = express();

// --- 1. ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- 2. НАЛАШТУВАННЯ ---
app.use(express.json()); 

const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://thanet-ukrainians-app.up.railway.app',
    'https://alert-prosperity-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`⚠️ CORS Warning: ${origin}`);
            callback(null, true); 
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- 3. МАРШРУТИ ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');
const newsRoutes = require('./routes/newsRoutes'); 

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);
app.use('/api/news', newsRoutes); 

// --- 4. СКИНДАННЯ ПАРОЛЯ (Працює так само) ---
app.post('/api/admin/reset-password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Тільки Admin може це робити!" });
    }

    const { userId } = req.body;
    const tempPassword = '12345'; 

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [hashedPassword, userId]
        );

        res.json({ success: true, message: `Пароль успішно скинуто на: ${tempPassword}` });

    } catch (err) {
        console.error("Помилка скидання пароля:", err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// --- 5. ЗАПУСК ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER STARTED ON PORT ${PORT}`);
});