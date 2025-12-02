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
// @route   DELETE /api/events/:id
// @desc    Видалити подію (Тільки Адмін або Власник)
router.delete('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    try {
        // 1. Перевірка прав (чи це подія цього організатора?)
        const eventCheck = await db.query('SELECT organizer_id FROM events WHERE event_id = $1', [eventId]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Подію не знайдено' });
        }

        if (userRole !== 'Admin' && eventCheck.rows[0].organizer_id !== userId) {
            return res.status(403).json({ message: 'Ви не маєте прав видаляти цю подію' });
        }

        // 2. Видалення (спочатку завдання, потім подія - або налаштуйте CASCADE в SQL)
        await db.query('DELETE FROM volunteer_signups WHERE task_id IN (SELECT task_id FROM tasks WHERE event_id = $1)', [eventId]);
        await db.query('DELETE FROM tasks WHERE event_id = $1', [eventId]); // Видаляємо завдання події
        await db.query('DELETE FROM events WHERE event_id = $1', [eventId]); // Видаляємо подію

        res.json({ message: 'Подію успішно видалено' });
    } catch (err) {
        console.error('Помилка видалення події:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/events/:id
// @desc    Оновити подію
router.put('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    const { title, category, start_datetime, end_datetime, description, location_name } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    try {
        const eventCheck = await db.query('SELECT organizer_id FROM events WHERE event_id = $1', [eventId]);
        if (eventCheck.rows.length === 0) return res.status(404).json({ message: 'Подію не знайдено' });

        if (userRole !== 'Admin' && eventCheck.rows[0].organizer_id !== userId) {
            return res.status(403).json({ message: 'Немає прав на редагування' });
        }

        const queryText = `
            UPDATE events 
            SET title=$1, category=$2, start_datetime=$3, end_datetime=$4, description=$5, location_name=$6
            WHERE event_id=$7
            RETURNING *
        `;
        const result = await db.query(queryText, [title, category, start_datetime, end_datetime, description, location_name, eventId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Помилка оновлення події:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;