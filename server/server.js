const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: '../.env' }); 

const app = express();

app.use(express.json()); 

// --- ТИМЧАСОВО: ДОЗВОЛИТИ ВСІ ДОМЕНИ ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

console.log('⚠️ CORS налаштовано на "*" (всі домени дозволені)');

// Підключення маршрутів
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.send('Server is running with CORS: *');
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server працює на порті ${PORT}`);
});