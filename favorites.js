// Класс для управления избранным
class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.init();
    }
    
    // Загружаем избранное из localStorage
    loadFavorites() {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : [];
    }
    
    // Сохраняем избранное в localStorage
    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateUI();
    }
    
    // Добавить в избранное
    add(productId, productData) {
        if (!this.favorites.some(item => item.id === productId)) {
            this.favorites.push({
                id: productId,
                ...productData
            });
            this.saveFavorites();
            this.showToast('Товар добавлен в избранное ❤️');
            return true;
        }
        return false;
    }
    
    // Удалить из избранного
    remove(productId) {
        const index = this.favorites.findIndex(item => item.id === productId);
        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            this.showToast('Товар удален из избранного');
            return true;
        }
        return false;
    }
    
    // Проверить, есть ли товар в избранном
    isFavorite(productId) {
        return this.favorites.some(item => item.id === productId);
    }
    
    // Получить все избранные товары
    getAll() {
        return this.favorites;
    }
    
    // Очистить избранное
    clear() {
        this.favorites = [];
        this.saveFavorites();
        this.showToast('Избранное очищено');
    }
    
    // Обновить интерфейс
    updateUI() {
        // Обновить счетчик
        const countElement = document.getElementById('favoriteCount');
        if (countElement) {
            countElement.textContent = this.favorites.length;
        }
        
        // Обновить иконки на карточках
        document.querySelectorAll('.product-card__favorite').forEach(btn => {
            const productId = btn.dataset.id;
            if (this.isFavorite(productId)) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-star"></i>';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fa-regular fa-star"></i>';
            }
        });
    }
    
    // Показать уведомление
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Инициализация
    init() {
        // Сохраняем данные товаров
        this.productsData = {};
        document.querySelectorAll('.product-card').forEach(card => {
            const id = card.dataset.id;
            const title = card.querySelector('.product-card__title').textContent;
            const price = card.querySelector('.product-card__price').textContent;
            const image = card.querySelector('.product-card__image').src;
            
            this.productsData[id] = { title, price, image };
        });
        
        // Навешиваем обработчики на кнопки "В избранное"
        document.querySelectorAll('.product-card__favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.dataset.id;
                const productData = this.productsData[productId];
                
                if (this.isFavorite(productId)) {
                    this.remove(productId);
                } else {
                    this.add(productId, productData);
                }
            });
        });
        
        // Кнопка открытия модального окна
        document.getElementById('favoriteBtn').addEventListener('click', () => {
            this.openModal();
        });
        
        // Кнопки закрытия
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Кнопка очистки
        document.getElementById('clearFavorites').addEventListener('click', () => {
            if (confirm('Очистить все избранные товары?')) {
                this.clear();
                this.closeModal();
            }
        });
        
        // Закрытие по клику вне модального окна
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('favoriteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Обновляем UI при загрузке
        this.updateUI();
    }
    
    // Открыть модальное окно
    openModal() {
        const modal = document.getElementById('favoriteModal');
        const favoritesList = document.getElementById('favoritesList');
        
        // Генерируем HTML для списка избранных товаров
        if (this.favorites.length === 0) {
            favoritesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fa-regular fa-star" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>В избранном пока нет товаров</p>
                </div>
            `;
        } else {
            favoritesList.innerHTML = this.favorites.map(item => `
                <div class="favorite-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.title}">
                    <div class="favorite-item__info">
                        <h4>${item.title}</h4>
                        <p>${item.price}</p>
                    </div>
                    <button class="favorite-item__remove" onclick="favoritesManager.remove('${item.id}'); favoritesManager.openModal();">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
        
        modal.classList.add('show');
    }
    
    // Закрыть модальное окно
    closeModal() {
        document.getElementById('favoriteModal').classList.remove('show');
    }
}

// Создаем глобальный экземпляр
const favoritesManager = new FavoritesManager();