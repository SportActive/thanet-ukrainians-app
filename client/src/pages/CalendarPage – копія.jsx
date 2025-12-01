import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// API_URL передається через props з App.jsx
const CalendarPage = ({ API_URL }) => {
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('month'); // month, week, day
    const [currentDate, setCurrentDate] = useState(new Date());

    // Компонент-картка для відображення події
    const EventCard = ({ event, view }) => {
        const isDayView = view === 'day';
        const start = new Date(event.start_datetime);
        const end = event.end_datetime ? new Date(event.end_datetime) : null;
        
        const timeDisplay = isDayView 
            ? `${start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} - ${end ? end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : 'Кінець'}`
            : start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    
        return (
            <div className="bg-white p-4 border-l-4 border-indigo-500 rounded-lg shadow-md hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-indigo-700">{event.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{event.category}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{timeDisplay}</span>
                </div>
                
                <p className="text-gray-600 mt-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    {event.location_name}
                </p>
                
                {/* Деталізація (більше інформації для вигляду "День" та "Тиждень") */}
                {view !== 'month' && (
                    <p className="text-gray-700 text-sm mt-3 border-t pt-2 italic">
                        {event.description.substring(0, 150)}...
                    </p>
                )}
    
                <a href={`/event/${event.event_id}`} className="mt-3 inline-block text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition duration-150">
                    Детальніше та Волонтерство →
                </a>
            </div>
        );
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Запит до API для отримання публічних подій
                const response = await axios.get(`${API_URL}/events/public`);
                setAllEvents(response.data);
                setError(null);
            } catch (err) {
                console.error("Помилка завантаження подій:", err);
                // Оскільки ми вже вирішили проблему, помилка тут означає, що бекенд не відповідає
                setError('Не вдалося завантажити події. Перевірте, чи запущено бекенд на порту 5000.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [API_URL]);

    // Логіка фільтрації подій залежно від обраного вигляду (view)
    const filteredEvents = useMemo(() => {
        // Визначаємо початок і кінець періоду для фільтрації
        let filterStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        let filterEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        if (view === 'day') {
            // Фільтрація по поточному дню
            filterStart = new Date(currentDate.setHours(0, 0, 0, 0));
            filterEnd = new Date(currentDate.setHours(23, 59, 59, 999));
        } else if (view === 'week') {
            // Фільтрація по поточному тижню (Понеділок - Неділя)
            const dayOfWeek = currentDate.getDay(); // 0 = Неділя, 1 = Понеділок
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Переміщення на Понеділок
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            filterStart = new Date(startOfWeek.setHours(0, 0, 0, 0));
            filterEnd = new Date(endOfWeek.setHours(23, 59, 59, 999));
        }

        return allEvents.filter(event => {
            const eventDate = new Date(event.start_datetime);
            return eventDate >= filterStart && eventDate <= filterEnd;
        }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)); // Сортування за часом
    }, [allEvents, view, currentDate]);

    const changeTimeFrame = (offset) => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + offset);
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + (offset * 7));
        } else if (view === 'day') {
            newDate.setDate(currentDate.getDate() + offset);
        }
        setCurrentDate(newDate);
    };

    const changeView = (newView) => {
        setView(newView);
        // При зміні вигляду, оновлюємо дату
        if (newView !== 'month') {
             setCurrentDate(new Date());
        }
    }

    const viewOptions = [
        { key: 'month', label: 'Місяць' },
        { key: 'week', label: 'Тиждень' },
        { key: 'day', label: 'День' }
    ];

    const formatHeader = () => {
        switch (view) {
            case 'month':
                return currentDate.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' });
            case 'week':
                 const dayOfWeek = currentDate.getDay();
                 const start = new Date(currentDate);
                 start.setDate(currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
                 const end = new Date(start);
                 end.setDate(start.getDate() + 6);
                 return `${start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            case 'day':
                return currentDate.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            default:
                return '';
        }
    };

    if (loading) return <div className="p-8 text-center text-xl text-indigo-700 font-semibold">Завантаження календаря...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-extrabold mb-8 text-center text-gray-800">
                Календар Подій Спільноти
            </h1>
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
                    <p className="font-semibold">Помилка підключення:</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Панель керування календарем (адаптивна) */}
            <div className="bg-white p-4 shadow-xl rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                {/* Кнопки перемикання вигляду (верхній ряд на мобільному) */}
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
                    {viewOptions.map(option => (
                        <button 
                            key={option.key}
                            onClick={() => changeView(option.key)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition duration-150 ${view === option.key ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Навігація за часом (нижній ряд на мобільному) */}
                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-start">
                    <button 
                        onClick={() => changeTimeFrame(-1)}
                        className="p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition duration-150"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 w-full sm:w-40 text-center">
                        {formatHeader()}
                    </h2>

                    <button 
                        onClick={() => changeTimeFrame(1)}
                        className="p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition duration-150"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>

            {/* Виведення подій */}
            {filteredEvents.length === 0 ? (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg">
                    <p className="font-semibold">Немає запланованих подій у {formatHeader()}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map(event => (
                        <EventCard key={event.event_id} event={event} view={view} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarPage;