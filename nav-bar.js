// nav-bar.js - FINAL SÜRÜM (Tıklama Kilidi Hatası Giderildi)
document.addEventListener('DOMContentLoaded', function() {
    const homeNav = document.getElementById('home-nav');
    const addPostNav = document.getElementById('add-post-nav');
    const accountNav = document.getElementById('account-nav');
    
    const homeContent = document.getElementById('home-content');
    const accountContent = document.getElementById('account-content');
    const addPostModal = document.getElementById('add-post-modal');

    const searchContainer = document.querySelector('.search-container');
    
    // Global Fonksiyon: Sekme Değiştirme
    window.switchTab = function(tabName) {
        localStorage.setItem('activeTab', tabName);

        // Önce tüm aktif sınıfları temizle ve TIKLANABİLİRLİĞİ SIFIRLA
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.style.pointerEvents = 'auto'; // Kilitleri aç
        });

        if (tabName === 'account') {
            if(accountNav) {
                accountNav.classList.add('active');
                accountNav.style.pointerEvents = 'none'; // Aktif olana tıklanmasın
            }
            showContent(accountContent);
            updatePageTitle('Hesap');
            if (searchContainer) searchContainer.style.display = 'none';
            document.dispatchEvent(new Event('accountNavClicked'));
        } else {
            // Varsayılan: Home
            if(homeNav) {
                homeNav.classList.add('active');
                homeNav.style.pointerEvents = 'none'; // Aktif olana tıklanmasın
            }
            showContent(homeContent);
            updatePageTitle('Ana Sayfa');
            if (searchContainer) searchContainer.style.display = ''; 
        }
    };

    // Global Fonksiyon: Navigasyon Durumunu Geri Yükle (İptal Durumu İçin)
    window.restoreNavState = function() {
        const currentTab = localStorage.getItem('activeTab') || 'home';
        
        // ÖNEMLİ DÜZELTME: Tüm butonların kilidini açıyoruz
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.style.pointerEvents = 'auto'; // <-- BU SATIR EKLENDİ (SORUNU ÇÖZEN KISIM)
        });
        
        if (currentTab === 'account') {
            if(accountNav) {
                accountNav.classList.add('active');
                accountNav.style.pointerEvents = 'none'; // Sadece aktif olanı kilitle
            }
        } else {
            if(homeNav) {
                homeNav.classList.add('active');
                homeNav.style.pointerEvents = 'none'; // Sadece aktif olanı kilitle
            }
        }
    };

    // Başlangıç Durumu
    const savedTab = localStorage.getItem('activeTab');
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
                showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                window.switchTab('account');
                return;
            }
            
            // Görsel olarak + butonunu aktif yap
            setActiveNav(addPostNav); 
            
            // Modalı aç
            if(window.openModal && addPostModal) {
                window.openModal(addPostModal);
            } else if(addPostModal) {
                // Fallback (eğer openModal global değilse)
                addPostModal.style.display = 'flex';
                addPostModal.setAttribute('aria-hidden', 'false');
            }
        });
    }
    
    if (accountNav) {
        accountNav.addEventListener('click', () => window.switchTab('account'));
    }
});
