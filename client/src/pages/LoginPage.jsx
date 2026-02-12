import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';

const LoginPage = ({ API_URL, onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Поля форми
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');     // UK Phone
    const [whatsapp, setWhatsapp] = useState(''); // WhatsApp

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegistering ? '/auth/register' : '/auth/login';
        
        const body = isRegistering 
            ? { first_name: firstName, last_name: lastName, email, password, uk_phone: phone, whatsapp }
            : { email, password };

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                // УСПІХ!
                try {
                    // Декодуємо токен, щоб дізнатися ім'я користувача
                    const decodedUser = jwtDecode(data.token);
                    // Передаємо дані в App.jsx, щоб екран змінився МИТТЄВО
                    onLoginSuccess(data.token, decodedUser);
                } catch (decodeError) {
                    console.error("Помилка декодування:", decodeError);
                    // Якщо щось пішло не так - просто перезавантажуємо сторінку, це точно спрацює
                    localStorage.setItem('token', data.token);
                    window.location.reload(); 
                }
            } else {
                // ПОМИЛКА ВІД СЕРВЕРА
                setError(data.message || 'Щось пішло не так');
            }
        } catch (err) {
            console.error(err);
            setError('Помилка з\'єднання. Перевірте інтернет.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-indigo-100 mt-10">
            <h2 className="text-3xl font-bold text-center mb-6 text-indigo-800">
                {isRegistering ? 'Реєстрація' : 'Вхід'}
            </h2>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
                    <p className="font-bold">Помилка</p>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                type="text" placeholder="Ім'я" required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                value={firstName} onChange={e => setFirstName(e.target.value)}
                            />
                            <input 
                                type="text" placeholder="Прізвище" required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                value={lastName} onChange={e => setLastName(e.target.value)}
                            />
                        </div>
                        <input 
                            type="text" placeholder="WhatsApp (напр. +380...)" required 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        />
                        <input 
                            type="text" placeholder="UK номер (напр. 07...)" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={phone} onChange={e => setPhone(e.target.value)}
                        />
                    </>
                )}

                <input 
                    type="email" placeholder="Email" required 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={email} onChange={e => setEmail(e.target.value)}
                />

                <input 
                    type="password" placeholder="Пароль" required 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={password} onChange={e => setPassword(e.target.value)}
                />

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full text-white font-bold py-3 rounded-lg shadow-md transition transform hover:-translate-y-0.5 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {loading ? 'Зачекайте...' : (isRegistering ? 'Зареєструватися' : 'Увійти')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold underline transition"
                >
                    {isRegistering ? 'Вже маю акаунт? Увійти' : 'Немає акаунту? Реєстрація'}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;