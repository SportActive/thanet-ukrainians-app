const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: '../.env' }); 

const app = express();

// --- СПОЧАТКУ JSON MIDDLEWARE ---
app.use(express.json()); 

// --- ПОТІМ CORS ---
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

// Логування для дебагу
app.use((req, res, next) => {
  console.log(`Запит від origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Дозволяємо запити без origin (Postman, curl) та від нашого фронтенду
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      console.log(`❌ CORS заблоковано для: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Явна обробка preflight
app.options('*', cors());

// Підключення маршрутів
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.send(`Server is running! Allowed Origin: ${allowedOrigin}`);
});

// Жорстко ставимо порт 8080 і слухаємо всі IP (0.0.0.0)
const HARD_PORT = 8080;

app.listen(HARD_PORT, '0.0.0.0', () => {
  console.log(`!!! SERVER STARTED FORCEFULLY ON PORT ${HARD_PORT} !!!`);

});