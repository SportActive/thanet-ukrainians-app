const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
const editorProtect = [protect, restrictTo(['Admin', 'Organizer', 'Editor'])];

// @route   GET /api/news/public
router.get('/public', async (req, res) => {
    try {
        const query = `
            SELECT n.*, e.start_datetime as event_date 
            FROM news n
            LEFT JOIN events e ON n.event_id = e.event_id
            WHERE n.is_published = TRUE 
            AND (
                n.event_id IS NULL 
                OR e.start_datetime >= NOW() - INTERVAL '2 hours' -- Показуємо події, що ще не закінчились (з невеликим запасом)
            )
            ORDER BY 
                CASE WHEN n.event_id IS NULL THEN 0 ELSE 1 END ASC, -- Спочатку записи БЕЗ подій (загальні анонси)
                e.start_datetime ASC, -- Потім події від найближчої до найдальшої
                n.created_at DESC -- Якщо дати немає, сортуємо за створенням
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/news
router.post('/', editorProtect, async (req, res) => {
    // Приймаємо is_news та is_announcement
    const { title, content, image_url, is_news, is_announcement, event_id } = req.body;
    const authorId = req.user.user_id;

    try {
        const result = await db.query(
            'INSERT INTO news (title, content, image_url, is_news, is_announcement, author_id, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, content, image_url, is_news || false, is_announcement || false, authorId, event_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/news/:id
router.put('/:id', editorProtect, async (req, res) => {
    const { title, content, image_url, is_news, is_announcement, event_id } = req.body;
    const newsId = req.params.id;

    try {
        const result = await db.query(
            'UPDATE news SET title=$1, content=$2, image_url=$3, is_news=$4, is_announcement=$5, event_id=$6 WHERE news_id=$7 RETURNING *',
            [title, content, image_url, is_news || false, is_announcement || false, event_id || null, newsId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/news/:id
router.delete('/:id', editorProtect, async (req, res) => {
    try {
        await db.query('DELETE FROM news WHERE news_id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;