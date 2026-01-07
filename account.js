// account.js - TAMAMEN YENİLENDİ
document.addEventListener('DOMContentLoaded', function() {
    // Elementleri seç
    const loginForm = document.getElementById('login-account-form');
    const registerForm = document.getElementById('register-account-form');
    const accountInfo = document.getElementById('account-info');
    const accountTitle = document.getElementById('account-title');
    const accountPostsGrid = document.getElementById('account-posts-grid');
    const addNewPostBtn = document.getElementById('add-new-post-btn');
    const editAccountBtn = document.getElementById('edit-account-btn');
    const upgradePremiumBtn = document.getElementById('upgrade-premium-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const ageWarning = document.getElementById('age-warning');

    // Uygulama başlat
    initializeApp();

    function initializeApp() {
        initializeBirthdateSelects();
        setupEventListeners();
        checkCurrentUser();
    }

    function initializeBirthdateSelects() {
        const daySelect = document.getElementById('register-birthday');
        const monthSelect = document.getElementById('register-birthmonth');
        const yearSelect = document.getElementById('register-birthyear');

        if (!daySelect || !monthSelect || !yearSelect) return;

        // Günleri doldur
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            daySelect.appendChild(option);
        }

        // Ayları doldur
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Yılları doldur (1920'den günümüze)
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= 1920; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearSelect.appendChild(option);
        }

        // Yaş kontrolü için event listener'lar
        [daySelect, monthSelect, yearSelect].forEach(select => {
            select.addEventListener('change', checkAgeRequirement);
        });
    }

    function setupEventListeners() {
        // Form geçişleri
        document.querySelectorAll('.switch-auth').forEach(btn => {
            btn.addEventListener('click', handleFormSwitch);
        });

        // Giriş butonu
        const loginBtn = document.getElementById('account-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
        
        // Kayıt butonu
        const registerBtn = document.getElementById('account-register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', handleRegister);
        }
        
        // Hesap işlemleri
        if (addNewPostBtn) addNewPostBtn.addEventListener('click', handleAddNewPost);
        if (editAccountBtn) editAccountBtn.addEventListener('click', handleEditAccount);
        if (upgradePremiumBtn) upgradePremiumBtn.addEventListener('click', handleUpgradePremium);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        // Account nav event
        document.addEventListener('accountNavClicked', () => {
            checkCurrentUser();
        });
    }

    function checkCurrentUser() {
        const user = getCurrentUser();
        updateUI(user);
    }

    function handleFormSwitch(e) {
        const formType = e.target.getAttribute('data-form');
        
        if (formType === 'register') {
            // Kayıt formunu göster
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) {
                registerForm.style.display = 'block';
                registerForm.classList.add('active');
            }
            if (accountInfo) accountInfo.style.display = 'none';
            if (accountTitle) accountTitle.textContent = 'Yeni Hesap Oluşturun';
        } else {
            // Giriş formunu göster
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) {
                loginForm.style.display = 'block';
                loginForm.classList.add('active');
            }
            if (accountInfo) accountInfo.style.display = 'none';
            if (accountTitle) accountTitle.textContent = 'Hesabınıza Giriş Yapın';
        }
    }

    function checkAgeRequirement() {
        const day = document.getElementById('register-birthday')?.value;
        const month = document.getElementById('register-birthmonth')?.value;
        const year = document.getElementById('register-birthyear')?.value;

        if (day && month && year) {
            const birthDate = new Date(year, month - 1, day);
            const age = calculateAge(birthDate);

            if (age < 15) {
                if (ageWarning) ageWarning.style.display = 'flex';
                disableRegisterButton();
            } else {
                if (ageWarning) ageWarning.style.display = 'none';
                enableRegisterButton();
            }
        }
    }

    function disableRegisterButton() {
        const registerBtn = document.getElementById('account-register-btn');
        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.style.opacity = '0.5';
            registerBtn.style.cursor = 'not-allowed';
        }
    }

    function enableRegisterButton() {
        const registerBtn = document.getElementById('account-register-btn');
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.style.opacity = '1';
            registerBtn.style.cursor = 'pointer';
        }
    }

    function calculateAge(birthdate) {
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Kullanıcı verisi okunamadı:', error);
            return null;
        }
    }

    function updateUI(user) {
        if (user) {
            showAccountInfo(user);
        } else {
            showLoginForm();
        }
    }

    function showLoginForm() {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (accountInfo) accountInfo.style.display = 'none';
        if (accountTitle) accountTitle.textContent = 'Hesabınıza Giriş Yapın';
    }

    function showAccountInfo(user) {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (accountInfo) accountInfo.style.display = 'block';
        if (accountTitle) accountTitle.textContent = 'Hesabım';

        // Kullanıcı bilgilerini güncelle
        updateUserInfo(user);
        updateAccountStats(user.username);
        loadAccountPosts(user.username);
    }

    function updateUserInfo(user) {
        const fullnameEl = document.getElementById('account-fullname');
        const emailEl = document.getElementById('account-email');
        const ageTextEl = document.getElementById('account-age-text');
        const avatarEl = document.getElementById('account-avatar');
        const memberSinceEl = document.getElementById('member-since');

        if (fullnameEl) fullnameEl.textContent = user.fullname || `${user.firstname} ${user.lastname}`;
        if (emailEl) emailEl.textContent = user.email;
        
        if (ageTextEl && user.birthdate) {
            const age = calculateAge(new Date(user.birthdate));
            ageTextEl.textContent = `${age} yaşında`;
        }
        
        // Avatar güncelle
        if (avatarEl) {
            const hue = (user.username?.length * 30) % 360 || 0;
            const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue + 30}, 70%, 60%))`;
            avatarEl.style.background = gradient;
        }

        // Üyelik süresi
        if (memberSinceEl) {
            const memberSince = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            memberSinceEl.textContent = memberSince;
        }
    }

    function updateAccountStats(username) {
        const postsCountEl = document.getElementById('account-posts');
        const likesCountEl = document.getElementById('account-likes');
        const daysCountEl = document.getElementById('account-days');

        try {
            const posts = JSON.parse(localStorage.getItem('neydikiPosts')) || [];
            const userPosts = posts.filter(post => post.username === username);
            
            // İstatistikleri güncelle
            if (postsCountEl) postsCountEl.textContent = userPosts.length;
            
            const totalLikes = userPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
            if (likesCountEl) likesCountEl.textContent = totalLikes;
            
            const joinDate = new Date();
            const today = new Date();
            const daysSinceJoin = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
            if (daysCountEl) daysCountEl.textContent = daysSinceJoin + 1;
        } catch (error) {
            console.error('İstatistikler güncellenirken hata:', error);
        }
    }

    function loadAccountPosts(username) {
        if (!accountPostsGrid) return;

        try {
            const posts = JSON.parse(localStorage.getItem('neydikiPosts')) || [];
            const userPosts = posts.filter(post => post.username === username);
            
            accountPostsGrid.innerHTML = '';
            
            if (userPosts.length === 0) {
                showEmptyPostsState();
                return;
            }
            
            userPosts.forEach(post => {
                const postElement = createAccountPostElement(post);
                accountPostsGrid.appendChild(postElement);
            });
        } catch (error) {
            console.error('Gönderiler yüklenirken hata:', error);
            showEmptyPostsState();
        }
    }

    function showEmptyPostsState() {
        if (!accountPostsGrid) return;

        accountPostsGrid.innerHTML = `
            <div class="empty-account-posts">
                <i class="fas fa-images"></i>
                <h4>Henüz gönderiniz yok</h4>
                <p>İlk gönderinizi paylaşmak için butona tıklayın</p>
            </div>
        `;
    }

    function createAccountPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'account-post-item';
        postDiv.setAttribute('data-post-id', post.id);
        
        const imageStyle = post.imageType === 'gradient' 
            ? `background: ${post.image}`
            : `background-image: url("${post.image}"); background-size: cover; background-position: center;`;
        
        postDiv.innerHTML = `
            <div class="account-post-image" style="${imageStyle}"></div>
            <div class="account-post-overlay">
                <div class="account-post-stats">
                    <span class="stat"><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                    <span class="stat"><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                </div>
                <div class="account-post-actions">
                    <button class="account-post-delete-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Event listener'ları ekle
        const deleteBtn = postDiv.querySelector('.account-post-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePostFromAccount(post.id);
            });
        }

        postDiv.addEventListener('click', () => {
            if (typeof openDiscussionModal === 'function') {
                openDiscussionModal(post.id);
            }
        });

        return postDiv;
    }

    function deletePostFromAccount(postId) {
        if (!confirm('Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }

        try {
            let posts = JSON.parse(localStorage.getItem('neydikiPosts')) || [];
            posts = posts.filter(p => p.id !== postId);
            
            // Beğenilerden de kaldır
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
            const updatedLikedPosts = likedPosts.filter(id => id !== postId);
            localStorage.setItem('likedPosts', JSON.stringify(updatedLikedPosts));
            
            // Yerel depolamayı güncelle
            localStorage.setItem('neydikiPosts', JSON.stringify(posts));
            
            // UI'ı yenile
            const currentUser = getCurrentUser();
            if (currentUser) {
                updateAccountStats(currentUser.username);
                loadAccountPosts(currentUser.username);
            }
            
            // Ana sayfayı yenile
            if (typeof loadImageFeed === 'function') {
                loadImageFeed();
            }
            
            showNotification('Gönderi başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Gönderi silinirken hata:', error);
            showNotification('Gönderi silinirken bir hata oluştu!', 'error');
        }
    }

    function handleLogin() {

    const email = document.getElementById('account-username')?.value;
    const password = document.getElementById('account-password')?.value;

    // Alanlar boş mu kontrol et
    if (!email || !password) {
        showNotification('Lütfen e-posta ve şifrenizi girin.', 'error');
        return;
    }

    // Firebase ile Giriş Yap
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showNotification('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            // Sayfa yenilemeye gerek yok, alttaki kod (kontrolcü) otomatik yakalayacak
        })
        .catch((error) => {
            console.error(error);
            showNotification('Giriş başarısız. E-posta veya şifre yanlış.', 'error');
        });

    }

    function handleRegister() {
    
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const username = document.getElementById('register-username')?.value;
    const firstname = document.getElementById('register-firstname')?.value;
    const lastname = document.getElementById('register-lastname')?.value;
    
    // Doğrulama: Alanlar boş mu?
    if (!email || !password || !username) {
        showNotification('Lütfen zorunlu alanları doldurun.', 'error');
        return;
    }

    // 1. Firebase'e Kayıt Et (Kullanıcı oluştur)
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Kayıt başarılı oldu, şimdi detayları veritabanına yazalım
            // 2. Veritabanına Yaz
            return db.collection("users").doc(userCredential.user.uid).set({
                username: username,
                email: email,
                fullname: `${firstname} ${lastname}`,
                uid: userCredential.user.uid,
                joinDate: new Date().toISOString()
            });
        })
        .then(() => {
            // Her şey tamam!
            showNotification('Kayıt başarılı! Hoş geldiniz.', 'success');
        })
        .catch((error) => {
            console.error(error);
            // Hata mesajını Türkçeleştirip gösterelim
            let mesaj = error.message;
            if(error.code === 'auth/email-already-in-use') mesaj = 'Bu e-posta zaten kullanılıyor.';
            if(error.code === 'auth/weak-password') mesaj = 'Şifre çok zayıf (en az 6 karakter).';
            
            showNotification('Kayıt hatası: ' + mesaj, 'error');
        });
      
    }

    function handleAddNewPost() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
            return;
        }
        
        const addPostModal = document.getElementById('add-post-modal');
        if (addPostModal && typeof openModal === 'function') {
            openModal(addPostModal);
        }
    }

    function handleEditAccount() {
        showNotification('Profil düzenleme özelliği yakında gelecek!', 'info');
    }

    function handleUpgradePremium() {
        showNotification('Premium özellikler yakında gelecek! 🚀', 'info');
    }

    function handleLogout() {
        if (confirm('Çıkış yapmak istiyor musunuz?')) {
            localStorage.removeItem('currentUser');
            updateUI(null);
            showNotification('Çıkış yapıldı', 'info');
        }
    }

    // Global fonksiyon
    window.onNewPostAdded = function() {
        const currentUser = getCurrentUser();
        if (currentUser) {
            updateAccountStats(currentUser.username);
            loadAccountPosts(currentUser.username);
        }
    };

    // Sayfa yüklendiğinde kontrol et
    setTimeout(() => {
        checkCurrentUser();
    }, 100);
});

// account.js dosyasında createAccountPostElement fonksiyonunu bulun ve değiştirin:

function createAccountPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'account-post-item';
    postDiv.setAttribute('data-post-id', post.id);
    
    const hasNoImage = !post.image || post.imageType === 'none';
    
    let imageStyle = '';
    if (hasNoImage) {
        // Görsel olmayan gönderiler için özel tasarım
        const gradient = getRandomGradient();
        imageStyle = `background: ${gradient}; display: flex; align-items: center; justify-content: center;`;
        
        postDiv.innerHTML = `
            <div class="account-post-image" style="${imageStyle}">
                <div style="text-align: center; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                    <i class="fas fa-feather" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <div style="font-size: 12px; font-weight: 600;">Sadece Yazı</div>
                </div>
            </div>
            <div class="account-post-overlay">
                <div class="account-post-stats">
                    <span class="stat"><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                    <span class="stat"><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                </div>
                <div class="account-post-actions">
                    <button class="account-post-delete-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        // Görsel içeren gönderiler
        if (post.imageType === 'gradient') {
            imageStyle = `background: ${post.image}`;
        } else {
            imageStyle = `background-image: url("${post.image}"); background-size: cover; background-position: center;`;
        }
        
        postDiv.innerHTML = `
            <div class="account-post-image" style="${imageStyle}"></div>
            <div class="account-post-overlay">
                <div class="account-post-stats">
                    <span class="stat"><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                    <span class="stat"><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                </div>
                <div class="account-post-actions">
                    <button class="account-post-delete-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Event listener'ları ekle
    const deleteBtn = postDiv.querySelector('.account-post-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePostFromAccount(post.id);
        });
    }

    postDiv.addEventListener('click', () => {
        if (typeof openDiscussionModal === 'function') {
            openDiscussionModal(post.id);
        }
    });

    return postDiv;
}

// Rastgele gradient seç (account.js için)
function getRandomGradient() {
    const gradients = [
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
        'linear-gradient(135deg, #a6c0fe 0%, #f68084 100%)',
        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}



// --- OTURUM KONTROLCÜSÜ ---
// Kullanıcı giriş veya çıkış yaptığında bu kod otomatik çalışır
auth.onAuthStateChanged((user) => {
    if (user) {
        // Biri giriş yapmış! Bilgilerini veritabanından çekelim
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Bilgileri tarayıcıya (localStorage) da kaydedelim ki diğer sayfalar görsün
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                // Ekranı güncelle (Profil resmini vs. göster)
                // (Bu fonksiyon zaten kodunda var, onu çağırıyoruz)
                if (typeof updateUI === 'function') {
                    updateUI(userData);
                }
            }
        });
    } else {
        // Kimse yok veya çıkış yapılmış
        localStorage.removeItem('currentUser');
        // Giriş ekranını göster
        if (typeof showLoginForm === 'function') {
            showLoginForm();
        }
    }
});

// Çıkış Yap butonu için ayar
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            showNotification('Başarıyla çıkış yapıldı.', 'info');
            window.location.reload(); // Sayfayı yenilemek en temizidir
        });
    });
}
