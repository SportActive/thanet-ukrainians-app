const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware: Доступ тільки для Адмінів та Організаторів
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   GET /api/events
// @desc    Отримати ВСІ події (для адмінки)
router.get('/', organizerProtect, async (req, res) => {
    try {
        // Забираємо всі події, відсортовані за датою
        const result = await db.query('SELECT * FROM events ORDER BY start_datetime DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка отримання подій:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/events/public
// @desc    Отримати тільки ПУБЛІЧНІ події (для календаря на сайті)
router.get('/public', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM events WHERE is_published = TRUE ORDER BY start_datetime ASC'
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка в /api/events/public:', err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// @route   GET /api/events/:id/details
// @desc    Детальна інфо про подію + список волонтерів і гостей (Для Адмінки)
router.get('/:id/details', organizerProtect, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Подія
        const eventRes = await db.query('SELECT * FROM events WHERE event_id = $1', [id]);
        if (eventRes.rows.length === 0) return res.status(404).json({ message: 'Подію не знайдено' });

        // 2. Гості (реєстрації)
        const attendeesRes = await db.query(
            'SELECT * FROM event_registrations WHERE event_id = $1 ORDER BY created_at DESC', 
            [id]
        );

        // 3. Завдання (Tasks)
        const tasksRes = await db.query('SELECT * FROM volunteer_tasks WHERE event_id = $1', [id]);

        // 4. Волонтери (Signups)
        const volunteersRes = await db.query(`
            SELECT vs.*, vt.title as task_title 
            FROM volunteer_signups vs
            JOIN volunteer_tasks vt ON vs.task_id = vt.task_id
            WHERE vt.event_id = $1
        `, [id]);

        res.json({
            event: eventRes.rows[0],
            attendees: attendeesRes.rows,
            tasks: tasksRes.rows,
            volunteers: volunteersRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/events/register
// @desc    Публічна реєстрація відвідувача
router.post('/register', async (req, res) => {
    const { event_id, name, contact, adults, children, comment, user_id } = req.body;

    if (!event_id || (!name && !user_id) || !contact) {
        return res.status(400).json({ message: 'Обов\'язкові поля: подія, ім\'я та контакт.' });
    }

    try {
        const query = `
            INSERT INTO event_registrations 
            (event_id, guest_name, guest_contact, adults_count, children_count, comment, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const values = [
            event_id, 
            name || 'Unknown', 
            contact, 
            adults || 1, 
            children || 0, 
            comment || '', 
            user_id || null
        ];
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Помилка реєстрації.' });
    }
});

// @route   POST /api/events
// @desc    Створити подію
router.post('/', organizerProtect, async (req, res) => {
    const { title, category, start_datetime, end_datetime, description, location_name, is_published } = req.body;
    const organizerId = req.user.user_id; // Беремо ID того, хто створює

    try {
        const result = await db.query(
            `INSERT INTO events (title, category, start_datetime, end_datetime, description, location_name, organizer_id, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [title, category, start_datetime, end_datetime, description, location_name, organizerId, is_published]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Помилка створення події:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/events/:id
// @desc    Видалити подію (Дозволено будь-якому Організатору)
router.delete('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;

    try {
        // ВИДАЛЕНО ПЕРЕВІРКУ НА АВТОРСТВО. Тепер будь-який Organizer може видаляти.
        
        await db.query('DELETE FROM events WHERE event_id = $1', [eventId]);
        res.json({ message: 'Подію успішно видалено' });
    } catch (err) {
        console.error('Помилка видалення події:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/events/:id
// @desc    Редагувати подію (Дозволено будь-якому Організатору)
router.put('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    const { title, category, start_datetime, end_datetime, description, location_name } = req.body;

    try {
        // Перевіряємо, чи існує подія
        const eventCheck = await db.query('SELECT organizer_id FROM events WHERE event_id = $1', [eventId]);
        if (eventCheck.rows.length === 0) return res.status(404).json({ message: 'Подію не знайдено' });

        // ВИДАЛЕНО ПЕРЕВІРКУ НА АВТОРСТВО. Тепер будь-який Organizer може редагувати.

        const queryText = `
            UPDATE events 
            SET title=$1, category=$2, start_datetime=$3, end_datetime=$4, description=$5, location_name=$6
            WHERE event_id=$7
            RETURNING *
        `;
        const result = await db.query(queryText, [title, category, start_datetime, end_datetime, description, location_name, eventId]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Помилка редагування:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;