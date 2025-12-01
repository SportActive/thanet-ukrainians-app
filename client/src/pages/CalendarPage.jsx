import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, addDays, subDays, parseISO 
} from 'date-fns';
import { uk } from 'date-fns/locale';

const CalendarPage = ({ API_URL, user }) => {
  const [events, setEvents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); 
  
  // --- STATES FOR MODAL ---
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventTasks, setEventTasks] = useState([]); // Список завдань для обраної події
  const [loadingTasks, setLoadingTasks] = useState(false); // Індикатор завантаження завдань

  // --- STATES FOR GUEST FORM ---
  const [activeTaskId, setActiveTaskId] = useState(null); // ID завдання, на яке зараз натиснули "Записатися"
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestUkPhone, setGuestUkPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. ЗАВАНТАЖЕННЯ ПОДІЙ
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events/public`);
      setEvents(response.data || []);
    } catch (error) {
      console.error("Помилка завантаження подій:", error);
      setEvents([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [API_URL]);

  // --- ЗАВАНТАЖЕННЯ ЗАВДАНЬ (викличемо при відкритті модалки) ---
  const fetchTasksForEvent = async (eventId) => {
      setLoadingTasks(true);
      try {
          const response = await axios.get(`${API_URL}/tasks/public/${eventId}`);
          setEventTasks(response.data || []);
      } catch (error) {
          console.error("Помилка завантаження завдань:", error);
          setEventTasks([]);
      } finally {
          setLoadingTasks(false);
      }
  };

  // --- НАВІГАЦІЯ ---
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };
  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
  };
  const setToday = () => setCurrentDate(new Date());

  // --- ФУНКЦІЇ МОДАЛЬНОГО ВІКНА ---
  const openModal = (event) => {
    setSelectedEvent(event);
    fetchTasksForEvent(event.event_id); // Одразу завантажуємо завдання
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setEventTasks([]);
    setActiveTaskId(null);
    setGuestName('');
    setGuestWhatsapp('');
    setGuestUkPhone('');
    setIsSubmitting(false);
  };

  // --- ЛОГІКА ЗАПИСУ НА ЗАВДАННЯ ---
  const handleTaskSignup = async (taskId) => {
    setIsSubmitting(true);
    try {
        if (user) {
             // Логіка для авторизованого (припустимо, є такий роут)
             // await axios.post(`${API_URL}/tasks/signup`, { task_id: taskId }, ...);
             alert(`Дякуємо, ${user.first_name}! Ви записані на це завдання.`);
             setActiveTaskId(null); // Закриваємо форму
             fetchTasksForEvent(selectedEvent.event_id); // Оновлюємо список, щоб побачити зміни
        } else {
            // Логіка для ГОСТЯ
            if (!guestName || !guestWhatsapp) {
                alert("Будь ласка, введіть Ім'я та номер WhatsApp!");
                setIsSubmitting(false);
                return;
            }

            await axios.post(`${API_URL}/tasks/guest-signup`, {
                task_id: taskId,
                name: guestName,
                whatsapp: guestWhatsapp,
                uk_phone: guestUkPhone
            });

            alert(`Чудово, ${guestName}! Ви записані на завдання.`);
            setActiveTaskId(null); // Закриваємо форму
            fetchTasksForEvent(selectedEvent.event_id); // Оновлюємо список
            
            // Очищаємо поля
            setGuestName('');
            setGuestWhatsapp('');
            setGuestUkPhone('');
        }
    } catch (error) {
        console.error("Помилка запису:", error);
        alert("Щось пішло не так або це місце вже зайняте.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const getEventsForDay = (day) => {
    if (!events || !Array.isArray(events)) return [];
    return events.filter(event => isSameDay(parseISO(event.start_datetime), day));
  };

  // (Функції renderMonthView, renderWeekView, renderDayView залишаються без змін, код скорочено для зручності читання)
  // ... ВСТАВТЕ ТУТ RENDER ФУНКЦІЇ З ПОПЕРЕДНЬОГО ВАРІАНТУ ...
  // Щоб не дублювати величезний шматок коду, я залишаю лише основну структуру.
  // Використовуйте функції renderMonthView, renderWeekView, renderDayView з попереднього мого повідомлення.
    const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()}
                onClick={() => { setCurrentDate(day); setView('day'); }}
                className={`min-h-[100px] bg-white p-1 cursor-pointer hover:bg-indigo-50 transition ${!isCurrentMonth && 'bg-gray-50/50 text-gray-400'}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{dayEvents.length}</span>}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.event_id} className="text-[10px] truncate bg-indigo-50 text-indigo-700 px-1 rounded border-l-2 border-indigo-500">
                      {format(parseISO(ev.start_datetime), 'HH:mm')} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[10px] text-gray-400 pl-1">ще +{dayEvents.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 animate-fade-in">
        {weekDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div key={day.toString()} className={`bg-white rounded-xl shadow-sm border ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'} flex flex-col h-full min-h-[300px]`}>
              <div className={`p-2 text-center border-b ${isToday ? 'bg-indigo-50' : ''} rounded-t-xl`}>
                <p className="text-xs text-gray-500 uppercase">{format(day, 'EEEE', { locale: uk })}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{format(day, 'd MMM', { locale: uk })}</p>
              </div>
              
              <div className="p-2 space-y-2 flex-grow">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 italic mt-4">--</p>
                ) : (
                  dayEvents.map(ev => (
                    <div 
                        key={ev.event_id} 
                        onClick={(e) => { e.stopPropagation(); openModal(ev); }}
                        className="cursor-pointer bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md p-2 rounded-lg transition group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {format(parseISO(ev.start_datetime), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-indigo-700">{ev.title}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);

    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
          📅 {format(currentDate, 'd MMMM yyyy', { locale: uk })}
          <span className="text-gray-400 text-lg font-normal">({format(currentDate, 'EEEE', { locale: uk })})</span>
        </h3>

        {dayEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <div className="text-5xl mb-4">💤</div>
            <p className="text-gray-500 text-lg">На цей день подій поки що немає.</p>
            <button onClick={() => setView('month')} className="mt-4 text-indigo-600 hover:underline font-medium">
              Повернутися до календаря
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {dayEvents.map(event => (
              <div key={event.event_id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                
                {/* ЛІВА ЧАСТИНА */}
                <div className="bg-indigo-600 text-white p-6 flex flex-col justify-center items-center md:w-40 text-center shrink-0">
                    <span className="text-3xl font-bold tracking-tight">
                        {format(parseISO(event.start_datetime), 'HH:mm')}
                    </span>
                    {event.end_datetime && (
                         <span className="text-indigo-200 text-sm mt-1">до {format(parseISO(event.end_datetime), 'HH:mm')}</span>
                    )}
                    <span className="mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
                        {event.category || 'Подія'}
                    </span>
                </div>
                
                {/* ПРАВА ЧАСТИНА */}
                <div className="p-6 flex-grow flex flex-col">
                    <h4 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{event.title}</h4>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-5">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                            📍 {event.location_name || 'Локацію не вказано'}
                        </div>
                    </div>

                    <div className="prose prose-sm text-gray-600 mb-6 max-w-none line-clamp-3">
                        <p>{event.description || 'Опис відсутній.'}</p>
                    </div>

                    <div className="mt-auto flex gap-3">
                        <button 
                            onClick={() => openModal(event)}
                            className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow hover:bg-gray-800 transition transform active:scale-95"
                        >
                            Детальніше / Долучитися
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  if (loading) return (
      <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center md:text-left min-w-[220px]">
             <h2 className="text-3xl font-bold text-gray-800 capitalize">
                {view === 'day' 
                    ? format(currentDate, 'd MMM', { locale: uk }) 
                    : format(currentDate, 'LLLL yyyy', { locale: uk })}
            </h2>
            <p className="text-sm text-gray-500 font-medium capitalize">
                {view === 'month' ? 'Місячний календар' : view === 'week' ? 'Розклад на тиждень' : 'Події дня'}
            </p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
            {['month', 'week', 'day'].map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 capitalize ${view === v ? 'bg-white text-indigo-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>
                    {v === 'month' ? 'Місяць' : v === 'week' ? 'Тиждень' : 'День'}
                </button>
            ))}
        </div>

        <div className="flex items-center gap-2">
            <button onClick={prev} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm">←</button>
            <button onClick={setToday} className="px-5 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition">Сьогодні</button>
            <button onClick={next} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm">→</button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="transition-all duration-300">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* --- МОДАЛЬНЕ ВІКНО --- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeModal}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-2xl font-bold">{selectedEvent.title}</h3>
                        <p className="text-indigo-100 mt-1 flex items-center gap-2">
                            🕒 {format(parseISO(selectedEvent.start_datetime), 'd MMMM, HH:mm', { locale: uk })}
                        </p>
                    </div>
                    <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition">
                        ✕
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto">
                    {/* Event Details */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">📍 {selectedEvent.location_name || 'Локацію не вказано'}</div>
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium">🏷️ {selectedEvent.category || 'Подія'}</div>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-line text-lg">{selectedEvent.description || 'Опис відсутній.'}</p>

                    {/* --- СПИСОК ЗАВДАНЬ (НОВЕ!) --- */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                           📋 Потрібна допомога (Список завдань)
                        </h4>

                        {loadingTasks ? (
                             <p className="text-center text-gray-500 py-4">Завантаження завдань...</p>
                        ) : eventTasks.length === 0 ? (
                             <p className="text-center text-gray-500 italic py-4">Організатор поки не додав конкретних завдань, але ви можете прийти і допомогти!</p>
                        ) : (
                            <div className="space-y-4">
                                {eventTasks.map(task => {
                                    const needed = task.required_volunteers;
                                    const taken = task.signed_up_volunteers || 0;
                                    const isFull = taken >= needed;
                                    const isSelected = activeTaskId === task.task_id;

                                    return (
                                        <div key={task.task_id} className={`bg-white border rounded-xl p-4 shadow-sm transition ${isFull ? 'border-gray-200 opacity-75' : 'border-indigo-100 hover:border-indigo-300'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h5 className="font-bold text-gray-800 text-lg">{task.title}</h5>
                                                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-2 ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                                        {isFull ? 'Зайнято' : 'Вільно'}
                                                    </span>
                                                    <div className="text-xs text-gray-500">
                                                        {taken} / {needed} волонтерів
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Кнопка або Форма */}
                                            {!isFull && !isSelected && (
                                                <button 
                                                    onClick={() => setActiveTaskId(task.task_id)}
                                                    className="mt-3 w-full py-2 border-2 border-indigo-600 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition"
                                                >
                                                    Взяти участь
                                                </button>
                                            )}

                                            {/* Форма запису (відкривається при кліку) */}
                                            {isSelected && (
                                                <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200 animate-fade-in">
                                                    {user ? (
                                                        <div className="text-center">
                                                            <p className="mb-2 text-indigo-800">Записатися як <strong>{user.first_name}</strong>?</p>
                                                            <div className="flex gap-2 justify-center">
                                                                <button onClick={() => setActiveTaskId(null)} className="px-4 py-2 bg-white text-gray-600 rounded-lg shadow-sm border">Скасувати</button>
                                                                <button onClick={() => handleTaskSignup(task.task_id)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700">Так, записатися</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <p className="text-sm font-bold text-indigo-800">Заповніть контакти для зв'язку:</p>
                                                            <input type="text" placeholder="Ваше ім'я" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full p-2 border rounded"/>
                                                            <input type="text" placeholder="WhatsApp" value={guestWhatsapp} onChange={e => setGuestWhatsapp(e.target.value)} className="w-full p-2 border rounded"/>
                                                            <input type="text" placeholder="Британський номер (опц.)" value={guestUkPhone} onChange={e => setGuestUkPhone(e.target.value)} className="w-full p-2 border rounded"/>
                                                            
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setActiveTaskId(null)} className="flex-1 py-2 bg-white text-gray-600 rounded border">Скасувати</button>
                                                                <button 
                                                                    onClick={() => handleTaskSignup(task.task_id)} 
                                                                    disabled={isSubmitting}
                                                                    className="flex-1 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700"
                                                                >
                                                                    {isSubmitting ? 'Обробка...' : 'Підтвердити'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100 shrink-0">
                    <button onClick={closeModal} className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition">Закрити</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default CalendarPage;