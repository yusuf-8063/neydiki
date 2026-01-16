// script.js - MODERN BİLDİRİM SİSTEMİ (BOTTOM TOAST)
// Global değişkenler ve yardımcı fonksiyonlar

// ESKİ "showNotification" YERİNE YENİSİ:
function showNotification(message, type = 'info') {
    // Varsa eskisini kaldır
    const existingNotification = document.querySelector('.modern-toast');
    if (existingNotification) existingNotification.remove();
    
    // Yeni bildirim elementi
    const notification = document.createElement('div');
    notification.className = `modern-toast toast-${type}`;
    
    // İkon seçimi
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    else icon = '<i class="fas fa-info-circle"></i>';

    notification.innerHTML = `${icon} <span>${message}</span>`;
    
    // Modern Stil (Instagram Tarzı - Ekran Altı)
    notification.style.cssText = `
        position: fixed; 
        bottom: 90px; /* Nav barın hemen üstü */
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background-color: #262626;
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: none;
        white-space: nowrap;
        max-width: 90%;
    `;
    
    // Hata ise kırmızımsı, başarı ise koyu ton
    if (type === 'error') notification.style.backgroundColor = '#ff4757';
    if (type === 'success') notification.style.backgroundColor = '#4CAF50';

    document.body.appendChild(notification);
    
    // Animasyon: Giriş
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Animasyon: Çıkış
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => notification.remove(), 400);
        }
    }, 3000);
}

function openModal(modal) {
    if (modal) {
        modal.style.opacity = '0';
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            modal.style.opacity = '1';
            if (modal.querySelector('.modal-content')) {
                modal.querySelector('.modal-content').style.transform = 'scale(1)';
                modal.querySelector('.modal-content').style.opacity = '1';
            }
        }, 10);
        
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

function closeModal(modal) {
    if (modal) {
        if (document.activeElement && modal.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        modal.style.opacity = '0';

        if (modal.querySelector('.modal-content')) {
            modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
            modal.querySelector('.modal-content').style.opacity = '0';
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = ''; 
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = 'auto';

            if (modal.id === 'add-post-modal') {
                if (typeof window.restoreNavState === 'function') {
                    window.restoreNavState();
                }
            }
        }, 300);
    }
}

function updatePageTitle(title) {
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

document.addEventListener('DOMContentLoaded', function() {
    const addPostModal = document.getElementById('add-post-modal');
    const settingsModal = document.getElementById('settings-modal');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const discussionModal = document.getElementById('discussion-modal');

    document.getElementById('close-add-post')?.addEventListener('click', () => closeModal(addPostModal));
    document.getElementById('close-edit-profile')?.addEventListener('click', () => closeModal(editProfileModal));
    document.getElementById('close-settings')?.addEventListener('click', () => closeModal(settingsModal));
    document.getElementById('close-discussion')?.addEventListener('click', () => closeModal(discussionModal));
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => closeModal(editProfileModal));

    window.addEventListener('click', (e) => {
        if (e.target === addPostModal) closeModal(addPostModal);
        if (e.target === editProfileModal) closeModal(editProfileModal);
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === discussionModal) closeModal(discussionModal);
    });

    const style = document.createElement('style');
    style.textContent = `
        /* Orijinal CSS animasyonları */
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        
        .delete-post-btn { background: none; border: none; color: var(--text-light); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.3s ease; font-size: 16px; margin-left: auto; }
        .delete-post-btn:hover { background-color: rgba(255, 71, 87, 0.1); color: #ff4757; }
        
        /* OTO YÜKSEKLİK */
        .card-image { max-width: 100%; height: auto !important; width: 100%; object-fit: contain; }
        @media (max-width: 768px) { .card-image { height: auto !important; max-height: 600px !important; } }
        @media (max-width: 480px) { .card-image { height: auto !important; max-height: 500px !important; } }
    `;
    document.head.appendChild(style);
});

function refreshHomeFeed() {
    if (typeof loadImageFeed === 'function') { loadImageFeed(); }
}

function checkLayout() {
    const filtersSidebar = document.getElementById('filters-sidebar');
    if (window.innerWidth <= 768) {
        if (filtersSidebar && filtersSidebar.classList.contains('active')) {
            filtersSidebar.classList.remove('active');
        }
    }
}

let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkLayout, 200);
});

document.addEventListener('DOMContentLoaded', checkLayout);
