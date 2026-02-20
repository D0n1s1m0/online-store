// Простой менеджер избранного
class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.init();
    }
    
    // Загружаем из localStorage
    loadFavorites() {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : [];
    }
    
    // Сохраняем в localStorage
    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateButtons();
    }
    
    // Добавить в избранное
    add(productId) {
        if (!this.favorites.includes(productId)) {
            this.favorites.push(productId);
            this.saveFavorites();
            this.showToast('Товар добавлен в избранное ⭐');
            return true;
        }
        return false;
    }
    
    // Удалить из избранного
    remove(productId) {
        const index = this.favorites.indexOf(productId);
        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            this.showToast('Товар удален из избранного');
            return true;
        }
        return false;
    }
    
    // Проверить, в избранном ли товар
    isFavorite(productId) {
        return this.favorites.includes(productId);
    }
    
    // Обновить состояние кнопок
    updateButtons() {
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
        }, 2000);
    }
    
    // Инициализация
    init() {
        // Навешиваем обработчики на кнопки избранного
        document.querySelectorAll('.product-card__favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = btn.dataset.id;
                
                if (this.isFavorite(productId)) {
                    this.remove(productId);
                } else {
                    this.add(productId);
                }
            });
        });
        
        // Обновляем кнопки при загрузке
        this.updateButtons();
    }
}

// Создаем экземпляр при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesManager = new FavoritesManager();
});