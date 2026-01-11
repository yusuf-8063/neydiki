// script.js - GÜNCELLENMİŞ (Başlık Düzeltildi)

// Global değişkenler ve yardımcı fonksiyonlar
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px;
        color: white; font-weight: 500; z-index: 2001; animation: slideIn 0.3s ease;
        max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Animasyon için
        setTimeout(() => {
            if (modal.querySelector('.modal-content')) {
                modal.querySelector('.modal-content').style.transform = 'scale(1)';
                modal.querySelector('.modal-content').style.opacity = '1';
            }
        }, 10);
        
        // Tartışma modalı için özel işlemler
        if (modal.id === 'discussion-modal') {
            setTimeout(() => {
                const commentsList = document.getElementById('comments-list');
                if (commentsList) {
                    commentsList.scrollTop = commentsList.scrollHeight;
                }
            }, 200);
        }
    }
}

// GÜNCELLENEN KISIM: closeModal
function closeModal(modal) {
    if (modal) {
        if (modal.querySelector('.modal-content')) {
            modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
            modal.querySelector('.modal-content').style.opacity = '0';
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = 'auto';

            // ÖZEL DURUM: Eğer kapanan "Yeni Gönderi" penceresiyse navigasyonu düzelt
            if (modal.id === 'add-post-modal') {
                if (typeof window.restoreNavState === 'function') {
                    window.restoreNavState();
                }
            }
        }, 300);
    }
}

function updatePageTitle(title) {
    // BURASI GÜNCELLENDİ: "Social" ifadesi kaldırıldı, yerine "NeydiKi?" getirildi.
    document.title = `${title} - NeydiKi?`;
    if (title === 'Ana Sayfa') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function showContent(contentToShow) {
    document.querySelectorAll('.main-content').forEach(content => {
        content.style.display = 'none';
    });
    if (contentToShow) {
        contentToShow.style.display = 'block';
        if (contentToShow.id === 'home-content' && typeof loadImageFeed === 'function') {
            setTimeout(() => {
                loadImageFeed();
            }, 100);
        }
    }
}

function setActiveNav(navItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.style.pointerEvents = 'auto'; 
    });
    if (navItem) {
        navItem.classList.add('active');
        navItem.style.pointerEvents = 'none'; 
    }
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const addPostModal = document.getElementById('add-post-modal');
    const settingsModal = document.getElementById('settings-modal');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const discussionModal = document.getElementById('discussion-modal');

    // Modal kapatma olayları
    document.getElementById('close-add-post')?.addEventListener('click', () => closeModal(addPostModal));
    document.getElementById('close-edit-profile')?.addEventListener('click', () => closeModal(editProfileModal));
    document.getElementById('close-settings')?.addEventListener('click', () => closeModal(settingsModal));
    document.getElementById('close-discussion')?.addEventListener('click', () => closeModal(discussionModal));
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => closeModal(editProfileModal));

    // Modal dışına tıklama
    window.addEventListener('click', (e) => {
        if (e.target === addPostModal) closeModal(addPostModal);
        if (e.target === editProfileModal) closeModal(editProfileModal);
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === discussionModal) closeModal(discussionModal);
    });

    // CSS Animasyon
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { 
            from { transform: translateX(100%); opacity: 0; } 
            to { transform: translateX(0); opacity: 1; } 
        }
        @keyframes slideOut { 
            from { transform: translateX(0); opacity: 1; } 
            to { transform: translateX(100%); opacity: 0; } 
        }
        
        .delete-post-btn {
            background: none;
            border: none;
            color: var(--text-light);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.3s ease;
            font-size: 16px;
            margin-left: auto;
        }

        .delete-post-btn:hover {
            background-color: rgba(255, 71, 87, 0.1);
            color: #ff4757;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-light);
        }

        .empty-state i {
            margin-bottom: 16px;
            font-size: 48px;
        }

        .empty-state h3 {
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 18px;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: var(--background);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #0081d6;
        }
        
        * {
            scrollbar-width: thin;
            scrollbar-color: var(--primary) var(--background);
        }
        
        .card-image {
            max-width: 100%;
            height: auto;
        }
        
        @media (max-width: 768px) {
            .card-image {
                height: 400px !important;
            }
        }
        
        @media (max-width: 480px) {
            .card-image {
                height: 350px !important;
            }
        }
    `;
    document.head.appendChild(style);
});

// Profil sayfasından gönderi silindiğinde ana sayfayı yenile
function refreshHomeFeed() {
    if (typeof loadImageFeed === 'function') {
        loadImageFeed();
    }
}

// Responsive layout kontrolü
function checkLayout() {
    const filtersSidebar = document.getElementById('filters-sidebar');
    
    if (window.innerWidth <= 768) {
        if (filtersSidebar && filtersSidebar.classList.contains('active')) {
            filtersSidebar.classList.remove('active');
        }
    }
}

window.addEventListener('resize', checkLayout);
document.addEventListener('DOMContentLoaded', checkLayout);
