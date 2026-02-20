// ========== БАЗА ДАННЫХ (В ПАМЯТИ) ==========
let products = [
    { id: 1, name: 'Ноутбук ASUS ROG', price: 129990 },
    { id: 2, name: 'Смартфон Samsung S24 Ultra', price: 119990 },
    { id: 3, name: 'Наушники Sony WH-1000XM5', price: 32990 },
    { id: 4, name: 'Клавиатура Logitech MX Mechanical', price: 18990 },
    { id: 5, name: 'Монитор LG UltraGear 27"', price: 35990 },
    { id: 6, name: 'Мышь Razer DeathAdder V3', price: 8990 }
];

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
const validateProductData = (name, price) => {
    const errors = [];
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Название товара обязательно и должно быть строкой');
    } else if (name.trim().length < 2) {
        errors.push('Название товара должно содержать минимум 2 символа');
    }
    
    if (price === undefined || price === null) {
        errors.push('Цена товара обязательна');
    } else {
        const numPrice = Number(price);
        if (isNaN(numPrice)) {
            errors.push('Цена должна быть числом');
        } else if (numPrice <= 0) {
            errors.push('Цена должна быть положительным числом');
        } else if (numPrice > 10000000) {
            errors.push('Цена не может превышать 10 миллионов');
        }
    }
    
    return errors;
};

const findProductIndex = (id) => {
    return products.findIndex(p => p.id === id);
};

const generateNewId = () => {
    return products.length > 0 
        ? Math.max(...products.map(p => p.id)) + 1 
        : 1;
};

// ========== ОСНОВНЫЕ CRUD ОПЕРАЦИИ ==========

// GET /api/products - получить все товары (с фильтрацией)
const getAllProducts = (req, res) => {
    try {
        let { minPrice, maxPrice, sort, limit } = req.query;
        let filteredProducts = [...products];
        
        // Фильтрация по минимальной цене
        if (minPrice) {
            const min = Number(minPrice);
            if (!isNaN(min)) {
                filteredProducts = filteredProducts.filter(p => p.price >= min);
            }
        }
        
        // Фильтрация по максимальной цене
        if (maxPrice) {
            const max = Number(maxPrice);
            if (!isNaN(max)) {
                filteredProducts = filteredProducts.filter(p => p.price <= max);
            }
        }
        
        // Сортировка
        if (sort) {
            switch(sort) {
                case 'price_asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name_desc':
                    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
                    break;
            }
        }
        
        // Ограничение количества результатов
        if (limit) {
            const limitNum = Number(limit);
            if (!isNaN(limitNum) && limitNum > 0) {
                filteredProducts = filteredProducts.slice(0, limitNum);
            }
        }
        
        res.json({
            success: true,
            count: filteredProducts.length,
            total: products.length,
            filters: {
                minPrice: minPrice || null,
                maxPrice: maxPrice || null,
                sort: sort || null,
                limit: limit || null
            },
            data: filteredProducts
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении товаров',
            details: error.message 
        });
    }
};

// GET /api/products/:id - получить товар по ID
const getProductById = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректный ID товара' 
            });
        }
        
        const product = products.find(p => p.id === id);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                error: 'Товар не найден',
                message: `Товар с ID ${id} не существует`
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении товара',
            details: error.message 
        });
    }
};

// POST /api/products - создать новый товар
const createProduct = (req, res) => {
    try {
        const { name, price } = req.body;
        
        // Валидация данных
        const errors = validateProductData(name, price);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ошибка валидации',
                errors: errors
            });
        }
        
        // Создание нового товара
        const newProduct = {
            id: generateNewId(),
            name: name.trim(),
            price: Number(price)
        };
        
        products.push(newProduct);
        
        res.status(201).json({
            success: true,
            message: 'Товар успешно создан',
            data: newProduct
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при создании товара',
            details: error.message 
        });
    }
};

// PUT /api/products/:id - полностью обновить товар
const updateProduct = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price } = req.body;
        
        if (isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректный ID товара' 
            });
        }
        
        const productIndex = findProductIndex(id);
        
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Товар не найден',
                message: `Товар с ID ${id} не существует`
            });
        }
        
        // Для PUT запроса оба поля обязательны
        if (!name || !price) {
            return res.status(400).json({
                success: false,
                error: 'Для полного обновления необходимы name и price'
            });
        }
        
        // Валидация данных
        const errors = validateProductData(name, price);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ошибка валидации',
                errors: errors
            });
        }
        
        // Обновление товара
        products[productIndex] = {
            id: id,
            name: name.trim(),
            price: Number(price)
        };
        
        res.json({
            success: true,
            message: 'Товар успешно обновлен',
            data: products[productIndex]
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при обновлении товара',
            details: error.message 
        });
    }
};

// PATCH /api/products/:id - частично обновить товар
const partialUpdateProduct = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price } = req.body;
        
        if (isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректный ID товара' 
            });
        }
        
        const productIndex = findProductIndex(id);
        
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Товар не найден',
                message: `Товар с ID ${id} не существует`
            });
        }
        
        // Частичное обновление
        if (name) {
            if (typeof name !== 'string' || name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Название должно содержать минимум 2 символа'
                });
            }
            products[productIndex].name = name.trim();
        }
        
        if (price) {
            const numPrice = Number(price);
            if (isNaN(numPrice) || numPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Цена должна быть положительным числом'
                });
            }
            products[productIndex].price = numPrice;
        }
        
        res.json({
            success: true,
            message: 'Товар успешно обновлен',
            data: products[productIndex]
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при обновлении товара',
            details: error.message 
        });
    }
};

// DELETE /api/products/:id - удалить товар
const deleteProduct = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректный ID товара' 
            });
        }
        
        const productIndex = findProductIndex(id);
        
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Товар не найден',
                message: `Товар с ID ${id} не существует`
            });
        }
        
        const deletedProduct = products[productIndex];
        products = products.filter(p => p.id !== id);
        
        res.json({
            success: true,
            message: 'Товар успешно удален',
            data: deletedProduct
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при удалении товара',
            details: error.message 
        });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    partialUpdateProduct,
    deleteProduct
};