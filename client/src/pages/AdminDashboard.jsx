import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';

// --- КОМПОНЕНТ: ФОРМА ЗАВДАННЯ ---
const TaskForm = ({ eventId, eventTitle, API_URL, token, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requiredVolunteers, setRequiredVolunteers] = useState(1);
    const [deadlineTime, setDeadlineTime] = useState('');
    const [message, setMessage] = useState('');

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!title || !requiredVolunteers || !eventId) {
            setMessage('❌ Будь ласка, оберіть подію та заповніть всі обов\'язкові поля.');
            return;
        }

        try {
            const newTask = {
                event_id: eventId,
                title,
                description,
                required_volunteers: parseInt(requiredVolunteers),
                deadline_time: deadlineTime || null,
            };

            await axios.post(`${API_URL}/tasks`, newTask, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage(`✅ Завдання "${title}" успішно створено для події "${eventTitle}"!`);
            setTitle('');
            setDescription('');
            setRequiredVolunteers(1);
            setDeadlineTime('');
            onSuccess(); 

        } catch (error) {
            console.error("Помилка відправки завдання:", error.response || error.message);
            const status = error.response?.status;
            let errorMessage = `Помилка [${status || '500'}].`;

            if (status === 400) errorMessage = error.response?.data?.message || 'Помилка 400: Некоректні дані.';
            else if (status === 404) errorMessage = error.response?.data?.message || 'Помилка 404: Подія не знайдена.';
            else if (status === 403) errorMessage = 'Помилка 403: Недостатньо прав.';
            else if (status === 500) errorMessage = `❌ Критична помилка сервера.`;

            setMessage(`❌ ${errorMessage}`);
        }
    };

    return (
        <div className="p-6 bg-white shadow-lg rounded-xl">
            <h4 className="text-xl font-bold text-indigo-700 mb-4">Створити Завдання для: {eventTitle}</h4>
            {message && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
            <form onSubmit={handleCreateTask} className="space-y-4">
                <label className="block">
                    <span className="text-gray-700 font-medium">Назва Завдання*</span>
                    <input type="text" placeholder="Наприклад, Спекти 10 Наполеонів" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg"/>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-gray-700 font-medium">Кількість Волонтерів*</span>
                        <input type="number" min="1" value={requiredVolunteers} onChange={(e) => setRequiredVolunteers(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg"/>
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Крайній Термін (Deadline)</span>
                        <input type="datetime-local" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/>
                    </label>
                </div>
                <label className="block">
                    <span className="text-gray-700 font-medium">Детальний Опис / Інструкції</span>
                    <textarea placeholder="Конкретні інструкції: що, де, коли і як робити." value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 w-full p-3 border rounded-lg resize-none"/>
                </label>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition">Додати Завдання</button>
            </form>
        </div>
    );
};

// --- КОМПОНЕНТ: СПИСОК ЗАВДАНЬ ---
const TaskList = ({ tasks, loading }) => {
    if (loading) return <p className="text-center text-gray-500">Завантаження завдань...</p>;
    if (tasks.length === 0) return <p className="text-center text-gray-600 italic">Наразі немає відкритих завдань для цієї події.</p>;

    return (
        <div className="space-y-4">
            {tasks.map(task => (
                <div key={task.task_id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-gray-800">{task.title}</h4>
                        <span className={`px-3 py-1 text-xs rounded-full font-bold ${task.status === 'Open' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {task.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                        <p>Потрібно: <span className="font-bold text-base text-indigo-600">{task.signed_up_volunteers || 0}/{task.required_volunteers}</span> волонтерів</p>
                        {task.deadline_time && (
                             <p>Крайній термін: {new Date(task.deadline_time).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ADMIN DASHBOARD ---
const AdminDashboard = ({ user, API_URL }) => {
    const [view, setView] = useState('events'); // 'events', 'tasks', 'users'
    const token = localStorage.getItem('token');
    const [message, setMessage] = useState('');

    // STATES: EVENTS & TASKS
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // STATES: USERS
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

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
            const response = await axios.get(`${API_URL}/events`, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(response.data);
            if (response.data.length > 0 && !selectedEventId) {
                setSelectedEventId(response.data[0].event_id.toString());
            }
        } catch (error) {
            console.error("Помилка завантаження подій:", error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const fetchTasks = async (eventId) => {
        setLoadingTasks(true);
        try {
            const response = await axios.get(`${API_URL}/tasks/${eventId}`, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Помилка завантаження завдань:", error);
            setTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    };

    const fetchUsers = async () => {
        if (user.role !== 'Admin') return;
        setLoadingUsers(true);
        try {
            const response = await axios.get(`${API_URL}/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Помилка завантаження користувачів:", error);
            setMessage("❌ Не вдалося завантажити користувачів.");
        } finally {
            setLoadingUsers(false);
        }
    };

    // --- EFFECTS ---

    useEffect(() => {
        fetchEvents();
        if (user.role === 'Admin') {
            fetchUsers();
        }
    }, []);

    useEffect(() => {
        if (selectedEventId && view === 'tasks') {
            fetchTasks(selectedEventId);
        }
    }, [selectedEventId, view, events]);

    // --- HANDLERS ---

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!title || !description || !locationName || !startDate) {
            setMessage('❌ Будь ласка, заповніть всі обов\'язкові поля.');
            return;
        }

        try {
            const newEvent = {
                title, description, location_name: locationName,
                start_datetime: startDate, end_datetime: endDate || null,
                is_published: true, category: category
            };

            await axios.post(`${API_URL}/events`, newEvent, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage('✅ Подію успішно створено та опубліковано! Оновіть календар.');
            fetchEvents(); 
            setTitle(''); setDescription(''); setLocationName(''); setStartDate(''); setEndDate(''); setCategory('Social');
        } catch (error) {
            setMessage(`❌ Помилка: ${error.response?.data?.message || 'Не вдалося створити подію.'}`);
        }
    };

    const handleEventSelect = (e) => {
        const id = e.target.value;
        setSelectedEventId(id);
        if (id) fetchTasks(id);
        else setTasks([]);
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.put(`${API_URL}/auth/users/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
            setMessage(`✅ Роль користувача змінено на ${newRole}`);
            
            if (userId === user.user_id && newRole !== 'Admin') {
                 window.location.reload(); 
            }
        } catch (error) {
            console.error("Помилка зміни ролі:", error);
            setMessage("❌ Не вдалося змінити роль.");
        }
    };

    const selectedEvent = events.find(e => e.event_id.toString() === selectedEventId);

    // --- RENDER VIEWS ---

    const renderEventsView = () => (
        <div className="bg-white p-6 shadow-2xl rounded-xl border border-indigo-200 animate-fade-in">
            <h3 className="text-2xl font-semibold text-indigo-700 mb-6 border-b pb-3">Створення Події (Крок 1)</h3>
            {message && <div className={`p-4 mb-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}
            <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block"><span className="text-gray-700 font-medium">Назва Події*</span><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg"/></label>
                    <label className="block"><span className="text-gray-700 font-medium">Категорія*</span><select value={category} onChange={(e) => setCategory(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-white">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block"><span className="text-gray-700 font-medium">Початок*</span><input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg"/></label>
                    <label className="block"><span className="text-gray-700 font-medium">Завершення</span><input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/></label>
                </div>
                <label className="block"><span className="text-gray-700 font-medium">Місце Проведення*</span><input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg"/></label>
                <label className="block"><span className="text-gray-700 font-medium">Детальний Опис*</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" required className="mt-1 w-full p-3 border rounded-lg resize-none"/></label>
                <button type="submit" className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg shadow-xl hover:bg-indigo-700 transition">Опублікувати Подію</button>
            </form>
        </div>
    );

    const renderTasksView = () => (
        <div className="bg-white p-6 shadow-2xl rounded-xl border border-green-200 animate-fade-in">
            <h3 className="text-2xl font-semibold text-green-700 mb-6 border-b pb-3">Додавання Завдань (Крок 2)</h3>
            <label className="block mb-6">
                <span className="text-gray-700 font-medium">Виберіть Подію*</span>
                <select value={selectedEventId || ''} onChange={handleEventSelect} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="" disabled>-- Виберіть подію --</option>
                    {loadingEvents ? <option>Завантаження...</option> : events.map(event => (
                        <option key={event.event_id} value={event.event_id}>{event.title} ({new Date(event.start_datetime).toLocaleDateString('uk-UA')})</option>
                    ))}
                </select>
            </label>
            {selectedEventId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TaskForm eventId={selectedEventId} eventTitle={selectedEvent?.title} API_URL={API_URL} token={token} onSuccess={() => fetchTasks(selectedEventId)} />
                    <div><h4 className="text-xl font-bold text-gray-800 mb-4 border-b">Відкриті Завдання</h4><TaskList tasks={tasks} loading={loadingTasks} /></div>
                </div>
            )}
            {!selectedEventId && !loadingEvents && events.length === 0 && <div className="bg-yellow-100 p-4 rounded-lg text-center text-yellow-700">Спочатку створіть подію.</div>}
        </div>
    );

    const renderUsersView = () => (
        <div className="bg-white p-6 shadow-2xl rounded-xl border border-purple-200 animate-fade-in">
            <h3 className="text-2xl font-semibold text-purple-700 mb-6 border-b pb-3">Керування Користувачами</h3>
            {message && <div className={`p-3 mb-4 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>}

            <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ім'я</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Контакти</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Роль</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingUsers ? <tr><td colSpan="4" className="text-center p-4">Завантаження...</td></tr> : users.map(u => (
                            <tr key={u.user_id}>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 font-bold whitespace-nowrap">{u.first_name} {u.last_name}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 font-medium">{u.email}</p>
                                    <div className="mt-1 text-xs text-gray-500 space-y-1">
                                        {u.whatsapp && <p className="flex items-center gap-1">📱 WA: {u.whatsapp}</p>}
                                        {u.uk_phone && <p className="flex items-center gap-1">🇬🇧 UK: {u.uk_phone}</p>}
                                    </div>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span className={`px-3 py-1 font-semibold leading-tight rounded-full ${u.role === 'Admin' ? 'bg-red-200 text-red-900' : u.role === 'Organizer' ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-900'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-700 py-1 px-2 rounded focus:outline-none focus:border-purple-500"
                                        disabled={u.user_id === user.user_id} // Заборона зміни ролі самому собі
                                    >
                                        <option value="User">User</option>
                                        <option value="Organizer">Organizer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && !loadingUsers && <p className="text-center p-4 text-gray-500">Користувачів не знайдено.</p>}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Панель Керування {user.first_name}</h2>
            <p className="mb-6 text-lg text-gray-600">Ваш статус: <span className="font-bold text-indigo-600">{user.role}</span></p>

            <div className="flex space-x-4 mb-8 border-b overflow-x-auto">
                <button onClick={() => setView('events')} className={`pb-2 px-4 whitespace-nowrap text-lg font-semibold transition ${view === 'events' ? 'border-b-4 border-indigo-600 text-indigo-800' : 'text-gray-500 hover:text-indigo-600'}`}>1. Події</button>
                <button onClick={() => setView('tasks')} className={`pb-2 px-4 whitespace-nowrap text-lg font-semibold transition ${view === 'tasks' ? 'border-b-4 border-green-600 text-green-800' : 'text-gray-500 hover:text-green-600'}`}>2. Завдання</button>
                {user.role === 'Admin' && (
                    <button onClick={() => setView('users')} className={`pb-2 px-4 whitespace-nowrap text-lg font-semibold transition ${view === 'users' ? 'border-b-4 border-purple-600 text-purple-800' : 'text-gray-500 hover:text-purple-600'}`}>3. Користувачі</button>
                )}
            </div>
            
            {view === 'events' && renderEventsView()}
            {view === 'tasks' && renderTasksView()}
            {view === 'users' && user.role === 'Admin' && renderUsersView()}
        </div>
    );
};

export default AdminDashboard;