import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const NewsPage = ({ API_URL }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // 'All', 'News', 'Announcement'

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await axios.get(`${API_URL}/news/public`);
                setNews(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [API_URL]);

    const filteredNews = filter === 'All' ? news : news.filter(n => n.type === filter);

    if (loading) return <div className="text-center py-10">Завантаження...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">📰 Новини та Анонси</h2>
            
            {/* Фільтр */}
            <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setFilter('All')} className={`px-4 py-2 rounded-full font-bold transition ${filter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Всі</button>
                <button onClick={() => setFilter('Announcement')} className={`px-4 py-2 rounded-full font-bold transition ${filter === 'Announcement' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'}`}>📣 Анонси</button>
                <button onClick={() => setFilter('News')} className={`px-4 py-2 rounded-full font-bold transition ${filter === 'News' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>📰 Новини</button>
            </div>

            <div className="space-y-8">
                {filteredNews.length === 0 ? <p className="text-center text-gray-500">Поки що новин немає.</p> : filteredNews.map(item => (
                    <div key={item.news_id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row hover:shadow-xl transition">
                        {/* Рекламна плашка (Картинка) */}
                        {item.image_url && (
                            <div className="md:w-1/3 h-48 md:h-auto relative">
                                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white rounded uppercase ${item.type === 'Announcement' ? 'bg-pink-600' : 'bg-blue-600'}`}>
                                    {item.type === 'Announcement' ? 'Анонс' : 'Новина'}
                                </div>
                            </div>
                        )}
                        
                        <div className={`p-6 flex flex-col justify-between ${item.image_url ? 'md:w-2/3' : 'w-full'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-bold text-gray-800 leading-tight">{item.title}</h3>
                                    {!item.image_url && (
                                        <span className={`px-2 py-1 text-xs font-bold text-white rounded uppercase ${item.type === 'Announcement' ? 'bg-pink-600' : 'bg-blue-600'}`}>
                                            {item.type === 'Announcement' ? 'Анонс' : 'Новина'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-sm mb-4">📅 {format(new Date(item.created_at), 'd MMMM yyyy', { locale: uk })}</p>
                                <div className="prose text-gray-600 whitespace-pre-line mb-4">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NewsPage;