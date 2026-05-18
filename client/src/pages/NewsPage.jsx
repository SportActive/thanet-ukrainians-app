import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const NewsPage = ({ API_URL, onGoToCalendar, targetNewsId }) => { 
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('News'); 

    //КГ 2026 05 18 Функція для ігнорування часового поясу користувача (Floating Time)
    const parseLocalDate = (dateString) => {
        if (!dateString) return new Date();
        // Відрізаємо "Z" та мілісекунди, залишаючи тільки YYYY-MM-DDTHH:mm
        return new Date(dateString.slice(0, 16));
    };

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

    // --- ДЕБАГ ТА АВТО-СКРОЛ (ФІНАЛ) ---
    useEffect(() => {
        console.log("🛠️ DEBUG: Ефект запущено! targetNewsId:", targetNewsId, "| loading:", loading, "| filter:", filter);

        if (targetNewsId && !loading && news.length > 0) {
            const targetItem = news.find(n => n.news_id.toString() === targetNewsId.toString());
            console.log("🛠️ DEBUG: Знайдено новину:", targetItem);
            
            if (targetItem) {
                // Якщо є тільки бейдж Анонс (без Новини) - це вкладка Анонсів
                const shouldBeAnnouncement = targetItem.is_announcement && !targetItem.is_news;
                const requiredFilter = shouldBeAnnouncement ? 'Announcement' : 'News';

                if (filter !== requiredFilter) {
                    console.log("🛠️ DEBUG: Перемикаю вкладку на", requiredFilter);
                    setFilter(requiredFilter);
                    return; // Зупиняємось і чекаємо рендеру нової вкладки
                }

                console.log("🛠️ DEBUG: Вкладка правильна. Чекаю 300мс для рендеру і скролю...");
                setTimeout(() => {
                    const element = document.getElementById(`news-${targetNewsId}`);
                    console.log("🛠️ DEBUG: Елемент знайдено в HTML:", !!element);
                    
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Додаємо агресивну червону підсвітку, щоб точно побачити
                        element.classList.add('ring-4', 'ring-red-500', 'bg-red-50', 'transition-all', 'duration-500');
                        setTimeout(() => element.classList.remove('ring-4', 'ring-red-500', 'bg-red-50'), 3000);
                    }
                }, 300); // Збільшена затримка для надійності
            }
        }
    }, [targetNewsId, loading, news, filter]);

    const copyLink = (id) => {
        const link = `${window.location.origin}/?news_id=${id}`;
        navigator.clipboard.writeText(link);
        alert('✅ Посилання скопійовано! Можете відправити його друзям.');
    };

    const formatText = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <p key={index} className="mb-2 min-h-[1rem] break-words whitespace-pre-wrap">
                {line.split(' ').map((word, wordIndex) => {
                    const isUrl = word.match(/^(https?:\/\/[^\s]+)/);
                    if (isUrl) {
                        return <a key={wordIndex} href={word} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium break-all" onClick={(e) => e.stopPropagation()}>{word} </a>;
                    }
                    return word + ' ';
                })}
            </p>
        ));
    };

    const getProcessedNews = () => {
        let processed = [...news]; 

        if (filter === 'News') {
            processed = processed.filter(item => item.is_news);
            processed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (filter === 'Announcement') {
            processed = processed.filter(item => item.is_announcement);
            processed.sort((a, b) => {
                //КГ 2026 05 18 Застосовуємо parseLocalDate для правильного сортування
                const dateA = a.event_date ? parseLocalDate(a.event_date) : new Date(0);
                const dateB = b.event_date ? parseLocalDate(b.event_date) : new Date(0);
                return dateA - dateB;
            });
        }

        return processed;
    };

    const filteredNews = getProcessedNews();

    if (loading) return <div className="text-center py-10 text-gray-500">Завантаження новин...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">📰 Новини та Анонси</h2>
            
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
                <button 
                    onClick={() => setFilter('News')} 
                    className={`px-6 py-2 rounded-full font-bold transition ${filter === 'News' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    📰 Новини
                </button>
                <button 
                    onClick={() => setFilter('Announcement')} 
                    className={`px-6 py-2 rounded-full font-bold transition ${filter === 'Announcement' ? 'bg-pink-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    📣 Анонси
                </button>
            </div>

            <div className="space-y-8">
                {filteredNews.length === 0 ? <p className="text-center text-gray-500 italic">У цій категорії поки що немає записів.</p> : filteredNews.map(item => {
                    //КГ 2026 05 18 Застосовуємо парсинг до відображення дати
                    const displayDate = item.event_date ? parseLocalDate(item.event_date) : parseLocalDate(item.created_at);
                    const dateLabel = (filter === 'Announcement' && item.event_date) ? '📅 Дата події:' : '📅 Опубліковано:';

                    return (
                        <div 
                            key={item.news_id} 
                            id={`news-${item.news_id}`} 
                            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row hover:shadow-xl transition duration-300"
                        >
                            {item.image_url && (
                                <div className="md:w-1/3 h-48 md:h-auto relative shrink-0 bg-gray-100">
                                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        {item.is_announcement && <span className="px-2 py-1 text-xs font-bold text-white rounded uppercase shadow-sm bg-pink-600 w-fit">Анонс</span>}
                                        {item.is_news && <span className="px-2 py-1 text-xs font-bold text-white rounded uppercase shadow-sm bg-blue-600 w-fit">Новина</span>}
                                    </div>
                                </div>
                            )}
                            
                            <div className="p-6 flex flex-col justify-between flex-grow w-full md:w-2/3 relative">
                                <button 
                                    onClick={() => copyLink(item.news_id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition p-1"
                                    title="Копіювати посилання на цю публікацію"
                                >
                                    🔗
                                </button>

                                <div>
                                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2 pr-8">
                                        <h3 className="text-2xl font-bold text-gray-800 leading-tight break-words w-full">{item.title}</h3>
                                        {!item.image_url && (
                                            <div className="flex gap-1">
                                                {item.is_announcement && <span className="px-2 py-1 text-xs font-bold text-white rounded uppercase bg-pink-600">Анонс</span>}
                                                {item.is_news && <span className="px-2 py-1 text-xs font-bold text-white rounded uppercase bg-blue-600">Новина</span>}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4 flex items-center gap-1 font-medium">
                                        {dateLabel} {format(displayDate, 'd MMMM yyyy, HH:mm', { locale: uk })}
                                    </p>
                                    
                                    <div className="text-gray-700 leading-relaxed text-base">
                                        {formatText(item.content)}
                                    </div>
                                </div>

                                {item.event_id && (
                                    <button 
                                        onClick={() => onGoToCalendar(item.event_id, item.event_date)} 
                                        className="mt-6 self-start px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 hover:shadow-lg transition transform active:scale-95 flex items-center gap-2"
                                    >
                                        📅 Докладніше
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NewsPage;