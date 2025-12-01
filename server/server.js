const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Завантаження змінних середовища з .env
dotenv.config({ path: '../.env' }); 

const app = express();

// Підключення маршрутів
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes'); // <--- 1. ДОДАТИ ІМПОРТ

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Використання маршрутів API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes); // <--- 2. ПІДКЛЮЧИТИ МАРШРУТ

// Тестовий маршрут
app.get('/', (req, res) => {
  res.send('Server is running! Ready for API requests.');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server працює на порті ${PORT}`);
});