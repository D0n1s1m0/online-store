const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3001;

// ========== НАСТРОЙКА CORS ==========
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Логирование запросов
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

// ========== Swagger configuration ==========
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Online Store API',
            version: '1.0.0',
            description: 'API для управления товарами интернет-магазина',
            contact: {
                name: 'Поддержка API',
                email: 'support@onlinestore.ru'
            }
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Локальный сервер разработки'
            }
        ],
        components: {
            schemas: {
                Product: {
                    type: 'object',
                    required: ['name', 'category', 'description', 'price'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Уникальный идентификатор товара',
                            example: 'abc123'
                        },
                        name: {
                            type: 'string',
                            description: 'Название товара',
                            example: 'Смартфон XYZ Pro'
                        },
                        category: {
                            type: 'string',
                            description: 'Категория товара',
                            example: 'Смартфоны'
                        },
                        description: {
                            type: 'string',
                            description: 'Подробное описание товара',
                            example: '6.7" дисплей, 128 ГБ памяти, тройная камера 50 МП'
                        },
                        price: {
                            type: 'number',
                            description: 'Цена товара в рублях',
                            example: 49990
                        },
                        stock: {
                            type: 'integer',
                            description: 'Количество на складе',
                            example: 15
                        },
                        rating: {
                            type: 'number',
                            description: 'Рейтинг товара (0-5)',
                            example: 4.8
                        },
                        image: {
                            type: 'string',
                            description: 'URL изображения товара',
                            example: 'https://example.com/image.jpg'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Сообщение об ошибке'
                        }
                    }
                }
            }
        }
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Подключаем Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
    }
}));

// ========== ГЛАВНАЯ СТРАНИЦА ==========
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Online Store API</title>
        <style>
            body { 
                font-family: 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 40px;
                text-align: center;
            }
            h1 { font-size: 3rem; margin-bottom: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .card { 
                background: rgba(255,255,255,0.1); 
                border-radius: 16px; 
                padding: 30px;
                backdrop-filter: blur(10px);
                margin-top: 30px;
            }
            ul { text-align: left; }
            li { margin: 15px 0; }
            a { 
                color: #00ff88; 
                text-decoration: none;
                font-size: 1.2rem;
                background: rgba(0,0,0,0.3);
                padding: 10px 20px;
                border-radius: 8px;
                display: inline-block;
            }
            a:hover { background: rgba(0,255,136,0.2); }
            .swagger-link {
                display: inline-block;
                margin-top: 20px;
                padding: 15px 30px;
                background: #00ff88;
                color: #000;
                font-weight: bold;
                border-radius: 8px;
                text-decoration: none;
            }
            .swagger-link:hover {
                background: #00cc66;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛒 Online Store API</h1>
            <p>Сервер успешно запущен на порту 3001!</p>
            <div class="card">
                <h2>Доступные маршруты:</h2>
                <ul>
                    <li><a href="/api/products">📦 /api/products</a> - все товары</li>
                    <li><a href="/api/products/1">🔍 /api/products/1</a> - товар по ID</li>
                    <li><a href="/api/categories">📋 /api/categories</a> - категории</li>
                    <li><a href="/api-docs">📚 /api-docs</a> - Swagger документация</li>
                </ul>
            </div>
            <a href="/api-docs" class="swagger-link">📚 Открыть Swagger документацию</a>
            <p style="margin-top: 20px; opacity: 0.8;">Практические занятия 5-6</p>
        </div>
    </body>
    </html>
  `);
});

// ========== БАЗА ДАННЫХ ==========
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

// Создаем папку data, если её нет
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Загружаем или создаем начальные данные
let products = [];

try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        products = JSON.parse(data);
        console.log(`✅ Загружено ${products.length} товаров`);
    } else {
        // 10+ товаров с изображениями
        products = [
            {
                id: nanoid(6),
                name: 'Смартфон XYZ Pro',
                category: 'Смартфоны',
                description: '6.7" дисплей, 128 ГБ памяти, тройная камера 50 МП, процессор A16',
                price: 49990,
                stock: 15,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'
            },
            {
                id: nanoid(6),
                name: 'Ноутбук UltraBook',
                category: 'Ноутбуки',
                description: '15.6" экран, 512GB SSD, 16GB RAM, Intel Core i7, RTX 3060',
                price: 89990,
                stock: 8,
                rating: 4.9,
                image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'
            },
            {
                id: nanoid(6),
                name: 'Наушники AirSound Pro',
                category: 'Аудио',
                description: 'Беспроводные, активное шумоподавление, 30 часов работы',
                price: 12990,
                stock: 25,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
            },
            {
                id: nanoid(6),
                name: 'Планшет TabPro 11',
                category: 'Планшеты',
                description: '11" экран, стилус в комплекте, 128GB, Wi-Fi',
                price: 34990,
                stock: 12,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'
            },
            {
                id: nanoid(6),
                name: 'Умные часы Watch X',
                category: 'Аксессуары',
                description: 'Отслеживание здоровья, GPS, пульсометр, 7 дней работы',
                price: 15990,
                stock: 20,
                rating: 4.5,
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'
            },
            {
                id: nanoid(6),
                name: 'Игровая консоль GameBox',
                category: 'Игры',
                description: '1TB SSD, 2 геймпада, поддержка 4K',
                price: 45990,
                stock: 5,
                rating: 4.9,
                image: 'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=400'
            },
            {
                id: nanoid(6),
                name: 'Монитор UltraWide 34"',
                category: 'Мониторы',
                description: '34" изогнутый, 144Hz, 1ms, HDR400',
                price: 39990,
                stock: 7,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400'
            },
            {
                id: nanoid(6),
                name: 'Клавиатура Mechanical Pro',
                category: 'Периферия',
                description: 'Механическая, RGB подсветка, свитчи Cherry MX',
                price: 6990,
                stock: 30,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400'
            },
            {
                id: nanoid(6),
                name: 'Мышь Gaming X',
                category: 'Периферия',
                description: '16000 DPI, 8 программируемых кнопок, RGB',
                price: 3990,
                stock: 40,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400'
            },
            {
                id: nanoid(6),
                name: 'Внешний диск 2TB',
                category: 'Хранение',
                description: 'SSD внешний, USB-C, скорость чтения 1000MB/s',
                price: 8990,
                stock: 18,
                rating: 4.5,
                image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400'
            }
        ];
        saveToFile();
    }
} catch (error) {
    console.error('Ошибка загрузки данных:', error);
}

// Функция сохранения
function saveToFile() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// ========== API МАРШРУТЫ ==========

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех товаров с возможностью фильтрации
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Фильтр по категории
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Минимальная цена
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Максимальная цена
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Только товары в наличии
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, rating, name]
 *         description: Сортировка товаров
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Ограничение количества результатов
 *     responses:
 *       200:
 *         description: Успешный ответ со списком товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    try {
        let { category, minPrice, maxPrice, inStock, sort, limit } = req.query;
        let filtered = [...products];

        if (category) filtered = filtered.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
        if (minPrice) filtered = filtered.filter(p => p.price >= Number(minPrice));
        if (maxPrice) filtered = filtered.filter(p => p.price <= Number(maxPrice));
        if (inStock === 'true') filtered = filtered.filter(p => p.stock > 0);

        if (sort) {
            switch (sort) {
                case 'price_asc': filtered.sort((a, b) => a.price - b.price); break;
                case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
                case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
                case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            }
        }

        if (limit) filtered = filtered.slice(0, Number(limit));

        res.json({
            success: true,
            count: filtered.length,
            total: products.length,
            data: filtered
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json({ success: true, data: product });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создает новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *       400:
 *         description: Ошибка валидации
 */
app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, rating, image } = req.body;

    if (!name || !category || !description || !price) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: stock ? Number(stock) : 0,
        rating: rating ? Number(rating) : 0,
        image: image || null
    };

    products.push(newProduct);
    saveToFile();

    res.status(201).json({ success: true, data: newProduct });
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Частично обновляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар успешно обновлен
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    const { name, category, description, price, stock, rating, image } = req.body;

    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (description) product.description = description.trim();
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating) product.rating = Number(rating);
    if (image !== undefined) product.image = image;

    saveToFile();
    res.json({ success: true, data: product });
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар успешно удален
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', (req, res) => {
    const exists = products.some(p => p.id === req.params.id);
    if (!exists) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products = products.filter(p => p.id !== req.params.id);
    saveToFile();
    res.status(204).send();
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Возвращает список всех категорий товаров
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Список категорий
 */
app.get('/api/categories', (req, res) => {
    const categories = [...new Set(products.map(p => p.category))];
    res.json({ success: true, count: categories.length, data: categories });
});

// ========== ОБРАБОТКА ОШИБОК ==========
app.use((req, res) => {
    console.log(`Маршрут не найден: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ========== ЗАПУСК ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 ONLINE STORE ЗАПУЩЕН');
    console.log('='.repeat(50));
    console.log(`📡 Локальный адрес: http://localhost:${PORT}`);
    console.log(`📦 API товаров: http://localhost:${PORT}/api/products`);
    console.log(`📚 Swagger документация: http://localhost:${PORT}/api-docs`);
    console.log(`🛒 Сайт: http://localhost:${PORT}`);
    console.log('='.repeat(50) + '\n');
});