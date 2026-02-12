const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware: Доступ тільки для Адмінів та Організаторів
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   GET /api/events/public
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

// @route   GET /api/events/:id/details (ДЛЯ СТАТИСТИКИ)
router.get('/:id/details', organizerProtect, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Учасники
        const attendees = await db.query(`SELECT * FROM event_registrations WHERE event_id = $1 ORDER BY created_at DESC`, [id]);
        
        // 2. Волонтери (з деталями)
        const volunteers = await db.query(`
            SELECT vs.*, t.title as task_title 
            FROM volunteer_signups vs
            JOIN tasks t ON vs.task_id = t.task_id
            WHERE t.event_id = $1
        `, [id]);

        // 3. Завдання (Tasks) - ВИПРАВЛЕНО НАЗВУ ТАБЛИЦІ tasks
        const tasks = await db.query(`
            SELECT 
                t.*,
                COALESCE(s.signed_up_count, 0) AS signed_up_volunteers
            FROM tasks t
            LEFT JOIN (
                SELECT task_id, COUNT(*) AS signed_up_count
                FROM volunteer_signups
                GROUP BY task_id
            ) s ON s.task_id = t.task_id
            WHERE t.event_id = $1
            ORDER BY t.title ASC
        `, [id]);

        res.json({
            attendees: attendees.rows,
            volunteers: volunteers.rows,
            tasks: tasks.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/events/register
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
        const result = await db.query(query, [event_id, name || 'Unknown', contact, adults || 1, children || 0, comment || '', user_id || null]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Помилка реєстрації.' });
    }
});

// @route   POST /api/events
router.post('/', organizerProtect, async (req, res) => {
    const { title, category, start_datetime, end_datetime, description, location_name, is_published } = req.body;
    const organizerId = req.user.user_id;

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

// @route   GET /api/events
router.get('/', organizerProtect, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM events ORDER BY start_datetime DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка отримання подій:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/events/:id
router.delete('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    try {
        // Видалення без перевірки авторства (Командний режим)
        await db.query('DELETE FROM volunteer_signups WHERE task_id IN (SELECT task_id FROM tasks WHERE event_id = $1)', [eventId]);
        await db.query('DELETE FROM tasks WHERE event_id = $1', [eventId]);
        await db.query('DELETE FROM events WHERE event_id = $1', [eventId]);
        res.json({ message: 'Подію успішно видалено' });
    } catch (err) {
        console.error('Помилка видалення події:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/events/:id
router.put('/:id', organizerProtect, async (req, res) => {
    const eventId = req.params.id;
    const { title, category, start_datetime, end_datetime, description, location_name } = req.body;

    try {
        // Редагування без перевірки авторства (Командний режим)
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

// @route   GET /api/events/stats/global (ГЛОБАЛЬНА СТАТИСТИКА)
router.get('/stats/global', organizerProtect, async (req, res) => {
    try {
        const stats = {};
        const eventsCount = await db.query('SELECT COUNT(*) FROM events');
        stats.total_events = eventsCount.rows[0].count;

        const volCount = await db.query('SELECT COUNT(DISTINCT guest_whatsapp) FROM volunteer_signups');
        stats.unique_volunteers = volCount.rows[0].count;

        const regCount = await db.query('SELECT SUM(adults_count + children_count) as total_people FROM event_registrations');
        stats.total_attendees = regCount.rows[0].total_people || 0;

        const futureEvents = await db.query('SELECT COUNT(*) FROM events WHERE start_datetime > NOW()');
        stats.future_events = futureEvents.rows[0].count;

        res.json(stats);
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ message: 'Error calculating stats' });
    }
});

module.exports = router;