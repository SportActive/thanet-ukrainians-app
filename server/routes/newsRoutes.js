const express = require('express');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Дозволяємо керувати новинами Адмінам, Організаторам та Редакторам
const editorProtect = [protect, restrictTo(['Admin', 'Organizer', 'Editor'])];

// @route   GET /api/news/public
// @desc    Отримати всі опубліковані новини (для всіх)
router.get('/public', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM news WHERE is_published = TRUE ORDER BY created_at DESC'
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/news
// @desc    Створити новину/анонс
router.post('/', editorProtect, async (req, res) => {
    const { title, content, image_url, type } = req.body;
    const authorId = req.user.user_id;

    try {
        const result = await db.query(
            'INSERT INTO news (title, content, image_url, type, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, image_url, type || 'News', authorId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/news/:id
router.delete('/:id', editorProtect, async (req, res) => {
    try {
        await db.query('DELETE FROM news WHERE news_id = $1', [req.params.id]);
        res.json({ message: 'Новину видалено' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;