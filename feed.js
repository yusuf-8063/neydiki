// feed.js - HİBRİT SIRALAMA + AKILLI KAPSAYICI DESTEKLİ (GÜNCEL)
document.addEventListener('DOMContentLoaded', function() {
    console.log("Feed.js: Sistem Başlatıldı - Premium Kalite ve Akıllı Kapsayıcı Aktif");

    const imageFeed = document.getElementById('image-feed');
    const sharePostBtn = document.getElementById('share-post-btn');
    const addPostModal = document.getElementById('add-post-modal');
    const imageUploadArea = document.getElementById('image-upload-area');
    const imagePreview = document.getElementById('image-preview');
    
    let selectedImage = null;
    let openDiscussionIds = new Set(); 

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
                
                // HİBRİT SIRALAMA
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
                commentsContainer.scrollTop = oldScrollTop;
            }
        }
    }

    // --- 5. YENİ KART OLUŞTURUCU (GÜNCELLENDİ) ---
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
            // YENİ YAPI: Bulanık Arka Plan + Orantılı Görsel
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
        return comments.slice().reverse().map(c => {
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

    function sendComment(postId, text) {
        if (!text.trim()) { showNotification('Boş yorum gönderilemez.', 'error'); return; }
        const user = getCurrentUserOrAlert();
        if(!user) return;
        
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

    // --- PAYLAŞIM ---
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

    initFeed();
});
