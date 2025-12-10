import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, addDays, subDays, parseISO 
} from 'date-fns';
import { uk } from 'date-fns/locale';

const CalendarPage = ({ API_URL, user, targetEvent, onTargetHandled }) => {
  const [events, setEvents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); 
  
  // Modal & Forms
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventTasks, setEventTasks] = useState([]); 
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [mode, setMode] = useState('view'); 
  const [activeTaskId, setActiveTaskId] = useState(null); 
  
  // Form Inputs
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestUkPhone, setGuestUkPhone] = useState('');
  const [volComment, setVolComment] = useState(''); 
  
  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regAdults, setRegAdults] = useState(1);
  const [regChildren, setRegChildren] = useState(0);
  const [regComment, setRegComment] = useState(''); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Новий стейт для QR джерела
  const [isQrSource, setIsQrSource] = useState(false);

  // 1. Fetch Events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events/public`);
      setEvents(response.data || []);
    } catch (error) {
      console.error("Error events:", error);
      setEvents([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [API_URL]);

  // --- ОБРОБКА ПЕРЕХОДУ З НОВИН / QR КОДУ ---
  useEffect(() => {
      // 1. Перевірка на QR-код
      const params = new URLSearchParams(window.location.search);
      if (params.get('source') === 'qr') {
          setIsQrSource(true);
      }

      // 2. Відкриття конкретної події
      if (targetEvent && events.length > 0) {
          const eventToOpen = events.find(e => e.event_id === targetEvent.id);
          
          if (eventToOpen) {
              setCurrentDate(new Date(targetEvent.date));
              setSelectedEvent(eventToOpen);
              
              // Якщо це QR, відразу відкриваємо реєстрацію, інакше - Інфо
              if (params.get('source') === 'qr') {
                  setMode('register');
              } else {
                  setMode('view');
              }
              
              fetchTasksForEvent(eventToOpen.event_id);
              if (onTargetHandled) onTargetHandled();
          }
      }

      // 3. Автозаповнення з телефону (LocalStorage)
      if (!user) {
        const savedName = localStorage.getItem('u_guest_name');
        const savedContact = localStorage.getItem('u_guest_contact');
        if (savedName) { setGuestName(savedName); setRegName(savedName); }
        if (savedContact) { setGuestWhatsapp(savedContact); setRegContact(savedContact); }
      }
  }, [targetEvent, events, onTargetHandled, user]); 

  const fetchTasksForEvent = async (eventId) => {
      setLoadingTasks(true);
      try {
          const response = await axios.get(`${API_URL}/tasks/public/${eventId}`);
          setEventTasks(response.data || []);
      } catch (error) {
          console.error("Error tasks:", error);
          setEventTasks([]);
      } finally {
          setLoadingTasks(false);
      }
  };

  // Nav
  const next = () => { if (view === 'month') setCurrentDate(addMonths(currentDate, 1)); if (view === 'week') setCurrentDate(addWeeks(currentDate, 1)); if (view === 'day') setCurrentDate(addDays(currentDate, 1)); };
  const prev = () => { if (view === 'month') setCurrentDate(subMonths(currentDate, 1)); if (view === 'week') setCurrentDate(subWeeks(currentDate, 1)); if (view === 'day') setCurrentDate(subDays(currentDate, 1)); };
  const setToday = () => setCurrentDate(new Date());

  const openModal = (event) => {
    setSelectedEvent(event);
    setMode('view'); 
    fetchTasksForEvent(event.event_id); 
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setEventTasks([]);
    setActiveTaskId(null);
    setGuestName(''); setGuestWhatsapp(''); setGuestUkPhone(''); setVolComment('');
    setRegName(''); setRegContact(''); setRegAdults(1); setRegChildren(0); setRegComment('');
    setIsSubmitting(false);
  };

  // Forms Logic
  const handleEventRegistration = async () => {
    let contactToSend = user?.whatsapp || regContact;
    let nameToSend = user ? `${user.first_name} ${user.last_name || ''}` : regName;

    // ЛОГІКА ВАЛІДАЦІЇ
    if (!isQrSource) {
        // Якщо це звичайна реєстрація (не QR) - вимагаємо дані
        if (!contactToSend) { alert("Будь ласка, вкажіть номер WhatsApp для зв'язку!"); return; }
        if (!nameToSend) { alert("Будь ласка, вкажіть ваше Ім'я!"); return; }
    } else {
        // Якщо це QR вхід і поля пусті - заповнюємо автоматично
        if (!nameToSend) nameToSend = "Гість (QR-CheckIn)";
        if (!contactToSend) contactToSend = "On-site"; 
    }

    setIsSubmitting(true);
    try {
        await axios.post(`${API_URL}/events/register`, {
            event_id: selectedEvent.event_id,
            user_id: user?.user_id || null,
            name: nameToSend,
            contact: contactToSend, 
            adults: parseInt(regAdults),
            children: parseInt(regChildren),
            comment: regComment
        });
        
        // Зберігаємо в телефон тільки якщо людина реально щось ввела
        if (!user && regName && regContact) {
            localStorage.setItem('u_guest_name', regName);
            localStorage.setItem('u_guest_contact', regContact);
        }

        alert(`🎉 Ласкаво просимо! Враховано: ${parseInt(regAdults) + parseInt(regChildren)} чол.`);
        closeModal();
    } catch (error) {
        alert(`Помилка: ${error.response?.data?.message || 'Спробуйте пізніше'}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleTaskSignup = async (taskId) => {
    const contactToSend = user?.whatsapp || guestWhatsapp;

    // Зберігаємо дані перед відправкою, якщо вони введені
    if (!user && guestName && guestWhatsapp) {
        localStorage.setItem('u_guest_name', guestName);
        localStorage.setItem('u_guest_contact', guestWhatsapp);
    }

    if (!contactToSend) { alert("Введіть номер WhatsApp!"); return; }
    
    setIsSubmitting(true);
    try {
        const payload = user ? {
             task_id: taskId,
             name: user.first_name,
             whatsapp: contactToSend,
             uk_phone: user.uk_phone || '',
             comment: volComment
        } : {
             task_id: taskId,
             name: guestName,
             whatsapp: guestWhatsapp,
             uk_phone: guestUkPhone,
             comment: volComment
        };

        if (!user && !guestName) { alert("Введіть Ім'я!"); setIsSubmitting(false); return; }

        await axios.post(`${API_URL}/tasks/guest-signup`, payload);
        alert("Ви успішно записані!");
        setActiveTaskId(null); 
        fetchTasksForEvent(selectedEvent.event_id); 
        setVolComment('');
    } catch (error) {
        alert("Помилка запису.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const getEventsForDay = (day) => {
    if (!events || !Array.isArray(events)) return [];
    return events.filter(event => isSameDay(parseISO(event.start_datetime), day));
  };

  const formatText = (text) => {
    if (!text) return <p className="text-gray-500 italic">Опис відсутній.</p>;
    
    return text.split('\n').map((line, index) => (
        <p key={index} className="mb-2 min-h-[1rem] break-words whitespace-pre-wrap">
            {line.split(' ').map((word, wordIndex) => {
                const isUrl = word.match(/^(https?:\/\/[^\s]+)/);
                if (isUrl) {
                    return (
                        <a 
                            key={wordIndex} 
                            href={word} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline font-bold break-all"
                            onClick={(e) => e.stopPropagation()} 
                        >
                            {word}{' '}
                        </a>
                    );
                }
                return word + ' ';
            })}
        </p>
    ));
  };

  // Render Views
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
          {weekDays.map(day => (<div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase">{day}</div>))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} onClick={() => { setCurrentDate(day); setView('day'); }} className={`min-h-[100px] bg-white p-1 cursor-pointer hover:bg-indigo-50 transition ${!isCurrentMonth && 'bg-gray-50/50 text-gray-400'}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : ''}`}>{format(day, 'd')}</span>
                  {dayEvents.length > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{dayEvents.length}</span>}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map(ev => (<div key={ev.event_id} className="text-[10px] truncate bg-indigo-50 text-indigo-700 px-1 rounded border-l-2 border-indigo-500">{format(parseISO(ev.start_datetime), 'HH:mm')} {ev.title}</div>))}
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
              <div className={`p-2 text-center border-b ${isToday ? 'bg-indigo-50' : ''} rounded-t-xl`}><p className="text-xs text-gray-500 uppercase">{format(day, 'EEEE', { locale: uk })}</p><p className={`text-lg font-bold ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{format(day, 'd MMM', { locale: uk })}</p></div>
              <div className="p-2 space-y-2 flex-grow">
                {dayEvents.length === 0 ? (<p className="text-xs text-center text-gray-400 italic mt-4">--</p>) : (dayEvents.map(ev => (
                    <div key={ev.event_id} onClick={(e) => { e.stopPropagation(); openModal(ev); }} className="cursor-pointer bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md p-2 rounded-lg transition group">
                      <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{format(parseISO(ev.start_datetime), 'HH:mm')}</span></div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-indigo-700">{ev.title}</p>
                    </div>
                  )))}
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
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">📅 {format(currentDate, 'd MMMM yyyy', { locale: uk })} <span className="text-gray-400 text-lg font-normal">({format(currentDate, 'EEEE', { locale: uk })})</span></h3>
        {dayEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-dashed border-gray-300"><div className="text-5xl mb-4">💤</div><p className="text-gray-500 text-lg">На цей день подій поки що немає.</p><button onClick={() => setView('month')} className="mt-4 text-indigo-600 hover:underline font-medium">Повернутися до календаря</button></div>
        ) : (
          <div className="space-y-6">
            {dayEvents.map(event => (
              <div key={event.event_id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                <div className="bg-indigo-600 text-white p-6 flex flex-col justify-center items-center md:w-40 text-center shrink-0"><span className="text-3xl font-bold tracking-tight">{format(parseISO(event.start_datetime), 'HH:mm')}</span>{event.end_datetime && (<span className="text-indigo-200 text-sm mt-1">до {format(parseISO(event.end_datetime), 'HH:mm')}</span>)}<span className="mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-medium uppercase tracking-wider backdrop-blur-sm">{event.category || 'Подія'}</span></div>
                <div className="p-6 flex-grow flex flex-col"><h4 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{event.title}</h4><div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-5"><div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">📍 {event.location_name || 'Локацію не вказано'}</div></div><div className="prose prose-sm text-gray-600 mb-6 max-w-none line-clamp-3"><p>{event.description || 'Опис відсутній.'}</p></div><div className="mt-auto flex gap-3"><button onClick={() => openModal(event)} className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow hover:bg-gray-800 transition transform active:scale-95">Детальніше / Долучитися</button></div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center md:text-left min-w-[220px]">
             <h2 className="text-3xl font-bold text-gray-800 capitalize">{view === 'day' ? format(currentDate, 'd MMM', { locale: uk }) : format(currentDate, 'LLLL yyyy', { locale: uk })}</h2>
            <p className="text-sm text-gray-500 font-medium capitalize">{view === 'month' ? 'Місячний календар' : view === 'week' ? 'Розклад на тиждень' : 'Події дня'}</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
            {['month', 'week', 'day'].map((v) => (<button key={v} onClick={() => setView(v)} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 capitalize ${view === v ? 'bg-white text-indigo-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{v === 'month' ? 'Місяць' : v === 'week' ? 'Тиждень' : 'День'}</button>))}
        </div>
        <div className="flex items-center gap-2">
            <button onClick={prev} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm">←</button>
            <button onClick={setToday} className="px-5 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition">Сьогодні</button>
            <button onClick={next} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm">→</button>
        </div>
      </div>

      <div className="transition-all duration-300">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={closeModal}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white shrink-0 rounded-t-2xl relative">
                    <button onClick={closeModal} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl transition">✕</button>
                    <h3 className="text-2xl font-bold pr-8">{selectedEvent.title}</h3>
                    <p className="opacity-90 mt-1 flex items-center gap-2">🕒 {format(parseISO(selectedEvent.start_datetime), 'd MMMM, HH:mm', { locale: uk })}</p>
                </div>

                <div className="flex border-b">
                    <button onClick={() => setMode('view')} className={`flex-1 py-3 font-bold text-sm uppercase tracking-wide transition ${mode === 'view' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>📖 Інфо</button>
                    <button onClick={() => setMode('register')} className={`flex-1 py-3 font-bold text-sm uppercase tracking-wide transition ${mode === 'register' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>🙋‍♂️ Я буду</button>
                    <button onClick={() => setMode('volunteer')} className={`flex-1 py-3 font-bold text-sm uppercase tracking-wide transition ${mode === 'volunteer' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>🤝 Допомогти</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    
                    {/* VIEW MODE */}
                    {mode === 'view' && (
                        <div className="space-y-6">
                             <div className="flex gap-2">
                                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-medium">📍 {selectedEvent.location_name || 'Локацію не вказано'}</span>
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium">🏷️ {selectedEvent.category || 'Подія'}</span>
                            </div>
                            
                            <div className="text-gray-700 text-lg leading-relaxed">
                                {formatText(selectedEvent.description)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <button onClick={() => setMode('register')} className="py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition">🎫 Зареєструватись на подію</button>
                                <button onClick={() => setMode('volunteer')} className="py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition">💪 Стати волонтером</button>
                            </div>
                        </div>
                    )}

                    {/* REGISTER MODE */}
                    {mode === 'register' && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="text-xl font-bold text-gray-800 text-center mb-4">
                                {isQrSource ? 'Швидка реєстрація (на вході)' : 'Реєстрація на подію'}
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(!user || !user.first_name) && (
                                    <label className="block text-sm font-medium text-gray-700">
                                        Ваше Ім'я {isQrSource ? <span className="text-gray-400 font-normal">(необов'язково)</span> : '*'}
                                        <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" placeholder="Іван" />
                                    </label>
                                )}
                                {(!user || !user.whatsapp) && (
                                    <label className="block text-sm font-medium text-gray-700">
                                        Контакт {isQrSource ? <span className="text-gray-400 font-normal">(необов'язково)</span> : '*'}
                                        <input type="text" value={regContact} onChange={e => setRegContact(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" placeholder="07..." />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block text-sm font-medium text-gray-700">Дорослих <input type="number" min="1" value={regAdults} onChange={e => setRegAdults(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" /></label>
                                <label className="block text-sm font-medium text-gray-700">Дітей <input type="number" min="0" value={regChildren} onChange={e => setRegChildren(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" /></label>
                            </div>

                            <label className="block text-sm font-medium text-gray-700">Коментар <textarea value={regComment} onChange={e => setRegComment(e.target.value)} className="mt-1 w-full p-2 border rounded-lg resize-none" rows="2" placeholder="Наприклад: потрібен стілець..."></textarea></label>

                            <button onClick={handleEventRegistration} disabled={isSubmitting} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl mt-4 hover:bg-green-700 shadow-md transition">{isSubmitting ? 'Обробка...' : `Підтвердити участь (${parseInt(regAdults) + parseInt(regChildren)} осіб)`}</button>
                        </div>
                    )}

                    {/* VOLUNTEER MODE */}
                    {mode === 'volunteer' && (
                        <div className="animate-fade-in">
                            <h4 className="text-xl font-bold text-gray-800 mb-4">Оберіть, чим можете допомогти:</h4>
                            {loadingTasks ? <p className="text-center text-gray-500">Завантаження завдань...</p> : (
                                <div className="space-y-4">
                                    {eventTasks.length === 0 ? <p className="text-center text-gray-500 italic">Організатор не створив специфічних завдань, але ви можете зв'язатися з ним напряму!</p> : eventTasks.map(task => {
                                        const isSelected = activeTaskId === task.task_id;
                                        const isFull = (task.signed_up_volunteers || 0) >= task.required_volunteers;
                                        return (
                                            <div key={task.task_id} className={`border rounded-xl p-4 transition ${isSelected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200'}`}>
                                                <div className="flex justify-between items-start"><div><h5 className="font-bold text-gray-800">{task.title}</h5><p className="text-sm text-gray-600">{task.description}</p></div><div className="text-right shrink-0 ml-4"><span className={`inline-block px-2 py-1 text-xs font-bold rounded-full mb-1 ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{isFull ? 'Зайнято' : 'Вільно'}</span><div className="text-xs text-gray-500">{task.signed_up_volunteers || 0} / {task.required_volunteers}</div></div></div>
                                                {!isFull && !isSelected && (<button onClick={() => setActiveTaskId(task.task_id)} className="mt-3 w-full py-2 border border-orange-500 text-orange-600 font-bold rounded-lg hover:bg-orange-500 hover:text-white transition text-sm">Зголоситися</button>)}
                                                {isSelected && (
                                                    <div className="mt-4 bg-white p-4 rounded-lg border border-orange-200 animate-fade-in">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                                            {(!user || !user.first_name) && <input type="text" placeholder="Ім'я" value={guestName} onChange={e => setGuestName(e.target.value)} className="p-2 border rounded text-sm w-full"/>}
                                                            {(!user || !user.whatsapp) && <input type="text" placeholder="WhatsApp" value={guestWhatsapp} onChange={e => setGuestWhatsapp(e.target.value)} className="p-2 border rounded text-sm w-full"/>}
                                                        </div>
                                                        <textarea placeholder="Ваш коментар..." value={volComment} onChange={e => setVolComment(e.target.value)} className="w-full p-2 border rounded text-sm mb-3 resize-none" rows="2"></textarea>
                                                        <div className="flex gap-2"><button onClick={() => setActiveTaskId(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200">Відміна</button><button onClick={() => handleTaskSignup(task.task_id)} className="flex-1 py-2 bg-orange-600 text-white rounded font-bold text-sm hover:bg-orange-700">Записатися</button></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;