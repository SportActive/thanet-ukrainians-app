import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { addDays, addWeeks, addMonths, parseISO, formatISO } from 'date-fns'; // Додали функції для роботи з датами

// --- КОМПОНЕНТ: ФОРМА ЗАВДАННЯ ---
const TaskForm = ({ eventId, eventTitle, API_URL, token, onSuccess, editingTask, onCancelEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requiredVolunteers, setRequiredVolunteers] = useState(1);
    const [deadlineTime, setDeadlineTime] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description || '');
            setRequiredVolunteers(editingTask.required_volunteers);
            setDeadlineTime(editingTask.deadline_time ? editingTask.deadline_time.slice(0, 16) : '');
        } else {
            setTitle(''); setDescription(''); setRequiredVolunteers(1); setDeadlineTime('');
        }
    }, [editingTask]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const taskData = { event_id: eventId, title, description, required_volunteers: parseInt(requiredVolunteers), deadline_time: deadlineTime || null };
        try {
            if (editingTask) {
                await axios.put(`${API_URL}/tasks/${editingTask.task_id}`, taskData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage(`✅ Завдання оновлено!`);
            } else {
                if (!eventId) { setMessage('❌ Спочатку оберіть подію.'); return; }
                await axios.post(`${API_URL}/tasks`, taskData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage(`✅ Завдання створено!`);
            }
            if (!editingTask) { setTitle(''); setDescription(''); setRequiredVolunteers(1); setDeadlineTime(''); }
            onSuccess();
        } catch (error) { setMessage(`❌ Помилка: ${error.response?.data?.message}`); }
    };

    return (
        <div className="p-4 bg-white shadow rounded border-l-4 border-indigo-500">
            <div className="flex justify-between items-center mb-2"><h4 className="font-bold">{editingTask ? '✏️ Редагувати' : '➕ Додати завдання'}</h4>{editingTask && <button onClick={onCancelEdit} className="text-red-500 text-xs">Відміна</button>}</div>
            {message && <p className="text-xs mb-2">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-2">
                <input className="w-full p-2 border rounded" placeholder="Назва" value={title} onChange={e=>setTitle(e.target.value)} required />
                <div className="flex gap-2">
                    <input className="w-1/2 p-2 border rounded" type="number" min="1" value={requiredVolunteers} onChange={e=>setRequiredVolunteers(e.target.value)} />
                    <input className="w-1/2 p-2 border rounded" type="datetime-local" value={deadlineTime} onChange={e=>setDeadlineTime(e.target.value)} />
                </div>
                <textarea className="w-full p-2 border rounded" placeholder="Опис" value={description} onChange={e=>setDescription(e.target.value)} />
                <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Зберегти</button>
            </form>
        </div>
    );
};

const TaskList = ({ tasks, loading, onEdit, onDelete }) => {
    if (loading) return <p>Loading...</p>;
    return (
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasks.map(t => (
                <div key={t.task_id} className="p-2 border rounded bg-gray-50 flex justify-between">
                    <div><p className="font-bold text-sm">{t.title}</p><p className="text-xs">{t.signed_up_volunteers}/{t.required_volunteers}</p></div>
                    <div className="flex gap-1"><button onClick={()=>onEdit(t)}>✏️</button><button onClick={()=>onDelete(t.task_id)}>🗑️</button></div>
                </div>
            ))}
        </div>
    );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ---
const AdminDashboard = ({ user, API_URL }) => {
    const [view, setView] = useState('events'); 
    const token = localStorage.getItem('token');
    const [message, setMessage] = useState('');

    // --- STATES ---
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    
    // --- REPEAT MODAL STATE ---
    const [repeatModalOpen, setRepeatModalOpen] = useState(false);
    const [eventToRepeat, setEventToRepeat] = useState(null);
    const [repeatCount, setRepeatCount] = useState(1); // Скільки разів повторити
    const [repeatIntervalType, setRepeatIntervalType] = useState('week'); // week, day
    const [repeatIntervalValue, setRepeatIntervalValue] = useState(1); // кожні X тижнів
    const [isRepeating, setIsRepeating] = useState(false);
    // --------------------------

    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [stats, setStats] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // --- STATES FOR NEWS ---
    const [newsList, setNewsList] = useState([]);
    const [editingNews, setEditingNews] = useState(null);
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [newsImage, setNewsImage] = useState('');
    const [isNews, setIsNews] = useState(true); 
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [newsEventId, setNewsEventId] = useState('');

    // Event Form Fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationName, setLocationName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('Social');

    const categories = [{ value: 'Education', label: 'Освітня' }, { value: 'Charity', label: 'Благодійна' }, { value: 'Excursion', label: 'Екскурсія' }, { value: 'Social', label: 'Соціальна' }];

    // --- FETCHES ---
    const fetchEvents = async () => { 
        setLoadingEvents(true); 
        try { 
            const res = await axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }); 
            const sortedEvents = res.data.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
            setEvents(sortedEvents); 
        } catch (e) {
            console.error(e);
        } finally { 
            setLoadingEvents(false); 
        } 
    };

    const fetchTasks = async (id) => { if(!id) return; setLoadingTasks(true); try { const res = await axios.get(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setTasks(res.data); } catch (e) {} finally { setLoadingTasks(false); } };
    const fetchUsers = async () => { if(user.role !== 'Admin') return; setLoadingUsers(true); try { const res = await axios.get(`${API_URL}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }); setUsers(res.data); } catch (e) {} finally { setLoadingUsers(false); } };
    const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/events/stats/global`, { headers: { Authorization: `Bearer ${token}` } }); setStats(res.data); } catch(e){} };
    const fetchEventDetails = async (id) => { if(!id) return; setLoadingDetails(true); try { const res = await axios.get(`${API_URL}/events/${id}/details`, { headers: { Authorization: `Bearer ${token}` } }); setEventDetails(res.data); } catch(e){} finally { setLoadingDetails(false); } };
    
    const fetchNews = async () => { 
        try { 
            const res = await axios.get(`${API_URL}/news/public`); 
            const sortedNews = res.data.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA || b.news_id - a.news_id;
            });
            setNewsList(sortedNews); 
        } catch (error) { console.error(error); } 
    };

    useEffect(() => { fetchEvents(); if (user.role === 'Admin') fetchUsers(); fetchNews(); }, []);
    useEffect(() => { if (view === 'tasks' && selectedEventId) fetchTasks(selectedEventId); if (view === 'stats') fetchStats(); if (view === 'news') fetchNews(); }, [selectedEventId, view]);

    // --- HANDLERS ---
    const handleSaveEvent = async (e) => { e.preventDefault(); setMessage(''); const data = { title, description, location_name: locationName, start_datetime: startDate, end_datetime: endDate || null, is_published: true, category }; try { if(editingEvent) await axios.put(`${API_URL}/events/${editingEvent.event_id}`, data, { headers: { Authorization: `Bearer ${token}` } }); else await axios.post(`${API_URL}/events`, data, { headers: { Authorization: `Bearer ${token}` } }); setMessage('✅ Успішно!'); setEditingEvent(null); setTitle(''); setDescription(''); setLocationName(''); setStartDate(''); setEndDate(''); fetchEvents(); } catch (e) { setMessage('❌ Помилка'); } };
    const startEditEvent = (ev) => { setEditingEvent(ev); setTitle(ev.title); setCategory(ev.category); setStartDate(ev.start_datetime.slice(0,16)); setEndDate(ev.end_datetime?.slice(0,16) || ''); setLocationName(ev.location_name); setDescription(ev.description); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleDeleteEvent = async (id) => { if(!window.confirm('Видалити?')) return; try { await axios.delete(`${API_URL}/events/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchEvents(); } catch(e){alert('Помилка');} };
    const handleDeleteTask = async (id) => { try { await axios.delete(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchTasks(selectedEventId); } catch(e){alert('Помилка');} };
    const handleRoleChange = async (uid, role) => { try { await axios.put(`${API_URL}/auth/users/${uid}/role`, {role}, { headers: { Authorization: `Bearer ${token}` } }); setMessage(`Роль змінено на ${role}`); fetchUsers(); } catch(e){ alert('Error'); } };

    // --- ЛОГІКА ПОВТОРЕННЯ ПОДІЙ ---
    const openRepeatModal = (ev) => {
        setEventToRepeat(ev);
        setRepeatModalOpen(true);
        setMessage('');
    };

    const handleRepeatEvent = async () => {
        if (!eventToRepeat) return;
        setIsRepeating(true);
        setMessage('🔄 Створення копій, зачекайте...');

        try {
            // 1. Отримуємо список завдань для оригінальної події
            let originalTasks = [];
            try {
                const tasksRes = await axios.get(`${API_URL}/tasks/${eventToRepeat.event_id}`, { headers: { Authorization: `Bearer ${token}` } });
                originalTasks = tasksRes.data;
            } catch (err) {
                console.warn('Не вдалося отримати завдання, копіюємо лише подію');
            }

            const baseDate = parseISO(eventToRepeat.start_datetime);
            const hasEndDate = !!eventToRepeat.end_datetime;
            const duration = hasEndDate ? (parseISO(eventToRepeat.end_datetime) - baseDate) : 0;

            // 2. Цикл створення копій
            for (let i = 1; i <= repeatCount; i++) {
                let newStartDate;
                
                // Розрахунок нової дати
                if (repeatIntervalType === 'week') {
                    newStartDate = addWeeks(baseDate, i * repeatIntervalValue);
                } else if (repeatIntervalType === 'day') {
                    newStartDate = addDays(baseDate, i * repeatIntervalValue);
                } else if (repeatIntervalType === 'month') {
                    newStartDate = addMonths(baseDate, i * repeatIntervalValue);
                }

                const newEndDate = hasEndDate ? new Date(newStartDate.getTime() + duration) : null;

                // Формування даних події
                const eventData = {
                    title: eventToRepeat.title,
                    description: eventToRepeat.description,
                    location_name: eventToRepeat.location_name,
                    start_datetime: formatISO(newStartDate), // перетворення в ISO рядок
                    end_datetime: newEndDate ? formatISO(newEndDate) : null,
                    is_published: true,
                    category: eventToRepeat.category
                };

                // Створення події
                const createRes = await axios.post(`${API_URL}/events`, eventData, { headers: { Authorization: `Bearer ${token}` } });
                const newEventId = createRes.data.eventId || createRes.data.insertId; // Залежить від того, що повертає бекенд

                // Створення завдань для нової події
                if (originalTasks.length > 0 && newEventId) {
                    for (const task of originalTasks) {
                        const taskData = {
                            event_id: newEventId,
                            title: task.title,
                            description: task.description,
                            required_volunteers: task.required_volunteers,
                            deadline_time: null // Дедлайн складніше перерахувати, краще залишити пустим або додати логіку
                        };
                        await axios.post(`${API_URL}/tasks`, taskData, { headers: { Authorization: `Bearer ${token}` } });
                    }
                }
            }

            setMessage(`✅ Успішно створено ${repeatCount} копій!`);
            setRepeatModalOpen(false);
            fetchEvents(); // Оновити список
        } catch (error) {
            console.error(error);
            setMessage('❌ Помилка при копіюванні. Можливо, частина подій створилася.');
        } finally {
            setIsRepeating(false);
        }
    };

    // --- NEWS HANDLERS ---
    const startEditNews = (n) => { setEditingNews(n); setNewsTitle(n.title); setNewsContent(n.content); setNewsImage(n.image_url || ''); setIsNews(n.is_news); setIsAnnouncement(n.is_announcement); setNewsEventId(n.event_id || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); setMessage('✏️ Режим редагування'); };
    const cancelEditNews = () => { setEditingNews(null); setNewsTitle(''); setNewsContent(''); setNewsImage(''); setNewsEventId(''); setIsNews(true); setIsAnnouncement(false); setMessage(''); };
    const handleSaveNews = async (e) => { e.preventDefault(); const newsData = { title: newsTitle, content: newsContent, image_url: newsImage, is_news: isNews, is_announcement: isAnnouncement, event_id: newsEventId || null }; try { if (editingNews) { await axios.put(`${API_URL}/news/${editingNews.news_id}`, newsData, { headers: { Authorization: `Bearer ${token}` } }); setMessage('✅ Зміни збережено!'); setEditingNews(null); } else { await axios.post(`${API_URL}/news`, newsData, { headers: { Authorization: `Bearer ${token}` } }); setMessage('✅ Опубліковано!'); } setNewsTitle(''); setNewsContent(''); setNewsImage(''); setNewsEventId(''); setIsNews(true); setIsAnnouncement(false); fetchNews(); } catch (error) { setMessage('❌ Помилка збереження.'); } };
    const handleDeleteNews = async (id) => { if(!window.confirm('Видалити?')) return; try { await axios.delete(`${API_URL}/news/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchNews(); } catch (error) { alert('Помилка'); } };

    // --- RENDERS ---
    const renderEventsView = () => ( 
        <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={handleSaveEvent} className="bg-white p-4 shadow rounded space-y-3">
                <h3 className="font-bold text-lg">{editingEvent?'Редагувати':'Створити'} Подію</h3>
                {message && <p className="text-green-600 font-medium">{message}</p>}
                <input className="w-full p-2 border rounded" placeholder="Назва" value={title} onChange={e=>setTitle(e.target.value)} required />
                <select className="w-full p-2 border rounded" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <div className="flex gap-2"><input type="datetime-local" className="w-1/2 p-2 border rounded" value={startDate} onChange={e=>setStartDate(e.target.value)} required /><input type="datetime-local" className="w-1/2 p-2 border rounded" value={endDate} onChange={e=>setEndDate(e.target.value)} /></div>
                <input className="w-full p-2 border rounded" placeholder="Локація" value={locationName} onChange={e=>setLocationName(e.target.value)} required />
                <textarea className="w-full p-2 border rounded" placeholder="Опис" value={description} onChange={e=>setDescription(e.target.value)} rows="3" required />
                <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded">Зберегти</button>
                {editingEvent && <button type="button" onClick={() => setEditingEvent(null)} className="w-full bg-gray-300 p-2 rounded mt-2">Скасувати</button>}
            </form>
            
            <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                <h4 className="font-bold mb-2">Список Подій</h4>
                {events.map(ev => (
                    <div key={ev.event_id} className="bg-white p-2 mb-2 border rounded flex justify-between group">
                        <div>
                            <p className="font-bold text-gray-800">{ev.title}</p>
                            <p className="text-xs text-gray-500">{new Date(ev.start_datetime).toLocaleDateString()} {ev.first_name && (<span className="ml-2 bg-indigo-50 text-indigo-700 px-1.5 rounded font-bold">👤 {ev.first_name} {ev.last_name}</span>)}</p>
                        </div>
                        <div className="flex gap-1 items-start">
                            <button onClick={()=>openRepeatModal(ev)} className="px-2 py-1 border rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold" title="Дублювати подію">🔁</button>
                            <button onClick={()=>startEditEvent(ev)} className="px-2 py-1 border rounded hover:bg-gray-100">✏️</button>
                            <button onClick={()=>handleDeleteEvent(ev.event_id)} className="px-2 py-1 border rounded hover:bg-red-50 text-red-500">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div> 
    );
    
    const renderTasksView = () => ( <div className="bg-white p-4 rounded shadow"><h3 className="font-bold mb-4">Завдання</h3><select className="w-full p-2 border rounded mb-4" onChange={e => {setSelectedEventId(e.target.value); setEditingTask(null);}}><option value="">Оберіть подію...</option>{events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}</select>{selectedEventId && (<div className="grid md:grid-cols-2 gap-4"><div><TaskForm eventId={selectedEventId} eventTitle="" API_URL={API_URL} token={token} editingTask={editingTask} onCancelEdit={()=>setEditingTask(null)} onSuccess={()=>{fetchTasks(selectedEventId); setEditingTask(null);}} /></div><div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Список Завдань</h4><TaskList tasks={tasks} loading={loadingTasks} onEdit={(task) => { setEditingTask(task); window.scrollTo({ top: 200, behavior: 'smooth' }); }} onDelete={handleDeleteTask}/></div></div>)}</div> );
    
    // --- [ОНОВЛЕНА] СТАТИСТИКА З ГРУПУВАННЯМ ---
    const renderStatsView = () => ( 
        <div className="space-y-6">
            <h3 className="font-bold text-2xl">Статистика</h3>
            {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded shadow text-center"><p>Подій</p><p className="text-2xl font-bold">{stats.total_events}</p></div>
                <div className="bg-white p-4 rounded shadow text-center"><p>Активних</p><p className="text-2xl font-bold">{stats.future_events}</p></div>
                <div className="bg-white p-4 rounded shadow text-center"><p>Волонтерів</p><p className="text-2xl font-bold">{stats.unique_volunteers}</p></div>
                <div className="bg-white p-4 rounded shadow text-center"><p>Відвідувань</p><p className="text-2xl font-bold">{stats.total_attendees}</p></div>
            </div>}
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h4 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Деталі по події</h4>
                <select className="w-full p-3 border rounded-lg mb-6 bg-gray-50" onChange={e => fetchEventDetails(e.target.value)}>
                    <option value="">-- Оберіть подію для перегляду --</option>
                    {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}
                </select>
                
                {eventDetails && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. ГОСТІ (ЗАГАЛЬНИЙ СПИСОК) */}
                        <div className="bg-green-50/70 p-4 rounded-xl border border-green-200">
                            <h5 className="font-bold text-green-800 mb-3 text-lg flex items-center gap-2">
                                🙋‍♂️ Гості <span className="bg-green-200 text-green-900 px-2 py-0.5 rounded text-sm">{eventDetails.attendees.reduce((acc, curr) => acc + curr.adults_count + curr.children_count, 0)}</span>
                            </h5>
                            <ul className="text-sm space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {eventDetails.attendees.length === 0 ? <p className="italic text-gray-500">Ще ніхто не записався.</p> : 
                                eventDetails.attendees.map(a => (
                                    <li key={a.registration_id} className="bg-white p-3 rounded-lg shadow-sm border border-green-100">
                                        <div className="font-bold text-gray-800 text-base">{a.guest_name}</div>
                                        <div className="text-gray-600">📞 {a.guest_contact}</div>
                                        <div className="text-xs font-bold text-gray-500 mt-1">Дорослі: {a.adults_count}, Діти: {a.children_count}</div>
                                        {a.comment && <div className="text-xs bg-yellow-50 text-yellow-800 p-2 mt-2 rounded border border-yellow-100 italic">"{a.comment}"</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {/* 2. ВОЛОНТЕРИ (ЗГРУПОВАНІ ПО ЗАВДАННЯХ) */}
                        <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200">
                            <h5 className="font-bold text-orange-800 mb-3 text-lg flex items-center gap-2">
                                🤝 Волонтери <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded text-sm">{eventDetails.volunteers.length}</span>
                            </h5>
                            
                            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {eventDetails.tasks && eventDetails.tasks.map(task => {
                                    const taskVolunteers = eventDetails.volunteers.filter(v => v.task_id === task.task_id);
                                    
                                    return (
                                        <div key={task.task_id} className="bg-white rounded-lg shadow-sm border border-orange-100 overflow-hidden">
                                            <div className="bg-orange-100/50 px-3 py-2 flex justify-between items-center border-b border-orange-100">
                                                <span className="font-bold text-orange-900">{task.title}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${taskVolunteers.length >= task.required_volunteers ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {taskVolunteers.length} / {task.required_volunteers}
                                                </span>
                                            </div>
                                            <div className="p-2">
                                                {taskVolunteers.length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic pl-2">Поки нікого...</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {taskVolunteers.map(v => (
                                                            <li key={v.signup_id} className="text-sm p-2 bg-gray-50 rounded border border-gray-100">
                                                                <div className="font-bold text-gray-800">{v.guest_name}</div>
                                                                <div className="text-gray-600 text-xs">📞 {v.guest_whatsapp}</div>
                                                                {v.comment && <div className="text-xs text-blue-600 mt-1 italic">"{v.comment}"</div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {eventDetails.tasks && eventDetails.tasks.length === 0 && <p className="text-gray-500 italic">Завдань не створено.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div> 
    );

    const renderUsersView = () => ( 
        <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-200">
            <h3 className="font-bold text-2xl mb-6 text-purple-800">Керування Користувачами</h3>
            {message && <p className="text-green-600 mb-4 bg-green-50 p-2 rounded">{message}</p>}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full leading-normal text-left">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-600 font-bold">
                            <th className="px-5 py-3">Ім'я / ID</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">WhatsApp</th>
                            <th className="px-5 py-3">UK Phone</th>
                            <th className="px-5 py-3">Роль</th>
                            <th className="px-5 py-3">Дія</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.user_id} className="border-b hover:bg-gray-50 transition">
                                <td className="px-5 py-4">
                                    <div className="font-bold text-gray-900">{u.first_name} {u.last_name}</div>
                                    <div className="text-xs text-gray-400">ID: {u.user_id}</div>
                                </td>
                                <td className="px-5 py-4 text-sm text-gray-600">{u.email}</td>
                                <td className="px-5 py-4 text-sm font-medium text-green-700">{u.whatsapp || <span className="text-gray-300">-</span>}</td>
                                <td className="px-5 py-4 text-sm text-gray-600">{u.uk_phone || <span className="text-gray-300">-</span>}</td>
                                <td className="px-5 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-red-100 text-red-800' : u.role === 'Organizer' ? 'bg-green-100 text-green-800' : u.role === 'Editor' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <select value={u.role} onChange={(e) => handleRoleChange(u.user_id, e.target.value)} disabled={u.user_id === user.user_id} className="border rounded p-1 text-sm bg-white cursor-pointer hover:border-purple-400">
                                        <option value="User">User</option><option value="Organizer">Organizer</option><option value="Admin">Admin</option><option value="Editor">Editor</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div> 
    );

    const renderNewsView = () => ( <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in"><div className="lg:col-span-2 bg-white p-6 shadow-xl rounded-xl border border-pink-200"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-semibold text-pink-700">{editingNews ? '✏️ Редагування' : '📢 Публікація'}</h3>{editingNews && <button onClick={cancelEditNews} className="text-sm bg-gray-100 px-3 py-1 rounded">Скасувати</button>}</div>{message && <div className="p-3 bg-blue-50 text-blue-800 rounded mb-4">{message}</div>}<form onSubmit={handleSaveNews} className="space-y-4"><div><label className="block font-medium text-gray-700 mb-2">Тип публікації</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-2 rounded-lg border border-blue-100"><input type="checkbox" checked={isNews} onChange={(e) => setIsNews(e.target.checked)} className="w-5 h-5 text-blue-600" /><span className="font-bold text-blue-800">📰 Новина</span></label><label className="flex items-center gap-2 cursor-pointer bg-pink-50 px-3 py-2 rounded-lg border border-pink-100"><input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} className="w-5 h-5 text-pink-600" /><span className="font-bold text-pink-800">📣 Анонс події</span></label></div></div><input type="text" placeholder="Заголовок" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} required className="w-full p-3 border rounded-lg" /><div><label className="block text-sm font-medium text-gray-700 mb-1">Прив'язати до події</label><select value={newsEventId} onChange={e => setNewsEventId(e.target.value)} className="w-full p-3 border rounded-lg bg-white"><option value="">-- Без прив'язки --</option>{events.map(ev => (<option key={ev.event_id} value={ev.event_id}>{ev.title} ({new Date(ev.start_datetime).toLocaleDateString()})</option>))}</select></div><input type="text" placeholder="URL картинки" value={newsImage} onChange={e => setNewsImage(e.target.value)} className="w-full p-3 border rounded-lg" /><textarea placeholder="Текст..." value={newsContent} onChange={e => setNewsContent(e.target.value)} rows="5" required className="w-full p-3 border rounded-lg" /><button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition ${editingNews ? 'bg-orange-500' : 'bg-pink-600 hover:bg-pink-700'}`}>{editingNews ? 'Зберегти Зміни' : 'Опублікувати'}</button></form></div><div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-fit max-h-[800px] overflow-y-auto"><h4 className="font-bold text-gray-700 mb-4 sticky top-0 bg-gray-50 pb-2">Архіви</h4>{newsList.map(n => (<div key={n.news_id} className={`bg-white p-3 mb-3 rounded shadow-sm border flex flex-col gap-2 ${editingNews?.news_id === n.news_id ? 'ring-2 ring-orange-400' : ''}`}>{n.image_url && <img src={n.image_url} alt="preview" className="w-full h-24 object-cover rounded" />}<div className="flex gap-2 flex-wrap">{n.is_news && <span className="text-xs px-2 py-1 rounded text-white bg-blue-500">Новина</span>}{n.is_announcement && <span className="text-xs px-2 py-1 rounded text-white bg-pink-500">Анонс</span>}</div><h5 className="font-bold mt-1">{n.title}</h5><div className="flex gap-2 justify-end mt-2"><button onClick={() => startEditNews(n)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-2 py-1">✏️</button><button onClick={() => handleDeleteNews(n.news_id)} className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-2 py-1">🗑️</button></div></div>))}</div></div> );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl relative">
            <h2 className="text-3xl font-bold mb-4">Панель Керування ({user.role})</h2>
            <div className="flex space-x-2 overflow-x-auto border-b mb-6 pb-1">
                <button onClick={() => setView('events')} className={`px-4 pb-2 border-b-4 ${view === 'events' ? 'border-indigo-600' : 'border-transparent'}`}>Події</button>
                <button onClick={() => setView('tasks')} className={`px-4 pb-2 border-b-4 ${view === 'tasks' ? 'border-green-600' : 'border-transparent'}`}>Завдання</button>
                <button onClick={() => setView('news')} className={`px-4 pb-2 border-b-4 ${view === 'news' ? 'border-pink-600' : 'border-transparent'}`}>📢 Новини</button>
                <button onClick={() => setView('stats')} className={`px-4 pb-2 border-b-4 ${view === 'stats' ? 'border-blue-600' : 'border-transparent'}`}>Статистика</button>
                {user.role === 'Admin' && <button onClick={() => setView('users')} className={`px-4 pb-2 border-b-4 ${view === 'users' ? 'border-purple-600' : 'border-transparent'}`}>Користувачі</button>}
            </div>
            {view === 'events' && renderEventsView()}{view === 'tasks' && renderTasksView()}{view === 'news' && renderNewsView()}{view === 'stats' && renderStatsView()}{view === 'users' && user.role === 'Admin' && renderUsersView()}
            
            {/* МОДАЛЬНЕ ВІКНО ПОВТОРЕННЯ */}
            {repeatModalOpen && eventToRepeat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">🔁 Повторити подію</h3>
                        <p className="text-sm text-gray-500 mb-4">Ви створюєте копії для: <strong>{eventToRepeat.title}</strong></p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Інтервал повторення</label>
                                <div className="flex gap-2 mt-1">
                                    <input type="number" min="1" value={repeatIntervalValue} onChange={(e) => setRepeatIntervalValue(parseInt(e.target.value))} className="border rounded p-2 w-20" />
                                    <select value={repeatIntervalType} onChange={(e) => setRepeatIntervalType(e.target.value)} className="border rounded p-2 flex-grow">
                                        <option value="week">Тижнів (напр. щосуботи)</option>
                                        <option value="day">Днів</option>
                                        <option value="month">Місяців (того ж числа)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Кількість копій</label>
                                <input type="number" min="1" max="50" value={repeatCount} onChange={(e) => setRepeatCount(parseInt(e.target.value))} className="border rounded p-2 w-full mt-1" />
                            </div>
                            
                            <div className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded border border-yellow-200">
                                ⚠️ Увага: Буде створено {repeatCount} нових подій разом із завданнями волонтерів.
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setRepeatModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Скасувати</button>
                            <button 
                                onClick={handleRepeatEvent} 
                                disabled={isRepeating}
                                className={`px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 flex items-center gap-2 ${isRepeating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isRepeating ? '⏳ Створення...' : '✅ Створити копії'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;