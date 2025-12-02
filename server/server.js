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

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server працює на порті ${PORT}`);
  console.log(`CORS дозволено для: ${allowedOrigin}`);
});