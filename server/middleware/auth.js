const jwt = require('jsonwebtoken');

// 1. Захист: Перевіряє наявність токена
exports.protect = (req, res, next) => {
    // Токен зазвичай надсилається у форматі: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Якщо токен відсутній, ми просто відхиляємо, не завершуючи процес
        console.log('AUTH ERROR: Токен відсутній або неправильний формат.');
        return res.status(401).json({ message: 'Немає токена, авторизація відхилена.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Додаємо user_id та role у запит
        
        console.log('AUTH SUCCESS: Токен успішно декодовано. Користувач:', req.user.user_id);
        next();
    } catch (e) {
        // Якщо токен недійсний або термін дії закінчився
        console.error('AUTH CRITICAL ERROR: Недійсний токен.', e.message);
        return res.status(401).json({ message: 'Токен недійсний або термін дії закінчився.' });
    }
};

// 2. Обмеження: Перевіряє, чи має користувач потрібну роль
exports.restrictTo = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        console.log('AUTH FORBIDDEN: Недостатньо прав для ролі:', req.user.role);
        return res.status(403).json({ message: 'Недостатньо прав доступу.' });
    }
    next();
};