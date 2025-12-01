const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware для захисту від доступу не-організаторів
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   GET /api/events/public
// @desc    Отримати опубліковані події для календаря (Модуль 1)
router.get('/public', async (req, res) => {
    try {
        // Отримуємо лише ті події, де is_published = TRUE
        const result = await db.query(
            'SELECT * FROM events WHERE is_published = TRUE ORDER BY start_datetime ASC'
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка в /api/events/public:', err);
        res.status(500).json({ message: 'Помилка сервера при отриманні публічних подій' });
    }
});

// @route   POST /api/events
// @desc    Створення нової події (Модуль 1.1)
router.post('/', organizerProtect, async (req, res) => {
    const { title, category, start_datetime, end_datetime, description, location_name, is_published } = req.body;
    
    // Оскільки ми захистили цей маршрут, req.user містить ID організатора
    const organizerId = req.user.user_id;

    const queryText = `
        INSERT INTO events (title, category, start_datetime, end_datetime, description, location_name, organizer_id, is_published) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
    `;
    const queryValues = [
        title, 
        category || 'Social', 
        start_datetime, 
        end_datetime, 
        description, 
        location_name, 
        organizerId, // <-- ID організатора з токена
        is_published === undefined ? true : is_published
    ];

    try {
        const result = await db.query(queryText, queryValues);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Помилка в POST /api/events:', err);
        res.status(500).json({ message: 'Помилка при створенні події' });
    }
});

// @route   GET /api/events
// @desc    Отримати всі події, створені користувачем (для Адмін-Панелі)
router.get('/', organizerProtect, async (req, res) => {
    const organizerId = req.user.user_id;
    try {
        // Отримуємо лише події, створені цим організатором
        const result = await db.query(
            'SELECT * FROM events WHERE organizer_id = $1 ORDER BY start_datetime DESC',
            [organizerId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка при отриманні подій організатора:', err);
        res.status(500).json({ message: 'Помилка сервера при отриманні подій організатора' });
    }
});

// @route   POST /api/events/volunteer-guest
// @desc    Запис волонтера-гостя (без реєстрації)
router.post('/volunteer-guest', async (req, res) => {
    const { event_id, name, whatsapp, uk_phone } = req.body;

    // Проста валідація
    if (!event_id || !name || !whatsapp) {
        return res.status(400).json({ message: 'Будь ласка, вкажіть ім\'я та WhatsApp.' });
    }

    try {
        // Записуємо гостя
        const queryText = `
            INSERT INTO volunteer_signups (event_id, guest_name, guest_whatsapp, guest_uk_phone, user_id)
            VALUES ($1, $2, $3, $4, NULL)
            RETURNING *
        `;
        // user_id передаємо як NULL
        await db.query(queryText, [event_id, name, whatsapp, uk_phone]);
        
        res.status(201).json({ message: 'Ви успішно записалися як гість!' });
    } catch (err) {
        console.error('Помилка запису гостя:', err);
        res.status(500).json({ message: 'Помилка сервера. Спробуйте пізніше.' });
    }
});

module.exports = router;