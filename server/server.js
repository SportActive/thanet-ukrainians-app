const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs'); // Використовуємо правильну бібліотеку
const jwt = require('jsonwebtoken'); 

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

// --- 2. MIDDLEWARE (ПЕРЕВІРКА ТОКЕНА) ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- 3. НАЛАШТУВАННЯ ---
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

// --- 4. МАРШРУТИ АВТОРИЗАЦІЇ (ВБУДОВАНІ, ЩОБ ПОЛАГОДИТИ ВХІД) ---

// А. РЕЄСТРАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        // Отримуємо дані від користувача
        const { first_name, last_name, email, password, whatsapp, uk_phone } = req.body;

        // 1. Перевіряємо, чи такий email вже є
        const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(401).json({ message: "Користувач із таким email вже існує!" });
        }

        // 2. Шифруємо пароль (використовуємо bcryptjs)
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Записуємо в базу
        const newUser = await pool.query(
            "INSERT INTO users (first_name, last_name, email, password_hash, whatsapp, uk_phone, role) VALUES ($1, $2, $3, $4, $5, $6, 'User') RETURNING *",
            [first_name, last_name, email, bcryptPassword, whatsapp, uk_phone]
        );

        // 4. Генеруємо токен для автоматичного входу
        const token = jwt.sign(
            { user_id: newUser.rows[0].user_id, role: newUser.rows[0].role, first_name: newUser.rows[0].first_name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ token, role: newUser.rows[0].role });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error during Register");
    }
});

// Б. ВХІД (LOGIN)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Шукаємо користувача
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Невірний Email або пароль" });
        }

        // 2. Перевіряємо пароль (використовуємо bcryptjs)
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: "Невірний Email або пароль" });
        }

        // 3. Генеруємо токен
        const token = jwt.sign(
            { 
                user_id: user.rows[0].user_id, 
                role: user.rows[0].role, 
                first_name: user.rows[0].first_name,
                whatsapp: user.rows[0].whatsapp 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, role: user.rows[0].role });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error during Login");
    }
});

// В. ОТРИМАННЯ ДАНИХ КОРИСТУВАЧА (VERIFY)
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        res.json(true);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Г. ОТРИМАННЯ ВСІХ КОРИСТУВАЧІВ (ДЛЯ АДМІНА)
app.get('/api/auth/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).send('Access Denied');
    try {
        const users = await pool.query("SELECT user_id, first_name, last_name, email, role, whatsapp, uk_phone FROM users ORDER BY user_id DESC");
        res.json(users.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Д. ЗМІНА РОЛІ (ДЛЯ АДМІНА)
app.put('/api/auth/users/:id/role', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).send('Access Denied');
    try {
        const { id } = req.params;
        const { role } = req.body;
        await pool.query("UPDATE users SET role = $1 WHERE user_id = $2", [role, id]);
        res.json("Role updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// --- 5. ІНШІ МАРШРУТИ ---
// Ми тимчасово відключаємо authRoutes, бо він зламаний. Всі функції вище.
// const authRoutes = require('./routes/authRoutes'); 
// app.use('/api/auth', authRoutes); 

const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');
const newsRoutes = require('./routes/newsRoutes'); 

// УВАГА: Якщо ці файли (eventRoutes і т.д.) вимагають db.js, вони можуть видавати помилку.
// Але вхід має запрацювати.
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);
app.use('/api/news', newsRoutes); 

// --- 6. ЗМІНА ПАРОЛЯ ---
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Введіть старий та новий паролі" });
    }

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        const user = userRes.rows[0];

        if (!user) return res.status(404).json({ message: "Користувача не знайдено" });

        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: "Старий пароль неправильний!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hashedPassword, userId]);
        res.json({ success: true, message: "Пароль успішно змінено!" });

    } catch (err) {
        console.error("Помилка зміни пароля:", err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// --- 7. СКИНДАННЯ ПАРОЛЯ (АДМІН) ---
app.post('/api/admin/reset-password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Тільки Admin може це робити!" });
    }

    const { userId } = req.body;
    const tempPassword = '12345'; 

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hashedPassword, userId]);
        res.json({ success: true, message: `Пароль успішно скинуто на: ${tempPassword}` });

    } catch (err) {
        console.error("Помилка скидання пароля:", err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// --- 8. ЗАПУСК ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER STARTED ON PORT ${PORT}`);
});