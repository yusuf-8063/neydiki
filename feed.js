// feed.js - TAM VE GÜNCEL SÜRÜM
document.addEventListener('DOMContentLoaded', function() {
    console.log("Feed.js: Sistem Başlatıldı.");

    const imageFeed = document.getElementById('image-feed');
    const sharePostBtn = document.getElementById('share-post-btn');
    const addPostModal = document.getElementById('add-post-modal');
    const imageUploadArea = document.getElementById('image-upload-area');
    const imagePreview = document.getElementById('image-preview');
    
    let selectedImage = null;
    let openDiscussionIds = new Set(); 

    // --- 1. GÖNDERİLERİ ÇEK ---
    function loadImageFeed() {
        if (!imageFeed || !window.db) return;

        window.db.collection("posts")
            .orderBy("timestamp", "desc")
            .onSnapshot((snapshot) => {
                imageFeed.innerHTML = ''; 
                if (snapshot.empty) {
                    imageFeed.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-camera-retro"></i>
                            <h3>Henüz gönderi yok.</h3>
                            <p>İlk gönderiyi sen paylaş!</p>
                        </div>`;
                    return;
                }
                snapshot.forEach((doc) => {
                    const post = doc.data();
                    post.id = doc.id;
                    imageFeed.appendChild(createPostElement(post));
                });
                
                restoreOpenDiscussions();
            });
    }

    // --- 2. GÖNDERİ KARTI OLUŞTUR ---
    function createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'image-card';
        div.setAttribute('data-post-id', post.id);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isOwnPost = currentUser && currentUser.username === post.username;
        const commentCount = post.comments ? post.comments.length : 0;
        
        const isLikedByMe = post.likedBy && post.likedBy.includes(currentUser?.uid);
        const likeClass = isLikedByMe ? 'active' : '';
        const likeIconClass = isLikedByMe ? 'fas' : 'far'; 

        // GÖRSEL AYARLARI
        let contentHtml = '';
        if (post.imageType === 'none' || !post.image) {
            // Görsel yoksa (Sadece yazı)
            contentHtml = `
                <div class="card-image no-image-post" style="padding: 40px 20px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 250px;">
                    <i class="fas fa-quote-left" style="font-size:32px; color:white; margin-bottom:15px; opacity:0.8;"></i>
                    <div style="color:white; font-weight:600; font-size:18px; text-align:center; text-shadow:0 2px 4px rgba(0,0,0,0.1);">Düşünce Paylaşımı</div>
                </div>`;
        } else {
            // Görsel varsa (Tamamen temiz, CSS ile kontrol ediliyor)
            contentHtml = `<img src="${post.image}" class="card-image" loading="lazy" alt="Gönderi görseli">`;
        }

        // Avatar Rengi
        const hue = (post.username.length * 30) % 360;
        const avatarGradient = `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue + 30}, 70%, 60%))`;

        div.innerHTML = `
            <div class="card-header">
                <div class="user-avatar" style="background: ${avatarGradient};"></div>
                <div class="user-info">
                    <div class="username">${post.username || 'Anonim'}</div>
                    <div class="post-time">${timeAgo(post.timestamp)}</div>
                </div>
                ${isOwnPost ? `<button class="delete-post-btn"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            
            ${contentHtml}
            
            <div class="card-content">
                <p><strong>${post.username}</strong> ${post.caption || ''}</p>
            </div>
            
            <div class="image-actions">
                <div class="action-left">
                    <button class="action-btn like-post-btn ${likeClass}">
                        <i class="${likeIconClass} fa-heart"></i> 
                        <span>${post.likes || 0}</span>
                    </button>
                    
                    <button class="discussion-btn toggle-comments-btn">
                        <i class="far fa-comments"></i> Tartışma (${commentCount})
                    </button>
                </div>
            </div>

            <div class="discussion-section" id="discussion-${post.id}" style="display:none;">
                <div class="comments-container">
                    <div class="comments-list">
                        ${renderCommentsHTML(post.comments, currentUser)}
                    </div>
                </div>

                <div class="add-comment">
                    <input type="text" class="comment-input" placeholder="Yorumunuzu yazın...">
                    <button class="submit-comment inline-submit-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // --- Event Listeners ---
        const delBtn = div.querySelector('.delete-post-btn');
        if(delBtn) delBtn.addEventListener('click', () => deletePost(post.id));

        const likeBtn = div.querySelector('.like-post-btn');
        if(likeBtn) likeBtn.addEventListener('click', () => togglePostLike(post));

        const discBtn = div.querySelector('.toggle-comments-btn');
        const discSection = div.querySelector('.discussion-section');
        const commentInput = div.querySelector('.comment-input');

        if(discBtn) {
            discBtn.addEventListener('click', () => {
                const isHidden = discSection.style.display === 'none';
                if(isHidden) {
                    discSection.style.display = 'block';
                    discSection.classList.add('expanded');
                    openDiscussionIds.add(post.id);
                    setTimeout(() => commentInput.focus(), 100);
                } else {
                    discSection.style.display = 'none';
                    discSection.classList.remove('expanded');
                    openDiscussionIds.delete(post.id);
                }
            });
        }

        const sendBtn = div.querySelector('.inline-submit-btn');
        const handleSend = () => { sendComment(post.id, commentInput.value); commentInput.value = ''; };
        if(sendBtn) sendBtn.addEventListener('click', handleSend);
        if(commentInput) commentInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });

        // Yorum işlemleri delegation
        const cList = div.querySelector('.comments-list');
        cList.addEventListener('click', (e) => {
            const delCommentBtn = e.target.closest('.comment-delete-btn');
            if(delCommentBtn) deleteComment(post, delCommentBtn.dataset.id);
            
            const likeCommentBtn = e.target.closest('.comment-like-btn');
            if(likeCommentBtn) toggleCommentLike(post, likeCommentBtn.dataset.id);
        });

        return div;
    }

    // --- 3. HTML OLUŞTURUCULAR ---
    function renderCommentsHTML(comments, currentUser) {
        if (!comments || comments.length === 0) {
            return '<div style="text-align:center; color:var(--text-light); font-size:13px; padding:20px;">Henüz yorum yok. İlk yorumu sen yap!</div>';
        }

        return comments.slice().reverse().map(c => {
            const isMyComment = currentUser && currentUser.username === c.username;
            const isLikedByMe = c.likedBy && c.likedBy.includes(currentUser?.uid);
            const likeClass = isLikedByMe ? 'active' : '';
            const heartIcon = isLikedByMe ? 'fas' : 'far';

            return `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-user">${c.username}</span>
                        <span class="comment-time">${timeAgo(c.timestamp)}</span>
                    </div>
                    <div class="comment-text">${c.text}</div>
                    <div class="comment-actions">
                        <button class="comment-like-btn ${likeClass}" data-id="${c.id}">
                            <i class="${heartIcon} fa-heart"></i> ${c.likes || 0}
                        </button>
                        ${isMyComment ? `<button class="comment-delete-btn" data-id="${c.id}"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- 4. VERİTABANI İŞLEMLERİ ---
    function togglePostLike(post) {
        const user = getCurrentUserOrAlert();
        if(!user) return;
        const ref = window.db.collection("posts").doc(post.id);
        const isLiked = post.likedBy && post.likedBy.includes(user.uid);
        if (isLiked) {
            ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid) });
        } else {
            ref.update({ likes: firebase.firestore.FieldValue.increment(1), likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            showNotification('Gönderi beğenildi', 'success');
        }
    }

    function toggleCommentLike(post, cId) {
        const user = getCurrentUserOrAlert();
        if(!user) return;
        const ref = window.db.collection("posts").doc(post.id);
        const comments = post.comments || [];
        const updated = comments.map(c => {
            if(c.id === cId) {
                const likedBy = c.likedBy || [];
                if(likedBy.includes(user.uid)) { c.likes--; c.likedBy = likedBy.filter(u => u !== user.uid); }
                else { c.likes++; if(!c.likedBy) c.likedBy=[]; c.likedBy.push(user.uid); }
            }
            return c;
        });
        ref.update({ comments: updated });
    }

    function sendComment(postId, text) {
        if (!text.trim()) { showNotification('Boş yorum gönderilemez.', 'error'); return; }
        const user = getCurrentUserOrAlert();
        if(!user) return;
        const newComment = { id: Date.now().toString(), username: user.username, text: text, timestamp: new Date().toISOString(), likes: 0, likedBy: [] };
        window.db.collection("posts").doc(postId).update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) })
            .then(() => showNotification('Yorum gönderildi', 'success'));
    }

    function deleteComment(post, cId) {
        if(!confirm("Yorumu silmek istiyor musunuz?")) return;
        const updated = post.comments.filter(c => c.id !== cId);
        window.db.collection("posts").doc(post.id).update({ comments: updated });
    }

    function deletePost(postId) {
        if(confirm("Gönderiyi silmek istiyor musunuz?")) {
            window.db.collection("posts").doc(postId).delete()
                .then(() => showNotification('Gönderi silindi', 'success'));
        }
    }

    function restoreOpenDiscussions() {
        openDiscussionIds.forEach(id => {
            const el = document.getElementById(`discussion-${id}`);
            if(el) { 
                el.style.display = 'block'; 
                el.classList.add('expanded');
                // Scroll'u en alta indir
                const container = el.querySelector('.comments-container');
                if(container) container.scrollTop = container.scrollHeight;
            }
        });
    }

    function timeAgo(date) {
        const s = Math.floor((new Date() - new Date(date)) / 1000);
        if (s < 60) return "Az önce";
        if (s < 3600) return Math.floor(s/60) + "dk";
        if (s < 86400) return Math.floor(s/3600) + "sa";
        return Math.floor(s/86400) + "g";
    }

    function getCurrentUserOrAlert() {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if(!user) { showNotification('Lütfen giriş yapın.', 'error'); return null; }
        return user;
    }

    // Paylaşım İşlemleri
    if (sharePostBtn) {
        sharePostBtn.addEventListener('click', () => {
            const caption = document.getElementById('post-caption').value;
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) { showNotification('Giriş yapmalısınız!', 'error'); return; }
            if (!selectedImage && !caption) { showNotification('Görsel veya açıklama ekleyin.', 'error'); return; }

            const newPost = {
                username: user.username, userId: user.uid, caption: caption,
                image: selectedImage, imageType: selectedImage ? 'uploaded' : 'none',
                timestamp: new Date().toISOString(), likes: 0, likedBy: [], comments: []
            };

            sharePostBtn.textContent = 'Paylaşılıyor...';
            sharePostBtn.disabled = true;

            window.db.collection("posts").add(newPost).then(() => {
                closeModal(addPostModal);
                document.getElementById('post-caption').value = '';
                selectedImage = null;
                if(imagePreview) imagePreview.style.display = 'none';
                sharePostBtn.textContent = 'Paylaş';
                sharePostBtn.disabled = false;
                showNotification('Paylaşıldı!', 'success');
            });
        });
    }

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        selectedImage = ev.target.result;
                        if(imagePreview) { imagePreview.src = selectedImage; imagePreview.style.display = 'block'; }
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            };
            input.click();
        });
    }

    loadImageFeed();
});
