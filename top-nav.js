document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    
    // Ayarlar butonu
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => openModal(settingsModal));
    }

    // Karanlık Mod
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeSwitch = document.getElementById('dark-mode-switch');

    function setTheme(theme) {
        const icon = document.getElementById('dark-mode-icon');
        const switchBtn = document.getElementById('dark-mode-switch');
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        if (switchBtn) switchBtn.checked = theme === 'dark';
    }

    function toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    }

    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
    if (darkModeSwitch) darkModeSwitch.addEventListener('change', toggleDarkMode);
    
    // Başlangıç kontrolü
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Logo tıklama işlevselliği
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function() {
            // Ana sayfaya git
            const homeNav = document.getElementById('home-nav');
            const homeContent = document.getElementById('home-content');
            
            if (homeNav && homeContent) {
                // Aktif navigasyonu güncelle
                setActiveNav(homeNav);
                
                // Ana sayfa içeriğini göster
                showContent(homeContent);
                
                // Sayfa başlığını güncelle
                updatePageTitle('Ana Sayfa');
                
                // Görsel akışını yenile
                if (typeof loadImageFeed === 'function') {
                    loadImageFeed();
                }
                
                // Bildirim göster
                showNotification('Ana sayfaya yönlendiriliyor...', 'info');
            }
        });
        
        // Logo için cursor pointer ekle
        logo.style.cursor = 'pointer';
    }

    // ÇIKIŞ YAP BUTONU - YENİLENMİŞ VERSİYON
    const logoutSetting = document.querySelector('.setting-item:last-child');
    if (logoutSetting) {
        logoutSetting.addEventListener('click', function() {
            if (confirm('Hesabınızdan çıkış yapmak istediğinizden emin misiniz?')) {
                // Kullanıcı verilerini temizle
                localStorage.removeItem('currentUser');
                
                // Bildirim göster
                showNotification('Başarıyla çıkış yapıldı', 'success');
                
                // Modalı kapat
                closeModal(settingsModal);
                
                // Account sayfasına yönlendir ve giriş ekranını göster
                const accountNav = document.getElementById('account-nav');
                if (accountNav) {
                    accountNav.click();
                }
                
                // Giriş formunu göster
                setTimeout(() => {
                    const loginForm = document.getElementById('login-account-form');
                    const registerForm = document.getElementById('register-account-form');
                    const accountInfo = document.getElementById('account-info');
                    const accountTitle = document.getElementById('account-title');
                    
                    if (loginForm && registerForm && accountInfo) {
                        loginForm.style.display = 'block';
                        registerForm.style.display = 'none';
                        accountInfo.style.display = 'none';
                        accountTitle.textContent = 'Hesabınıza Giriş Yapın';
                    }
                }, 100);
            }
        });
    }
});