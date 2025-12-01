const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Middleware для захисту від доступу не-організаторів (Admin/Organizer)
const organizerProtect = [protect, restrictTo(['Admin', 'Organizer'])];

// @route   POST /api/tasks
// @desc    Створити нове завдання для події (Модуль 2)
// Видалено console.log для уникнення збою
router.post('/', organizerProtect, async (req, res) => {
    
    try {
        // Очікувані поля з TaskForm
        const { event_id, title, description, required_volunteers, deadline_time } = req.body;
        
        // 1. Примусове перетворення даних
        const finalEventId = parseInt(event_id);
        const finalVolunteers = parseInt(required_volunteers);
        const finalDeadline = deadline_time || null;
        
        // 2. Перевірка валідності даних
        if (isNaN(finalEventId) || finalEventId <= 0 || !title || isNaN(finalVolunteers) || finalVolunteers <= 0) {
            console.error('TRACE: Недійсні дані для завдання. body:', req.body);
            return res.status(400).json({ message: 'Обов\'язкові поля мають бути коректними.' });
        }

        // 3. Перевірка існування події (виконується в базі даних, але тут залишаємо логіку)
        const eventCheck = await db.query('SELECT event_id FROM events WHERE event_id = $1', [finalEventId]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Помилка: Вибрана подія не знайдена у базі даних.' });
        }
        
        // 4. Вставка завдання
        const queryText = `
            INSERT INTO tasks (event_id, title, description, required_volunteers, deadline_time, status) 
            VALUES ($1, $2, $3, $4, $5, 'Open') 
            RETURNING *
        `;
        const queryValues = [finalEventId, title, description, finalVolunteers, finalDeadline];

        const result = await db.query(queryText, queryValues);
        result.rows[0].signed_up_volunteers = 0; 
        
        // 5. Успіх
        res.status(201).json(result.rows[0]);

    } catch (err) {
        // !!! ЦЕЙ БЛОК МАЄ ПРАЦЮВАТИ !!!
        console.error('КРИТИЧНА ПОМИЛКА API/TASK (Збій в try-блоці):', err.stack || err.message); 
        res.status(500).json({ message: `Критична помилка сервера. Перевірте консоль: ${err.message || 'Невідома помилка.'}` });
    }
});

// @route   GET /api/tasks/:event_id
// @desc    Отримати всі завдання для конкретної події (Помилка 404 виникала тут)
router.get('/:event_id', organizerProtect, async (req, res) => {
    const eventId = req.params.event_id;

    try {
        // Використовуємо підзапит для підрахунку записаних волонтерів
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
// @desc    Запис гостя на конкретне завдання
router.post('/guest-signup', async (req, res) => {
    const { task_id, name, whatsapp, uk_phone } = req.body;

    if (!task_id || !name || !whatsapp) {
        return res.status(400).json({ message: 'Неповні дані.' });
    }

    try {
        // Перевіряємо, чи є ще місця (опціонально, але бажано)
        // ... тут можна додати логіку перевірки

        const queryText = `
            INSERT INTO volunteer_signups (task_id, guest_name, guest_whatsapp, guest_uk_phone, user_id)
            VALUES ($1, $2, $3, $4, NULL)
        `;
        await db.query(queryText, [task_id, name, whatsapp, uk_phone]);
        
        res.status(201).json({ message: 'Успішно записано на завдання!' });
    } catch (err) {
        console.error('Помилка запису на завдання:', err);
        res.status(500).json({ message: 'Помилка сервера.' });
    }
});


module.exports = router;