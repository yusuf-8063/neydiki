// nav-bar.js - SEKMELER VE YENİ PROFİL GÖRÜNÜMÜ YÖNETİMİ
document.addEventListener('DOMContentLoaded', function() {
    const homeNav = document.getElementById('home-nav');
    const addPostNav = document.getElementById('add-post-nav');
    const accountNav = document.getElementById('account-nav');
    
    const searchContainer = document.querySelector('.search-container');
    
    // Aktif sekmeyi ayarla
    function setActiveNav(activeElement) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.style.pointerEvents = 'auto'; // Tıklanabilirliği geri ver
        });
        
        if (activeElement) {
            activeElement.classList.add('active');
            activeElement.style.pointerEvents = 'none'; // Aktif sekmeye tekrar tıklamayı engelle
        }
    }

    // Ana sekme değiştirici fonksiyon (GLOBAL)
    window.switchTab = function(tabName) {
        // Durumu kaydet
        localStorage.setItem('activeTab', tabName);

        // Önce tüm içerikleri gizle
        document.querySelectorAll('.main-content').forEach(el => {
            el.style.display = 'none';
        });

        if (tabName === 'account') {
            // Kendi Hesabım sekmesi
            setActiveNav(accountNav);
            const accountContent = document.getElementById('account-content');
            if (accountContent) accountContent.style.display = 'block';
            
            if (typeof updatePageTitle === 'function') updatePageTitle('Hesap');
            
            // Hesap sayfasında aramayı gizle
            if (searchContainer) {
                searchContainer.style.display = 'none';
            }

            // Hesaba geçildiğinde verileri yenile (account.js içinde dinlenir)
            document.dispatchEvent(new Event('accountNavClicked'));
            window.scrollTo(0, 0);

        } else if (tabName === 'profile') {
            // Başka kullanıcının profilini görüntülerken alt barda "Ana Sayfa" veya "Hesap" vurgusunu kaldırıyoruz 
            // Veya görsel olarak "Ana Sayfa" da bırakabilirsin, tamamen sana bağlı. Ben vurguyu kaldırıyorum.
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                item.style.pointerEvents = 'auto';
            });
            
            const profileContent = document.getElementById('profile-content');
            if (profileContent) profileContent.style.display = 'block';
            
            // Profilde de aramayı gizle
            if (searchContainer) {
                searchContainer.style.display = 'none';
            }
            window.scrollTo(0, 0);

        } else {
            // Ana Sayfa sekmesi (Varsayılan)
            setActiveNav(homeNav);
            const homeContent = document.getElementById('home-content');
            if (homeContent) homeContent.style.display = 'block';
            
            if (typeof updatePageTitle === 'function') updatePageTitle('Ana Sayfa');
            
            // Ana sayfada aramayı göster
            if (searchContainer) {
                searchContainer.style.display = ''; // CSS'teki orijinal değere döner
                searchContainer.style.opacity = '1';
                searchContainer.style.visibility = 'visible';
            }
        }
    };

    // Sayfa yüklendiğinde durumu geri yükleme
    window.restoreNavState = function() {
        const currentTab = localStorage.getItem('activeTab') || 'home';
        
        if (currentTab === 'account' || currentTab === 'profile') {
            setActiveNav(accountNav);
        } else {
            setActiveNav(homeNav);
        }
    };

    // İlk yüklemede kaydedilmiş sekmeyi aç
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'account') {
        window.switchTab('account');
    } else if (savedTab === 'profile') {
        // Eğer sayfayı F5 ile yenilerse profilde kalmasın, ana sayfaya dönsün ki hatalı veri görmesin
        window.switchTab('home');
    } else {
        window.switchTab('home');
    }

    // Tıklama Event Listener'ları
    if (homeNav) {
        homeNav.addEventListener('click', () => window.switchTab('home'));
    }

    if (accountNav) {
        accountNav.addEventListener('click', () => window.switchTab('account'));
    }

    if (addPostNav) {
        addPostNav.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            // Giriş kontrolü
            if (!currentUser) {
                if(typeof showNotification === 'function') {
                    showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                } else {
                    alert('Gönderi paylaşmak için giriş yapmalısınız!');
                }
                window.switchTab('account');
                return;
            }

            // Gönderi ekleme butonuna basıldığında görsel olarak aktif yap (kısa süreliğine)
            setActiveNav(addPostNav); 
            
            // Modalı aç
            const addPostModal = document.getElementById('add-post-modal');
            if (window.openModal && addPostModal) {
                window.openModal(addPostModal);
            } else if (addPostModal) {
                addPostModal.style.display = 'flex';
                addPostModal.setAttribute('aria-hidden', 'false');
            }
            
            // Modalı açtıktan sonra alt menüdeki aktif sekmeyi eski haline döndür
            setTimeout(window.restoreNavState, 300);
        });
    }
    
    // --- YENİ EKLENEN PROFİL GERİ BUTONU DİNLEYİCİSİ ---
    const profileBackBtn = document.getElementById('profile-back-btn');
    if (profileBackBtn) {
        profileBackBtn.addEventListener('click', () => {
            window.switchTab('home'); // Geri dön butonuna basınca anasayfaya atar
        });
    }
});
