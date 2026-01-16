// account.js - GÜVENLİ VE TAM SİLME ÖZELLİKLİ FİNAL VERSİYON + ADMIN YETKİLERİ
document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENTLER ---
    const loginForm = document.getElementById('login-account-form');
    const registerForm = document.getElementById('register-account-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const accountInfo = document.getElementById('account-info');
    const authLoading = document.getElementById('auth-loading');
    const accountTitle = document.getElementById('account-title');
    
    // Modal Elementleri
    const discussionModal = document.getElementById('discussion-modal');
    const discussionImageEl = document.getElementById('discussion-image');
    const discussionCaptionEl = document.getElementById('discussion-caption');
    const discussionCommentsList = document.getElementById('comments-list');
    
    let currentDetailPostId = null;
    let currentPostData = null; 

    // --- CSS YAMASI ---
    const fixModalStyle = document.createElement('style');
    fixModalStyle.textContent = `
        /* Çift Göz İkonu Hatası Çözümü */
        input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { display: none !important; }
        
        /* Modal ve Hata Stilleri */
        #discussion-modal .discussion-modal-content { display: flex !important; flex-direction: column !important; height: 85vh !important; max-height: 85vh !important; width: 95% !important; max-width: 500px !important; padding: 0 !important; overflow: hidden !important; border-radius: 15px !important; }
        #discussion-modal .modal-header { flex-shrink: 0 !important; z-index: 2 !important; background: var(--surface) !important; }
        #discussion-modal .discussion-image-container { flex-shrink: 0 !important; max-height: 30vh !important; background: #000 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        #discussion-modal .discussion-content { flex: 1 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; position: relative !important; min-height: 0 !important; }
        #discussion-modal .post-caption { flex-shrink: 0 !important; padding: 10px 15px !important; border-bottom: 1px solid var(--border) !important; max-height: 80px !important; overflow-y: auto !important; }
        #discussion-modal .comments-section { flex-grow: 1 !important; overflow-y: auto !important; padding: 10px !important; scroll-behavior: smooth !important; background: var(--surface) !important; display: block !important; }
        #discussion-modal .comments-list { padding-bottom: 10px !important; }
        #discussion-modal .add-comment { flex-shrink: 0 !important; padding: 10px 15px !important; background: var(--surface) !important; border-top: 1px solid var(--border) !important; position: relative !important; z-index: 10 !important; margin-top: auto !important; }
        #edit-avatar-preview { background-size: cover; background-position: center; background-color: #e1e1e1; color: #999; display: flex; align-items: center; justify-content: center; }
        .error-shake { animation: shake 0.4s ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); border-color: #ff4757; } 40%, 80% { transform: translateX(5px); } }
        .comment-text.collapsed { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
        .read-more-btn { background: none; border: none; color: var(--text-light); font-size: 11px; font-weight: 600; cursor: pointer; padding: 0; margin-top: 2px; display: inline-block; }
        .read-more-btn:hover { text-decoration: underline; color: var(--primary); }
    `;
    document.head.appendChild(fixModalStyle);

    function resetUI() {
        if(loginForm) loginForm.classList.remove('visible-flex');
        if(registerForm) registerForm.classList.remove('visible-flex');
        if(forgotPasswordForm) forgotPasswordForm.classList.remove('visible-flex');
        if(accountInfo) accountInfo.classList.remove('visible-block');
        if(authLoading) authLoading.style.display = 'flex';
    }
    
    resetUI();

    const addNewPostBtn = document.getElementById('add-new-post-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn'); 
    const loginBtn = document.getElementById('account-login-btn');
    const registerBtn = document.getElementById('account-register-btn');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const sendResetBtn = document.getElementById('send-reset-btn');

    initializeBirthdateSelects();
    setupEventListeners();
    setupLogoRedirect();
    setupCommentSystem();
    setupProfileEditing();

    function hideLoading() { setTimeout(() => { if(authLoading) authLoading.style.display = 'none'; }, 300); }
    
    function timeAgo(date) {
        const s = Math.floor((new Date() - new Date(date)) / 1000);
        if (s < 60) return "Az önce";
        if (s < 3600) return Math.floor(s/60) + "dk";
        if (s < 86400) return Math.floor(s/3600) + "sa";
        return Math.floor(s/86400) + "g";
    }

    function setupLogoRedirect() {
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
                const homeContent = document.getElementById('home-content');
                if (homeContent) homeContent.style.display = 'block';
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                const homeNav = document.getElementById('home-nav');
                if (homeNav) homeNav.classList.add('active');
                window.scrollTo(0, 0);
            });
        }
    }

    function setupEventListeners() {
        document.querySelectorAll('.switch-auth').forEach(btn => { btn.addEventListener('click', handleFormSwitch); });
        if (loginBtn) loginBtn.addEventListener('click', handleLogin);
        if (registerBtn) registerBtn.addEventListener('click', handleRegister);
        if (addNewPostBtn) addNewPostBtn.addEventListener('click', handleAddNewPost);
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Çıkış yapmak istiyor musunuz?')) {
                    auth.signOut().then(() => { localStorage.removeItem('currentUser'); window.location.reload(); });
                }
            });
        }
        
        if (deleteAccountBtn) { deleteAccountBtn.addEventListener('click', handleDeleteAccount); }

        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', function() {
                if(loginForm) loginForm.classList.remove('visible-flex');
                if(registerForm) registerForm.classList.remove('visible-flex');
                if(forgotPasswordForm) forgotPasswordForm.classList.add('visible-flex');
                if(accountTitle) accountTitle.textContent = 'Şifre Sıfırlama';
                
                // Hata mesajlarını temizle
                const errorMsg = document.getElementById('login-error-msg');
                if(errorMsg) errorMsg.style.display = 'none';
                const forgotErrorMsg = document.getElementById('forgot-error-msg');
                if(forgotErrorMsg) forgotErrorMsg.style.display = 'none';
                const regErrorMsg = document.getElementById('register-error-msg');
                if(regErrorMsg) regErrorMsg.style.display = 'none';
            });
        }

        if (sendResetBtn) { sendResetBtn.addEventListener('click', handlePasswordReset); }
        
        const toggleRegPassBtn = document.getElementById('toggle-register-password');
        const regPassInput = document.getElementById('register-password');
        if (toggleRegPassBtn && regPassInput) {
            toggleRegPassBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const type = regPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
                regPassInput.setAttribute('type', type);
                const icon = this.querySelector('i');
                if (type === 'text') { icon.className = 'fas fa-eye-slash'; } else { icon.className = 'fas fa-eye'; }
            });
        }

        const toggleLoginPassBtn = document.getElementById('toggle-login-password');
        const loginPassInput = document.getElementById('account-password');
        if (toggleLoginPassBtn && loginPassInput) {
            toggleLoginPassBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const type = loginPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
                loginPassInput.setAttribute('type', type);
                const icon = this.querySelector('i');
                if (type === 'text') { icon.className = 'fas fa-eye-slash'; } else { icon.className = 'fas fa-eye'; }
            });
        }
    }
    
    // --- GÜÇLENDİRİLMİŞ HESAP SİLME FONKSİYONU ---
    async function handleDeleteAccount() {
        if (!confirm('HESABINIZI SİLMEK ÜZERESİNİZ!\n\nBu işlem geri alınamaz. Tüm gönderileriniz, yorumlarınız ve beğenileriniz kalıcı olarak silinecektir. Devam etmek istiyor musunuz?')) return;
        if (!confirm('Son onay: Hesabınızı ve tüm verilerinizi silmek istediğinize emin misiniz?')) return;

        const user = firebase.auth().currentUser;
        if (!user) { alert('Oturum hatası. Lütfen sayfayı yenileyip tekrar giriş yapın.'); return; }

        const deleteBtn = document.getElementById('delete-account-btn');
        let originalText = '';
        if(deleteBtn) {
            originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = 'Veriler Temizleniyor... <i class="fas fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;
        }

        try {
            // 1. ADIM: Güncel kullanıcı adını veritabanından al (LocalStorage eski kalmış olabilir)
            let currentUsername = null;
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUsername = userDoc.data().username;
            } else {
                // Eğer veritabanında kullanıcı yoksa localStorage'a bak
                const localData = JSON.parse(localStorage.getItem('currentUser'));
                if (localData) currentUsername = localData.username;
            }

            // 2. ADIM: Kullanıcının kendi gönderilerini sil (Batch Limit Korumalı)
            const userPostsSnapshot = await db.collection('posts').where('uid', '==', user.uid).get();
            
            // Firestore batch limiti 500'dür, fazlası için parçalı silme gerekir
            const BATCH_SIZE = 450;
            const chunks = [];
            const docs = userPostsSnapshot.docs;
            
            for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                const chunk = docs.slice(i, i + BATCH_SIZE);
                const batch = db.batch();
                chunk.forEach(doc => batch.delete(doc.ref));
                chunks.push(batch.commit());
            }
            await Promise.all(chunks); // Tüm gönderi silme paketlerini çalıştır

            // 3. ADIM: Diğer gönderilerdeki BEĞENİ ve YORUMLARI temizle
            const allPostsSnapshot = await db.collection('posts').get();
            const updatePromises = [];

            allPostsSnapshot.forEach(doc => {
                const post = doc.data();
                let isModified = false;
                let updates = {};

                // A) Beğeni Silme (UID bazlı)
                if (post.likedBy && post.likedBy.includes(user.uid)) {
                    updates.likedBy = firebase.firestore.FieldValue.arrayRemove(user.uid);
                    updates.likes = firebase.firestore.FieldValue.increment(-1);
                    isModified = true;
                }

                // B) Yorum Silme (Kullanıcı Adı bazlı)
                if (post.comments && post.comments.length > 0 && currentUsername) {
                    const originalLength = post.comments.length;
                    const cleanComments = post.comments.filter(c => c.username !== currentUsername);
                    
                    if (cleanComments.length !== originalLength) {
                        updates.comments = cleanComments;
                        isModified = true;
                    }
                }

                if (isModified) {
                    updatePromises.push(doc.ref.update(updates));
                }
            });

            await Promise.all(updatePromises); // Tüm güncellemeleri bekle

            // 4. ADIM: Kullanıcı Profil Dokümanını Sil
            await db.collection('users').doc(user.uid).delete();

            // 5. ADIM: Authentication Hesabını Sil
            await user.delete();

            alert('Hesabınız ve tüm verileriniz başarıyla silindi.');
            localStorage.removeItem('currentUser');
            window.location.reload();

        } catch (error) {
            console.error("Silme hatası:", error);
            if(deleteBtn) {
                deleteBtn.innerHTML = originalText;
                deleteBtn.disabled = false;
            }
            
            if (error.code === 'auth/requires-recent-login') {
                alert('Güvenlik gereği hesabınızı silmek için yeniden giriş yapmanız gerekiyor.');
                auth.signOut().then(() => window.location.reload());
            } else {
                alert('Hata: ' + error.message);
            }
        }
    }

    function setupProfileEditing() {
        const editBtn = document.getElementById('edit-account-btn');
        const saveBtn = document.getElementById('save-profile-btn');
        const modal = document.getElementById('edit-profile-modal');
        const removeBtn = document.getElementById('remove-profile-pic'); 
        const inputUsername = document.getElementById('edit-username');
        const inputFullname = document.getElementById('edit-fullname');
        const inputBirthdate = document.getElementById('edit-birthdate');
        const uploadInput = document.getElementById('edit-profile-upload');
        const previewDiv = document.getElementById('edit-avatar-preview');
        let activeProfilePicData = null;

        const updatePreviewUI = (picData) => {
            if (!previewDiv) return;
            if (picData) {
                previewDiv.style.backgroundImage = `url('${picData}')`;
                previewDiv.style.backgroundColor = 'transparent';
                previewDiv.innerHTML = '';
                if (removeBtn) removeBtn.style.display = 'inline-block';
            } else {
                previewDiv.style.backgroundImage = 'none';
                previewDiv.style.backgroundColor = '#e1e1e1';
                previewDiv.innerHTML = '<i class="fas fa-user" style="font-size: 50px; color: #999;"></i>';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        };

        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (!user) return;
                if(inputUsername) inputUsername.value = user.username || '';
                if(inputFullname) inputFullname.value = user.fullname || '';
                if(inputBirthdate) inputBirthdate.value = user.birthdate || '';
                activeProfilePicData = user.profilePic || null;
                updatePreviewUI(activeProfilePicData);
                if (window.openModal && modal) { window.openModal(modal); } else if (modal) { modal.style.display = 'flex'; }
            });
        }

        function convertToWebP(base64Str) {
            return new Promise((resolve) => {
                let img = new Image();
                img.src = base64Str;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxWidth = 500; const maxHeight = 500;
                    let width = img.width; let height = img.height;
                    if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.8));
                };
                img.onerror = () => resolve(base64Str);
            });
        }

        if (uploadInput) {
            uploadInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        convertToWebP(ev.target.result).then(webpData => {
                            activeProfilePicData = webpData;
                            updatePreviewUI(activeProfilePicData);
                        });
                    }
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                activeProfilePicData = null;
                if (uploadInput) uploadInput.value = '';
                updatePreviewUI(null);
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async function() {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (!user) return;
                const oldUsername = user.username; 
                const newUsername = inputUsername.value.trim();
                const newFullname = inputFullname.value.trim();
                const newBirthdate = inputBirthdate.value;

                if (!newUsername) { showNotification('Kullanıcı adı boş olamaz!', 'error'); return; }

                const originalBtnText = saveBtn.textContent;
                saveBtn.textContent = 'Veriler güncelleniyor...';
                saveBtn.disabled = true;

                let updateData = { username: newUsername, fullname: newFullname, birthdate: newBirthdate, profilePic: activeProfilePicData };

                try {
                    await db.collection("users").doc(user.uid).set(updateData, { merge: true });
                    
                    const snapshot = await db.collection("posts").get();
                    const batch = db.batch();
                    let batchCount = 0;

                    snapshot.forEach(doc => {
                        const post = doc.data();
                        let isDirty = false;
                        let updates = {};
                        if (post.userId === user.uid) { 
                            updates.username = newUsername; 
                            updates.userProfilePic = activeProfilePicData; 
                            isDirty = true; 
                        }
                        if (post.comments && post.comments.length > 0) {
                            let commentsChanged = false;
                            const updatedComments = post.comments.map(comment => {
                                if (comment.username === oldUsername) { 
                                    commentsChanged = true; 
                                    return { ...comment, username: newUsername }; 
                                }
                                return comment;
                            });
                            if (commentsChanged) { 
                                updates.comments = updatedComments; 
                                isDirty = true; 
                            }
                        }
                        if (isDirty) { batch.update(doc.ref, updates); batchCount++; }
                    });

                    if (batchCount > 0) { await batch.commit(); }

                    user.username = newUsername; 
                    user.fullname = newFullname; 
                    user.birthdate = newBirthdate; 
                    user.profilePic = activeProfilePicData;
                    localStorage.setItem('currentUser', JSON.stringify(user));

                    showAccountInfo(user);

                    if (window.closeModal && modal) { window.closeModal(modal); } else if (modal) { modal.style.display = 'none'; }
                    showNotification('Profil güncellendi!', 'success');

                } catch (error) {
                    console.error("Güncelleme hatası: ", error);
                    showNotification('Hata oluştu: ' + error.message, 'error');
                } finally {
                    saveBtn.textContent = originalBtnText;
                    saveBtn.disabled = false;
                }
            });
        }
    }

    function renderAccountCommentsHTML(comments, currentUser) {
        if (!comments || comments.length === 0) return '<div class="empty-comments-msg" style="text-align:center; padding:20px; color:#8e8e8e;">Henüz yorum yok.</div>';
        
        // --- YÖNETİCİ KONTROLÜ ---
        const isAdmin = currentUser && currentUser.role === 'admin';

        return comments.map(c => {
            const isMine = currentUser && currentUser.username === c.username;
            const isLongText = c.text && c.text.length > 120;
            const textClass = isLongText ? 'comment-text collapsed' : 'comment-text';
            const readMoreBtn = isLongText ? '<button class="read-more-btn">Devamını oku</button>' : '';
            
            // Silme Yetkisi: Kendi yorumuysa VEYA Yöneticiyse
            const canDelete = isMine || isAdmin;
            
            const deleteBtnHtml = canDelete ? `<button class="comment-delete-btn" data-id="${c.id}" style="position: absolute; top: 3px; right: 3px; border: none; background: none; color: #8e8e8e; cursor: pointer; font-size: 10px;"><i class="fas fa-trash"></i></button>` : '';
            
            return `
                <div class="comment-item ${isMine ? 'mine' : ''}">
                    ${deleteBtnHtml}
                    <div class="comment-header"><span class="comment-user">${c.username}</span></div>
                    <div class="${textClass}">${c.text}</div>
                    ${readMoreBtn}
                    <div class="comment-footer"><div class="footer-left"></div><div class="footer-right"><span class="comment-time">${timeAgo(c.timestamp)}</span></div></div>
                </div>`;
        }).join('');
    }

    function setupCommentSystem() {
        const submitBtn = document.getElementById('submit-comment');
        const inputElement = document.getElementById('comment-input');
        
        const sendComment = () => {
            const currentInput = document.getElementById('comment-input');
            const text = currentInput ? currentInput.value.trim() : '';
            if (!text) return; 
            if (!currentDetailPostId) return;
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) return alert('Yorum yapmak için giriş yapmalısınız.');

            const newComment = { id: Date.now().toString(), username: user.username, text: text, timestamp: new Date().toISOString(), likes: 0, likedBy: [] };
            if(currentInput) currentInput.value = '';
            
            db.collection("posts").doc(currentDetailPostId).update({
                comments: firebase.firestore.FieldValue.arrayUnion(newComment)
            }).then(() => {
                if(currentPostData) {
                    if(!currentPostData.comments) currentPostData.comments = [];
                    currentPostData.comments.push(newComment);
                    const commentsList = document.getElementById('comments-list');
                    if (commentsList) {
                        commentsList.innerHTML = renderAccountCommentsHTML(currentPostData.comments, user);
                        const scrollContainer = document.querySelector('#discussion-modal .comments-section');
                        if(scrollContainer) setTimeout(() => { scrollContainer.scrollTop = scrollContainer.scrollHeight; }, 50);
                    }
                }
            }).catch(err => { console.error("Yorum hatası:", err); alert("Yorum gönderilemedi."); });
        };

        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.addEventListener('click', function(e) {
                if (e.target.classList.contains('read-more-btn')) {
                    e.preventDefault();
                    const textDiv = e.target.previousElementSibling; 
                    if (textDiv && textDiv.classList.contains('comment-text')) {
                        if (textDiv.classList.contains('collapsed')) { textDiv.classList.remove('collapsed'); e.target.textContent = 'Daha az'; } else { textDiv.classList.add('collapsed'); e.target.textContent = 'Devamını oku'; }
                    }
                }
                const delBtn = e.target.closest('.comment-delete-btn');
                if (delBtn) { e.preventDefault(); e.stopPropagation(); deleteCommentInAccount(delBtn.dataset.id); }
            });
        }
        if(submitBtn) { const newBtn = submitBtn.cloneNode(true); submitBtn.parentNode.replaceChild(newBtn, submitBtn); newBtn.addEventListener('click', sendComment); }
        if(inputElement) { const newInput = inputElement.cloneNode(true); inputElement.parentNode.replaceChild(newInput, inputElement); newInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendComment(); }); }
    }

    function deleteCommentInAccount(commentId) {
        if(!confirm("Yorumu silmek istiyor musunuz?")) return;
        if(!currentDetailPostId || !currentPostData) return;
        const updatedComments = currentPostData.comments.filter(c => c.id !== commentId);
        const user = JSON.parse(localStorage.getItem('currentUser'));
        db.collection("posts").doc(currentDetailPostId).update({ comments: updatedComments })
            .then(() => { 
                currentPostData.comments = updatedComments; 
                const commentsList = document.getElementById('comments-list');
                if (commentsList) { commentsList.innerHTML = renderAccountCommentsHTML(updatedComments, user); }
            })
            .catch(err => alert("Silme hatası: " + err.message));
    }

    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            if (user) {
                db.collection("users").doc(user.uid).get().then((doc) => {
                    // Veritabanından gelen veride 'role' alanı varsa localStorage'a da kaydedilir
                    const userData = doc.exists ? doc.data() : { username: user.email.split('@')[0], email: user.email, uid: user.uid };
                    userData.uid = user.uid;
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    showAccountInfo(userData);
                    hideLoading();
                }).catch(() => { showLoginForm(); hideLoading(); });
            } else { localStorage.removeItem('currentUser'); showLoginForm(); hideLoading(); }
        });
    } else { showLoginForm(); hideLoading(); }

    function showLoginForm() {
        if (loginForm) loginForm.classList.add('visible-flex');
        if (registerForm) registerForm.classList.remove('visible-flex');
        if (forgotPasswordForm) forgotPasswordForm.classList.remove('visible-flex');
        if (accountInfo) accountInfo.classList.remove('visible-block');
        if (accountTitle) accountTitle.textContent = 'Hesabınıza Giriş Yapın';
        
        // Hata mesajlarını gizle
        const errorMsg = document.getElementById('login-error-msg');
        if(errorMsg) errorMsg.style.display = 'none';
        const forgotErrorMsg = document.getElementById('forgot-error-msg');
        if(forgotErrorMsg) forgotErrorMsg.style.display = 'none';
        const regErrorMsg = document.getElementById('register-error-msg');
        if(regErrorMsg) regErrorMsg.style.display = 'none';
    }

    function showAccountInfo(user) {
        if (loginForm) loginForm.classList.remove('visible-flex');
        if (registerForm) registerForm.classList.remove('visible-flex');
        if (forgotPasswordForm) forgotPasswordForm.classList.remove('visible-flex');
        if (accountInfo) accountInfo.classList.add('visible-block');
        if (accountTitle) accountTitle.textContent = 'Hesabım';

        const elName = document.getElementById('account-fullname');
        if(elName) elName.textContent = user.fullname || user.username;
        const elUserDisplay = document.getElementById('account-username-display');
        if(elUserDisplay) elUserDisplay.textContent = '@' + user.username;
        const elEmail = document.getElementById('account-email');
        if(elEmail) elEmail.textContent = user.email;
        if (user.joinDate) {
            const date = new Date(user.joinDate);
            const elDate = document.getElementById('member-since');
            if(elDate) elDate.textContent = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        }
        
        const avatarEl = document.getElementById('account-avatar');
        if (avatarEl) {
            avatarEl.style.display = 'flex'; avatarEl.style.alignItems = 'center'; avatarEl.style.justifyContent = 'center';
            if (user.profilePic) { avatarEl.style.background = `url('${user.profilePic}') center/cover no-repeat`; avatarEl.style.border = '2px solid rgba(255,255,255,0.8)'; avatarEl.innerHTML = ''; }
            else { avatarEl.style.background = '#e1e1e1'; avatarEl.style.border = '2px solid rgba(255,255,255,0.8)'; avatarEl.innerHTML = '<i class="fas fa-user" style="font-size: 30px; color: #999;"></i>'; }
        }
        loadAccountPosts(user.username);
    }

    function loadAccountPosts(username) {
        const grid = document.getElementById('account-posts-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="feed-loading"><div class="feed-spinner"></div><p>Yükleniyor...</p></div>';
        db.collection("posts").where("username", "==", username).get().then((snapshot) => {
            grid.innerHTML = ''; 
            if (snapshot.empty) {
                grid.innerHTML = '<div class="empty-account-posts"><i class="fas fa-camera"></i><h4>Henüz gönderiniz yok</h4><p>İlk gönderinizi paylaşmak için yukarıdaki butonu kullanın.</p></div>';
                updateStats(0, 0); return;
            }
            let posts = [];
            snapshot.forEach(doc => { let p = doc.data(); p.id = doc.id; posts.push(p); });
            posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            let totalLikes = 0;
            posts.forEach(post => { grid.appendChild(createAccountPostElement(post)); totalLikes += (post.likes || 0); });
            updateStats(posts.length, totalLikes);
        }).catch(err => { console.error(err); grid.innerHTML = '<p style="text-align:center;">Hata oluştu.</p>'; });
    }

    function createAccountPostElement(post) {
        const div = document.createElement('div');
        div.className = 'account-post-item';
        let mediaHtml = post.imageType === 'none' || !post.image ? `<div class="account-post-image no-image-bg"><i class="fas fa-align-left" style="font-size:24px;"></i></div>` : `<div class="account-post-image" style="background-image: url('${post.image}')"></div>`;
        div.innerHTML = `${mediaHtml}<div class="account-post-overlay"><div class="account-post-stats"><span class="stat-item"><i class="fas fa-heart"></i> ${post.likes||0}</span><span class="stat-item"><i class="fas fa-comment"></i> ${post.comments ? post.comments.length : 0}</span></div></div><button class="delete-post-btn-account" title="Sil"><i class="fas fa-trash"></i></button>`;
        div.querySelector('.delete-post-btn-account').addEventListener('click', (e) => { e.stopPropagation(); deletePost(post.id); });
        div.addEventListener('click', () => openPostDetail(post));
        return div;
    }

    function openPostDetail(post) {
        if (!discussionModal) return;
        currentDetailPostId = post.id; currentPostData = post; 
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        if (post.imageType === 'none' || !post.image) {
            discussionImageEl.innerHTML = `<div class="no-image-post" style="height:100%; min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);"><i class="fas fa-quote-left" style="font-size:48px; color:white; opacity:0.8; margin-bottom:15px;"></i><div style="color:white; font-size:18px; font-weight:600;">Düşünce Paylaşımı</div></div>`;
        } else { discussionImageEl.innerHTML = `<img src="${post.image}" style="width:100%; height:auto; display:block; border-radius:8px;" alt="Post">`; }

        if (discussionCaptionEl) discussionCaptionEl.innerHTML = `<strong>${post.username}</strong> ${post.caption || ''}`;

        if (discussionCommentsList) {
            discussionCommentsList.innerHTML = renderAccountCommentsHTML(post.comments, currentUser);
            const input = document.getElementById('comment-input'); if(input) input.value = '';
            setTimeout(() => { 
                const scrollContainer = document.querySelector('#discussion-modal .comments-section'); 
                if(scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight; 
            }, 150);
        }
        
        if (window.openModal) window.openModal(discussionModal); else discussionModal.style.display = 'flex';
    }

    function deletePost(postId) {
        if (confirm("Silmek istediğinize emin misiniz?")) {
            db.collection("posts").doc(postId).delete().then(() => { const user = JSON.parse(localStorage.getItem('currentUser')); if (user) loadAccountPosts(user.username); }).catch(err => alert("Hata: " + err.message));
        }
    }

    function updateStats(p, l) { const pe = document.getElementById('account-posts'), le = document.getElementById('account-likes'); if(pe) pe.textContent = p; if(le) le.textContent = l; }
    
    function handleFormSwitch(e) {
        const type = e.target.getAttribute('data-form');
        
        if(loginForm) loginForm.classList.remove('visible-flex');
        if(registerForm) registerForm.classList.remove('visible-flex');
        if(forgotPasswordForm) forgotPasswordForm.classList.remove('visible-flex');

        if (type === 'register') { 
            if(registerForm) registerForm.classList.add('visible-flex'); 
            if(accountTitle) accountTitle.textContent = 'Yeni Hesap Oluşturun'; 
        } else if (type === 'login') {
            if(loginForm) loginForm.classList.add('visible-flex'); 
            if(accountTitle) accountTitle.textContent = 'Hesabınıza Giriş Yapın'; 
        }
        
        // HATA MESAJLARINI TEMİZLE
        const loginErrorMsg = document.getElementById('login-error-msg');
        if(loginErrorMsg) loginErrorMsg.style.display = 'none';
        const forgotErrorMsg = document.getElementById('forgot-error-msg');
        if(forgotErrorMsg) forgotErrorMsg.style.display = 'none';
        const regErrorMsg = document.getElementById('register-error-msg');
        if(regErrorMsg) regErrorMsg.style.display = 'none';
    }

    function handleLogin() {
        const emailInput = document.getElementById('account-username');
        const passwordInput = document.getElementById('account-password');
        const e = emailInput?.value;
        const p = passwordInput?.value;

        if (!e || !p) {
            const errorEl = document.getElementById('login-error-msg');
            if (errorEl) {
                errorEl.textContent = 'Lütfen bilgileri girin.';
                errorEl.style.display = 'flex';
            } else { showNotification('Lütfen bilgileri girin.', 'error'); }
            return;
        }

        const btn = document.getElementById('account-login-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Giriş Yapılıyor...';
        btn.disabled = true;

        auth.signInWithEmailAndPassword(e, p)
            .then(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            })
            .catch(err => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                let msg = "Giriş başarısız.";
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    msg = "E-posta veya parola hatalı.";
                } else if (err.code === 'auth/invalid-email') {
                    msg = "Geçersiz e-posta formatı.";
                } else if (err.code === 'auth/too-many-requests') {
                    msg = "Çok fazla deneme yaptınız. Lütfen biraz bekleyin.";
                }

                const errorEl = document.getElementById('login-error-msg');
                if (errorEl) {
                    errorEl.textContent = msg;
                    errorEl.style.display = 'flex';
                } else {
                    showNotification(msg, 'error');
                }

                if(passwordInput) {
                    passwordInput.classList.add('error-shake');
                    setTimeout(() => passwordInput.classList.remove('error-shake'), 500);
                }
            });
    }

    // --- ŞİFRE SIFIRLAMA FONKSİYONU ---
    function handlePasswordReset() {
        const emailInput = document.getElementById('forgot-email');
        const email = emailInput ? emailInput.value.trim() : '';
        const errorEl = document.getElementById('forgot-error-msg');
        
        const showError = (msg) => {
            if (errorEl) {
                errorEl.textContent = msg;
                errorEl.style.display = 'flex';
                
                if(emailInput) {
                    emailInput.classList.add('error-shake');
                    setTimeout(() => emailInput.classList.remove('error-shake'), 500);
                }
            } else {
                showNotification(msg, 'error');
            }
        };

        if (!email) {
            showError('Lütfen e-posta adresinizi girin.');
            return;
        }

        const btn = document.getElementById('send-reset-btn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = 'Kontrol ediliyor...';
        btn.disabled = true;
        if(errorEl) errorEl.style.display = 'none';

        db.collection('users').where('email', '==', email).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    showError('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }

                btn.innerHTML = 'Gönderiliyor...';
                auth.sendPasswordResetEmail(email)
                    .then(() => {
                        showNotification('Sıfırlama bağlantısı gönderildi!', 'success');
                        setTimeout(() => {
                            if(forgotPasswordForm) forgotPasswordForm.classList.remove('visible-flex');
                            if(loginForm) loginForm.classList.add('visible-flex');
                            if(accountTitle) accountTitle.textContent = 'Hesabınıza Giriş Yapın';
                        }, 2000);
                    })
                    .catch((error) => {
                        let msg = "Bir hata oluştu.";
                        if (error.code === 'auth/invalid-email') msg = "Geçersiz e-posta adresi formatı.";
                        showError(msg);
                    })
                    .finally(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    });
            })
            .catch(error => {
                console.error("Hata:", error);
                showError('Bağlantı hatası, lütfen tekrar deneyin.');
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    }

    // --- YENİ KAYIT FONKSİYONU (UI DÜZELTİLDİ) ---
    function handleRegister() {
        const e = document.getElementById('register-email')?.value,
              p = document.getElementById('register-password')?.value,
              u = document.getElementById('register-username')?.value;
        
        // Önceki hatayı temizle
        let errorBox = document.getElementById('register-error-msg');
        if(errorBox) errorBox.style.display = 'none';

        if (!e || !p || !u) {
            showRegisterError('Lütfen tüm alanları doldurun.');
            return;
        }

        const btn = document.getElementById('account-register-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Kayıt Olunuyor...';
        btn.disabled = true;

        auth.createUserWithEmailAndPassword(e, p).then((c) => { 
            return db.collection("users").doc(c.user.uid).set({ 
                username: u, 
                email: e, 
                uid: c.user.uid, 
                joinDate: new Date().toISOString() 
            }); 
        })
        .then(() => {
            // Başarılı ise yönlendirme veya giriş authStateChanged ile yapılır
        })
        .catch(err => {
            btn.innerHTML = originalText;
            btn.disabled = false;

            let msg = "Kayıt işlemi başarısız.";
            // Firebase Hata Kodları Çevirisi
            if (err.code === 'auth/email-already-in-use') {
                msg = "Bu e-posta adresi zaten kullanımda. Lütfen giriş yapın.";
            } else if (err.code === 'auth/weak-password') {
                msg = "Şifre çok zayıf (en az 6 karakter olmalı).";
            } else if (err.code === 'auth/invalid-email') {
                msg = "Geçersiz e-posta adresi formatı.";
            } else if (err.code === 'auth/operation-not-allowed') {
                msg = "Kayıt işlemi şu an kapalı.";
            }

            showRegisterError(msg);
        });
    }

    function showRegisterError(msg) {
        let errorBox = document.getElementById('register-error-msg');
        // Eğer HTML'de yoksa JS ile oluştur ve formun başına ekle
        if (!errorBox) {
            errorBox = document.createElement('div');
            errorBox.id = 'register-error-msg';
            errorBox.className = 'error-message';
            errorBox.style.display = 'none';
            // Yaş uyarısından hemen sonraya ekleyelim
            const ageWarning = document.getElementById('age-warning');
            if (ageWarning) {
                ageWarning.parentNode.insertBefore(errorBox, ageWarning.nextSibling);
            } else {
                // Yaş uyarısı yoksa formun en başına
                const form = document.getElementById('register-account-form');
                form.insertBefore(errorBox, form.firstChild);
            }
        }
        
        errorBox.textContent = msg;
        errorBox.style.display = 'flex';
        errorBox.classList.add('error-shake');
        setTimeout(() => errorBox.classList.remove('error-shake'), 500);
    }
    
    function handleAddNewPost() { const m = document.getElementById('add-post-modal'); if (m && window.openModal) window.openModal(m); else if(m) m.style.display = 'flex'; }
    function initializeBirthdateSelects() {
        const d=document.getElementById('register-birthday'); if(!d)return; d.innerHTML='<option value="">Gün</option>'; for(let i=1;i<=31;i++){let o=document.createElement('option');o.value=i;o.text=i;d.add(o);}
        const m=document.getElementById('register-birthmonth'); if(m){m.innerHTML='<option value="">Ay</option>';['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].forEach((x,i)=>{let o=document.createElement('option');o.value=i+1;o.text=x;m.add(o);});}
        const y=document.getElementById('register-birthyear'); if(y){y.innerHTML='<option value="">Yıl</option>';for(let i=new Date().getFullYear();i>=1920;i--){let o=document.createElement('option');o.value=i;o.text=i;y.add(o);}}
    }
    window.refreshAccountPosts = function() { const u = JSON.parse(localStorage.getItem('currentUser')); if(u) loadAccountPosts(u.username); };
});
