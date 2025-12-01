const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); 
const { protect, restrictTo } = require('../middleware/auth'); 

const router = express.Router();

const generateToken = (id, role, first_name) => {
    return jwt.sign({ user_id: id, role, first_name }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    // 1. Очікуємо нові поля
    const { first_name, last_name, email, password, whatsapp, uk_phone } = req.body;

    if (!first_name || !last_name || !email || !password || !whatsapp) {
        return res.status(400).json({ message: 'Ім\'я, Прізвище, Email, Пароль та WhatsApp є обов\'язковими!' });
    }

    try {
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Записуємо нові поля в базу
        const newUser = await db.query(
            'INSERT INTO users (first_name, last_name, email, password_hash, role, whatsapp, uk_phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [first_name, last_name, email, hashedPassword, 'User', whatsapp, uk_phone]
        );

        const user = newUser.rows[0];

        res.status(201).json({
            user_id: user.user_id,
            first_name: user.first_name,
            role: user.role,
            token: generateToken(user.user_id, user.role, user.first_name),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }

        res.json({
            user_id: user.user_id,
            first_name: user.first_name,
            role: user.role,
            token: generateToken(user.user_id, user.role, user.first_name),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/auth/users (Тільки Адмін)
router.get('/users', protect, restrictTo(['Admin']), async (req, res) => {
    try {
        // 3. Вибираємо whatsapp та uk_phone замість phone
        const result = await db.query('SELECT user_id, first_name, last_name, email, whatsapp, uk_phone, role FROM users ORDER BY user_id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Помилка отримання користувачів:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/auth/users/:id/role
router.put('/users/:id/role', protect, restrictTo(['Admin']), async (req, res) => {
    const { role } = req.body;
    const { id } = req.params;

    const validRoles = ['User', 'Organizer', 'Admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Недопустима роль' });
    }

    try {
        await db.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, id]);
        res.json({ message: `Роль користувача оновлено на ${role}` });
    } catch (err) {
        console.error('Помилка зміни ролі:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;