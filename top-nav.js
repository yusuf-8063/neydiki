// top-nav.js - OPTİMİZE VERSİYON
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeSwitch = document.getElementById('dark-mode-switch');
    const logo = document.querySelector('.logo');
    const logoutSetting = document.querySelector('.setting-item:last-child');
    
    // Theme Management
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
    
    // Event Listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => openModal(settingsModal));
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    if (darkModeSwitch) {
        darkModeSwitch.addEventListener('change', toggleDarkMode);
    }
    
    // Başlangıç kontrolü
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Logo tıklama
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', function() {
            localStorage.setItem('activeTab', 'home');
            
            const homeNav = document.getElementById('home-nav');
            const homeContent = document.getElementById('home-content');
            
            if (homeNav && homeContent) {
                setActiveNav(homeNav);
                showContent(homeContent);
                updatePageTitle('Ana Sayfa');
                
                if (typeof loadImageFeed === 'function') {
                    loadImageFeed();
                }
                
                showNotification('Ana sayfaya yönlendiriliyor...', 'info');
            }
        });
    }
    
    // Çıkış Yap butonu
    if (logoutSetting) {
        logoutSetting.addEventListener('click', function() {
            if (confirm('Hesabınızdan çıkış yapmak istediğinizden emin misiniz?')) {
                localStorage.removeItem('currentUser');
                localStorage.setItem('activeTab', 'account');
                showNotification('Başarıyla çıkış yapıldı', 'success');
                closeModal(settingsModal);
                
                const accountNav = document.getElementById('account-nav');
                if (accountNav) accountNav.click();
                
                setTimeout(() => {
                    const loginForm = document.getElementById('login-account-form');
                    const registerForm = document.getElementById('register-account-form');
                    const accountInfo = document.getElementById('account-info');
                    
                    if (loginForm && registerForm && accountInfo) {
                        loginForm.style.display = 'block';
                        registerForm.style.display = 'none';
                        accountInfo.style.display = 'none';
                    }
                }, 100);
            }
        });
    }
});
