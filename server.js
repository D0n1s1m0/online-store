const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3001;

const ACCESS_SECRET = 'your_access_secret_key_change_in_production_2025';
const REFRESH_SECRET = 'your_refresh_secret_key_change_in_production_2025';
const ACCESS_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_IN = '30d';

const refreshTokens = new Set();

// ========== НАСТРОЙКА CORS ==========
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ========== БАЗА ДАННЫХ ==========
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

let users = [];
let products = [];

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            users = JSON.parse(data);
            console.log(`✅ Загружено ${users.length} пользователей`);
        } else {
            const adminPasswordHash = bcrypt.hashSync('admin123', 10);
            const sellerPasswordHash = bcrypt.hashSync('seller123', 10);
            const userPasswordHash = bcrypt.hashSync('user123', 10);

            users = [
                {
                    id: nanoid(8),
                    email: 'admin@store.com',
                    first_name: 'Admin',
                    last_name: 'Administrator',
                    password_hash: adminPasswordHash,
                    role: 'admin',
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: nanoid(8),
                    email: 'seller@store.com',
                    first_name: 'Seller',
                    last_name: 'User',
                    password_hash: sellerPasswordHash,
                    role: 'seller',
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: nanoid(8),
                    email: 'user@store.com',
                    first_name: 'Regular',
                    last_name: 'User',
                    password_hash: userPasswordHash,
                    role: 'user',
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ];
            saveUsers();
            console.log('✅ Созданы тестовые пользователи:');
            console.log('   👑 Админ: admin@store.com / admin123');
            console.log('   🛒 Продавец: seller@store.com / seller123');
            console.log('   👤 Пользователь: user@store.com / user123');
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения пользователей:', error);
    }
}

function loadProducts() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
            products = JSON.parse(data);
            console.log(`✅ Загружено ${products.length} товаров`);
        } else {
            products = [
                {
                    id: nanoid(8),
                    name: 'Смартфон XYZ Pro',
                    category: 'Смартфоны',
                    description: '6.7" дисплей, 128 ГБ памяти, тройная камера 50 МП',
                    price: 49990,
                    stock: 15,
                    rating: 4.8,
                    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
                    created_by: null,
                    created_at: new Date().toISOString()
                },
                {
                    id: nanoid(8),
                    name: 'Ноутбук UltraBook',
                    category: 'Ноутбуки',
                    description: '15.6" экран, 512GB SSD, 16GB RAM, Intel Core i7',
                    price: 89990,
                    stock: 8,
                    rating: 4.9,
                    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
                    created_by: null,
                    created_at: new Date().toISOString()
                },
                {
                    id: nanoid(8),
                    name: 'Наушники AirSound Pro',
                    category: 'Аудио',
                    description: 'Беспроводные, активное шумоподавление, 30 часов работы',
                    price: 12990,
                    stock: 25,
                    rating: 4.7,
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                    created_by: null,
                    created_at: new Date().toISOString()
                }
            ];
            saveProducts();
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

function saveProducts() {
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения товаров:', error);
    }
}

// ========== MIDDLEWARE АУТЕНТИФИКАЦИИ ==========
function authMiddleware(req, res, next) {
    const token = req.headers.authorization || '';

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const user = users.find(u => u.id === payload.sub && u.is_active);

        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            };
        } else {
            req.user = null;
        }
        next();
    } catch (err) {
        req.user = null;
        next();
    }
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    next();
}

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Доступ запрещен. Требуется роль: ${allowedRoles.join(' или ')}` });
        }
        next();
    };
}

// ========== ГЕНЕРАЦИЯ ТОКЕНОВ ==========
function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

app.use(authMiddleware);

// ========== SWAGGER КОНФИГУРАЦИЯ ==========
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Online Store API',
            version: '1.0.0',
            description: `API для интернет-магазина с системой ролей (RBAC)

## Система ролей:
- 👑 **admin** - полный доступ: управление товарами, пользователями, назначение ролей
- 🛒 **seller** - управление товарами (создание, редактирование)
- 👤 **user** - только просмотр товаров

## Тестовые аккаунты:
- 👑 Админ: admin@store.com / admin123
- 🛒 Продавец: seller@store.com / seller123
- 👤 Пользователь: user@store.com / user123`
        },
        servers: [{ url: `http://localhost:${PORT}`, description: 'Локальный сервер' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'Authorization',
                    description: 'Введите полученный accessToken'
                }
            },
            schemas: {
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'first_name', 'last_name'],
                    properties: {
                        email: { type: 'string', example: 'user@example.com' },
                        password: { type: 'string', example: 'password123' },
                        first_name: { type: 'string', example: 'Иван' },
                        last_name: { type: 'string', example: 'Петров' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'admin@store.com' },
                        password: { type: 'string', example: 'admin123' }
                    }
                },
                RefreshRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: { type: 'string' }
                    }
                },
                ProductRequest: {
                    type: 'object',
                    required: ['name', 'category', 'description', 'price'],
                    properties: {
                        name: { type: 'string', example: 'Новый товар' },
                        category: { type: 'string', example: 'Электроника' },
                        description: { type: 'string', example: 'Описание товара' },
                        price: { type: 'number', example: 9990 },
                        stock: { type: 'integer', example: 10 },
                        rating: { type: 'number', example: 4.5 },
                        image: { type: 'string', example: 'https://example.com/image.jpg' }
                    }
                },
                UserUpdateRequest: {
                    type: 'object',
                    properties: {
                        first_name: { type: 'string', example: 'Новое имя' },
                        last_name: { type: 'string', example: 'Новая фамилия' },
                        role: { type: 'string', enum: ['user', 'seller', 'admin'], example: 'seller' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                first_name: { type: 'string' },
                                last_name: { type: 'string' },
                                role: { type: 'string' }
                            }
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        role: { type: 'string' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        category: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        stock: { type: 'integer' },
                        rating: { type: 'number' },
                        image: { type: 'string' },
                        created_by: { type: 'string' },
                        created_at: { type: 'string' }
                    }
                }
            }
        },
        tags: [
            { name: 'Auth', description: '🔐 Аутентификация и регистрация' },
            { name: 'Users', description: '👥 Управление пользователями (только админ)' },
            { name: 'Products', description: '📦 Управление товарами' },
            { name: 'Categories', description: '📂 Категории товаров' }
        ]
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
    }
}));

// ========== API МАРШРУТЫ ==========

// -------------------- AUTH --------------------
app.post('/api/auth/register', async (req, res) => {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({ error: 'Пользователь уже существует' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = {
        id: nanoid(8),
        email,
        first_name,
        last_name,
        password_hash,
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers();

    const { password_hash: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.is_active) {
        return res.status(401).json({ error: 'Аккаунт заблокирован' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
        success: true,
        accessToken,
        refreshToken,
        user: userWithoutPassword
    });
});

app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken обязателен' });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Недействительный refresh токен' });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find(u => u.id === payload.sub && u.is_active);

        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        refreshTokens.delete(refreshToken);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);

        const { password_hash: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: userWithoutPassword
        });
    } catch (err) {
        refreshTokens.delete(refreshToken);
        return res.status(401).json({ error: 'Недействительный refresh токен' });
    }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    res.json({ success: true, message: 'Выход выполнен успешно' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ success: true, data: req.user });
});

// -------------------- USERS (только админ) --------------------
app.get('/api/users', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);
    res.json({ success: true, count: usersWithoutPassword.length, data: usersWithoutPassword });
});

app.get('/api/users/:id', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
});

app.put('/api/users/:id', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.role === 'admin' && req.user.id !== user.id) {
        return res.status(403).json({ error: 'Нельзя изменять другого администратора' });
    }

    const { first_name, last_name, role } = req.body;
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (role && ['user', 'seller', 'admin'].includes(role)) {
        user.role = role;
    }

    saveUsers();

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
});

// Специальный эндпоинт для смены роли
app.patch('/api/users/:id/role', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.role === 'admin') {
        return res.status(403).json({ error: 'Нельзя изменить роль администратора' });
    }

    const { role } = req.body;
    if (!role || !['user', 'seller'].includes(role)) {
        return res.status(400).json({ error: 'Недопустимая роль. Допустимые: user, seller' });
    }

    const oldRole = user.role;
    user.role = role;
    saveUsers();

    res.json({
        success: true,
        message: `Роль пользователя ${user.email} изменена с "${oldRole}" на "${role}"`,
        data: { id: user.id, email: user.email, role: user.role }
    });
});

app.delete('/api/users/:id', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.role === 'admin') {
        return res.status(403).json({ error: 'Нельзя заблокировать администратора' });
    }

    user.is_active = false;
    saveUsers();
    res.json({ success: true, message: `Пользователь ${user.email} заблокирован` });
});

// -------------------- PRODUCTS (доступны всем на просмотр) --------------------
app.get('/api/products', (req, res) => {
    try {
        let { category, minPrice, maxPrice, inStock, sort, limit } = req.query;
        let filtered = [...products];

        if (category) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
        }
        if (minPrice) {
            filtered = filtered.filter(p => p.price >= Number(minPrice));
        }
        if (maxPrice) {
            filtered = filtered.filter(p => p.price <= Number(maxPrice));
        }
        if (inStock === 'true') {
            filtered = filtered.filter(p => p.stock > 0);
        }

        if (sort) {
            switch (sort) {
                case 'price_asc': filtered.sort((a, b) => a.price - b.price); break;
                case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
                case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
                case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            }
        }

        if (limit) {
            filtered = filtered.slice(0, Number(limit));
        }

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

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json({ success: true, data: product });
});

app.get('/api/categories', (req, res) => {
    const categories = [...new Set(products.map(p => p.category))];
    res.json({ success: true, count: categories.length, data: categories });
});

// -------------------- ЗАЩИЩЕННЫЕ МАРШРУТЫ ТОВАРОВ (admin и seller) --------------------
app.post('/api/products', requireAuth, roleMiddleware(['admin', 'seller']), (req, res) => {
    const { name, category, description, price, stock, rating, image } = req.body;

    if (!name || !category || !description || !price) {
        return res.status(400).json({ error: 'Обязательные поля: name, category, description, price' });
    }

    const newProduct = {
        id: nanoid(8),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: stock ? Number(stock) : 0,
        rating: rating ? Number(rating) : 0,
        image: image || null,
        created_by: req.user.id,
        created_by_name: `${req.user.first_name} ${req.user.last_name}`,
        created_at: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts();

    res.status(201).json({ success: true, data: newProduct });
});

app.put('/api/products/:id', requireAuth, roleMiddleware(['admin', 'seller']), (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    const { name, category, description, price, stock, rating, image } = req.body;

    products[productIndex] = {
        ...products[productIndex],
        name: name || products[productIndex].name,
        category: category || products[productIndex].category,
        description: description || products[productIndex].description,
        price: price ? Number(price) : products[productIndex].price,
        stock: stock !== undefined ? Number(stock) : products[productIndex].stock,
        rating: rating ? Number(rating) : products[productIndex].rating,
        image: image !== undefined ? image : products[productIndex].image,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
    };

    saveProducts();
    res.json({ success: true, data: products[productIndex] });
});

app.patch('/api/products/:id', requireAuth, roleMiddleware(['admin', 'seller']), (req, res) => {
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

    saveProducts();
    res.json({ success: true, data: product });
});

// Только admin может удалять товары
app.delete('/api/products/:id', requireAuth, roleMiddleware(['admin']), (req, res) => {
    const exists = products.some(p => p.id === req.params.id);
    if (!exists) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products = products.filter(p => p.id !== req.params.id);
    saveProducts();
    res.status(204).send();
});

// -------------------- СТАТИСТИКА --------------------
app.get('/api/stats', (req, res) => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const averagePrice = products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
    const categories = [...new Set(products.map(p => p.category))];

    res.json({
        success: true,
        data: {
            totalProducts,
            totalStock,
            averagePrice: Math.round(averagePrice),
            categoriesCount: categories.length,
            categories
        }
    });
});

// ========== ГЛАВНАЯ СТРАНИЦА ==========
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Online Store API</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                min-height: 100vh;
            }
            .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
            h1 { font-size: 3rem; margin-bottom: 10px; text-align: center; }
            .subtitle { text-align: center; opacity: 0.9; margin-bottom: 40px; }
            .card { 
                background: rgba(255,255,255,0.1); 
                border-radius: 16px; 
                padding: 25px;
                backdrop-filter: blur(10px);
                margin-bottom: 25px;
            }
            .card h2 { margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px; }
            .credentials { 
                background: rgba(0,0,0,0.3); 
                border-radius: 12px; 
                padding: 15px;
                font-family: monospace;
            }
            .role-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: bold;
                margin-left: 8px;
            }
            .role-admin { background: #ff4d4d; }
            .role-seller { background: #fca130; }
            .role-user { background: #00ff88; color: #000; }
            .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background: #00ff88;
                color: #000;
                font-weight: bold;
                border-radius: 8px;
                text-decoration: none;
            }
            .btn:hover { background: #00cc66; transform: scale(1.02); transition: all 0.2s; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛒 Online Store API</h1>
            <div class="subtitle">REST API с системой ролей (RBAC) - Admin, Seller, User</div>
            
            <div class="card">
                <h2>📋 Тестовые аккаунты</h2>
                <div class="credentials">
                    <p><strong>👑 Администратор</strong> <span class="role-badge role-admin">admin</span></p>
                    <p>📧 admin@store.com / 🔑 admin123</p>
                    <p style="margin-top: 10px;"><strong>🛒 Продавец</strong> <span class="role-badge role-seller">seller</span></p>
                    <p>📧 seller@store.com / 🔑 seller123</p>
                    <p style="margin-top: 10px;"><strong>👤 Пользователь</strong> <span class="role-badge role-user">user</span></p>
                    <p>📧 user@store.com / 🔑 user123</p>
                </div>
            </div>

            <div class="card">
                <h2>🔐 Система ролей</h2>
                <div class="credentials">
                    <p>👑 <strong>Admin</strong> - полный доступ: управление товарами, пользователями, назначение ролей</p>
                    <p>🛒 <strong>Seller</strong> - управление товарами (создание, редактирование)</p>
                    <p>👤 <strong>User</strong> - только просмотр товаров</p>
                    <p>👀 <strong>Гость (без входа)</strong> - просмотр товаров</p>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="/api-docs" class="btn">📚 Открыть Swagger документацию</a>
                <a href="/" class="btn" style="margin-left: 15px;">🏠 Магазин</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// ========== ОБРАБОТКА ОШИБОК ==========
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ========== ЗАПУСК ==========
loadUsers();
loadProducts();

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ONLINE STORE API ЗАПУЩЕН');
    console.log('='.repeat(60));
    console.log(`📡 Адрес: http://localhost:${PORT}`);
    console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
    console.log(`🏠 Магазин: http://localhost:${PORT}`);
    console.log('\n👥 ТЕСТОВЫЕ АККАУНТЫ:');
    console.log(`   👑 Админ: admin@store.com / admin123`);
    console.log(`   🛒 Продавец: seller@store.com / seller123`);
    console.log(`   👤 Пользователь: user@store.com / user123`);
    console.log('\n🔐 СИСТЕМА РОЛЕЙ:');
    console.log(`   👑 Admin: полный доступ (товары + пользователи)`);
    console.log(`   🛒 Seller: управление товарами (создание, редактирование)`);
    console.log(`   👤 User: только просмотр товаров`);
    console.log(`   👀 Гость: просмотр товаров (без входа)`);
    console.log('='.repeat(60) + '\n');
});