// top-nav.js 
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeSwitch = document.getElementById('dark-mode-switch');
    const logo = document.querySelector('.logo');
    
    const logoutBtn = document.getElementById('settings-logout-btn');
    const openAccountSettingsBtn = document.getElementById('open-account-settings-btn');
    const triggerEditProfile = document.getElementById('trigger-edit-profile');
    const triggerChangePassword = document.getElementById('trigger-change-password');
    
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    
    function setTheme(theme) {
        const icon = document.getElementById('dark-mode-icon');
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        if (darkModeSwitch) darkModeSwitch.checked = theme === 'dark';
    }
    
    function toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    }
    
    if (settingsBtn) settingsBtn.addEventListener('click', () => openModal(settingsModal));
    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
    if (darkModeSwitch) darkModeSwitch.addEventListener('change', toggleDarkMode);
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', function() {
            localStorage.setItem('activeTab', 'home');
            
            const homeNav = document.getElementById('home-nav');
            const homeContent = document.getElementById('home-content');
            
            if (homeNav && homeContent) {
                if(typeof setActiveNav === 'function') setActiveNav(homeNav);
                if(typeof showContent === 'function') showContent(homeContent);
                if(typeof updatePageTitle === 'function') updatePageTitle('Ana Sayfa');
                
                if (typeof window.loadImageFeed === 'function') {
                    window.loadImageFeed();
                } else if (typeof loadImageFeed === 'function') {
                    loadImageFeed();
                }
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Hesabınızdan çıkış yapmak istediğinizden emin misiniz?')) {
                if(window.auth) {
                    window.auth.signOut().then(() => {
                        localStorage.removeItem('currentUser');
                        showNotification('Başarıyla çıkış yapıldı', 'success');
                        closeModal(settingsModal);
                        window.location.reload();
                    });
                } else {
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                }
            }
        });
    }

    if (openAccountSettingsBtn) {
        openAccountSettingsBtn.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) {
                if(typeof showNotification === 'function') showNotification('Lütfen önce giriş yapın', 'error');
                closeModal(settingsModal);
                if(window.switchTab) window.switchTab('account');
                return;
            }
            
            const privacySwitch = document.getElementById('privacy-mode-switch');
            if (privacySwitch) privacySwitch.checked = user.isPrivate || false;
            
            closeModal(settingsModal);
            openModal(document.getElementById('account-settings-modal'));
        });
    }

    // GÜNCELLEME: Hesap Ayarları menüsü altta açık kalacak, Profili Düzenle onun üzerine açılacak.
    if (triggerEditProfile) {
        triggerEditProfile.addEventListener('click', () => {
            const editBtn = document.getElementById('edit-account-btn'); 
            if(editBtn) editBtn.click(); // Edit profil modalını açar (hesap sayfasına atmaz, sadece modalı tetikler)
        });
    }

    if (triggerChangePassword) {
        triggerChangePassword.addEventListener('click', () => {
            openModal(document.getElementById('change-password-modal'));
        });
    }
    
    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener('click', () => {
            if(typeof openModal === 'function') openModal(aboutModal);
        });
    }
});
