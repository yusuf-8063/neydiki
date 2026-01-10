// feed.js - KALICI ZOOM, TEK PARMAK GEZİNME VE PINCH DÜZELTMESİ
document.addEventListener('DOMContentLoaded', function() {
    console.log("Feed.js: Sistem Başlatıldı");

    const imageFeed = document.getElementById('image-feed');
    const sharePostBtn = document.getElementById('share-post-btn');
    const addPostModal = document.getElementById('add-post-modal');
    const imageUploadArea = document.getElementById('image-upload-area');
    const imagePreview = document.getElementById('image-preview');
    
    let selectedImage = null;
    let openDiscussionIds = new Set(); 
    let justCommentedPostId = null; // YENİ: Son yorum yapılan gönderi takibi

    // --- GLOBAL DEĞİŞKENLER ---
    let rawPosts = []; 
    let activeFilters = {
        sort: 'newest',
        mediaType: [],
        dateStart: null,
        dateEnd: null,
        search: ''
    };

    // --- YARDIMCI: GÖRSEL SIKIŞTIRMA ---
    function compressImage(base64Str, maxWidth = 1200, maxHeight = 1200) {
        return new Promise((resolve) => {
            let img = new Image();
            img.src = base64Str;
            img.onload = () => {
                let canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8)); 
            };
            img.onerror = (err) => {
                console.error("Görsel işleme hatası:", err);
                resolve(base64Str);
            };
        });
    }

    // --- 1. VERİTABANI BAĞLANTISI ---
    function initFeed() {
        if (!imageFeed || !window.db) return;

        if (imageFeed.children.length === 0) {
            imageFeed.innerHTML = `
                <div class="feed-loading">
                    <div class="feed-spinner"></div>
                    <p>Akış güncelleniyor...</p>
                </div>
            `;
        }

        window.db.collection("posts")
            .orderBy("timestamp", "desc")
            .onSnapshot((snapshot) => {
                rawPosts = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { ...data, id: doc.id };
                });
                renderFilteredFeed();
            }, (error) => {
                console.error("Veri çekme hatası:", error);
                if (imageFeed.querySelector('.feed-loading')) {
                    imageFeed.innerHTML = '<div class="empty-state"><i class="fas fa-wifi"></i><p>Bağlantı sorunu.</p></div>';
                }
            });
    }

    function getPostById(postId) {
        return rawPosts.find(p => p.id === postId);
    }

    // --- 3. AKILLI RENDER MOTORU ---
    function renderFilteredFeed() {
        if (!imageFeed) return;

        let processedPosts = [...rawPosts];
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        // FİLTRELER
        if (activeFilters.search) {
            const term = activeFilters.search;
            processedPosts = processedPosts.filter(post => 
                (post.caption && post.caption.toLowerCase().includes(term)) ||
                (post.username && post.username.toLowerCase().includes(term))
            );
        }

        if (activeFilters.mediaType.length > 0) {
            processedPosts = processedPosts.filter(post => {
                const hasImage = post.imageType !== 'none' && post.image;
                if (activeFilters.mediaType.includes('image') && hasImage) return true;
                if (activeFilters.mediaType.includes('text') && !hasImage) return true;
                return false;
            });
        }

        if (activeFilters.dateStart || activeFilters.dateEnd) {
            processedPosts = processedPosts.filter(post => {
                const postDate = new Date(post.timestamp);
                if (activeFilters.dateStart && postDate < activeFilters.dateStart) return false;
                if (activeFilters.dateEnd) {
                    const endDateFixed = new Date(activeFilters.dateEnd);
                    endDateFixed.setHours(23, 59, 59, 999);
                    if (postDate > endDateFixed) return false;
                }
                return true;
            });
        }

        // --- SIRALAMA GÜNCELLEMESİ ---
        processedPosts.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            const commentsA = a.comments ? a.comments.length : 0;
            const commentsB = b.comments ? b.comments.length : 0;

            switch (activeFilters.sort) {
                case 'oldest': return dateA - dateB;
                case 'most-liked': return likesB - likesA;
                case 'most-commented': return commentsB - commentsA;
                case 'hybrid': 
                    const scoreA = likesA + commentsA;
                    const scoreB = likesB + commentsB;
                    if (scoreB === scoreA) return dateB - dateA;
                    return scoreB - scoreA;
                case 'newest': default: return dateB - dateA;
            }
        });

        // DOM GÜNCELLEME
        const loading = imageFeed.querySelector('.feed-loading');
        if (loading) loading.remove();

        const currentElements = Array.from(imageFeed.children).filter(el => el.classList.contains('image-card'));
        const newIds = processedPosts.map(p => p.id);
        currentElements.forEach(el => {
            if (!newIds.includes(el.dataset.postId)) el.remove();
        });

        if (processedPosts.length === 0) {
            if (!imageFeed.querySelector('.empty-state')) {
                imageFeed.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Sonuç Bulunamadı</h3>
                        <p>Seçtiğiniz filtrelere uygun gönderi yok.</p>
                    </div>`;
            }
            return;
        } else {
            const emptyState = imageFeed.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
        }

        processedPosts.forEach((post, index) => {
            let existingEl = imageFeed.querySelector(`.image-card[data-post-id="${post.id}"]`);

            if (existingEl) {
                updatePostElement(existingEl, post, currentUser);
                const actualIndex = Array.from(imageFeed.children).indexOf(existingEl);
                if (actualIndex !== index) {
                    imageFeed.insertBefore(existingEl, imageFeed.children[index]);
                }
            } else {
                const newEl = createPostElement(post, currentUser);
                if (imageFeed.children[index]) {
                    imageFeed.insertBefore(newEl, imageFeed.children[index]);
                } else {
                    imageFeed.appendChild(newEl);
                }
            }
        });
    }

    // --- 4. KART GÜNCELLEME ---
    function updatePostElement(element, post, currentUser) {
        const isLikedByMe = post.likedBy && currentUser && post.likedBy.includes(currentUser.uid);
        const likeBtn = element.querySelector('.like-post-btn');
        if (likeBtn) {
            const likeIcon = likeBtn.querySelector('i');
            const likeCountSpan = likeBtn.querySelector('span');
            
            if (isLikedByMe) {
                likeBtn.classList.add('active');
                if(likeIcon) likeIcon.className = 'fas fa-heart';
            } else {
                likeBtn.classList.remove('active');
                if(likeIcon) likeIcon.className = 'far fa-heart';
            }
            
            const safeLikeCount = Math.max(0, post.likes || 0);
            if (likeCountSpan && likeCountSpan.textContent !== safeLikeCount.toString()) {
                likeCountSpan.textContent = safeLikeCount;
            }
        }
        
        const avatarEl = element.querySelector('.user-avatar');
        if (avatarEl) {
            avatarEl.style.display = 'flex';
            avatarEl.style.alignItems = 'center';
            avatarEl.style.justifyContent = 'center';
            avatarEl.innerHTML = '';

            let userPic = post.userProfilePic;
            if (currentUser && post.username === currentUser.username) {
                userPic = currentUser.profilePic;
            }

            if (userPic) {
                avatarEl.style.backgroundImage = `url('${userPic}')`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.style.backgroundColor = 'transparent';
            } else {
                avatarEl.style.backgroundImage = 'none';
                avatarEl.style.backgroundColor = '#e1e1e1';
                avatarEl.innerHTML = '<i class="fas fa-user" style="color: #999; font-size: 18px;"></i>';
            }
        }

        const commentCount = post.comments ? post.comments.length : 0;
        const discBtn = element.querySelector('.toggle-comments-btn');
        if (discBtn && !discBtn.innerHTML.includes(`(${commentCount})`)) {
             discBtn.innerHTML = `<i class="far fa-comments"></i> Tartışma (${commentCount})`;
        }

        const commentsList = element.querySelector('.comments-list');
        const commentsContainer = element.querySelector('.comments-container');
        
        if (commentsList && commentsContainer) {
            const oldScrollTop = commentsContainer.scrollTop;
            const newCommentsHTML = renderCommentsHTML(post.comments, currentUser);
            
            if (commentsList.innerHTML !== newCommentsHTML) {
                commentsList.innerHTML = newCommentsHTML;
                
                // YENİ: Eğer bu gönderiye az önce yorum yapıldıysa en alta kaydır
                if (justCommentedPostId === post.id) {
                    commentsContainer.scrollTop = commentsContainer.scrollHeight;
                    justCommentedPostId = null; // İşaretçiyi sıfırla
                } else {
                    commentsContainer.scrollTop = oldScrollTop;
                }
            }
        }
    }

    // --- 5. YENİ KART OLUŞTURUCU ---
    function createPostElement(post, currentUser) {
        const div = document.createElement('div');
        div.className = 'image-card';
        div.setAttribute('data-post-id', post.id);
        
        const isOwnPost = currentUser && currentUser.username === post.username;
        const commentCount = post.comments ? post.comments.length : 0;
        const isLikedByMe = post.likedBy && currentUser && post.likedBy.includes(currentUser.uid);
        const likeClass = isLikedByMe ? 'active' : '';
        const likeIconClass = isLikedByMe ? 'fas' : 'far'; 
        const safeLikes = Math.max(0, post.likes || 0);

        let contentHtml = '';
        if (post.imageType === 'none' || !post.image) {
            contentHtml = `
                <div class="card-image no-image-post" style="padding: 40px 20px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 250px;">
                    <i class="fas fa-quote-left" style="font-size:32px; color:white; margin-bottom:15px; opacity:0.8;"></i>
                    <div style="color:white; font-weight:600; font-size:18px; text-align:center; text-shadow:0 2px 4px rgba(0,0,0,0.1);">Düşünce Paylaşımı</div>
                </div>`;
        } else {
            contentHtml = `
                <div class="post-media-container">
                    <div class="media-blur-bg" style="background-image: url('${post.image}')"></div>
                    <img src="${post.image}" class="card-image" loading="lazy" alt="Gönderi görseli">
                </div>
            `;
        }

        let avatarStyle = 'display: flex; align-items: center; justify-content: center;';
        let avatarContent = '';
        let userPic = post.userProfilePic;
        
        if (isOwnPost && currentUser.profilePic) userPic = currentUser.profilePic;
        
        if (userPic) {
            avatarStyle += `background: url('${userPic}') center/cover no-repeat;`;
        } else {
            avatarStyle += `background: #e1e1e1;`;
            avatarContent = `<i class="fas fa-user" style="color: #999; font-size: 18px;"></i>`;
        }

        div.innerHTML = `
            <div class="card-header">
                <div class="user-avatar" style="${avatarStyle}">${avatarContent}</div>
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
                        <span>${safeLikes}</span>
                    </button>
                </div>
                <button class="discussion-btn toggle-comments-btn">
                    <i class="far fa-comments"></i> Tartışma (${commentCount})
                </button>
            </div>
            <div class="discussion-section" id="discussion-${post.id}">
                <div class="comments-container">
                    <div class="comments-list">
                        ${renderCommentsHTML(post.comments, currentUser)}
                    </div>
                </div>
                <div class="add-comment">
                    <input type="text" class="comment-input" placeholder="Yorumunuzu yazın...">
                    <button class="submit-comment inline-submit-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;

        // --- TAM EKRAN TIKLAMA OLAYI ---
        const postImage = div.querySelector('.card-image');
        if (postImage && post.imageType !== 'none') {
            postImage.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                openFullscreenImage(post.image);
            });
        }
        // -------------------------------

        const delBtn = div.querySelector('.delete-post-btn');
        if(delBtn) delBtn.addEventListener('click', (e) => { e.preventDefault(); deletePost(post.id); });

        const likeBtn = div.querySelector('.like-post-btn');
        if(likeBtn) likeBtn.addEventListener('click', (e) => { e.preventDefault(); togglePostLike(post.id); });

        const discBtn = div.querySelector('.toggle-comments-btn');
        const discSection = div.querySelector('.discussion-section');
        const commentInput = div.querySelector('.comment-input');

        if(openDiscussionIds.has(post.id)) discSection.classList.add('expanded');

        if(discBtn) {
            discBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isExpanded = discSection.classList.contains('expanded');
                if(!isExpanded) {
                    discSection.classList.add('expanded');
                    openDiscussionIds.add(post.id);
                    setTimeout(() => {
                        if(commentInput) commentInput.focus({ preventScroll: true });
                    }, 300);
                } else {
                    discSection.classList.remove('expanded');
                    openDiscussionIds.delete(post.id);
                }
            });
        }

        const sendBtn = div.querySelector('.inline-submit-btn');
        const handleSend = () => { sendComment(post.id, commentInput.value); commentInput.value = ''; };
        if(sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); handleSend(); });
        if(commentInput) commentInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') { e.preventDefault(); handleSend(); } });

        const cList = div.querySelector('.comments-list');
        cList.addEventListener('click', (e) => {
            const delCommentBtn = e.target.closest('.comment-delete-btn');
            if(delCommentBtn) { e.preventDefault(); deleteComment(post.id, delCommentBtn.dataset.id); }

            const likeCommentBtn = e.target.closest('.comment-like-btn');
            if(likeCommentBtn) { e.preventDefault(); toggleCommentLike(post.id, likeCommentBtn.dataset.id); }
        });

        return div;
    }

    function renderCommentsHTML(comments, currentUser) {
        if (!comments || comments.length === 0) return '<div style="text-align:center; color:var(--text-light); font-size:13px; padding:20px;">Henüz yorum yok. İlk yorumu sen yap!</div>';
        
        // Kronolojik sıra için .reverse() kaldırıldı.
        return comments.map(c => {
            const isMyComment = currentUser && currentUser.username === c.username;
            const isLiked = c.likedBy && currentUser && c.likedBy.includes(currentUser.uid);
            const likeClass = isLiked ? 'active' : '';
            const likeIcon = isLiked ? 'fas' : 'far';
            const likeCount = c.likes || 0;

            return `
                <div class="comment-item ${isMyComment ? 'mine' : ''}">
                    <div class="comment-header"><span class="comment-user">${c.username}</span></div>
                    <div class="comment-text">${c.text}</div>
                    <div class="comment-footer">
                        <div class="footer-left">
                            <button class="comment-like-btn ${likeClass}" data-id="${c.id}">
                                <i class="${likeIcon} fa-heart"></i> ${likeCount > 0 ? likeCount : ''}
                            </button>
                        </div>
                        <div class="footer-right">
                            ${isMyComment ? `<button class="comment-delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>` : ''}
                            <span class="comment-time">${timeAgo(c.timestamp)}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    window.updateFeedFilters = function(newFilters) {
        activeFilters = { ...activeFilters, ...newFilters };
        renderFilteredFeed();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.loadImageFeed = function() {
        renderFilteredFeed();
    };

    function togglePostLike(postId) {
        const user = getCurrentUserOrAlert();
        if(!user) return;
        
        const currentPost = getPostById(postId);
        if(!currentPost) return;

        const ref = window.db.collection("posts").doc(postId);
        
        if (currentPost.likedBy && currentPost.likedBy.includes(user.uid)) {
            ref.update({ 
                likes: firebase.firestore.FieldValue.increment(-1), 
                likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid) 
            });
        } else {
            ref.update({ 
                likes: firebase.firestore.FieldValue.increment(1), 
                likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid) 
            });
            showNotification('Gönderi beğenildi', 'success');
        }
    }

    function toggleCommentLike(postId, commentId) {
        const user = getCurrentUserOrAlert();
        if(!user) return;

        const currentPost = getPostById(postId);
        if(!currentPost) return;
        
        let updatedComments = [...currentPost.comments];
        const commentIndex = updatedComments.findIndex(c => c.id === commentId);
        if(commentIndex === -1) return;
        
        let comment = updatedComments[commentIndex];
        
        if(!comment.likedBy) comment.likedBy = [];
        if(!comment.likes) comment.likes = 0;
        
        const isLiked = comment.likedBy.includes(user.uid);
        
        if(isLiked) {
            if (comment.likes > 0) comment.likes--;
            comment.likedBy = comment.likedBy.filter(id => id !== user.uid);
        } else {
            comment.likes++;
            comment.likedBy.push(user.uid);
        }
        
        updatedComments[commentIndex] = comment;
        
        window.db.collection("posts").doc(postId).update({ 
            comments: updatedComments 
        }).catch(err => {
            console.error("Yorum beğeni hatası:", err);
            showNotification('İşlem başarısız.', 'error');
        });
    }

    // YENİ: Yorum gönderildiğinde flag'i işaretle
    function sendComment(postId, text) {
        if (!text.trim()) { showNotification('Boş yorum gönderilemez.', 'error'); return; }
        const user = getCurrentUserOrAlert();
        if(!user) return;
        
        // İşaretçiyi ayarla
        justCommentedPostId = postId;
        
        const newComment = { id: Date.now().toString(), username: user.username, text: text, timestamp: new Date().toISOString(), likes: 0, likedBy: [] };
        window.db.collection("posts").doc(postId).update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) })
            .then(() => showNotification('Yorum gönderildi', 'success'));
    }

    function deleteComment(postId, cId) {
        if(!confirm("Yorumu silmek istiyor musunuz?")) return;
        const currentPost = getPostById(postId);
        if(!currentPost) return;
        const updated = currentPost.comments.filter(c => c.id !== cId);
        window.db.collection("posts").doc(postId).update({ comments: updated });
    }

    function deletePost(postId) {
        if(confirm("Gönderiyi silmek istiyor musunuz?")) {
            window.db.collection("posts").doc(postId).delete().then(() => showNotification('Gönderi silindi', 'success'));
        }
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

    if (sharePostBtn) {
        sharePostBtn.addEventListener('click', () => {
            const caption = document.getElementById('post-caption').value;
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) { showNotification('Giriş yapmalısınız!', 'error'); return; }
            if (!selectedImage && !caption) { showNotification('Görsel veya açıklama ekleyin.', 'error'); return; }

            const newPost = {
                username: user.username, 
                userId: user.uid, 
                caption: caption,
                image: selectedImage, 
                imageType: selectedImage ? 'uploaded' : 'none',
                timestamp: new Date().toISOString(), 
                likes: 0, 
                likedBy: [], 
                comments: [],
                userProfilePic: user.profilePic || null
            };

            sharePostBtn.textContent = 'Paylaşılıyor...';
            sharePostBtn.disabled = true;

            window.db.collection("posts").add(newPost).then(() => {
                if(addPostModal) {
                    addPostModal.style.display = 'none';
                    addPostModal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = 'auto';
                }

                if (typeof window.switchTab === 'function') {
                    window.switchTab('home');
                } else {
                    const homeNav = document.getElementById('home-nav');
                    if (homeNav) homeNav.click();
                }

                document.getElementById('post-caption').value = '';
                selectedImage = null;
                if(imagePreview) imagePreview.style.display = 'none';
                sharePostBtn.textContent = 'Paylaş';
                sharePostBtn.disabled = false;
                showNotification('Paylaşıldı!', 'success');
            }).catch((error) => {
                console.error("Paylaşım hatası:", error);
                showNotification("Bir hata oluştu.", 'error');
                sharePostBtn.textContent = 'Paylaş';
                sharePostBtn.disabled = false;
            });
        });
    }

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file'; 
            input.accept = 'image/*';
            input.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    if(imagePreview) { imagePreview.style.display = 'block'; imagePreview.style.opacity = '0.5'; }
                    reader.onload = (ev) => {
                        compressImage(ev.target.result).then(compressedBase64 => {
                            selectedImage = compressedBase64;
                            if(imagePreview) { imagePreview.style.opacity = '1'; imagePreview.src = compressedBase64; }
                        });
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }

    // --- GELİŞMİŞ TAM EKRAN GÖRSEL & ZOOM SİSTEMİ (INSTAGRAM TARZI AKICILIK) ---
    const fullscreenViewer = document.getElementById('fullscreen-viewer');
    const fullscreenImg = document.getElementById('fullscreen-image');
    const closeFullscreenBtn = document.getElementById('close-fullscreen-btn');
    const fullscreenContainer = document.getElementById('fullscreen-img-container');

    // Zoom Durum Değişkenleri
    let state = {
        scale: 1,
        panning: false,
        pointX: 0,
        pointY: 0,
        startX: 0,
        startY: 0
    };

    // Ayarlar
    const minScale = 1;
    const maxScale = 5;

    function openFullscreenImage(src) {
        if (!fullscreenViewer || !fullscreenImg) return;
        fullscreenImg.src = src;
        
        // YENİ: Arka plan için değişkeni ayarla
        fullscreenViewer.style.setProperty('--fullscreen-bg', `url('${src}')`);
        
        fullscreenViewer.classList.add('active');
        document.body.style.overflow = 'hidden'; 
        resetZoom();
    }

    function closeFullscreenImage() {
        if (!fullscreenViewer) return;
        fullscreenViewer.classList.remove('active');
        document.body.style.overflow = 'auto'; 
        setTimeout(() => { if(fullscreenImg) fullscreenImg.src = ''; }, 300);
    }

    function resetZoom() {
        state = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
        // Resetlerken yumuşak geçişi aç
        if(fullscreenImg) {
            fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            updateTransform();
        }
    }

    function updateTransform() {
        if(fullscreenImg) {
            fullscreenImg.style.transform = `translate(${state.pointX}px, ${state.pointY}px) scale(${state.scale})`;
        }
    }

    // Event Listeners (Kapatma)
    if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFullscreenImage();
        });
    }

    if (fullscreenViewer) {
        fullscreenViewer.addEventListener('click', (e) => {
            if (state.scale === 1 && !state.panning) {
                if (e.target === fullscreenViewer || e.target === fullscreenContainer) {
                    closeFullscreenImage();
                }
            }
        });
    }

    if (fullscreenContainer && fullscreenImg) {
        let lastTap = 0;
        let isPinching = false; // BU DEĞİŞKEN "SNAP-BACK" SORUNUNU ÇÖZER

        fullscreenContainer.addEventListener('touchend', function (e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // Çift Tıklama Mantığı
            // Pinch (kıstırma) işlemi yapmıyorsak ve parmak sayısı 0 ise kontrol et
            if (!isPinching && tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
                e.preventDefault();
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                // İSTEK: Çift tıklama sıfırlama işlevi görsün
                if (state.scale > 1) {
                    resetZoom();
                } else {
                    state.scale = 2;
                    state.pointX = 0;
                    state.pointY = 0;
                    updateTransform();
                }
            }

            if (e.touches.length === 0) {
                state.panning = false;
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                
                // Kalıcı Zoom Mantığı
                // Sadece resim normalden küçükse resetle, yoksa olduğu gibi bırak
                if (state.scale < 1) {
                    resetZoom();
                }
                
                // Pinch işlemi bitti, flag'i kapat (Double tap kilidini açma ama lastTap güncelleme)
                if (isPinching) {
                    isPinching = false;
                    return; // Pinch sonrası hemen çift tıklama algılanmasın
                }
            }
            lastTap = currentTime;
        });

        // Masaüstü Çift Tıklama
        fullscreenContainer.addEventListener('dblclick', (e) => {
            fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            if (state.scale > 1) {
                resetZoom();
            } else {
                state.scale = 2;
                updateTransform();
            }
        });

        // --- 2. Dokunmatik Hareketler (Pinch & Pan) - Mobil ---
        let initialPinchDistance = 0;
        let initialScale = 1;
        let initialPinchCenter = { x: 0, y: 0 };
        let initialPoint = { x: 0, y: 0 };

        fullscreenContainer.addEventListener('touchstart', (e) => {
            fullscreenImg.style.transition = 'none';

            if (e.touches.length === 2) {
                isPinching = true; // Pinch başladı
                state.panning = false;
                initialPinchDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                initialScale = state.scale;
                
                initialPinchCenter = {
                    x: (e.touches[0].pageX + e.touches[1].pageX) / 2,
                    y: (e.touches[0].pageY + e.touches[1].pageY) / 2
                };
                initialPoint = { x: state.pointX, y: state.pointY };
                
            } else if (e.touches.length === 1) {
                // Pan (1 parmak - Zoom varsa veya normal durumda)
                state.panning = true;
                state.startX = e.touches[0].pageX - state.pointX;
                state.startY = e.touches[0].pageY - state.pointY;
            }
        });

        fullscreenContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 2) {
                // Pinch & Pan (2 parmakla hem zoom hem kaydırma)
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                
                const currentCenter = {
                    x: (e.touches[0].pageX + e.touches[1].pageX) / 2,
                    y: (e.touches[0].pageY + e.touches[1].pageY) / 2
                };

                if (initialPinchDistance > 0) {
                    const diff = currentDistance / initialPinchDistance;
                    let newScale = initialScale * diff;
                    newScale = Math.min(Math.max(minScale, newScale), maxScale);
                    state.scale = newScale;
                    
                    const dx = currentCenter.x - initialPinchCenter.x;
                    const dy = currentCenter.y - initialPinchCenter.y;
                    
                    state.pointX = initialPoint.x + dx;
                    state.pointY = initialPoint.y + dy;

                    updateTransform();
                }
            } else if (e.touches.length === 1 && state.panning && state.scale > 1) {
                // Tek parmakla hareket (Sadece zoom yapılmışsa çalışır)
                // Kalıcı zoom sayesinde parmak çekilse bile scale > 1 kalacağı için bu çalışır
                state.pointX = e.touches[0].pageX - state.startX;
                state.pointY = e.touches[0].pageY - state.startY;
                updateTransform();
            }
        });

        // --- 3. Mouse Tekerleği (Wheel) ile Zoom ---
        fullscreenContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            fullscreenImg.style.transition = 'none';

            const zoomFactor = 0.1;
            const direction = e.deltaY < 0 ? 1 : -1;
            let newScale = state.scale + (direction * zoomFactor * state.scale);

            newScale = Math.min(Math.max(minScale, newScale), maxScale);

            if (newScale <= 1) {
                resetZoom();
            } else {
                state.scale = newScale;
                updateTransform();
            }
        }, { passive: false });

        // --- 4. Mouse Sürükleme (Pan) ---
        let isMouseDown = false;

        fullscreenContainer.addEventListener('mousedown', (e) => {
            if (state.scale > 1) {
                e.preventDefault();
                fullscreenImg.style.transition = 'none';
                isMouseDown = true;
                state.startX = e.clientX - state.pointX;
                state.startY = e.clientY - state.pointY;
                fullscreenContainer.style.cursor = 'grabbing';
            }
        });

        fullscreenContainer.addEventListener('mousemove', (e) => {
            if (isMouseDown && state.scale > 1) {
                e.preventDefault();
                state.pointX = e.clientX - state.startX;
                state.pointY = e.clientY - state.startY;
                updateTransform();
            }
        });

        const stopDrag = () => {
            if (isMouseDown) {
                isMouseDown = false;
                fullscreenContainer.style.cursor = 'default';
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
        };

        fullscreenContainer.addEventListener('mouseup', stopDrag);
        fullscreenContainer.addEventListener('mouseleave', stopDrag);
    }

    initFeed();
});
