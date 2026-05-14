// script.js - MODERN BİLDİRİM SİSTEMİ VE DİNAMİK MODALLAR

let currentModalZIndex = 2000; // Modalların üst üste sağlıklı açılması için

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.modern-toast');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `modern-toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    else icon = '<i class="fas fa-info-circle"></i>';

    notification.innerHTML = `${icon} <span>${message}</span>`;
    
    // GÜNCELLEME: Animasyon süresi 0.4s'den 0.2s'ye çekildi, hızlandırıldı.
    notification.style.cssText = `
        position: fixed; 
        bottom: 90px; 
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
        transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); 
        pointer-events: none;
        white-space: nowrap;
        max-width: 90%;
    `;
    
    if (type === 'error') notification.style.backgroundColor = '#ff4757';
    if (type === 'success') notification.style.backgroundColor = '#4CAF50';

    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => notification.remove(), 200);
        }
    }, 3000);
}

function openModal(modal) {
    if (modal) {
        currentModalZIndex += 10;
        modal.style.zIndex = currentModalZIndex; // Modallar üst üste açılırsa altta kalmasın
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
            
            // GÜNCELLEME: Başka bir modal arkada hala açıksa scroll kilidini kaldırma
            const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex' && m !== modal);
            if (!anyOpen) {
                document.body.style.overflow = 'auto';
                currentModalZIndex = 2000; // Indexi sıfırla
            }

            if (modal.id === 'add-post-modal') {
                if (typeof window.restoreNavState === 'function') {
                    window.restoreNavState();
                }
            }
        }, 200); // 300'den 200'e çekildi (kapanma hissi hızlandırıldı)
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
    const userListModal = document.getElementById('user-list-modal');
    
    const accountSettingsModal = document.getElementById('account-settings-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    const aboutModal = document.getElementById('about-modal');

    document.getElementById('close-add-post')?.addEventListener('click', () => closeModal(addPostModal));
    document.getElementById('close-edit-profile')?.addEventListener('click', () => closeModal(editProfileModal));
    document.getElementById('close-settings')?.addEventListener('click', () => closeModal(settingsModal));
    document.getElementById('close-discussion')?.addEventListener('click', () => closeModal(discussionModal));
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => closeModal(editProfileModal));
    document.getElementById('close-user-list')?.addEventListener('click', () => closeModal(userListModal));
    
    document.getElementById('close-account-settings')?.addEventListener('click', () => closeModal(accountSettingsModal));
    document.getElementById('close-change-password')?.addEventListener('click', () => closeModal(changePasswordModal));
    document.getElementById('close-about')?.addEventListener('click', () => closeModal(aboutModal));

    window.addEventListener('click', (e) => {
        if (e.target === addPostModal) closeModal(addPostModal);
        if (e.target === editProfileModal) closeModal(editProfileModal);
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === discussionModal) closeModal(discussionModal);
        if (e.target === userListModal) closeModal(userListModal);
        if (e.target === accountSettingsModal) closeModal(accountSettingsModal);
        if (e.target === changePasswordModal) closeModal(changePasswordModal);
        if (e.target === aboutModal) closeModal(aboutModal);
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        
        .delete-post-btn { background: none; border: none; color: var(--text-light); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.3s ease; font-size: 16px; margin-left: auto; }
        .delete-post-btn:hover { background-color: rgba(255, 71, 87, 0.1); color: #ff4757; }
        
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

// --- İNTERNET BAĞLANTISI KONTROLÜ (GÜNCELLEME EKLENTİSİ) ---
document.addEventListener('DOMContentLoaded', function() {
    const offlineOverlay = document.getElementById('offline-overlay');
    const retryBtn = document.getElementById('retry-connection-btn');
    
    // Uygulama açıldığında çevrimdışı mı kontrolü için bayrak
    let wasOffline = !navigator.onLine; 

    function updateOnlineStatus() {
        if (!navigator.onLine) {
            // Bağlantı koptuğunda
            wasOffline = true;
            if (offlineOverlay) {
                offlineOverlay.style.display = 'flex';
                // CSS Animasyonunu tetiklemek için ufak bir bekleme
                setTimeout(() => {
                    offlineOverlay.classList.add('active');
                }, 10);
            }
        } else {
            // Bağlantı geri geldiğinde
            if (wasOffline) {
                // Eğer daha önceden çevrimdışıysa ve şimdi geldiyse sayfayı yenile
                showNotification('İnternet bağlantısı sağlandı! Sayfa yenileniyor...', 'success');
                
                if (offlineOverlay) {
                    offlineOverlay.classList.remove('active');
                }
                
                // Mesajın okunabilmesi için 1 saniye bekleyip sayfayı yeniliyoruz
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                // Kullanıcı hep çevrimiçiyse sadece paneli gizle (olası hatalara karşı güvenlik)
                if (offlineOverlay) {
                    offlineOverlay.classList.remove('active');
                    setTimeout(() => {
                        offlineOverlay.style.display = 'none';
                    }, 300);
                }
            }
        }
    }

    // Olay dinleyicileri (Tarayıcının onLine özelliğini sürekli kontrol eder)
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // "Tekrar Deneyin" butonu
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const originalText = retryBtn.innerHTML;
            retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol ediliyor...';
            retryBtn.disabled = true;
            
            // Gerçekçi his vermesi için yarım saniye bekletiyoruz
            setTimeout(() => {
                if (navigator.onLine) {
                    updateOnlineStatus(); // Bu fonksiyon zaten sayfayı yenileyecek
                } else {
                    showNotification('Hâlâ internet bağlantısı yok.', 'error');
                    // Kullanıcıya bir hata efekti (titreme) yansıtıyoruz
                    retryBtn.classList.add('error-shake');
                    setTimeout(() => retryBtn.classList.remove('error-shake'), 500);
                }
                retryBtn.innerHTML = originalText;
                retryBtn.disabled = false;
            }, 800);
        });
    }

    // İlk yüklendiğinde kontrol (Eğer sayfa önbellekten vs yüklendiyse ve bağlantı yoksa)
    if (!navigator.onLine) {
        updateOnlineStatus();
    }
});
