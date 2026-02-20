const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - получить все товары (с возможностью фильтрации)
router.get('/', productController.getAllProducts);

// GET /api/products/:id - получить товар по ID
router.get('/:id', productController.getProductById);

// POST /api/products - создать новый товар
router.post('/', productController.createProduct);

// PUT /api/products/:id - полностью обновить товар
router.put('/:id', productController.updateProduct);

// PATCH /api/products/:id - частично обновить товар (дополнительно)
router.patch('/:id', productController.partialUpdateProduct);

// DELETE /api/products/:id - удалить товар
router.delete('/:id', productController.deleteProduct);

module.exports = router;