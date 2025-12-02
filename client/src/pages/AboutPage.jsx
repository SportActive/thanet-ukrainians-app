import React from 'react';

const AboutPage = () => {
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-2xl my-8 border border-gray-100">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">🇺🇦 Українці в Танеті</h1>
                <p className="text-xl text-gray-600">Сила в єдності. Підтримка в дії.</p>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-2xl font-bold text-indigo-700 mb-3 border-b pb-2">Хто ми?</h2>
                    <p className="text-gray-700 leading-relaxed text-lg">
                        Ми — спільнота українців, що проживають у регіоні Танет. Наша мета — об'єднати співвітчизників, надати підтримку тим, хто її потребує, та зберегти нашу культуру далеко від дому. Ми організовуємо освітні заходи, зустрічі, екскурсії та благодійні ініціативи.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-indigo-700 mb-3 border-b pb-2">Наші Контакти</h2>
                    <ul className="space-y-2 text-lg text-gray-700">
                        <li>📧 <strong>Email:</strong> contact@thanet-ukrainians.com</li>
                        <li>📱 <strong>WhatsApp:</strong> +44 7700 900000</li>
                        <li>facebook <strong>Facebook:</strong> <a href="#" className="text-blue-600 hover:underline">Група Українці в Танеті</a></li>
                    </ul>
                </section>

                <section className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                    <h2 className="text-2xl font-bold text-yellow-800 mb-4 text-center">🤝 Подяки</h2>
                    <p className="text-gray-700 text-center mb-6">
                        Ми щиро дякуємо кожному волонтеру та партнеру, хто робить наш проєкт можливим.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded shadow-sm">
                            <h4 className="font-bold text-gray-800">Local Council</h4>
                            <p className="text-sm text-gray-500">За надання приміщень для зустрічей.</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm">
                            <h4 className="font-bold text-gray-800">Волонтерська група "Надія"</h4>
                            <p className="text-sm text-gray-500">За організацію дитячих свят.</p>
                        </div>
                         <div className="bg-white p-4 rounded shadow-sm">
                            <h4 className="font-bold text-gray-800">Кирило та Команда Розробників</h4>
                            <p className="text-sm text-gray-500">За створення цього чудового додатку!</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;