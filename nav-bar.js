// nav-bar.js - GÜNCELLENMİŞ (Modal Kapanınca Ana Sayfaya Dönüş)
document.addEventListener('DOMContentLoaded', function() {
    const homeNav = document.getElementById('home-nav');
    const addPostNav = document.getElementById('add-post-nav');
    const accountNav = document.getElementById('account-nav');
    
    const homeContent = document.getElementById('home-content');
    const accountContent = document.getElementById('account-content');
    const addPostModal = document.getElementById('add-post-modal');

    const searchContainer = document.querySelector('.search-container');
    
    // YENİ: Kapatma butonu seçimi
    const closeAddPostBtn = document.getElementById('close-add-post');

    function switchTab(tabName) {
        localStorage.setItem('activeTab', tabName);

        if (tabName === 'account') {
            setActiveNav(accountNav);
            showContent(accountContent);
            updatePageTitle('Hesap');
            if (searchContainer) searchContainer.style.display = 'none';
            document.dispatchEvent(new Event('accountNavClicked'));
        } else {
            setActiveNav(homeNav);
            showContent(homeContent);
            updatePageTitle('Ana Sayfa');
            if (searchContainer) searchContainer.style.display = ''; 
        }
    }

    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'account') {
        switchTab('account');
    } else {
        switchTab('home');
    }

    // EVENT LISTENERS

    if (homeNav) {
        homeNav.addEventListener('click', () => {
            switchTab('home');
        });
    }
    
    if (addPostNav) {
        addPostNav.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                switchTab('account');
                return;
            }
            setActiveNav(addPostNav);
            openModal(addPostModal);
        });
    }
    
    if (accountNav) {
        accountNav.addEventListener('click', () => {
            switchTab('account');
        });
    }

    // YENİ EKLENEN KISIM: Modal kapatma butonuna (X) basınca Ana Sayfaya dön
    if (closeAddPostBtn) {
        closeAddPostBtn.addEventListener('click', () => {
            // Modal script.js tarafından kapatılıyor, biz navigasyonu düzeltiyoruz
            switchTab('home');
        });
    }
});
