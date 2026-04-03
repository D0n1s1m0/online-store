// ========== ТОКЕНЫ ==========
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let currentUser = null;

// Восстанавливаем пользователя
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
    } catch (e) { }
}

// ========== API КЛИЕНТ ==========
const API = {
    baseURL: '/api',

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (accessToken) {
            headers['Authorization'] = accessToken;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 204) return null;

        if (response.status === 401 && accessToken && !options._retry) {
            const refreshed = await this.refresh();
            if (refreshed) {
                options._retry = true;
                return this.request(endpoint, options);
            } else {
                logout();
                throw new Error('Сессия истекла');
            }
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
        return data;
    },

    async register(userData) {
        const response = await fetch(`${this.baseURL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    async login(email, password) {
        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
        currentUser = data.user;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        return data;
    },

    async refresh() {
        if (!refreshToken) return null;

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            currentUser = data.user;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            return data;
        } catch (error) {
            return null;
        }
    },

    async logout() {
        try {
            if (accessToken) {
                await fetch(`${this.baseURL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': accessToken
                    },
                    body: JSON.stringify({ refreshToken })
                });
            }
        } catch (e) { }

        accessToken = null;
        refreshToken = null;
        currentUser = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
    },

    async getProducts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.inStock) params.append('inStock', 'true');
        if (filters.sort) params.append('sort', filters.sort);

        const query = params.toString();
        const url = `${this.baseURL}/products${query ? '?' + query : ''}`;

        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    async createProduct(product) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
    },

    async updateProduct(id, product) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        });
    },

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },

    async getUsers() {
        return this.request('/users');
    },

    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    async updateUserRole(id, role) {
        return this.request(`/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    },

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }
};

// ========== СОСТОЯНИЕ ==========
let products = [];
let users = [];
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
    count: document.getElementById('products-count'),
    authSection: document.getElementById('auth-section'),
    mainContent: document.getElementById('main-content'),
    adminPanel: document.getElementById('admin-panel'),
    createBtn: document.getElementById('create-btn'),
    adminPanelBtn: document.getElementById('admin-panel-btn'),
    closeAdminPanel: document.getElementById('close-admin-panel'),
    usersList: document.getElementById('users-list'),
    userSearch: document.getElementById('user-search'),

    filterCategory: document.getElementById('filter-category'),
    filterMinPrice: document.getElementById('filter-min-price'),
    filterMaxPrice: document.getElementById('filter-max-price'),
    filterInStock: document.getElementById('filter-in-stock'),
    filterSort: document.getElementById('filter-sort'),
    clearFilters: document.getElementById('clear-filters'),

    // Модальные окна
    loginModal: document.getElementById('login-modal'),
    registerModal: document.getElementById('register-modal'),
    productModal: document.getElementById('product-modal'),
    userModal: document.getElementById('user-modal'),

    // Поля формы товара
    productId: document.getElementById('product-id'),
    productName: document.getElementById('product-name'),
    productCategory: document.getElementById('product-category'),
    productDescription: document.getElementById('product-description'),
    productPrice: document.getElementById('product-price'),
    productStock: document.getElementById('product-stock'),
    productRating: document.getElementById('product-rating'),
    productImage: document.getElementById('product-image'),
    modalTitle: document.getElementById('modal-title'),

    toast: document.getElementById('toast')
};

// ========== УТИЛИТЫ ==========
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

function getRoleBadge(role) {
    switch (role) {
        case 'admin': return '<span class="role-badge role-admin">👑 Админ</span>';
        case 'seller': return '<span class="role-badge role-seller">🛒 Продавец</span>';
        default: return '<span class="role-badge role-user">👤 Пользователь</span>';
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function openModal(modal) {
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
}

function openLoginModal() {
    openModal(elements.loginModal);
}

function closeLoginModal() {
    closeModal(elements.loginModal);
}

function openRegisterModal() {
    openModal(elements.registerModal);
}

function closeRegisterModal() {
    closeModal(elements.registerModal);
}

function openProductModal(isEdit = false) {
    if (!isEdit) {
        // Очищаем форму для нового товара
        if (elements.productId) elements.productId.value = '';
        if (elements.productName) elements.productName.value = '';
        if (elements.productCategory) elements.productCategory.value = '';
        if (elements.productDescription) elements.productDescription.value = '';
        if (elements.productPrice) elements.productPrice.value = '';
        if (elements.productStock) elements.productStock.value = '0';
        if (elements.productRating) elements.productRating.value = '0';
        if (elements.productImage) elements.productImage.value = '';
        if (elements.modalTitle) elements.modalTitle.textContent = 'Добавить товар';
    }
    openModal(elements.productModal);
}

function closeProductModal() {
    closeModal(elements.productModal);
}

function openUserModal() {
    openModal(elements.userModal);
}

function closeUserModal() {
    closeModal(elements.userModal);
}

// ========== АУТЕНТИФИКАЦИЯ ==========
function updateAuthUI() {
    if (elements.authSection) {
        if (currentUser) {
            elements.authSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span>👋 ${escapeHtml(currentUser.first_name)} ${getRoleBadge(currentUser.role)}</span>
                    <button id="logout-btn" class="btn btn--secondary" style="padding: 5px 15px;">Выйти</button>
                </div>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', logout);
        } else {
            elements.authSection.innerHTML = `
                <div style="display: flex; gap: 10px;">
                    <button id="show-login-btn" class="btn btn--primary" style="padding: 5px 15px;">Вход</button>
                    <button id="show-register-btn" class="btn btn--secondary" style="padding: 5px 15px;">Регистрация</button>
                </div>
            `;
            document.getElementById('show-login-btn')?.addEventListener('click', openLoginModal);
            document.getElementById('show-register-btn')?.addEventListener('click', openRegisterModal);
        }
    }

    if (elements.adminPanelBtn) {
        elements.adminPanelBtn.style.display = currentUser?.role === 'admin' ? 'block' : 'none';
    }
    if (elements.createBtn) {
        const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'seller';
        elements.createBtn.style.display = canEdit ? 'block' : 'none';
    }
}

async function logout() {
    await API.logout();
    currentUser = null;
    accessToken = null;
    refreshToken = null;
    updateAuthUI();
    showToast('Вы вышли из системы');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await API.login(email, password);
        updateAuthUI();
        closeLoginModal();
        await loadProducts();
        if (currentUser?.role === 'admin') {
            await loadUsers();
        }
        showToast('Добро пожаловать!');
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const userData = {
        email: document.getElementById('reg-email').value,
        first_name: document.getElementById('reg-firstname').value,
        last_name: document.getElementById('reg-lastname').value,
        password: document.getElementById('reg-password').value
    };

    if (userData.password.length < 6) {
        showToast('Пароль должен быть минимум 6 символов', true);
        return;
    }

    try {
        await API.register(userData);
        showToast('Регистрация успешна! Теперь войдите');
        closeRegisterModal();
        openLoginModal();
        document.getElementById('login-email').value = userData.email;
    } catch (error) {
        showToast(error.message, true);
    }
}

// ========== ЗАГРУЗКА ТОВАРОВ ==========
async function loadProducts() {
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
    }
}

function renderProducts() {
    if (!elements.grid) return;

    if (!products.length) {
        elements.grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h3>Товаров пока нет</h3>
                <p>Добавьте первый товар</p>
            </div>
        `;
        return;
    }

    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'seller';

    elements.grid.innerHTML = products.map(product => {
        const imageUrl = product.image || 'https://via.placeholder.com/400x300?text=No+Image';

        return `
            <div class="product-card">
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
                            <i class="fa-solid fa-star"></i> ${(product.rating || 0).toFixed(1)}
                        </span>
                    </div>
                    <p class="product-card__description">${escapeHtml(product.description)}</p>
                    <div class="product-card__details">
                        <span class="product-card__price">${formatPrice(product.price)}</span>
                        <span class="product-card__stock ${product.stock > 10 ? 'product-card__stock--high' : 'product-card__stock--low'}">
                            ${product.stock > 0 ? `В наличии: ${product.stock}` : 'Нет в наличии'}
                        </span>
                    </div>
                    ${canEdit ? `
                    <div class="product-card__actions">
                        <button class="btn btn--primary" onclick="editProduct('${product.id}')">
                            <i class="fa-solid fa-pen"></i> Изменить
                        </button>
                        ${currentUser?.role === 'admin' ? `
                        <button class="btn btn--danger" onclick="deleteProduct('${product.id}')">
                            <i class="fa-solid fa-trash"></i> Удалить
                        </button>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========== АДМИН ПАНЕЛЬ ==========
async function showAdminPanel() {
    if (currentUser?.role !== 'admin') {
        showToast('Доступ запрещен', true);
        return;
    }

    if (elements.mainContent) elements.mainContent.style.display = 'none';
    if (elements.adminPanel) elements.adminPanel.style.display = 'block';
    await loadUsers();
}

function hideAdminPanel() {
    if (elements.mainContent) elements.mainContent.style.display = 'block';
    if (elements.adminPanel) elements.adminPanel.style.display = 'none';
}

async function loadUsers() {
    if (!elements.usersList) return;

    try {
        const response = await API.getUsers();
        users = response.data || [];
        renderUsersList();
    } catch (error) {
        showToast('Ошибка загрузки пользователей', true);
        if (elements.usersList) {
            elements.usersList.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
        }
    }
}

function renderUsersList() {
    if (!elements.usersList) return;

    const searchTerm = elements.userSearch?.value.toLowerCase() || '';
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm) ||
        u.first_name.toLowerCase().includes(searchTerm) ||
        u.last_name.toLowerCase().includes(searchTerm)
    );

    if (filteredUsers.length === 0) {
        elements.usersList.innerHTML = '<div class="empty-state">Пользователи не найдены</div>';
        return;
    }

    elements.usersList.innerHTML = filteredUsers.map(user => `
        <div class="user-card">
            <div class="user-card__info">
                <div class="user-card__name">
                    ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}
                    ${getRoleBadge(user.role)}
                </div>
                <div class="user-card__email">📧 ${escapeHtml(user.email)}</div>
                <div class="user-card__meta">
                    <span>🆔 ${user.id}</span>
                    <span>📅 ${new Date(user.created_at).toLocaleDateString()}</span>
                    <span>${user.is_active ? '✅ Активен' : '❌ Заблокирован'}</span>
                </div>
            </div>
            <div class="user-card__actions">
                <button class="btn btn--primary btn--small" onclick="openEditUserModal('${user.id}')">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                ${user.role !== 'admin' ? `
                <button class="btn btn--danger btn--small" onclick="blockUser('${user.id}')">
                    <i class="fas fa-ban"></i> Заблокировать
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function openEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-firstname').value = user.first_name;
    document.getElementById('edit-user-lastname').value = user.last_name;
    document.getElementById('edit-user-role').value = user.role;

    openUserModal();
}

async function handleUserUpdate(e) {
    e.preventDefault();

    const userId = document.getElementById('edit-user-id').value;
    const userData = {
        first_name: document.getElementById('edit-user-firstname').value,
        last_name: document.getElementById('edit-user-lastname').value,
        role: document.getElementById('edit-user-role').value
    };

    try {
        await API.updateUser(userId, userData);
        showToast('Пользователь обновлен');
        closeUserModal();
        await loadUsers();
        if (currentUser?.id === userId) {
            currentUser = { ...currentUser, ...userData };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

async function blockUser(userId) {
    if (!confirm('Заблокировать этого пользователя?')) return;

    try {
        await API.deleteUser(userId);
        showToast('Пользователь заблокирован');
        await loadUsers();
    } catch (error) {
        showToast(error.message, true);
    }
}

// ========== CRUD ТОВАРОВ (ИСПРАВЛЕНО) ==========
window.editProduct = function (id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Заполняем форму данными товара
    if (elements.productId) elements.productId.value = product.id;
    if (elements.productName) elements.productName.value = product.name;
    if (elements.productCategory) elements.productCategory.value = product.category;
    if (elements.productDescription) elements.productDescription.value = product.description;
    if (elements.productPrice) elements.productPrice.value = product.price;
    if (elements.productStock) elements.productStock.value = product.stock;
    if (elements.productRating) elements.productRating.value = product.rating;
    if (elements.productImage) elements.productImage.value = product.image || '';
    if (elements.modalTitle) elements.modalTitle.textContent = 'Редактировать товар';

    // Открываем модальное окно
    openModal(elements.productModal);
};

window.deleteProduct = async function (id) {
    if (!confirm('Удалить товар?')) return;

    try {
        await API.deleteProduct(id);
        await loadProducts();
        showToast('Товар удален');
    } catch (error) {
        showToast('Ошибка удаления', true);
    }
};

async function handleProductSubmit(e) {
    e.preventDefault();

    // Проверяем наличие ID - это ключевой момент!
    const productId = elements.productId?.value;
    const isEdit = productId && productId !== '';

    const productData = {
        name: elements.productName?.value,
        category: elements.productCategory?.value,
        description: elements.productDescription?.value,
        price: Number(elements.productPrice?.value),
        stock: Number(elements.productStock?.value) || 0,
        rating: Number(elements.productRating?.value) || 0,
        image: elements.productImage?.value || null
    };

    if (!productData.name || !productData.category || !productData.description || !productData.price) {
        showToast('Заполните все обязательные поля', true);
        return;
    }

    try {
        if (isEdit) {
            // Обновляем существующий товар
            await API.updateProduct(productId, productData);
            showToast('Товар обновлен');
        } else {
            // Создаем новый товар
            await API.createProduct(productData);
            showToast('Товар создан');
        }

        // Закрываем модальное окно и обновляем список
        closeProductModal();
        await loadProducts();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast(error.message || 'Ошибка сохранения', true);
    }
}

// ========== ФИЛЬТРЫ ==========
function updateFilters() {
    filters = {
        category: elements.filterCategory?.value || '',
        minPrice: elements.filterMinPrice?.value || '',
        maxPrice: elements.filterMaxPrice?.value || '',
        inStock: elements.filterInStock?.checked || false,
        sort: elements.filterSort?.value || 'name'
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
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();

    // Обработчики форм
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
    document.getElementById('user-form')?.addEventListener('submit', handleUserUpdate);

    // Переключение между модальными окнами
    document.getElementById('switch-to-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeLoginModal();
        openRegisterModal();
    });
    document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeRegisterModal();
        openLoginModal();
    });

    // Закрытие модальных окон
    document.getElementById('close-login-modal')?.addEventListener('click', closeLoginModal);
    document.getElementById('close-register-modal')?.addEventListener('click', closeRegisterModal);
    document.getElementById('close-product-modal')?.addEventListener('click', closeProductModal);
    document.getElementById('cancel-product-modal')?.addEventListener('click', closeProductModal);
    document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
    document.getElementById('cancel-user-modal')?.addEventListener('click', closeUserModal);

    // Закрытие по клику на оверлей
    const modals = [elements.loginModal, elements.registerModal, elements.productModal, elements.userModal];
    modals.forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal);
            });
        }
    });

    // Кнопка добавления товара
    if (elements.createBtn) {
        elements.createBtn.addEventListener('click', () => {
            // Очищаем ID для нового товара
            if (elements.productId) elements.productId.value = '';
            if (elements.modalTitle) elements.modalTitle.textContent = 'Добавить товар';
            // Очищаем форму
            if (elements.productName) elements.productName.value = '';
            if (elements.productCategory) elements.productCategory.value = '';
            if (elements.productDescription) elements.productDescription.value = '';
            if (elements.productPrice) elements.productPrice.value = '';
            if (elements.productStock) elements.productStock.value = '0';
            if (elements.productRating) elements.productRating.value = '0';
            if (elements.productImage) elements.productImage.value = '';
            openModal(elements.productModal);
        });
    }

    // Фильтры
    if (elements.filterCategory) elements.filterCategory.addEventListener('input', updateFilters);
    if (elements.filterMinPrice) elements.filterMinPrice.addEventListener('input', updateFilters);
    if (elements.filterMaxPrice) elements.filterMaxPrice.addEventListener('input', updateFilters);
    if (elements.filterInStock) elements.filterInStock.addEventListener('change', updateFilters);
    if (elements.filterSort) elements.filterSort.addEventListener('change', updateFilters);
    if (elements.clearFilters) elements.clearFilters.addEventListener('click', clearFilters);

    // Админ панель
    if (elements.adminPanelBtn) elements.adminPanelBtn.addEventListener('click', showAdminPanel);
    if (elements.closeAdminPanel) elements.closeAdminPanel.addEventListener('click', hideAdminPanel);
    if (elements.userSearch) elements.userSearch.addEventListener('input', () => renderUsersList());

    updateAuthUI();

    if (currentUser && accessToken && currentUser.role === 'admin') {
        await loadUsers();
    }
});