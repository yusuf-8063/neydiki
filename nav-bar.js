
// nav-bar.js - SEARCH BAR VE NAVIGASYON DÜZELTMESİ
document.addEventListener('DOMContentLoaded', function() {
    const homeNav = document.getElementById('home-nav');
    const addPostNav = document.getElementById('add-post-nav');
    const accountNav = document.getElementById('account-nav');
    
    const homeContent = document.getElementById('home-content');
    const accountContent = document.getElementById('account-content');
    const addPostModal = document.getElementById('add-post-modal');

    // Seçiciyi daha kapsayıcı hale getirdik
    const searchContainer = document.querySelector('.search-container');
    
    // Global Fonksiyon: Sekme Değiştirme
    window.switchTab = function(tabName) {
        localStorage.setItem('activeTab', tabName);

        // Navigasyon öğelerinin aktiflik durumunu temizle
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.style.pointerEvents = 'auto';
        });

        if (tabName === 'account') {
            // HESAP SEKMESİ
            if(accountNav) {
                accountNav.classList.add('active');
                accountNav.style.pointerEvents = 'none';
            }
            if (accountContent) {
                // Diğer içerikleri gizle
                document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
                accountContent.style.display = 'block';
            }
            if (typeof updatePageTitle === 'function') updatePageTitle('Hesap');
            
            // Hesap sekmesinde arama çubuğunu gizle
            if (searchContainer) searchContainer.style.display = 'none';
            
            document.dispatchEvent(new Event('accountNavClicked'));

        } else {
            // ANA SAYFA (Varsayılan)
            if(homeNav) {
                homeNav.classList.add('active');
                homeNav.style.pointerEvents = 'none';
            }
            if (homeContent) {
                // Diğer içerikleri gizle
                document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
                homeContent.style.display = 'block';
            }
            if (typeof updatePageTitle === 'function') updatePageTitle('Ana Sayfa');
            
            // DÜZELTME: Arama çubuğunu zorla göster (Flex yapısını bozmadan)
            if (searchContainer) {
                searchContainer.style.display = ''; // Inline stili temizle (CSS'e döner)
                searchContainer.style.opacity = '1';
                searchContainer.style.visibility = 'visible';
            }
        }
    };

    // Global Fonksiyon: Navigasyon Durumunu Geri Yükle
    window.restoreNavState = function() {
        const currentTab = localStorage.getItem('activeTab') || 'home';
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.style.pointerEvents = 'auto';
        });
        
        if (currentTab === 'account') {
            if(accountNav) {
                accountNav.classList.add('active');
                accountNav.style.pointerEvents = 'none';
            }
        } else {
            if(homeNav) {
                homeNav.classList.add('active');
                homeNav.style.pointerEvents = 'none';
            }
        }
    };

    // Başlangıç Durumu Kontrolü
    const savedTab = localStorage.getItem('activeTab');
    // Sayfa ilk yüklendiğinde search bar'ın durumunu garantiye al
    if (savedTab === 'account') {
        window.switchTab('account');
    } else {
        window.switchTab('home');
    }

    // EVENT LISTENERS
    if (homeNav) {
        homeNav.addEventListener('click', () => window.switchTab('home'));
    }
    
    if (addPostNav) {
        addPostNav.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                if(typeof showNotification === 'function') {
                    showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                } else {
                    alert('Lütfen giriş yapın.');
                }
                window.switchTab('account');
                return;
            }
            
            setActiveNav(addPostNav); 
            
            if(window.openModal && addPostModal) {
                window.openModal(addPostModal);
            } else if(addPostModal) {
                addPostModal.style.display = 'flex';
                addPostModal.setAttribute('aria-hidden', 'false');
            }
        });
    }
    
    if (accountNav) {
        accountNav.addEventListener('click', () => window.switchTab('account'));
    }
});
