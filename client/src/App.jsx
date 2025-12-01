import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import { jwtDecode } from 'jwt-decode';

// Використовуємо VITE_API_URL з .env файлу
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const App = () => {
    // user містить { user_id, first_name, role }
    const [user, setUser] = useState(null); 
    const [currentPage, setCurrentPage] = useState('calendar'); // calendar, admin, login
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Для мобільного меню

    useEffect(() => {
        // Перевірка токена при завантаженні сторінки
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Перевірка терміну дії токена
                if (decoded.exp * 1000 > Date.now()) {
                    setUser({ 
                        user_id: decoded.user_id, 
                        role: decoded.role, 
                        first_name: decoded.first_name || 'Користувач' 
                    });
                    
                    // Якщо користувач оновив сторінку на адмінці, залишаємо його там
                    if ((decoded.role === 'Admin' || decoded.role === 'Organizer') && currentPage === 'admin') {
                        setCurrentPage('admin');
                    }
                } else {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch (error) {
                console.error("Недійсний токен:", error);
                localStorage.removeItem('token');
            }
        }
    }, []);

    const handleLogin = (userInfo) => {
        setUser(userInfo);
        if (userInfo.role === 'Admin' || userInfo.role === 'Organizer') {
            setCurrentPage('admin');
        } else {
            setCurrentPage('calendar');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentPage('calendar');
        setIsMenuOpen(false);
    };

    const renderContent = () => {
        if (currentPage === 'login') {
            return <LoginPage onLogin={handleLogin} />;
        }
        
        if (currentPage === 'admin' && (user?.role === 'Admin' || user?.role === 'Organizer')) {
            return <AdminDashboard user={user} API_URL={API_URL} />;
        }

        // Передаємо user у календар, щоб він міг адаптуватися (наприклад, кнопка "Взяти участь")
        return <CalendarPage API_URL={API_URL} user={user} />;
    };

    const isAdminOrOrganizer = user?.role === 'Admin' || user?.role === 'Organizer';

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans text-gray-900">
            {/* --- HEADER --- */}
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-7xl">
                    
                    {/* Логотип */}
                    <div 
                        onClick={() => setCurrentPage('calendar')} 
                        className="cursor-pointer flex items-center gap-2 group"
                    >
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl shadow-indigo-200 shadow-lg group-hover:bg-indigo-700 transition">
                            🇺🇦
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 leading-tight group-hover:text-indigo-700 transition">
                                Українці в Танеті
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">Community App</p>
                        </div>
                    </div>
                    
                    {/* Десктоп Меню */}
                    <nav className="hidden md:flex items-center space-x-2">
                        <button 
                            onClick={() => setCurrentPage('calendar')} 
                            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${currentPage === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                        >
                            📅 Календар
                        </button>

                        {isAdminOrOrganizer && (
                            <button 
                                onClick={() => setCurrentPage('admin')} 
                                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${currentPage === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                ⚙️ Адмін Панель
                            </button>
                        )}

                        <div className="h-6 w-px bg-gray-300 mx-2"></div>

                        {!user ? (
                            <button 
                                onClick={() => setCurrentPage('login')} 
                                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition transform hover:-translate-y-0.5"
                            >
                                Вхід
                            </button>
                        ) : (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700">
                                    Привіт, <span className="text-indigo-600">{user.first_name}</span>
                                </span>
                                <button 
                                    onClick={handleLogout} 
                                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition"
                                >
                                    Вийти
                                </button>
                            </div>
                        )}
                    </nav>

                    {/* Кнопка Мобільного Меню */}
                    <button 
                        className="md:hidden p-2 text-gray-600 hover:text-indigo-600 transition"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        ) : (
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        )}
                    </button>
                </div>
                
                {/* Мобільне меню (випадаюче) */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-40">
                        <div className="p-4 space-y-3">
                            <button 
                                onClick={() => { setCurrentPage('calendar'); setIsMenuOpen(false); }} 
                                className={`w-full text-left px-4 py-3 rounded-xl font-medium ${currentPage === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                📅 Календар Подій
                            </button>
                            
                            {isAdminOrOrganizer && (
                                <button 
                                    onClick={() => { setCurrentPage('admin'); setIsMenuOpen(false); }} 
                                    className={`w-full text-left px-4 py-3 rounded-xl font-medium ${currentPage === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    ⚙️ Адмін Панель
                                </button>
                            )}

                            <div className="border-t border-gray-100 my-2"></div>

                            {!user ? (
                                <button 
                                    onClick={() => { setCurrentPage('login'); setIsMenuOpen(false); }} 
                                    className="w-full text-center px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md active:bg-indigo-800"
                                >
                                    Вхід / Реєстрація
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="px-4 text-sm text-gray-500">
                                        Ви увійшли як <span className="font-bold text-gray-800">{user.first_name}</span>
                                    </div>
                                    <button 
                                        onClick={handleLogout} 
                                        className="w-full text-left px-4 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-medium"
                                    >
                                        Вийти з акаунту
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>
            
            {/* --- MAIN CONTENT --- */}
            <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">
                {renderContent()}
            </main>
            
            {/* --- FOOTER --- */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="container mx-auto px-4 py-6 text-center">
                    <p className="text-gray-500 text-sm">
                        © 2025 Thanet Ukrainians Community App. 
                        <span className="hidden sm:inline"> | </span> 
                        <br className="sm:hidden"/>
                        Розроблено для спільноти 💙💛
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default App;