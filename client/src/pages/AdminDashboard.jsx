import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// --- КОМПОНЕНТ: ФОРМА ЗАВДАННЯ (З ПІДТРИМКОЮ РЕДАГУВАННЯ) ---
const TaskForm = ({ eventId, eventTitle, API_URL, token, onSuccess, editingTask, onCancelEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requiredVolunteers, setRequiredVolunteers] = useState(1);
    const [deadlineTime, setDeadlineTime] = useState('');
    const [message, setMessage] = useState('');

    // Заповнення форми при редагуванні
    useEffect(() => {
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description || '');
            setRequiredVolunteers(editingTask.required_volunteers);
            setDeadlineTime(editingTask.deadline_time ? editingTask.deadline_time.slice(0, 16) : '');
        } else {
            setTitle('');
            setDescription('');
            setRequiredVolunteers(1);
            setDeadlineTime('');
        }
    }, [editingTask]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const taskData = {
            event_id: eventId,
            title,
            description,
            required_volunteers: parseInt(requiredVolunteers),
            deadline_time: deadlineTime || null,
        };

        try {
            if (editingTask) {
                // UPDATE MODE
                await axios.put(`${API_URL}/tasks/${editingTask.task_id}`, taskData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage(`✅ Завдання оновлено!`);
            } else {
                // CREATE MODE
                if (!eventId) { 
                    setMessage('❌ Спочатку оберіть подію.'); 
                    return; 
                }
                await axios.post(`${API_URL}/tasks`, taskData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage(`✅ Завдання створено!`);
            }

            // Очищення полів
            if (!editingTask) {
                setTitle(''); setDescription(''); setRequiredVolunteers(1); setDeadlineTime('');
            }
            onSuccess(); 

        } catch (error) {
            console.error("Помилка:", error);
            setMessage(`❌ Помилка: ${error.response?.data?.message || 'Server Error'}`);
        }
    };

    return (
        <div className="p-6 bg-white shadow-lg rounded-xl border-l-4 border-indigo-500">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-gray-800">
                    {editingTask ? `✏️ Редагувати завдання` : `➕ Додати завдання для: ${eventTitle}`}
                </h4>
                {editingTask && (
                    <button onClick={onCancelEdit} className="text-sm text-red-600 hover:underline font-medium">
                        Скасувати редагування
                    </button>
                )}
            </div>
            
            {message && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                    <span className="text-gray-700 font-medium text-sm">Назва завдання*</span>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 outline-none"/>
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-gray-700 font-medium text-sm">Кількість волонтерів*</span>
                        <input type="number" min="1" value={requiredVolunteers} onChange={e => setRequiredVolunteers(e.target.value)} required className="mt-1 w-full p-2 border rounded"/>
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium text-sm">Дедлайн</span>
                        <input type="datetime-local" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="mt-1 w-full p-2 border rounded"/>
                    </label>
                </div>
                <label className="block">
                    <span className="text-gray-700 font-medium text-sm">Опис / Інструкції</span>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full p-2 border rounded resize-none" rows="3"></textarea>
                </label>
                
                <button type="submit" className={`w-full py-2.5 text-white font-bold rounded-lg shadow-md transition ${editingTask ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {editingTask ? 'Зберегти Зміни' : 'Додати Завдання'}
                </button>
            </form>
        </div>
    );
};

// --- КОМПОНЕНТ: СПИСОК ЗАВДАНЬ (З КНОПКАМИ ДІЙ) ---
const TaskList = ({ tasks, loading, onEdit, onDelete }) => {
    if (loading) return <p className="text-center text-gray-500 py-4">Завантаження завдань...</p>;
    if (tasks.length === 0) return <p className="text-center text-gray-500 italic py-4">Завдань немає. Додайте перше!</p>;

    return (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {tasks.map(task => (
                <div key={task.task_id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-start group hover:bg-white hover:shadow-md transition duration-200">
                    <div className="flex-grow pr-4">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-gray-800 text-lg">{task.title}</h4>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${task.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {task.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description || 'Опис відсутній'}</p>
                        <div className="text-xs text-gray-500 flex items-center gap-4">
                            <span>👥 Потрібно: <b className="text-indigo-600">{task.signed_up_volunteers || 0}/{task.required_volunteers}</b></span>
                            {task.deadline_time && (
                                <span>🕒 {new Date(task.deadline_time).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => onEdit(task)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition" title="Редагувати">✏️</button>
                        <button onClick={() => { if(window.confirm('Видалити це завдання?')) onDelete(task.task_id); }} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-800 transition" title="Видалити">🗑️</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ADMIN DASHBOARD ---
const AdminDashboard = ({ user, API_URL }) => {
    const [view, setView] = useState('events'); // 'events', 'tasks', 'users', 'stats'
    const token = localStorage.getItem('token');
    const [message, setMessage] = useState('');

    // STATES: EVENTS
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);

    // STATES: TASKS
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // STATES: USERS
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // STATES: STATS (НОВЕ)
    const [stats, setStats] = useState(null);
    const [eventDetails, setEventDetails] = useState(null); // Деталі: учасники + волонтери
    const [loadingDetails, setLoadingDetails] = useState(false);

    // STATES: FORM (EVENT)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationName, setLocationName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('Social'); 

    const categories = [
        { value: 'Education', label: 'Освітня (Класи)' },
        { value: 'Charity', label: 'Благодійна (Ярмарки)' },
        { value: 'Excursion', label: 'Екскурсія / Подорож' },
        { value: 'Social', label: 'Соціальна / Збори' }
    ];

    // --- FETCH FUNCTIONS ---

    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const response = await axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
            setEvents(response.data);
        } catch (error) { console.error("Помилка завантаження подій:", error); } 
        finally { setLoadingEvents(false); }
    };

    const fetchTasks = async (eventId) => {
        if (!eventId) return;
        setLoadingTasks(true);
        try {
            const response = await axios.get(`${API_URL}/tasks/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
            setTasks(response.data);
        } catch (error) { console.error("Помилка завантаження завдань:", error); setTasks([]); } 
        finally { setLoadingTasks(false); }
    };

    const fetchUsers = async () => {
        if (user.role !== 'Admin') return;
        setLoadingUsers(true);
        try {
            const response = await axios.get(`${API_URL}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(response.data);
        } catch (error) { console.error("Помилка завантаження користувачів:", error); } 
        finally { setLoadingUsers(false); }
    };

    // НОВА ФУНКЦІЯ: Завантаження статистики
    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/events/stats/global`, { headers: { Authorization: `Bearer ${token}` } });
            setStats(res.data);
        } catch (error) { console.error("Error fetching stats:", error); }
    };

    // НОВА ФУНКЦІЯ: Завантаження деталей (учасники/волонтери)
    const fetchEventDetails = async (id) => {
        if (!id) return;
        setLoadingDetails(true);
        try {
            const res = await axios.get(`${API_URL}/events/${id}/details`, { headers: { Authorization: `Bearer ${token}` } });
            setEventDetails(res.data);
        } catch (error) { console.error("Error fetching details:", error); } 
        finally { setLoadingDetails(false); }
    };

    // --- EFFECTS ---

    useEffect(() => {
        fetchEvents();
        if (user.role === 'Admin') fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedEventId && view === 'tasks') fetchTasks(selectedEventId);
        // Якщо перейшли на вкладку статистики - завантажуємо її
        if (view === 'stats') fetchStats();
    }, [selectedEventId, view]);

    // --- HANDLERS ---

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!title || !description || !locationName || !startDate) {
            setMessage('❌ Будь ласка, заповніть всі обов\'язкові поля.'); return;
        }
        const eventData = { title, description, location_name: locationName, start_datetime: startDate, end_datetime: endDate || null, is_published: true, category };

        try {
            if (editingEvent) {
                await axios.put(`${API_URL}/events/${editingEvent.event_id}`, eventData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage('✅ Подію успішно оновлено!');
                setEditingEvent(null);
            } else {
                await axios.post(`${API_URL}/events`, eventData, { headers: { Authorization: `Bearer ${token}` } });
                setMessage('✅ Подію успішно створено!');
            }
            setTitle(''); setDescription(''); setLocationName(''); setStartDate(''); setEndDate(''); setCategory('Social');
            fetchEvents();
        } catch (error) { setMessage(`❌ Помилка: ${error.response?.data?.message || 'Server Error'}`); }
    };

    const startEditEvent = (ev) => {
        setEditingEvent(ev);
        setTitle(ev.title);
        setCategory(ev.category || 'Social');
        setStartDate(ev.start_datetime ? ev.start_datetime.slice(0, 16) : '');
        setEndDate(ev.end_datetime ? ev.end_datetime.slice(0, 16) : '');
        setLocationName(ev.location_name);
        setDescription(ev.description);
        setMessage('✏️ Режим редагування: змініть дані та натисніть "Зберегти"');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditEvent = () => {
        setEditingEvent(null);
        setTitle(''); setDescription(''); setLocationName(''); setStartDate(''); setEndDate('');
        setMessage('');
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('⚠️ Ви впевнені? Це видалить подію ТА ВСІ завдання, пов\'язані з нею!')) return;
        try {
            await axios.delete(`${API_URL}/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setMessage('🗑️ Подію видалено.');
            fetchEvents();
            if (selectedEventId === id.toString()) setSelectedEventId(null);
        } catch (error) { setMessage(`❌ Помилка видалення: ${error.response?.data?.message}`); }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await axios.delete(`${API_URL}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchTasks(selectedEventId);
        } catch (error) { alert('❌ Не вдалося видалити завдання'); }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.put(`${API_URL}/auth/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
            setMessage(`✅ Роль користувача змінено на ${newRole}`);
            if (userId === user.user_id && newRole !== 'Admin') window.location.reload(); 
        } catch (error) { setMessage("❌ Не вдалося змінити роль."); }
    };

    // --- RENDER VIEWS ---

    const renderEventsView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Форма */}
            <div className="lg:col-span-2 bg-white p-6 shadow-xl rounded-xl border border-indigo-200">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-2xl font-semibold text-indigo-700">{editingEvent ? '✏️ Редагування Події' : '➕ Створення Події (Крок 1)'}</h3>
                    {editingEvent && <button onClick={cancelEditEvent} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">✕ Скасувати</button>}
                </div>
                {message && <div className={`p-4 mb-6 rounded-lg shadow-sm border ${message.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>{message}</div>}
                
                <form onSubmit={handleSaveEvent} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="block text-sm font-medium text-gray-700">Назва Події*<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-3 border rounded-lg mt-1"/></label>
                        <label className="block text-sm font-medium text-gray-700">Категорія*<select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full p-3 border rounded-lg mt-1 bg-white">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="block text-sm font-medium text-gray-700">Початок*<input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full p-3 border rounded-lg mt-1"/></label>
                        <label className="block text-sm font-medium text-gray-700">Завершення<input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-lg mt-1"/></label>
                    </div>
                    <label className="block text-sm font-medium text-gray-700">Місце Проведення*<input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} required className="w-full p-3 border rounded-lg mt-1"/></label>
                    <label className="block text-sm font-medium text-gray-700">Детальний Опис*<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" required className="w-full p-3 border rounded-lg resize-none mt-1"/></label>
                    <button type="submit" className={`w-full py-3.5 px-4 text-white font-bold rounded-lg shadow-lg ${editingEvent ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{editingEvent ? '💾 Зберегти Зміни' : '🚀 Опублікувати Подію'}</button>
                </form>
            </div>
            {/* Список */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 h-fit max-h-[800px] overflow-y-auto custom-scrollbar">
                <h4 className="font-bold text-gray-700 mb-4 sticky top-0 bg-gray-50 pb-2 z-10">📂 Мої Події ({events.length})</h4>
                {loadingEvents ? <p>Завантаження...</p> : events.map(ev => (
                    <div key={ev.event_id} className={`p-4 mb-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition ${editingEvent?.event_id === ev.event_id ? 'ring-2 ring-orange-400' : ''}`}>
                        <div className="flex justify-between items-start mb-2"><h5 className="font-bold text-sm text-gray-800">{ev.title}</h5><span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{new Date(ev.start_datetime).toLocaleDateString()}</span></div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                            <button onClick={() => startEditEvent(ev)} className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100">✏️ Ред.</button>
                            <button onClick={() => handleDeleteEvent(ev.event_id)} className="px-3 py-1 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">🗑️ Вид.</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTasksView = () => (
        <div className="bg-white p-6 shadow-xl rounded-xl border border-green-200 animate-fade-in">
            <h3 className="text-2xl font-semibold text-green-700 mb-6 border-b pb-3">Керування Завданнями (Крок 2)</h3>
            <label className="block mb-8 max-w-xl mx-auto md:mx-0">
                <span className="text-gray-700 font-bold mb-2 block">⬇️ Оберіть подію:</span>
                <select value={selectedEventId || ''} onChange={(e) => { setSelectedEventId(e.target.value); setEditingTask(null); }} className="w-full p-3 border-2 border-green-100 rounded-xl bg-white focus:border-green-500 outline-none">
                    <option value="" disabled>-- Оберіть подію зі списку --</option>
                    {events.map(event => (<option key={event.event_id} value={event.event_id}>{event.title} ({new Date(event.start_datetime).toLocaleDateString()})</option>))}
                </select>
            </label>
            {selectedEventId ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div><TaskForm eventId={selectedEventId} eventTitle={events.find(e => e.event_id.toString() === selectedEventId)?.title} API_URL={API_URL} token={token} editingTask={editingTask} onCancelEdit={() => setEditingTask(null)} onSuccess={() => { fetchTasks(selectedEventId); setEditingTask(null); }} /></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Список Завдань</h4>
                        <TaskList tasks={tasks} loading={loadingTasks} onEdit={(task) => { setEditingTask(task); window.scrollTo({ top: 200, behavior: 'smooth' }); }} onDelete={handleDeleteTask}/>
                    </div>
                </div>
            ) : <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300"><p className="text-gray-500">Оберіть подію у списку вище.</p></div>}
        </div>
    );

    const renderUsersView = () => (
        <div className="bg-white p-6 shadow-xl rounded-xl border border-purple-200 animate-fade-in">
            <h3 className="text-2xl font-semibold text-purple-700 mb-6 border-b pb-3">Керування Користувачами</h3>
            {message && <div className={`p-3 mb-4 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full leading-normal">
                    <thead><tr>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-bold text-gray-600 uppercase">Ім'я</th>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-bold text-gray-600 uppercase">Контакти</th>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-bold text-gray-600 uppercase">Роль</th>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-bold text-gray-600 uppercase">Змінити</th>
                    </tr></thead>
                    <tbody>
                        {loadingUsers ? <tr><td colSpan="4" className="text-center p-6">Завантаження...</td></tr> : users.map(u => (
                            <tr key={u.user_id} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm"><p className="text-gray-900 font-bold">{u.first_name} {u.last_name}</p></td>
                                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm"><p>{u.email}</p><p className="text-xs text-gray-500">{u.whatsapp}</p></td>
                                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-red-100 text-red-800' : u.role === 'Organizer' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{u.role}</span></td>
                                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                                    <select value={u.role} onChange={(e) => handleRoleChange(u.user_id, e.target.value)} disabled={u.user_id === user.user_id} className="bg-white border rounded py-1 px-2">
                                        <option value="User">User</option><option value="Organizer">Organizer</option><option value="Admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // НОВА В'ЮШКА СТАТИСТИКИ
    const renderStatsView = () => (
        <div className="animate-fade-in space-y-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">📊 Аналітика спільноти</h3>
            
            {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Всього подій</p>
                        <p className="text-4xl font-extrabold text-indigo-600 mt-2">{stats.total_events}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Активні події</p>
                        <p className="text-4xl font-extrabold text-green-600 mt-2">{stats.future_events}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Унікальних волонтерів</p>
                        <p className="text-4xl font-extrabold text-orange-600 mt-2">{stats.unique_volunteers}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Загальне охоплення (людей)</p>
                        <p className="text-4xl font-extrabold text-blue-600 mt-2">{stats.total_attendees}</p>
                    </div>
                </div>
            ) : <p className="text-center py-8">Завантаження статистики...</p>}

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <h4 className="text-xl font-bold text-gray-800">Детальні списки (Учасники та Волонтери)</h4>
                    <select onChange={(e) => fetchEventDetails(e.target.value)} className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg shadow-sm">
                        <option value="">-- Оберіть подію для перегляду --</option>
                        {events.map(ev => (<option key={ev.event_id} value={ev.event_id}>{ev.title}</option>))}
                    </select>
                </div>

                {loadingDetails ? (
                    <p className="text-center py-10 text-gray-500">Завантаження списків...</p>
                ) : eventDetails ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* СПИСОК УЧАСНИКІВ */}
                        <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                            <h5 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
                                🙋‍♂️ Зареєстровані гості 
                                <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                    {eventDetails.attendees.reduce((acc, curr) => acc + curr.adults_count + curr.children_count, 0)} осіб
                                </span>
                            </h5>
                            <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                {eventDetails.attendees.length === 0 ? <p className="text-sm text-gray-500 italic">Поки що реєстрацій немає.</p> : 
                                    eventDetails.attendees.map(a => (
                                    <div key={a.registration_id} className="bg-white p-3 rounded-lg shadow-sm border border-green-100">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800">{a.guest_name}</span>
                                            <span className="text-xs font-mono bg-gray-100 px-1 rounded">{new Date(a.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">📞 {a.guest_contact}</div>
                                        <div className="text-sm text-gray-800 font-medium mt-1">
                                            Дорослі: {a.adults_count}, Діти: {a.children_count}
                                        </div>
                                        {a.comment && (
                                            <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                                                💬 "{a.comment}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* СПИСОК ВОЛОНТЕРІВ */}
                        <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100">
                            <h5 className="font-bold text-orange-800 text-lg mb-3 flex items-center gap-2">
                                🤝 Волонтери 
                                <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                                    {eventDetails.volunteers.length} чол.
                                </span>
                            </h5>
                            <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                {eventDetails.volunteers.length === 0 ? <p className="text-sm text-gray-500 italic">Поки що волонтерів немає.</p> : 
                                    eventDetails.volunteers.map(v => (
                                    <div key={v.signup_id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-100">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800">{v.guest_name}</span>
                                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">{v.task_title}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">📞 {v.guest_whatsapp}</div>
                                        {v.comment && (
                                            <div className="mt-2 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-100">
                                                💬 "{v.comment}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg">
                        <span className="text-4xl block mb-2">👆</span>
                        Оберіть подію зверху, щоб побачити списки людей.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-1">Панель Керування</h2>
                    <p className="text-gray-600">Вітаємо, <span className="font-bold text-indigo-600">{user.first_name}</span>! Ваш доступ: <span className="bg-gray-200 px-2 py-0.5 rounded text-sm font-bold">{user.role}</span></p>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="flex space-x-2 md:space-x-4 mb-8 border-b overflow-x-auto pb-1 custom-scrollbar">
                <button onClick={() => setView('events')} className={`pb-3 px-4 whitespace-nowrap text-lg font-bold transition border-b-4 rounded-t-lg ${view === 'events' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-indigo-600'}`}>1. Події</button>
                <button onClick={() => setView('tasks')} className={`pb-3 px-4 whitespace-nowrap text-lg font-bold transition border-b-4 rounded-t-lg ${view === 'tasks' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:text-green-600'}`}>2. Завдання</button>
                <button onClick={() => setView('stats')} className={`pb-3 px-4 whitespace-nowrap text-lg font-bold transition border-b-4 rounded-t-lg ${view === 'stats' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>3. Статистика 📊</button>
                {user.role === 'Admin' && <button onClick={() => setView('users')} className={`pb-3 px-4 whitespace-nowrap text-lg font-bold transition border-b-4 rounded-t-lg ${view === 'users' ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>4. Користувачі</button>}
            </div>
            
            {/* --- CONTENT --- */}
            <div className="min-h-[500px]">
                {view === 'events' && renderEventsView()}
                {view === 'tasks' && renderTasksView()}
                {view === 'stats' && renderStatsView()}
                {view === 'users' && user.role === 'Admin' && renderUsersView()}
            </div>
        </div>
    );
};

export default AdminDashboard;