const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware для захисту від доступу не-організаторів (тільки Admin або Organizer)
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   GET /api/events/public
// @desc    Отримати опубліковані події для календаря (доступно всім)
router.get('/public', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM events WHERE is_published = TRUE ORDER BY start_datetime ASC'
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка в /api/events/public:', err);
        res.status(500).json({ message: 'Помилка сервера при отриманні подій' });
    }
});

// @route   POST /api/events/register
// @desc    Реєстрація звичайного УЧАСНИКА (не волонтера) на подію
router.post('/register', async (req, res) => {
    const { event_id, name, contact, adults, children, comment, user_id } = req.body;

    // Перевірка обов'язкових полів
    if (!event_id || (!name && !user_id) || !contact) {
        return res.status(400).json({ message: 'Обов\'язкові поля: подія, ім\'я та контакт.' });
    }

    try {
        const query = `
            INSERT INTO event_registrations 
            (event_id, guest_name, guest_contact, adults_count, children_count, comment, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        // Якщо user_id не передано, записуємо NULL
        await db.query(query, [event_id, name, contact, adults || 1, children || 0, comment || '', user_id || null]);
        
        res.status(201).json({ message: 'Ви успішно зареєструвались на подію!' });
    } catch (err) {
        console.error("Event registration error:", err);
        res.status(500).json({ message: 'Помилка реєстрації.' });
    }
});

// @route   GET /api/events/stats/global
// @desc    Глобальна статистика для Адмін-панелі
router.get('/stats/global', organizerProtect, async (req, res) => {
    try {
        const stats = {};

        // 1. Всього подій
        const eventsCount = await db.query('SELECT COUNT(*) FROM events');
        stats.total_events = eventsCount.rows[0].count;

        // 2. Всього унікальних волонтерів (рахуємо по унікальних номерах телефонів)
        const volCount = await db.query('SELECT COUNT(DISTINCT guest_whatsapp) FROM volunteer_signups');
        stats.unique_volunteers = volCount.rows[0].count;

        // 3. Всього людей (сума дорослих та дітей з реєстрацій)
        const regCount = await db.query('SELECT SUM(adults_count + children_count) as total_people FROM event_registrations');
        stats.total_attendees = regCount.rows[0].total_people || 0;

        // 4. Майбутні події (активні)
        const futureEvents = await db.query('SELECT COUNT(*) FROM events WHERE start_datetime > NOW()');
        stats.future_events = futureEvents.rows[0].count;

        res.json(stats);
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ message: 'Error calculating stats' });
    }
});

// @route   GET /api/events/:id/details
// @desc    Отримати списки учасників та волонтерів для конкретної події
router.get('/:id/details', organizerProtect, async (req, res) => {
    const { id } = req.params;
    try {
        // Отримуємо список звичайних учасників
        const attendees = await db.query(`
            SELECT * FROM event_registrations WHERE event_id = $1 ORDER BY created_at DESC
        `, [id]);

        // Отримуємо список волонтерів (об'єднуємо з таблицею завдань, щоб бачити, що вони роблять)
        const volunteers = await db.query(`
            SELECT vs.*, t.title as task_title 
            FROM volunteer_signups vs
            JOIN tasks t ON vs.task_id = t.task_id
            WHERE t.event_id = $1
        `, [id]);

        res.json({
            attendees: attendees.rows,
            volunteers: volunteers.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/events
// @desc    Створення нової події
router.post('/', organizerProtect, async (req, res) => {
    const { title, category, start_datetime, end_datetime, description, location_name, is_published } = req.body;
    
    // ID організатора беремо з токена
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
        organizerId, 
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
// @desc    Отримати події організатора (для адмінки)
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
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// @route   DELETE /api/events/:id
// @desc    Видалити подію
router.delete('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    try {
        // 1. Перевірка прав
        const eventCheck = await db.query('SELECT organizer_id FROM events WHERE event_id = $1', [eventId]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Подію не знайдено' });
        }

        if (userRole !== 'Admin' && eventCheck.rows[0].organizer_id !== userId) {
            return res.status(403).json({ message: 'Ви не маєте прав видаляти цю подію' });
        }

        // 2. Видалення (спочатку пов'язані дані)
        // Видаляємо волонтерів на завданнях цієї події
        await db.query('DELETE FROM volunteer_signups WHERE task_id IN (SELECT task_id FROM tasks WHERE event_id = $1)', [eventId]);
        // Видаляємо завдання
        await db.query('DELETE FROM tasks WHERE event_id = $1', [eventId]); 
        // Видаляємо саму подію (registrations видаляться автоматично через CASCADE в SQL, але якщо ні - база видасть помилку, тому можна додати явне видалення)
        // await db.query('DELETE FROM event_registrations WHERE event_id = $1', [eventId]); // Опціонально, якщо CASCADE працює
        
        await db.query('DELETE FROM events WHERE event_id = $1', [eventId]); 

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