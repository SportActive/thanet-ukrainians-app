import React, { useState } from 'react';
import axios from 'axios';

// Використовуємо змінну середовища, якщо вона є
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoginPage = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Нові поля для реєстрації
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [ukPhone, setUkPhone] = useState('');
    
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isLoginView) {
                // ЛОГІН
                const response = await axios.post(`${API_URL}/auth/login`, { email, password });
                localStorage.setItem('token', response.data.token);
                onLogin(response.data);
            } else {
                // РЕЄСТРАЦІЯ
                const response = await axios.post(`${API_URL}/auth/register`, {
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password,
                    whatsapp,   // Відправляємо WhatsApp
                    uk_phone: ukPhone // Відправляємо UK Phone
                });
                localStorage.setItem('token', response.data.token);
                onLogin(response.data);
            }
        } catch (err) {
            console.error("Auth error:", err);
            setError(err.response?.data?.message || 'Помилка авторизації');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80vh] bg-gray-50 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
                    {isLoginView ? 'Вхід в систему' : 'Реєстрація'}
                </h2>
                
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginView && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Ім'я" 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={firstName} onChange={(e) => setFirstName(e.target.value)} required 
                                />
                                <input 
                                    type="text" 
                                    placeholder="Прізвище" 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={lastName} onChange={(e) => setLastName(e.target.value)} required 
                                />
                            </div>
                            
                            {/* ПОЛЯ ТЕЛЕФОНІВ */}
                            <input 
                                type="text" 
                                placeholder="WhatsApp (обов'язково)" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required 
                            />
                            <input 
                                type="text" 
                                placeholder="Британський номер (опціонально)" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={ukPhone} onChange={(e) => setUkPhone(e.target.value)} 
                            />
                        </>
                    )}

                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={email} onChange={(e) => setEmail(e.target.value)} required 
                    />
                    
                    <input 
                        type="password" 
                        placeholder="Пароль" 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={password} onChange={(e) => setPassword(e.target.value)} required 
                    />

                    <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg mt-4">
                        {isLoginView ? 'Увійти' : 'Зареєструватися'}
                    </button>
                </form>

                <p className="text-center mt-6 text-gray-600">
                    {isLoginView ? 'Ще немає акаунту? ' : 'Вже є акаунт? '}
                    <button 
                        onClick={() => { setIsLoginView(!isLoginView); setError(''); }} 
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        {isLoginView ? 'Зареєструватися' : 'Увійти'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;