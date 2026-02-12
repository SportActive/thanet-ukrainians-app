import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import NewsPage from './pages/NewsPage';
import AboutPage from './pages/AboutPage';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DONATE_LINK = 'https://buy.stripe.com/dRmdR842pa5AfCw1uu8Vi00';

// --- КОМПОНЕНТ: СТОРІНКА ЗМІНИ ПАРОЛЯ ---
const ChangePasswordPage = ({ API_URL, onCancel }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('✅ Пароль успішно змінено!');
                setIsSuccess(true);
                setOldPassword('');
                setNewPassword('');
            } else {
                setMessage(`❌ ${data.message}`);
            }
        } catch (error) {
            setMessage('❌ Помилка з\'єднання із сервером');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200 mt-10">
            <h2 className="text-2xl font-bold mb-4 text-center">🔐 Зміна пароля</h2>
            
            {message && (
                <div className={`p-3 rounded mb-4 text-center font-bold ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-1">Старий пароль</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-1">Новий пароль</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition">
                        Зберегти новий пароль
                    </button>
                    <button type="button" onClick={onCancel} className="w-full bg-gray-100 text-gray-600 font-bold py-2 rounded hover:bg-gray-200 transition">
                        Скасувати
                    </button>
                </form>
            ) : (
                <button onClick={onCancel} className="w-full bg-indigo-600 text-white font-bold py-2 rounded">
                    Повернутися на головну
                </button>
            )}
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null); 
    const [currentPage, setCurrentPage] = useState('news'); 
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
    const [calendarTargetEvent, setCalendarTargetEvent] = useState(null);
    const [targetNewsId, setTargetNewsId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setUser({ user_id: decoded.user_id, role: decoded.role, first_name: decoded.first_name });
                } else {
                    localStorage.removeItem('token');
                }
            } catch (e) { localStorage.removeItem('token'); }
        }
        
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event_id');
        const newsId = params.get('news_id');

        if (newsId) {
            setTargetNewsId(newsId);
            setCurrentPage('news');
        } else if (eventId) {
            setCalendarTargetEvent(eventId); 
            setCurrentPage('calendar');
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    }, []);

    const handleLoginSuccess = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
        setCurrentPage('news');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentPage('news');
        setIsMenuOpen(false);
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'news': return <NewsPage API_URL={API_URL} targetNewsId={targetNewsId} />;
            case 'calendar': return <CalendarPage API_URL={API_URL} user={user} targetEventId={calendarTargetEvent} />;
            case 'login': return <LoginPage API_URL={API_URL} onLoginSuccess={handleLoginSuccess} />;
            case 'admin': return <AdminDashboard user={user} API_URL={API_URL} />;
            case 'about': return <AboutPage API_URL={API_URL} />;
            case 'change-password': return <ChangePasswordPage API_URL={API_URL} onCancel={() => setCurrentPage('news')} />;
            default: return <NewsPage API_URL={API_URL} />;
        }
    };

    const canAccessAdmin = user && (user.role === 'Admin' || user.role === 'Organizer' || user.role === 'Editor');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-7xl">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage('news')}>
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-md transition transform group-hover:scale-110" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-500 tracking-tight leading-none">
                                Українці в Танеті
                            </h1>
                            <p className="text-xs text-gray-400 font-medium tracking-wide">СПІЛЬНОТА ПІДТРИМКИ</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-1">
                        <button onClick={() => setCurrentPage('news')} className={`px-4 py-2 rounded-full font-bold transition ${currentPage === 'news' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Новини</button>
                        <button onClick={() => setCurrentPage('calendar')} className={`px-4 py-2 rounded-full font-bold transition ${currentPage === 'calendar' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Календар</button>
                        <button onClick={() => setCurrentPage('about')} className={`px-4 py-2 rounded-full font-bold transition ${currentPage === 'about' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Про нас</button>
                        
                        {canAccessAdmin && (
                            <button onClick={() => setCurrentPage('admin')} className={`px-4 py-2 rounded-full font-bold transition ${currentPage === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'text-purple-600 hover:bg-purple-50'}`}>Адмінка</button>
                        )}

                        {!user ? (
                            <button onClick={() => setCurrentPage('login')} className="ml-2 px-5 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-0.5">Вхід</button>
                        ) : (
                            <div className="relative group ml-2 h-10 flex items-center">
                                {/* Кнопка користувача */}
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full font-bold text-gray-700 hover:bg-gray-200">
                                    👤 {user.first_name}
                                </button>
                                
                                {/* ВИПРАВЛЕНЕ МЕНЮ: Додано pt-2 для містка і z-50 */}
                                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                        <button onClick={() => setCurrentPage('change-password')} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-b border-gray-50">🔐 Змінити пароль</button>
                                        <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold transition">Вийти</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer" className="ml-2 px-4 py-2 bg-yellow-400 text-blue-900 rounded-full font-bold hover:bg-yellow-300 shadow-md transition flex items-center gap-2">
                            ☕ <span className="hidden lg:inline">Донат</span>
                        </a>
                    </div>

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gray-600 text-3xl focus:outline-none">
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t p-4 space-y-2 shadow-lg animate-fade-in-down">
                        <button onClick={() => {setCurrentPage('news'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold ${currentPage === 'news' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>📰 Новини</button>
                        <button onClick={() => {setCurrentPage('calendar'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold ${currentPage === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>📅 Календар Подій</button>
                        <button onClick={() => {setCurrentPage('about'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold ${currentPage === 'about' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>ℹ️ Про нас / Контакти</button>
                        
                        {canAccessAdmin && <button onClick={() => {setCurrentPage('admin'); setIsMenuOpen(false);}} className="w-full text-left p-3 rounded-xl bg-purple-50 text-purple-700 font-bold border border-purple-100 mt-2">⚙️ Адмін Панель</button>}
                        
                        <div className="border-t my-3"></div>
                        
                        {!user ? (
                            <button onClick={() => {setCurrentPage('login'); setIsMenuOpen(false);}} className="w-full p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md">Вхід / Реєстрація</button>
                        ) : (
                            <div className="space-y-2 bg-gray-50 p-3 rounded-xl">
                                <p className="text-center text-sm text-gray-500 mb-2">Ви увійшли як <strong>{user.first_name}</strong></p>
                                <button onClick={() => {setCurrentPage('change-password'); setIsMenuOpen(false);}} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold text-sm mb-2">
                                    🔐 Змінити пароль
                                </button>
                                <button onClick={handleLogout} className="w-full p-2 text-red-600 bg-red-100 rounded-lg font-bold hover:bg-red-200 transition text-sm">Вийти з акаунту</button>
                            </div>
                        )}
                        <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer" className="block w-full text-center p-3 bg-yellow-400 text-blue-900 rounded-xl font-bold shadow-md mt-2">☕ Підтримати нас</a>
                    </div>
                )}
            </header>
            <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">{renderContent()}</main>
            <footer className="bg-white border-t border-gray-200 mt-auto"><div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm"><p>© 2024 Ukrainians in Thanet. Всі права захищено.</p><p className="mt-1">Разом ми сила 🇺🇦🇬🇧</p></div></footer>
        </div>
    );
};

export default App;