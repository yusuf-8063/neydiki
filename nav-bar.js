document.addEventListener('DOMContentLoaded', function() {
    const homeNav = document.getElementById('home-nav');
    const addPostNav = document.getElementById('add-post-nav');
    const accountNav = document.getElementById('account-nav');
    
    const homeContent = document.getElementById('home-content');
    const accountContent = document.getElementById('account-content');
    const addPostModal = document.getElementById('add-post-modal');

    // Navigasyon tıklama olayları
    if (homeNav) {
        homeNav.addEventListener('click', () => {
            setActiveNav(homeNav);
            showContent(homeContent);
            updatePageTitle('Ana Sayfa');
        });
    }
    
    if (addPostNav) {
        addPostNav.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                // Kullanıcı giriş yapmamışsa account sayfasına yönlendir
                setActiveNav(accountNav);
                showContent(accountContent);
                updatePageTitle('Hesap');
                document.dispatchEvent(new Event('accountNavClicked'));
                showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                return;
            }
            setActiveNav(addPostNav);
            openModal(addPostModal);
        });
    }
    
    if (accountNav) {
        accountNav.addEventListener('click', () => {
            setActiveNav(accountNav);
            showContent(accountContent);
            updatePageTitle('Hesap');
            document.dispatchEvent(new Event('accountNavClicked'));
        });
    }
});