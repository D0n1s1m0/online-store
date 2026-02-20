const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/products');
const logger = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors());                                // Разрешаем кросс-доменные запросы
app.use(express.json());                        // Парсинг JSON тела запроса
app.use(express.urlencoded({ extended: true })); // Парсинг данных форм
app.use(logger);                                // Пользовательское middleware для логирования

// ========== МАРШРУТЫ ==========
// Подключаем маршруты для товаров (все пути начинаются с /api/products)
app.use('/api/products', productRoutes);

// Корневой маршрут - документация API
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Добро пожаловать в API управления товарами',
        version: '2.0.0',
        author: 'Студент 4 семестра',
        endpoints: {
            // GET запросы
            getAllProducts: {
                method: 'GET',
                url: '/api/products',
                description: 'Получить список всех товаров',
                examples: [
                    '/api/products',
                    '/api/products?minPrice=1000&maxPrice=50000'
                ]
            },
            getProductById: {
                method: 'GET',
                url: '/api/products/:id',
                description: 'Получить товар по ID',
                example: '/api/products/1'
            },
            
            // POST запросы
            createProduct: {
                method: 'POST',
                url: '/api/products',
                description: 'Создать новый товар',
                body: {
                    name: 'Название товара (обязательно)',
                    price: 'Цена товара (обязательно, число)'
                }
            },
            
            // PUT запросы
            updateProduct: {
                method: 'PUT',
                url: '/api/products/:id',
                description: 'Обновить существующий товар',
                body: {
                    name: 'Новое название (опционально)',
                    price: 'Новая цена (опционально)'
                }
            },
            
            // DELETE запросы
            deleteProduct: {
                method: 'DELETE',
                url: '/api/products/:id',
                description: 'Удалить товар по ID'
            }
        }
    });
});

// ========== ОБРАБОТКА ОШИБОК ==========
// Middleware для обработки несуществующих маршрутов (404)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден',
        message: `Не удалось найти ${req.method} ${req.url}`,
        availableEndpoints: 'Проверьте документацию по адресу GET /'
    });
});

// Централизованная обработка ошибок сервера (500)
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: err.message || 'Что-то пошло не так'
    });
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН`);
    console.log('='.repeat(50));
    console.log(`📡 Адрес: http://localhost:${PORT}`);
    console.log(`📦 API товаров: http://localhost:${PORT}/api/products`);
    console.log(`📚 Документация: http://localhost:${PORT}`);
    console.log('='.repeat(50) + '\n');
});