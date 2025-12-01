const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Завантаження змінних середовища
// У Railway змінні вбудовані, тому path '../.env' може не знадобитися, але помилки не викличе
dotenv.config({ path: '../.env' }); 

const app = express();

// --- ВИПРАВЛЕНА ЧАСТИНА CORS ---
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: allowedOrigin, // Дозволяємо доступ тільки твоєму фронтенду
  credentials: true,     // Дозволяємо передавати токени/куки
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ------------------------------

// Підключення маршрутів
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

// Middleware для JSON
app.use(express.json()); 

// Використання маршрутів API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);

// Тестовий маршрут
app.get('/', (req, res) => {
  res.send(`Server is running! Allowed Origin: ${allowedOrigin}`);
});

const PORT = process.env.PORT || 5000;

// Явно вказуємо хост '0.0.0.0', щоб Railway міг достукатися до контейнера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server працює на порті ${PORT}`);
  console.log(`CORS дозволено для: ${allowedOrigin}`);
});
