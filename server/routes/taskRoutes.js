const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware для захисту від доступу не-організаторів (Admin/Organizer)
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   POST /api/tasks
// @desc    Створити нове завдання для події
router.post('/', organizerProtect, async (req, res) => {
    try {
        const { event_id, title, description, required_volunteers, deadline_time } = req.body;
        
        // Примусове перетворення даних
        const finalEventId = parseInt(event_id);
        const finalVolunteers = parseInt(required_volunteers);
        const finalDeadline = deadline_time || null;
        
        // Валідація
        if (isNaN(finalEventId) || finalEventId <= 0 || !title || isNaN(finalVolunteers) || finalVolunteers <= 0) {
            return res.status(400).json({ message: 'Обов\'язкові поля мають бути коректними.' });
        }

        // Перевірка існування події
        const eventCheck = await db.query('SELECT event_id FROM events WHERE event_id = $1', [finalEventId]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Помилка: Вибрана подія не знайдена.' });
        }
        
        // Вставка завдання
        const queryText = `
            INSERT INTO tasks (event_id, title, description, required_volunteers, deadline_time, status) 
            VALUES ($1, $2, $3, $4, $5, 'Open') 
            RETURNING *
        `;
        const result = await db.query(queryText, [finalEventId, title, description, finalVolunteers, finalDeadline]);
        result.rows[0].signed_up_volunteers = 0; 
        
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error('API/TASK Error:', err.message); 
        res.status(500).json({ message: `Server error: ${err.message}` });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Видалити завдання
router.delete('/:id', organizerProtect, async (req, res) => {
    try {
        // Спочатку видаляємо записи волонтерів на це завдання, щоб уникнути помилок foreign key
        await db.query('DELETE FROM volunteer_signups WHERE task_id = $1', [req.params.id]);
        // Тепер видаляємо саме завдання
        await db.query('DELETE FROM tasks WHERE task_id = $1', [req.params.id]);
        
        res.json({ message: 'Завдання видалено' });
    } catch (err) {
        console.error('Помилка видалення завдання:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Оновити завдання
router.put('/:id', organizerProtect, async (req, res) => {
    const { title, description, required_volunteers, deadline_time } = req.body;
    try {
        const result = await db.query(
            `UPDATE tasks SET title=$1, description=$2, required_volunteers=$3, deadline_time=$4 WHERE task_id=$5 RETURNING *`,
            [title, description, required_volunteers, deadline_time, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Помилка оновлення завдання:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/tasks/:event_id
// @desc    Отримати всі завдання для конкретної події (для Адмінки)
router.get('/:event_id', organizerProtect, async (req, res) => {
    const eventId = req.params.event_id;

    try {
        const result = await db.query(
            `SELECT 
                t.*,
                COALESCE(s.signed_up_count, 0) AS signed_up_volunteers
             FROM tasks t
             LEFT JOIN (
                SELECT task_id, COUNT(*) AS signed_up_count
                FROM volunteer_signups
                GROUP BY task_id
             ) s ON s.task_id = t.task_id
             WHERE t.event_id = $1
             ORDER BY t.deadline_time ASC`,
            [eventId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка при отриманні завдань:', err);
        res.status(500).json({ message: 'Помилка сервера при отриманні завдань.' });
    }
});

// @route   GET /api/tasks/public/:event_id
// @desc    Отримати список завдань для події (ПУБЛІЧНО)
router.get('/public/:event_id', async (req, res) => {
    const { event_id } = req.params;
    try {
        const queryText = `
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
            ORDER BY t.status DESC, t.task_id ASC
        `;
        const result = await db.query(queryText, [event_id]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Помилка отримання публічних завдань:', err);
        res.status(500).json({ message: 'Помилка сервера.' });
    }
});

// @route   POST /api/tasks/guest-signup
// @desc    Запис гостя на конкретне завдання (ОНОВЛЕНО: додано comment)
router.post('/guest-signup', async (req, res) => {
    const { task_id, name, whatsapp, uk_phone, comment } = req.body;

    if (!task_id || !name || !whatsapp) {
        return res.status(400).json({ message: 'Неповні дані. Ім\'я та WhatsApp обов\'язкові.' });
    }

    try {
        const queryText = `
            INSERT INTO volunteer_signups (task_id, guest_name, guest_whatsapp, guest_uk_phone, user_id, comment)
            VALUES ($1, $2, $3, $4, NULL, $5)
        `;
        // Передаємо comment або пустий рядок, якщо його немає
        await db.query(queryText, [task_id, name, whatsapp, uk_phone, comment || '']);
        
        res.status(201).json({ message: 'Успішно записано на завдання!' });
    } catch (err) {
        console.error('Помилка запису на завдання:', err);
        res.status(500).json({ message: 'Помилка сервера.' });
    }
});

module.exports = router;