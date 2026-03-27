// ========== API КЛИЕНТ ==========
const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (response.status === 204) return null;
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
        return data;
    },
    
    getProducts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.inStock) params.append('inStock', 'true');
        if (filters.sort) params.append('sort', filters.sort);
        
        const query = params.toString();
        return this.request(`/products${query ? '?' + query : ''}`);
    },
    
    getProduct(id) {
        return this.request(`/products/${id}`);
    },
    
    createProduct(product) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
    },
    
    updateProduct(id, product) {
        return this.request(`/products/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(product)
        });
    },
    
    deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },
    
    getCategories() {
        return this.request('/categories');
    }
};

// ========== СОСТОЯНИЕ ==========
let products = [];
let filters = {
    category: '',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sort: 'name'
};

// ========== DOM ЭЛЕМЕНТЫ ==========
const elements = {
    grid: document.getElementById('products-grid'),
    loader: document.getElementById('loader'),
    count: document.getElementById('products-count'),
    
    filterCategory: document.getElementById('filter-category'),
    filterMinPrice: document.getElementById('filter-min-price'),
    filterMaxPrice: document.getElementById('filter-max-price'),
    filterInStock: document.getElementById('filter-in-stock'),
    filterSort: document.getElementById('filter-sort'),
    clearFilters: document.getElementById('clear-filters'),
    
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalClose: document.getElementById('modal-close'),
    modalCancel: document.getElementById('modal-cancel'),
    createBtn: document.getElementById('create-btn'),
    productForm: document.getElementById('product-form'),
    productId: document.getElementById('product-id'),
    productName: document.getElementById('product-name'),
    productCategory: document.getElementById('product-category'),
    productDescription: document.getElementById('product-description'),
    productPrice: document.getElementById('product-price'),
    productStock: document.getElementById('product-stock'),
    productRating: document.getElementById('product-rating'),
    productImage: document.getElementById('product-image'),
    modalSubmit: document.getElementById('modal-submit'),
    
    toast: document.getElementById('toast')
};

// ========== УТИЛИТЫ ==========
function showLoader() {
    if (elements.loader) {
        elements.loader.style.display = 'block';
    }
}

function hideLoader() {
    if (elements.loader) {
        elements.loader.style.display = 'none';
    }
}

function showToast(message, isError = false) {
    if (!elements.toast) return;
    
    elements.toast.textContent = message;
    elements.toast.style.backgroundColor = isError ? '#ff4d4d' : '#00ff88';
    elements.toast.style.color = '#000';
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ЗАГРУЗКА ТОВАРОВ ==========
async function loadProducts() {
    showLoader();
    try {
        const response = await API.getProducts(filters);
        products = response.data || [];
        renderProducts();
        
        if (elements.count) {
            elements.count.textContent = `(${products.length})`;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('Ошибка загрузки товаров', true);
    } finally {
        hideLoader();
    }
}

// ========== ОТОБРАЖЕНИЕ ТОВАРОВ ==========
function renderProducts() {
    if (!elements.grid) return;
    
    if (!products.length) {
        elements.grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h3>Товаров пока нет</h3>
                <p>Нажмите "Добавить товар" чтобы создать первый товар</p>
            </div>
        `;
        return;
    }
    
    elements.grid.innerHTML = products.map(product => {
        const imageUrl = product.image || 'https://via.placeholder.com/400x300?text=No+Image';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-card__image">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">
                </div>
                <div class="product-card__content">
                    <div class="product-card__header">
                        <div>
                            <h3 class="product-card__title">${escapeHtml(product.name)}</h3>
                            <span class="product-card__category">${escapeHtml(product.category)}</span>
                        </div>
                        <span class="product-card__rating">
                            <i class="fa-solid fa-star"></i> ${product.rating.toFixed(1)}
                        </span>
                    </div>
                    <p class="product-card__description">${escapeHtml(product.description)}</p>
                    <div class="product-card__details">
                        <span class="product-card__price">${formatPrice(product.price)}</span>
                        <span class="product-card__stock ${product.stock > 10 ? 'product-card__stock--high' : 'product-card__stock--low'}">
                            ${product.stock > 0 ? `В наличии: ${product.stock}` : 'Нет в наличии'}
                        </span>
                    </div>
                    <div class="product-card__actions">
                        <button class="btn btn--primary" onclick="editProduct('${product.id}')">
                            <i class="fa-solid fa-pen"></i> Изменить
                        </button>
                        <button class="btn btn--danger" onclick="deleteProduct('${product.id}')">
                            <i class="fa-solid fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== CRUD ОПЕРАЦИИ ==========
window.editProduct = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Редактировать товар';
    if (elements.productId) elements.productId.value = product.id;
    if (elements.productName) elements.productName.value = product.name;
    if (elements.productCategory) elements.productCategory.value = product.category;
    if (elements.productDescription) elements.productDescription.value = product.description;
    if (elements.productPrice) elements.productPrice.value = product.price;
    if (elements.productStock) elements.productStock.value = product.stock;
    if (elements.productRating) elements.productRating.value = product.rating;
    if (elements.productImage) elements.productImage.value = product.image || '';
    if (elements.modalSubmit) elements.modalSubmit.textContent = 'Сохранить';
    
    openModal();
};

window.deleteProduct = async function(id) {
    if (!confirm('Удалить товар?')) return;
    
    try {
        await API.deleteProduct(id);
        await loadProducts();
        showToast('Товар удален');
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showToast('Ошибка удаления товара', true);
    }
};

// ========== МОДАЛЬНОЕ ОКНО ==========
function openModal() {
    if (elements.modal) {
        elements.modal.classList.remove('hidden');
    }
}

function closeModal() {
    if (elements.modal) {
        elements.modal.classList.add('hidden');
    }
    if (elements.productForm) {
        elements.productForm.reset();
    }
    if (elements.productId) {
        elements.productId.value = '';
    }
}

// ========== ОБРАБОТЧИК ФОРМЫ ==========
async function handleSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: elements.productName ? elements.productName.value : '',
        category: elements.productCategory ? elements.productCategory.value : '',
        description: elements.productDescription ? elements.productDescription.value : '',
        price: elements.productPrice ? Number(elements.productPrice.value) : 0,
        stock: elements.productStock ? Number(elements.productStock.value) || 0 : 0,
        rating: elements.productRating ? Number(elements.productRating.value) || 0 : 0,
        image: elements.productImage ? elements.productImage.value : null
    };
    
    try {
        const id = elements.productId ? elements.productId.value : '';
        if (id) {
            await API.updateProduct(id, productData);
            showToast('Товар обновлен');
        } else {
            await API.createProduct(productData);
            showToast('Товар создан');
        }
        
        closeModal();
        await loadProducts();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToast('Ошибка сохранения товара', true);
    }
}

// ========== ФИЛЬТРЫ ==========
function updateFilters() {
    filters = {
        category: elements.filterCategory ? elements.filterCategory.value : '',
        minPrice: elements.filterMinPrice ? elements.filterMinPrice.value : '',
        maxPrice: elements.filterMaxPrice ? elements.filterMaxPrice.value : '',
        inStock: elements.filterInStock ? elements.filterInStock.checked : false,
        sort: elements.filterSort ? elements.filterSort.value : 'name'
    };
    loadProducts();
}

function clearFilters() {
    if (elements.filterCategory) elements.filterCategory.value = '';
    if (elements.filterMinPrice) elements.filterMinPrice.value = '';
    if (elements.filterMaxPrice) elements.filterMaxPrice.value = '';
    if (elements.filterInStock) elements.filterInStock.checked = false;
    if (elements.filterSort) elements.filterSort.value = 'name';
    updateFilters();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем товары
    loadProducts();
    
    // Фильтры
    if (elements.filterCategory) elements.filterCategory.addEventListener('input', updateFilters);
    if (elements.filterMinPrice) elements.filterMinPrice.addEventListener('input', updateFilters);
    if (elements.filterMaxPrice) elements.filterMaxPrice.addEventListener('input', updateFilters);
    if (elements.filterInStock) elements.filterInStock.addEventListener('change', updateFilters);
    if (elements.filterSort) elements.filterSort.addEventListener('change', updateFilters);
    if (elements.clearFilters) elements.clearFilters.addEventListener('click', clearFilters);
    
    // Модальное окно
    if (elements.createBtn) {
        elements.createBtn.addEventListener('click', () => {
            if (elements.modalTitle) elements.modalTitle.textContent = 'Добавить товар';
            if (elements.modalSubmit) elements.modalSubmit.textContent = 'Создать';
            if (elements.productId) elements.productId.value = '';
            if (elements.productForm) elements.productForm.reset();
            openModal();
        });
    }
    
    if (elements.modalClose) elements.modalClose.addEventListener('click', closeModal);
    if (elements.modalCancel) elements.modalCancel.addEventListener('click', closeModal);
    if (elements.productForm) elements.productForm.addEventListener('submit', handleSubmit);
    
    // Закрытие по клику вне модалки
    if (elements.modal) {
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) closeModal();
        });
    }
});