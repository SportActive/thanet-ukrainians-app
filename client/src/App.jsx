import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import NewsPage from './pages/NewsPage';
import AboutPage from './pages/AboutPage';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 👇 ВАШЕ ПОСИЛАННЯ НА STRIPE
const DONATE_LINK = 'https://buy.stripe.com/dRmdR842pa5AfCw1uu8Vi00';

const App = () => {
    const [user, setUser] = useState(null); 
    const [currentPage, setCurrentPage] = useState('news'); 
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
    
    // Стейт для переходу на календар (з кнопки "Записатися")
    const [calendarTargetEvent, setCalendarTargetEvent] = useState(null);
    
    // Стейт для переходу на конкретну новину (з посилання)
    const [targetNewsId, setTargetNewsId] = useState(null);

    useEffect(() => {
        // 1. Перевірка токена
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setUser({ 
                        user_id: decoded.user_id, 
                        role: decoded.role, 
                        first_name: decoded.first_name || 'Користувач',
                        whatsapp: decoded.whatsapp 
                    });
                } else {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch (error) {
                localStorage.removeItem('token');
            }
        }

        // 2. Перевірка URL параметрів
        const params = new URLSearchParams(window.location.search);
        const newsIdFromUrl = params.get('news_id');
        const eventIdFromUrl = params.get('event_id'); 
        
        if (newsIdFromUrl) {
            setCurrentPage('news');
            setTargetNewsId(newsIdFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (eventIdFromUrl) {
            setCurrentPage('calendar');
            setCalendarTargetEvent({ id: parseInt(eventIdFromUrl), date: null });
        } else if (user && ['Admin', 'Organizer', 'Editor'].includes(user.role)) {
             // Логіка для адмінів за замовчуванням
        }

    }, []);

    const handleLogin = (userInfo) => {
        if (userInfo.token) {
            const decoded = jwtDecode(userInfo.token);
            setUser({ ...decoded, token: userInfo.token });
        } else { setUser(userInfo); }

        if (['Admin', 'Organizer', 'Editor'].includes(userInfo.role)) {
            setCurrentPage('admin');
        } else {
            setCurrentPage('calendar');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentPage('news'); 
        setIsMenuOpen(false);
    };

    const handleGoToCalendar = (eventId, eventDate) => {
        setCalendarTargetEvent({ id: eventId, date: eventDate });
        setCurrentPage('calendar');
        setIsMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const canAccessAdmin = user && ['Admin', 'Organizer', 'Editor'].includes(user.role);

    const renderContent = () => {
        switch (currentPage) {
            case 'login': return <LoginPage onLogin={handleLogin} />;
            case 'admin': return canAccessAdmin ? <AdminDashboard user={user} API_URL={API_URL} /> : <CalendarPage API_URL={API_URL} user={user} />;
            
            case 'news': 
                return <NewsPage API_URL={API_URL} onGoToCalendar={handleGoToCalendar} targetNewsId={targetNewsId} />;
            
            case 'about': return <AboutPage />;
            case 'calendar': default: return <CalendarPage API_URL={API_URL} user={user} targetEvent={calendarTargetEvent} onTargetHandled={() => setCalendarTargetEvent(null)} />;
        }
    };

    const NavButton = ({ target, label, icon }) => (
        <button onClick={() => { setCurrentPage(target); setIsMenuOpen(false); }} className={`px-3 py-2 rounded-lg font-medium transition duration-200 flex items-center gap-2 ${currentPage === target ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><span className="text-xl">{icon}</span> {label}</button>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans text-gray-900">
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-7xl">
                    <div className="flex items-center gap-4">
                        <div onClick={() => setCurrentPage('news')} className="cursor-pointer flex items-center gap-2 group">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200 transition group-hover:bg-indigo-700">🇺🇦</div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 leading-tight group-hover:text-indigo-700 transition">Українці в Танеті</h1>
                                <p className="text-xs text-gray-500 font-medium">Community App</p>
                            </div>
                        </div>
                        
                        {/* --- КНОПКА ПЕРЕКЛАДУ --- */}
                        <div id="google_translate_element" className="hidden md:block"></div>
                        {/* ------------------------ */}
                    </div>

                    <nav className="hidden md:flex items-center space-x-1">
                        <NavButton target="news" label="Новини" icon="📰" />
                        <NavButton target="calendar" label="Календар" icon="📅" />
                        <NavButton target="about" label="Про нас" icon="ℹ️" />
                        
                        {/* 🟡 КНОПКА ДОНАТУ (Desktop) */}
                        <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer" className="ml-2 px-4 py-2 bg-yellow-400 text-blue-900 font-bold rounded-lg shadow-md hover:bg-yellow-300 transition flex items-center gap-2 transform hover:-translate-y-0.5">
                            🪙 Підтримати громаду
                        </a>

                        {canAccessAdmin && (<button onClick={() => setCurrentPage('admin')} className={`ml-2 px-4 py-2 rounded-lg font-medium border flex items-center gap-2 transition ${currentPage === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}>⚙️ Адмінка</button>)}
                        
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        
                        {!user ? (<button onClick={() => setCurrentPage('login')} className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition transform hover:-translate-y-0.5">Вхід</button>) : (<div className="flex items-center gap-3"><span className="text-sm font-medium text-gray-700">Привіт, <span className="text-indigo-600 font-bold">{user.first_name}</span></span><button onClick={handleLogout} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition border border-transparent hover:border-red-100">Вихід</button></div>)}
                    </nav>
                    
                    {/* Мобільна кнопка меню та перекладач */}
                    <div className="flex items-center gap-2 md:hidden">
                         {/* Перекладач для мобільних */}
                        <div id="google_translate_element" className="md:hidden scale-75 origin-right"></div>
                        
                        <button className="p-2 text-gray-600 hover:text-indigo-600 transition" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    </div>
                </div>
                
                {/* MOBILE MENU */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 shadow-xl absolute w-full left-0 z-40 p-4 space-y-2 animate-fade-in">
                        
                        {/* 🟡 КНОПКА ДОНАТУ (Mobile) */}
                        <a href={DONATE_LINK} target="_blank" rel="noopener noreferrer" className="w-full text-center block p-3 bg-yellow-400 text-blue-900 rounded-xl font-bold shadow-sm mb-4">
                            🪙 Підтримати громаду
                        </a>

                        <button onClick={() => {setCurrentPage('news'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-medium flex items-center gap-3 ${currentPage === 'news' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>📰 Новини та Анонси</button>
                        <button onClick={() => {setCurrentPage('calendar'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-medium flex items-center gap-3 ${currentPage === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>📅 Календар Подій</button>
                        <button onClick={() => {setCurrentPage('about'); setIsMenuOpen(false);}} className={`w-full text-left p-3 rounded-xl font-medium flex items-center gap-3 ${currentPage === 'about' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>ℹ️ Про нас / Контакти</button>
                        
                        {canAccessAdmin && <button onClick={() => {setCurrentPage('admin'); setIsMenuOpen(false);}} className="w-full text-left p-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 mt-2">⚙️ Адмін Панель</button>}
                        
                        <div className="border-t my-3"></div>
                        
                        {!user ? (<button onClick={() => {setCurrentPage('login'); setIsMenuOpen(false);}} className="w-full p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md">Вхід / Реєстрація</button>) : (<div className="space-y-2"><p className="text-center text-sm text-gray-500">Ви увійшли як <strong>{user.first_name}</strong></p><button onClick={handleLogout} className="w-full p-3 text-red-600 bg-red-50 rounded-xl font-bold hover:bg-red-100 transition">Вийти з акаунту</button></div>)}
                    </div>
                )}
            </header>
            <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">{renderContent()}</main>
            <footer className="bg-white border-t border-gray-200 mt-auto"><div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm"><p>© 2025 Thanet Ukrainians Community App.</p><p className="mt-1 text-xs">Розроблено для спільноти 💙💛</p></div></footer>
        </div>
    );
};

export default App;