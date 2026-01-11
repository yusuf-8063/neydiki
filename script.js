// script.js - FINAL (MOBİL OTO YÜKSEKLİK SÜRÜMÜ)

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

    // --- GÜNCELLENEN KISIM BURASI ---
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
        .delete-post-btn { background: none; border: none; color: var(--text-light); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.3s ease; font-size: 16px; margin-left: auto; }
        .delete-post-btn:hover { background-color: rgba(255, 71, 87, 0.1); color: #ff4757; }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--text-light); }
        .empty-state i { margin-bottom: 16px; font-size: 48px; }
        .empty-state h3 { margin-bottom: 8px; font-weight: 600; font-size: 18px; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--background); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #0081d6; }
        * { scrollbar-width: thin; scrollbar-color: var(--primary) var(--background); }
        
        /* GÜNCELLENMİŞ OTO YÜKSEKLİK AYARLARI */
        .card-image { 
            max-width: 100%; 
            height: auto !important; /* Otomatik yükseklik */
            width: 100%; 
            object-fit: contain; 
        }
        
        @media (max-width: 768px) { 
            .card-image { 
                height: auto !important; 
                max-height: 600px !important; /* Max sınır 600px */
            } 
        }
        @media (max-width: 480px) { 
            .card-image { 
                height: auto !important; 
                max-height: 500px !important; /* Max sınır 500px */
            } 
        }
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
