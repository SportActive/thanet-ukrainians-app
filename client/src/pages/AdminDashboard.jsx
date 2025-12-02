import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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

    // Events State
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    
    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // Users State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [stats, setStats] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // --- NEWS STATE (Оновлено) ---
    const [newsList, setNewsList] = useState([]);
    const [editingNews, setEditingNews] = useState(null);
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [newsImage, setNewsImage] = useState('');
    
    // Замість одного типу тепер два чекбокси
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
    const fetchEvents = async () => { setLoadingEvents(true); try { const res = await axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }); setEvents(res.data); } catch (e) {} finally { setLoadingEvents(false); } };
    const fetchTasks = async (id) => { if(!id) return; setLoadingTasks(true); try { const res = await axios.get(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setTasks(res.data); } catch (e) {} finally { setLoadingTasks(false); } };
    const fetchUsers = async () => { if(user.role !== 'Admin') return; setLoadingUsers(true); try { const res = await axios.get(`${API_URL}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }); setUsers(res.data); } catch (e) {} finally { setLoadingUsers(false); } };
    const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/events/stats/global`, { headers: { Authorization: `Bearer ${token}` } }); setStats(res.data); } catch(e){} };
    const fetchEventDetails = async (id) => { if(!id) return; setLoadingDetails(true); try { const res = await axios.get(`${API_URL}/events/${id}/details`, { headers: { Authorization: `Bearer ${token}` } }); setEventDetails(res.data); } catch(e){} finally { setLoadingDetails(false); } };
    const fetchNews = async () => { try { const res = await axios.get(`${API_URL}/news/public`); setNewsList(res.data); } catch (error) {} };

    useEffect(() => { fetchEvents(); if (user.role === 'Admin') fetchUsers(); fetchNews(); }, []);
    useEffect(() => { if (view === 'tasks' && selectedEventId) fetchTasks(selectedEventId); if (view === 'stats') fetchStats(); if (view === 'news') fetchNews(); }, [selectedEventId, view]);

    // --- HANDLERS (Old) ---
    const handleSaveEvent = async (e) => { e.preventDefault(); setMessage(''); const data = { title, description, location_name: locationName, start_datetime: startDate, end_datetime: endDate || null, is_published: true, category }; try { if(editingEvent) await axios.put(`${API_URL}/events/${editingEvent.event_id}`, data, { headers: { Authorization: `Bearer ${token}` } }); else await axios.post(`${API_URL}/events`, data, { headers: { Authorization: `Bearer ${token}` } }); setMessage('✅ Успішно!'); setEditingEvent(null); setTitle(''); setDescription(''); setLocationName(''); setStartDate(''); setEndDate(''); fetchEvents(); } catch (e) { setMessage('❌ Помилка'); } };
    const startEditEvent = (ev) => { setEditingEvent(ev); setTitle(ev.title); setCategory(ev.category); setStartDate(ev.start_datetime.slice(0,16)); setEndDate(ev.end_datetime?.slice(0,16) || ''); setLocationName(ev.location_name); setDescription(ev.description); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleDeleteEvent = async (id) => { if(!window.confirm('Видалити?')) return; try { await axios.delete(`${API_URL}/events/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchEvents(); } catch(e){alert('Помилка');} };
    const handleDeleteTask = async (id) => { try { await axios.delete(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchTasks(selectedEventId); } catch(e){alert('Помилка');} };
    const handleRoleChange = async (uid, role) => { try { await axios.put(`${API_URL}/auth/users/${uid}/role`, {role}, { headers: { Authorization: `Bearer ${token}` } }); setMessage(`Роль змінено на ${role}`); fetchUsers(); } catch(e){ alert('Error'); } };

    // --- NEWS HANDLERS (Updated) ---
    const startEditNews = (n) => {
        setEditingNews(n);
        setNewsTitle(n.title);
        setNewsContent(n.content);
        setNewsImage(n.image_url || '');
        
        // Встановлюємо чекбокси
        setIsNews(n.is_news);
        setIsAnnouncement(n.is_announcement);
        
        setNewsEventId(n.event_id || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMessage('✏️ Режим редагування');
    };

    const cancelEditNews = () => {
        setEditingNews(null);
        setNewsTitle(''); setNewsContent(''); setNewsImage(''); setNewsEventId('');
        setIsNews(true); setIsAnnouncement(false);
        setMessage('');
    };

    const handleSaveNews = async (e) => {
        e.preventDefault();
        const newsData = { 
            title: newsTitle, 
            content: newsContent, 
            image_url: newsImage, 
            // Відправляємо булеві значення
            is_news: isNews,
            is_announcement: isAnnouncement,
            event_id: newsEventId || null 
        };
        
        try {
            if (editingNews) {
                await axios.put(`${API_URL}/news/${editingNews.news_id}`, newsData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage('✅ Зміни збережено!');
                setEditingNews(null);
            } else {
                await axios.post(`${API_URL}/news`, newsData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage('✅ Опубліковано!');
            }
            // Скидання
            setNewsTitle(''); setNewsContent(''); setNewsImage(''); setNewsEventId(''); setIsNews(true); setIsAnnouncement(false);
            fetchNews();
        } catch (error) { setMessage('❌ Помилка збереження.'); }
    };
    
    const handleDeleteNews = async (id) => {
        if(!window.confirm('Видалити?')) return;
        try { await axios.delete(`${API_URL}/news/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchNews(); } catch (error) { alert('Помилка'); }
    };

    // --- RENDERS ---
    // (renderEventsView, renderTasksView, renderStatsView, renderUsersView без змін, скорочено для зручності)
    const renderEventsView = () => ( <div className="grid md:grid-cols-2 gap-4"><form onSubmit={handleSaveEvent} className="bg-white p-4 shadow rounded space-y-3"><h3 className="font-bold text-lg">{editingEvent?'Редагувати':'Створити'} Подію</h3>{message && <p className="text-green-600">{message}</p>}<input className="w-full p-2 border rounded" placeholder="Назва" value={title} onChange={e=>setTitle(e.target.value)} required /><select className="w-full p-2 border rounded" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select><div className="flex gap-2"><input type="datetime-local" className="w-1/2 p-2 border rounded" value={startDate} onChange={e=>setStartDate(e.target.value)} required /><input type="datetime-local" className="w-1/2 p-2 border rounded" value={endDate} onChange={e=>setEndDate(e.target.value)} /></div><input className="w-full p-2 border rounded" placeholder="Локація" value={locationName} onChange={e=>setLocationName(e.target.value)} required /><textarea className="w-full p-2 border rounded" placeholder="Опис" value={description} onChange={e=>setDescription(e.target.value)} rows="3" required /><button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded">Зберегти</button>{editingEvent && <button type="button" onClick={() => setEditingEvent(null)} className="w-full bg-gray-300 p-2 rounded mt-2">Скасувати</button>}</form><div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto"><h4 className="font-bold mb-2">Список Подій</h4>{events.map(ev => (<div key={ev.event_id} className="bg-white p-2 mb-2 border rounded flex justify-between"><div><p className="font-bold">{ev.title}</p><p className="text-xs text-gray-500">{ev.start_datetime}</p></div><div><button onClick={()=>startEditEvent(ev)}>✏️</button> <button onClick={()=>handleDeleteEvent(ev.event_id)}>🗑️</button></div></div>))}</div></div> );
    const renderTasksView = () => ( <div className="bg-white p-4 rounded shadow"><h3 className="font-bold mb-4">Завдання</h3><select className="w-full p-2 border rounded mb-4" onChange={e => {setSelectedEventId(e.target.value); setEditingTask(null);}}><option value="">Оберіть подію...</option>{events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}</select>{selectedEventId && (<div className="grid md:grid-cols-2 gap-4"><div><TaskForm eventId={selectedEventId} eventTitle="" API_URL={API_URL} token={token} editingTask={editingTask} onCancelEdit={()=>setEditingTask(null)} onSuccess={()=>{fetchTasks(selectedEventId); setEditingTask(null);}} /></div><div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Список Завдань</h4><TaskList tasks={tasks} loading={loadingTasks} onEdit={(task) => { setEditingTask(task); window.scrollTo({ top: 200, behavior: 'smooth' }); }} onDelete={handleDeleteTask}/></div></div>)}</div> );
    const renderStatsView = () => ( <div className="space-y-4"><h3 className="font-bold text-2xl">Статистика</h3>{stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="bg-white p-4 rounded shadow text-center"><p>Подій</p><p className="text-2xl font-bold">{stats.total_events}</p></div><div className="bg-white p-4 rounded shadow text-center"><p>Активних</p><p className="text-2xl font-bold">{stats.future_events}</p></div><div className="bg-white p-4 rounded shadow text-center"><p>Волонтерів</p><p className="text-2xl font-bold">{stats.unique_volunteers}</p></div><div className="bg-white p-4 rounded shadow text-center"><p>Відвідувань</p><p className="text-2xl font-bold">{stats.total_attendees}</p></div></div>}<div className="bg-white p-4 rounded shadow"><h4 className="font-bold mb-2">Деталі по події</h4><select className="w-full p-2 border rounded mb-4" onChange={e => fetchEventDetails(e.target.value)}><option value="">Оберіть подію...</option>{events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}</select>{eventDetails && <div className="grid md:grid-cols-2 gap-4"><div className="bg-green-50 p-2 rounded"><h5 className="font-bold">Гості ({eventDetails.attendees.length})</h5><ul className="text-sm">{eventDetails.attendees.map(a => <li key={a.registration_id} className="border-b py-1">{a.guest_name} ({a.guest_contact})</li>)}</ul></div><div className="bg-orange-50 p-2 rounded"><h5 className="font-bold">Волонтери ({eventDetails.volunteers.length})</h5><ul className="text-sm">{eventDetails.volunteers.map(v => <li key={v.signup_id} className="border-b py-1">{v.guest_name} - {v.task_title}</li>)}</ul></div></div>}</div></div> );
    const renderUsersView = () => ( <div className="bg-white p-4 rounded shadow"><h3 className="font-bold mb-4">Користувачі</h3>{message && <p className="text-green-600">{message}</p>}<table className="w-full text-left text-sm"><thead><tr><th>Ім'я</th><th>Роль</th><th>Дія</th></tr></thead><tbody>{users.map(u => (<tr key={u.user_id} className="border-b"><td className="py-2">{u.first_name} {u.last_name}<br/><span className="text-xs text-gray-500">{u.email}</span></td><td><span className="bg-gray-100 px-2 rounded">{u.role}</span></td><td><select value={u.role} onChange={(e) => handleRoleChange(u.user_id, e.target.value)} disabled={u.user_id === user.user_id} className="border rounded p-1"><option value="User">User</option><option value="Organizer">Organizer</option><option value="Admin">Admin</option><option value="Editor">Editor</option></select></td></tr>))}</tbody></table></div> );

    const renderNewsView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Форма */}
            <div className="lg:col-span-2 bg-white p-6 shadow-xl rounded-xl border border-pink-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-pink-700">{editingNews ? '✏️ Редагування' : '📢 Публікація'}</h3>
                    {editingNews && <button onClick={cancelEditNews} className="text-sm bg-gray-100 px-3 py-1 rounded">Скасувати</button>}
                </div>
                {message && <div className="p-3 bg-blue-50 text-blue-800 rounded mb-4">{message}</div>}
                
                <form onSubmit={handleSaveNews} className="space-y-4">
                    {/* ЧЕКБОКСИ ЗАМІСТЬ РАДІО */}
                    <div>
                        <label className="block font-medium text-gray-700 mb-2">Тип публікації (можна обрати обидва)</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                                <input type="checkbox" checked={isNews} onChange={(e) => setIsNews(e.target.checked)} className="w-5 h-5 text-blue-600" />
                                <span className="font-bold text-blue-800">📰 Новина</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-pink-50 px-3 py-2 rounded-lg border border-pink-100 hover:bg-pink-100 transition">
                                <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} className="w-5 h-5 text-pink-600" />
                                <span className="font-bold text-pink-800">📣 Анонс події</span>
                            </label>
                        </div>
                    </div>

                    <input type="text" placeholder="Заголовок" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} required className="w-full p-3 border rounded-lg" />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Прив'язати до події (для Анонсів)</label>
                        <select value={newsEventId} onChange={e => setNewsEventId(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                            <option value="">-- Без прив'язки --</option>
                            {events.map(ev => (<option key={ev.event_id} value={ev.event_id}>{ev.title} ({new Date(ev.start_datetime).toLocaleDateString()})</option>))}
                        </select>
                    </div>

                    <input type="text" placeholder="URL картинки" value={newsImage} onChange={e => setNewsImage(e.target.value)} className="w-full p-3 border rounded-lg" />
                    <textarea placeholder="Текст..." value={newsContent} onChange={e => setNewsContent(e.target.value)} rows="5" required className="w-full p-3 border rounded-lg" />

                    <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition ${editingNews ? 'bg-orange-500' : 'bg-pink-600 hover:bg-pink-700'}`}>{editingNews ? 'Зберегти Зміни' : 'Опублікувати'}</button>
                </form>
            </div>

            {/* Список */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-fit max-h-[800px] overflow-y-auto">
                <h4 className="font-bold text-gray-700 mb-4 sticky top-0 bg-gray-50 pb-2">Архіви</h4>
                {newsList.map(n => (
                    <div key={n.news_id} className={`bg-white p-3 mb-3 rounded shadow-sm border flex flex-col gap-2 ${editingNews?.news_id === n.news_id ? 'ring-2 ring-orange-400' : ''}`}>
                        {n.image_url && <img src={n.image_url} alt="preview" className="w-full h-24 object-cover rounded" />}
                        <div className="flex gap-2 flex-wrap">
                            {n.is_news && <span className="text-xs px-2 py-1 rounded text-white bg-blue-500">Новина</span>}
                            {n.is_announcement && <span className="text-xs px-2 py-1 rounded text-white bg-pink-500">Анонс</span>}
                        </div>
                        <h5 className="font-bold mt-1">{n.title}</h5>
                        <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => startEditNews(n)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-2 py-1">✏️</button>
                            <button onClick={() => handleDeleteNews(n.news_id)} className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-2 py-1">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <h2 className="text-3xl font-bold mb-4">Панель Керування ({user.role})</h2>
            <div className="flex space-x-2 overflow-x-auto border-b mb-6 pb-1">
                <button onClick={() => setView('events')} className={`px-4 pb-2 border-b-4 ${view === 'events' ? 'border-indigo-600' : 'border-transparent'}`}>Події</button>
                <button onClick={() => setView('tasks')} className={`px-4 pb-2 border-b-4 ${view === 'tasks' ? 'border-green-600' : 'border-transparent'}`}>Завдання</button>
                <button onClick={() => setView('news')} className={`px-4 pb-2 border-b-4 ${view === 'news' ? 'border-pink-600' : 'border-transparent'}`}>📢 Новини</button>
                <button onClick={() => setView('stats')} className={`px-4 pb-2 border-b-4 ${view === 'stats' ? 'border-blue-600' : 'border-transparent'}`}>Статистика</button>
                {user.role === 'Admin' && <button onClick={() => setView('users')} className={`px-4 pb-2 border-b-4 ${view === 'users' ? 'border-purple-600' : 'border-transparent'}`}>Користувачі</button>}
            </div>
            {view === 'events' && renderEventsView()}{view === 'tasks' && renderTasksView()}{view === 'news' && renderNewsView()}{view === 'stats' && renderStatsView()}{view === 'users' && user.role === 'Admin' && renderUsersView()}
        </div>
    );
};

export default AdminDashboard;