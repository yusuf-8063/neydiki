// feed.js - GÜNCELLENMİŞ VERSİYON (WebP Otomatik Dönüşüm + Klavye Düzeltmesi)
document.addEventListener('DOMContentLoaded', function() {
    console.log("Feed.js: Optimize Edilmiş Sürüm (Lazy Comments + Read More/Less + Auto Scroll + Accessibility + WebP + Keyboard Fix)");

    // --- DİNAMİK CSS STİLLERİ (Yorum Kısaltma İçin) ---
    const style = document.createElement('style');
    style.textContent = `
        .comment-text.collapsed {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .read-more-btn {
            background: none;
            border: none;
            color: var(--text-light);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
            margin-top: 2px;
            display: inline-block;
        }
        .read-more-btn:hover { text-decoration: underline; color: var(--primary); }
    `;
    document.head.appendChild(style);

    const imageFeed = document.getElementById('image-feed');
    const sharePostBtn = document.getElementById('share-post-btn');
    const addPostModal = document.getElementById('add-post-modal');
    const imageUploadArea = document.getElementById('image-upload-area');
    const imagePreview = document.getElementById('image-preview');
    
    // --- STATE MANAGEMENT ---
    let rawPosts = [];          
    let lastVisibleDoc = null;  
    let isFetching = false;     
    let isAllFetched = false;   
    let feedObserver = null;    
    let viewMode = 'paginated'; 

    let selectedImage = null;
    let openDiscussionIds = new Set(); 
    
    let activeFilters = {
        sort: 'newest',
        mediaType: [],
        dateStart: null,
        dateEnd: null,
        search: ''
    };

    // --- RESİM SIKIŞTIRMA VE WEBP DÖNÜŞTÜRME ---
    function compressImage(base64Str, maxWidth = 1200, maxHeight = 1200) {
        return new Promise((resolve) => {
            let img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(img, 0, 0, width, height);
                // GÜNCELLEME: Çıktı formatı WebP olarak ayarlandı
                resolve(canvas.toDataURL('image/webp', 0.8)); 
            };
            img.onerror = () => resolve(base64Str);
        });
    }

    // --- 1. BAŞLATMA ---
    function initFeed() {
        if (!imageFeed || !window.db) return;

        imageFeed.innerHTML = `
            <div class="feed-loading" id="initial-loader">
                <div class="feed-spinner"></div>
                <p>Akış güncelleniyor...</p>
            </div>
        `;

        fetchPosts(true);
    }

    // --- 2. SENTINEL (Scroll Gözlemcisi) ---
    function createSentinel() {
        const oldSentinel = document.getElementById('feed-sentinel');
        if (oldSentinel) oldSentinel.remove();

        const sentinel = document.createElement('div');
        sentinel.id = 'feed-sentinel';
        sentinel.innerHTML = '<div class="feed-spinner small"></div>'; 
        imageFeed.appendChild(sentinel);

        const options = {
            root: null,
            rootMargin: '400px',
            threshold: 0.1
        };

        feedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isFetching && !isAllFetched && viewMode === 'paginated') {
                    fetchPosts(false);
                }
            });
        }, options);

        feedObserver.observe(sentinel);
    }

    // --- 3. VERİ ÇEKME MOTORU ---
    async function fetchPosts(isInitial = false) {
        if (isFetching) return;
        isFetching = true;

        const sentinel = document.getElementById('feed-sentinel');
        if (sentinel) sentinel.style.opacity = '1';

        try {
            let query = window.db.collection("posts").orderBy("timestamp", "desc");

            if (viewMode === 'paginated') {
                query = query.limit(5);
                if (!isInitial && lastVisibleDoc) {
                    query = query.startAfter(lastVisibleDoc);
                }
            }

            const snapshot = await query.get();

            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) initialLoader.remove();

            if (snapshot.empty) {
                isAllFetched = true;
                if (sentinel) sentinel.style.display = 'none';
                
                if (isInitial && rawPosts.length === 0) {
                    imageFeed.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-camera" aria-hidden="true"></i>
                            <h3>Akış Boş</h3>
                            <p>İlk gönderiyi sen paylaş!</p>
                        </div>`;
                }
                isFetching = false;
                return;
            }

            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            const newPosts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            if (isInitial) {
                rawPosts = newPosts;
                createSentinel(); 
            } else {
                const existingIds = new Set(rawPosts.map(p => p.id));
                const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                rawPosts = [...rawPosts, ...uniqueNewPosts];
            }

            renderBatch(isInitial ? rawPosts : newPosts, isInitial);
            
        } catch (error) {
            console.error("Veri hatası:", error);
            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) initialLoader.remove();
            if (typeof showNotification === 'function') showNotification('Veriler yüklenemedi.', 'error');
        } finally {
            isFetching = false;
            if (sentinel) sentinel.style.opacity = '0';
        }
    }

    function renderBatch(postsToRender, clearContainer = false) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const sentinel = document.getElementById('feed-sentinel');
        const fragment = document.createDocumentFragment();

        postsToRender.forEach((post, index) => {
            if (!checkPostFilter(post)) return;
            // İlk 2 post hemen yüklensin (eager), diğerleri lazy
            const isPriority = clearContainer && index < 2; 
            const el = createPostElement(post, currentUser, isPriority);
            fragment.appendChild(el);
        });

        if (clearContainer) {
            Array.from(imageFeed.children).forEach(child => {
                if (child.id !== 'feed-sentinel') child.remove();
            });
        }

        if (sentinel) {
            imageFeed.insertBefore(fragment, sentinel);
        } else {
            imageFeed.appendChild(fragment);
        }
    }

    function checkPostFilter(post) {
        if (activeFilters.search) {
            const term = activeFilters.search.toLowerCase();
            const textMatch = (post.caption && post.caption.toLowerCase().includes(term)) ||
                              (post.username && post.username.toLowerCase().includes(term));
            if (!textMatch) return false;
        }
        if (activeFilters.mediaType.length > 0) {
            const hasImage = post.imageType !== 'none' && post.image;
            if (activeFilters.mediaType.includes('image') && !hasImage) return false;
            if (activeFilters.mediaType.includes('text') && hasImage) return false;
        }
        if (activeFilters.dateStart || activeFilters.dateEnd) {
            const postDate = new Date(post.timestamp);
            if (activeFilters.dateStart && postDate < activeFilters.dateStart) return false;
            if (activeFilters.dateEnd) {
                const endDateFixed = new Date(activeFilters.dateEnd);
                endDateFixed.setHours(23, 59, 59, 999);
                if (postDate > endDateFixed) return false;
            }
        }
        return true;
    }

    window.updateFeedFilters = async function(newFilters) {
        activeFilters = { ...activeFilters, ...newFilters };
        const requiresFullData = activeFilters.search !== '' || 
                                 activeFilters.sort === 'most-liked' || 
                                 activeFilters.sort === 'most-commented' ||
                                 activeFilters.sort === 'oldest';

        imageFeed.innerHTML = `
            <div class="feed-loading">
                <div class="feed-spinner"></div>
                <p>Sonuçlar filtreleniyor...</p>
            </div>
        `;

        if (requiresFullData && viewMode === 'paginated') {
            viewMode = 'all';
            const snapshot = await window.db.collection("posts").orderBy("timestamp", "desc").get();
            rawPosts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            isAllFetched = true;
        }

        sortAndRenderAll();
    };

    function sortAndRenderAll() {
        let processed = rawPosts.filter(checkPostFilter);

        processed.sort((a, b) => {
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
                    return scoreB - scoreA;
                case 'newest': default: return dateB - dateA;
            }
        });

        imageFeed.innerHTML = ''; 
        const sentinel = document.getElementById('feed-sentinel');
        if(sentinel) sentinel.remove(); 

        if (processed.length === 0) {
            imageFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <h3>Sonuç Bulunamadı</h3>
                    <p>Filtrelerinize uygun gönderi yok.</p>
                </div>`;
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const fragment = document.createDocumentFragment();
        
        processed.forEach((post, index) => {
            const isPriority = index < 2;
            fragment.appendChild(createPostElement(post, currentUser, isPriority));
        });

        imageFeed.appendChild(fragment);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function createPostElement(post, currentUser, isPriority = false) {
        const div = document.createElement('div');
        div.className = 'image-card';
        div.setAttribute('data-post-id', post.id);
        div.style.animation = "fadeInUp 0.5s ease backwards";
        
        const isOwnPost = currentUser && currentUser.username === post.username;
        const commentCount = post.comments ? post.comments.length : 0;
        const isLikedByMe = post.likedBy && currentUser && post.likedBy.includes(currentUser.uid);
        const likeClass = isLikedByMe ? 'active' : '';
        const likeIconClass = isLikedByMe ? 'fas' : 'far'; 
        const safeLikes = Math.max(0, post.likes || 0);

        // Görsel Yükleme Stratejisi
        let contentHtml = '';
        if (post.imageType === 'none' || !post.image) {
            contentHtml = `
                <div class="card-image no-image-post" style="padding: 40px 20px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 250px;">
                    <i class="fas fa-quote-left" style="font-size:32px; color:white; margin-bottom:15px; opacity:0.8;" aria-hidden="true"></i>
                    <div style="color:white; font-weight:600; font-size:18px; text-align:center; text-shadow:0 2px 4px rgba(0,0,0,0.1);">Düşünce Paylaşımı</div>
                </div>`;
        } else {
            contentHtml = `
                <div class="post-media-container">
                    <div class="media-blur-bg" style="background-image: url('${post.image}')"></div>
                    <img src="${post.image}" class="card-image" loading="${isPriority ? 'eager' : 'lazy'}" decoding="async" alt="Gönderi resmi: ${post.caption || 'Başlıksız'}">
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
            avatarContent = `<i class="fas fa-user" style="color: #999; font-size: 18px;" aria-hidden="true"></i>`;
        }

        // HTML Güncellemesi: aria-label ve input fixleri
        div.innerHTML = `
            <div class="card-header">
                <div class="user-avatar" style="${avatarStyle}" aria-label="${post.username} profil resmi">${avatarContent}</div>
                <div class="user-info">
                    <div class="username">${post.username || 'Anonim'}</div>
                    <div class="post-time">${timeAgo(post.timestamp)}</div>
                </div>
                ${isOwnPost ? `<button class="delete-post-btn" aria-label="Gönderiyi sil"><i class="fas fa-trash" aria-hidden="true"></i></button>` : ''}
            </div>
            ${contentHtml}
            <div class="card-content">
                <p><strong>${post.username}</strong> ${post.caption || ''}</p>
            </div>
            <div class="image-actions">
                <div class="action-left">
                    <button class="action-btn like-post-btn ${likeClass}" aria-label="Beğen">
                        <i class="${likeIconClass} fa-heart" aria-hidden="true"></i> 
                        <span>${safeLikes}</span>
                    </button>
                </div>
                <button class="discussion-btn toggle-comments-btn" aria-label="Yorumları göster">
                    <i class="far fa-comments" aria-hidden="true"></i> Tartışma (${commentCount})
                </button>
            </div>
            <div class="discussion-section" id="discussion-${post.id}">
                <div class="comments-container">
                    <div class="comments-list" data-loaded="false"></div>
                </div>
                <div class="add-comment">
                    <input 
                        type="text" 
                        class="comment-input" 
                        name="comment_field_${post.id}" 
                        placeholder="Yorumunuzu yazın..." 
                        aria-label="Yorum yaz"
                        autocomplete="off" 
                        autocorrect="off" 
                        autocapitalize="off" 
                        spellcheck="false"
                    >
                    <button class="submit-comment inline-submit-btn" aria-label="Yorum gönder"><i class="fas fa-paper-plane" aria-hidden="true"></i></button>
                </div>
            </div>
        `;

        const postImage = div.querySelector('.card-image');
        if (postImage && post.imageType !== 'none') {
            postImage.addEventListener('click', (e) => {
                e.stopPropagation(); e.preventDefault(); openFullscreenImage(post.image);
            });
        }
        
        const delBtn = div.querySelector('.delete-post-btn');
        if(delBtn) delBtn.addEventListener('click', (e) => { e.preventDefault(); deletePost(post.id); });
        
        const likeBtn = div.querySelector('.like-post-btn');
        if(likeBtn) likeBtn.addEventListener('click', (e) => { e.preventDefault(); togglePostLike(post.id); });
        
        const discBtn = div.querySelector('.toggle-comments-btn');
        const discSection = div.querySelector('.discussion-section');
        const commentInput = div.querySelector('.comment-input');
        const commentsListEl = div.querySelector('.comments-list');

        // Eğer bir post önceden açıksa (refresh vb.) render et ve aç
        if(openDiscussionIds.has(post.id)) {
            commentsListEl.innerHTML = renderCommentsHTML(post.comments, currentUser);
            commentsListEl.setAttribute('data-loaded', 'true');
            discSection.classList.add('expanded');
        }

        if(discBtn) {
            discBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isExpanded = discSection.classList.contains('expanded');
                
                if(!isExpanded) {
                    // LAZY RENDERING: Sadece açılınca ve eğer daha önce yüklenmemişse render et
                    if (commentsListEl.getAttribute('data-loaded') === 'false') {
                        commentsListEl.innerHTML = renderCommentsHTML(post.comments, currentUser);
                        commentsListEl.setAttribute('data-loaded', 'true');
                    }
                    
                    discSection.classList.add('expanded'); 
                    openDiscussionIds.add(post.id);

                    // AÇILDIĞINDA EN AŞAĞI KAYDIR
                    const scrollContainer = div.querySelector('.comments-container');
                    if(scrollContainer) {
                        setTimeout(() => {
                            scrollContainer.scrollTop = scrollContainer.scrollHeight;
                        }, 100); 
                    }
                    
                    setTimeout(() => { if(commentInput) commentInput.focus({ preventScroll: true }); }, 300);
                } else {
                    discSection.classList.remove('expanded'); 
                    openDiscussionIds.delete(post.id);
                }
            });
        }
        
        const sendBtn = div.querySelector('.inline-submit-btn');
        const handleSend = () => { 
            sendComment(post.id, commentInput.value); 
            commentInput.value = ''; 
            commentsListEl.setAttribute('data-loaded', 'true');
        };
        
        if(sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); handleSend(); });
        if(commentInput) commentInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') { e.preventDefault(); handleSend(); } });

        // Event Delegation (Yorum içi tıklamalar: silme, beğenme, devamını oku)
        commentsListEl.addEventListener('click', (e) => {
            // Silme Butonu
            const delCommentBtn = e.target.closest('.comment-delete-btn');
            if(delCommentBtn) { e.preventDefault(); deleteComment(post.id, delCommentBtn.dataset.id); }
            
            // Beğeni Butonu
            const likeCommentBtn = e.target.closest('.comment-like-btn');
            if(likeCommentBtn) { e.preventDefault(); toggleCommentLike(post.id, likeCommentBtn.dataset.id); }

            // Devamını Oku / Daha Az Butonu
            if(e.target.classList.contains('read-more-btn')) {
                e.preventDefault();
                const container = e.target.previousElementSibling; // .comment-text
                if(container && container.classList.contains('comment-text')) {
                    if (container.classList.contains('collapsed')) {
                        // Açılıyor
                        container.classList.remove('collapsed');
                        e.target.textContent = 'Daha az';
                    } else {
                        // Kapanıyor
                        container.classList.add('collapsed');
                        e.target.textContent = 'Devamını oku';
                    }
                }
            }
        });

        return div;
    }

    // --- YENİ YORUM RENDER FONKSİYONU ---
    function renderCommentsHTML(comments, currentUser) {
        if (!comments || comments.length === 0) return '<div style="text-align:center; color:var(--text-light); font-size:13px; padding:20px;">Henüz yorum yok. İlk yorumu sen yap!</div>';
        
        return comments.map(c => {
            const isMyComment = currentUser && currentUser.username === c.username;
            const isLiked = c.likedBy && currentUser && c.likedBy.includes(currentUser.uid);
            const likeClass = isLiked ? 'active' : '';
            const likeIcon = isLiked ? 'fas' : 'far';
            const likeCount = c.likes || 0;
            
            // Metin uzunluk kontrolü
            const isLongText = c.text && c.text.length > 120; // 120 karakter üstü uzun sayılır
            const textClass = isLongText ? 'comment-text collapsed' : 'comment-text';
            // Başlangıçta 'Devamını oku' butonu
            const readMoreBtn = isLongText ? '<button class="read-more-btn" aria-label="Yorumun devamını oku">Devamını oku</button>' : '';

            return `
                <div class="comment-item ${isMyComment ? 'mine' : ''}">
                    <div class="comment-header"><span class="comment-user">${c.username}</span></div>
                    
                    <div class="${textClass}">${c.text}</div>
                    ${readMoreBtn}
                    
                    <div class="comment-footer">
                        <div class="footer-left"><button class="comment-like-btn ${likeClass}" data-id="${c.id}" aria-label="Yorumu beğen"><i class="${likeIcon} fa-heart" aria-hidden="true"></i> ${likeCount > 0 ? likeCount : ''}</button></div>
                        <div class="footer-right">${isMyComment ? `<button class="comment-delete-btn" data-id="${c.id}" aria-label="Yorumu sil"><i class="fas fa-trash" aria-hidden="true"></i></button>` : ''}<span class="comment-time">${timeAgo(c.timestamp)}</span></div>
                    </div>
                </div>`;
        }).join('');
    }

    function togglePostLike(postId) {
        const user = getCurrentUserOrAlert(); if(!user) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        if(card) {
            const btn = card.querySelector('.like-post-btn'); const span = btn.querySelector('span'); const icon = btn.querySelector('i');
            let cnt = parseInt(span.textContent) || 0;
            if(btn.classList.contains('active')) { btn.classList.remove('active'); icon.className = 'far fa-heart'; span.textContent = Math.max(0, cnt - 1); }
            else { btn.classList.add('active'); icon.className = 'fas fa-heart'; span.textContent = cnt + 1; }
        }
        const ref = window.db.collection("posts").doc(postId);
        if (currentPost.likedBy && currentPost.likedBy.includes(user.uid)) {
            ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid) });
            currentPost.likedBy = currentPost.likedBy.filter(u => u !== user.uid); currentPost.likes--;
        } else {
            ref.update({ likes: firebase.firestore.FieldValue.increment(1), likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            if(!currentPost.likedBy) currentPost.likedBy = []; currentPost.likedBy.push(user.uid); currentPost.likes++;
        }
    }

    function toggleCommentLike(postId, commentId) {
        const user = getCurrentUserOrAlert(); if(!user) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        let updatedComments = [...currentPost.comments];
        const commentIndex = updatedComments.findIndex(c => c.id === commentId); if(commentIndex === -1) return;
        let comment = updatedComments[commentIndex];
        if(!comment.likedBy) comment.likedBy = []; if(!comment.likes) comment.likes = 0;
        const isLiked = comment.likedBy.includes(user.uid);
        if(isLiked) { if (comment.likes > 0) comment.likes--; comment.likedBy = comment.likedBy.filter(id => id !== user.uid); }
        else { comment.likes++; comment.likedBy.push(user.uid); }
        updatedComments[commentIndex] = comment;
        
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        if(card) {
             const cBtn = card.querySelector(`.comment-like-btn[data-id="${commentId}"]`);
             if(cBtn) { cBtn.innerHTML = `<i class="${!isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i> ${comment.likes > 0 ? comment.likes : ''}`; cBtn.classList.toggle('active'); }
        }
        window.db.collection("posts").doc(postId).update({ comments: updatedComments });
    }

    function sendComment(postId, text) {
        if (!text.trim()) { if(typeof showNotification==='function') showNotification('Boş yorum gönderilemez.', 'error'); return; }
        const user = getCurrentUserOrAlert(); if(!user) return;
        const newComment = { id: Date.now().toString(), username: user.username, text: text, timestamp: new Date().toISOString(), likes: 0, likedBy: [] };
        const post = rawPosts.find(p => p.id === postId);
        if(post) {
            if(!post.comments) post.comments = []; post.comments.push(newComment);
            const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
            if(card) {
                const list = card.querySelector('.comments-list'); const btn = card.querySelector('.toggle-comments-btn');
                
                // Yorum gönderilince listeyi güncelle
                if(list) list.innerHTML = renderCommentsHTML(post.comments, user);
                if(btn) btn.innerHTML = `<i class="far fa-comments" aria-hidden="true"></i> Tartışma (${post.comments.length})`;

                const scrollContainer = card.querySelector('.comments-container');
                if(scrollContainer) {
                    setTimeout(() => {
                        scrollContainer.scrollTop = scrollContainer.scrollHeight;
                    }, 50); 
                }
            }
        }
        window.db.collection("posts").doc(postId).update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) })
            .then(() => { if(typeof showNotification==='function') showNotification('Yorum gönderildi', 'success'); });
    }

    function deleteComment(postId, cId) {
        if(!confirm("Yorumu silmek istiyor musunuz?")) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        const updated = currentPost.comments.filter(c => c.id !== cId);
        currentPost.comments = updated; 
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        if(card) { const list = card.querySelector('.comments-list'); const user = JSON.parse(localStorage.getItem('currentUser')); if(list) list.innerHTML = renderCommentsHTML(updated, user); }
        window.db.collection("posts").doc(postId).update({ comments: updated });
    }

    function deletePost(postId) {
        if(confirm("Gönderiyi silmek istiyor musunuz?")) {
            window.db.collection("posts").doc(postId).delete().then(() => {
                if(typeof showNotification==='function') showNotification('Gönderi silindi', 'success');
                const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
                if(card) card.remove();
                rawPosts = rawPosts.filter(p => p.id !== postId);
            });
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
        if(!user) { if(typeof showNotification==='function') showNotification('Lütfen giriş yapın.', 'error'); return null; }
        return user;
    }

    if (sharePostBtn) {
        sharePostBtn.addEventListener('click', () => {
            const caption = document.getElementById('post-caption').value;
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) { if(typeof showNotification==='function') showNotification('Giriş yapmalısınız!', 'error'); return; }
            if (!selectedImage && !caption) { if(typeof showNotification==='function') showNotification('Görsel veya açıklama ekleyin.', 'error'); return; }
            const newPost = { username: user.username, userId: user.uid, caption: caption, image: selectedImage, imageType: selectedImage ? 'uploaded' : 'none', timestamp: new Date().toISOString(), likes: 0, likedBy: [], comments: [], userProfilePic: user.profilePic || null };
            sharePostBtn.textContent = 'Paylaşılıyor...'; sharePostBtn.disabled = true;
            window.db.collection("posts").add(newPost).then((docRef) => {
                newPost.id = docRef.id; rawPosts.unshift(newPost);
                // Yeni post her zaman priority ile eklenir
                const card = createPostElement(newPost, user, true);
                if(imageFeed.firstChild) imageFeed.insertBefore(card, imageFeed.firstChild); else imageFeed.appendChild(card);
                if(addPostModal) { addPostModal.style.display = 'none'; document.body.style.overflow = 'auto'; }
                if (typeof window.switchTab === 'function') window.switchTab('home');
                document.getElementById('post-caption').value = ''; selectedImage = null;
                if(imagePreview) imagePreview.style.display = 'none';
                sharePostBtn.textContent = 'Paylaş'; sharePostBtn.disabled = false;
                if(typeof showNotification==='function') showNotification('Paylaşıldı!', 'success');
            }).catch((error) => { console.error("Paylaşım hatası:", error); sharePostBtn.textContent = 'Paylaş'; sharePostBtn.disabled = false; });
        });
    }

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
            input.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    if(imagePreview) { imagePreview.style.display = 'block'; imagePreview.style.opacity = '0.5'; }
                    reader.onload = (ev) => {
                        compressImage(ev.target.result).then(compressedBase64 => { selectedImage = compressedBase64; if(imagePreview) { imagePreview.style.opacity = '1'; imagePreview.src = compressedBase64; } });
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            };
            input.click();
        });
    }

    // --- GELİŞMİŞ TAM EKRAN GÖRSEL & ZOOM SİSTEMİ ---
    const fullscreenViewer = document.getElementById('fullscreen-viewer');
    const fullscreenImg = document.getElementById('fullscreen-image');
    const closeFullscreenBtn = document.getElementById('close-fullscreen-btn');
    const fullscreenContainer = document.getElementById('fullscreen-img-container');

    let state = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
    const minScale = 1;
    const maxScale = 5;

    function openFullscreenImage(src) {
        if (!fullscreenViewer || !fullscreenImg) return;
        fullscreenImg.src = src;
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

    if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); closeFullscreenImage(); });
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
        let isPinching = false;
        let initialPinchDistance = 0;
        let initialScale = 1;
        let initialPinchCenter = { x: 0, y: 0 };
        let initialPoint = { x: 0, y: 0 };

        fullscreenContainer.addEventListener('touchend', function (e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (!isPinching && tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
                e.preventDefault();
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                if (state.scale > 1) { resetZoom(); } else { state.scale = 2; state.pointX = 0; state.pointY = 0; updateTransform(); }
            }
            if (e.touches.length === 0) {
                state.panning = false;
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                if (state.scale < 1) { resetZoom(); }
                if (isPinching) { isPinching = false; return; }
            }
            lastTap = currentTime;
        });

        fullscreenContainer.addEventListener('dblclick', (e) => {
            fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            if (state.scale > 1) { resetZoom(); } else { state.scale = 2; updateTransform(); }
        });

        fullscreenContainer.addEventListener('touchstart', (e) => {
            fullscreenImg.style.transition = 'none';
            if (e.touches.length === 2) {
                isPinching = true; state.panning = false;
                initialPinchDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                initialScale = state.scale;
                initialPinchCenter = { x: (e.touches[0].pageX + e.touches[1].pageX) / 2, y: (e.touches[0].pageY + e.touches[1].pageY) / 2 };
                initialPoint = { x: state.pointX, y: state.pointY };
            } else if (e.touches.length === 1) {
                state.panning = true;
                state.startX = e.touches[0].pageX - state.pointX;
                state.startY = e.touches[0].pageY - state.pointY;
            }
        });

        fullscreenContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                const currentDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                const currentCenter = { x: (e.touches[0].pageX + e.touches[1].pageX) / 2, y: (e.touches[0].pageY + e.touches[1].pageY) / 2 };
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
                state.pointX = e.touches[0].pageX - state.startX;
                state.pointY = e.touches[0].pageY - state.startY;
                updateTransform();
            }
        });

        fullscreenContainer.addEventListener('wheel', (e) => {
            e.preventDefault(); fullscreenImg.style.transition = 'none';
            const zoomFactor = 0.1; const direction = e.deltaY < 0 ? 1 : -1;
            let newScale = state.scale + (direction * zoomFactor * state.scale);
            newScale = Math.min(Math.max(minScale, newScale), maxScale);
            if (newScale <= 1) { resetZoom(); } else { state.scale = newScale; updateTransform(); }
        }, { passive: false });

        let isMouseDown = false;
        fullscreenContainer.addEventListener('mousedown', (e) => {
            if (state.scale > 1) {
                e.preventDefault(); fullscreenImg.style.transition = 'none';
                isMouseDown = true; state.startX = e.clientX - state.pointX; state.startY = e.clientY - state.pointY;
                fullscreenContainer.style.cursor = 'grabbing';
            }
        });

        fullscreenContainer.addEventListener('mousemove', (e) => {
            if (isMouseDown && state.scale > 1) {
                e.preventDefault(); state.pointX = e.clientX - state.startX; state.pointY = e.clientY - state.startY; updateTransform();
            }
        });

        const stopDrag = () => {
            if (isMouseDown) {
                isMouseDown = false; fullscreenContainer.style.cursor = 'zoom-out';
                fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
        };
        fullscreenContainer.addEventListener('mouseup', stopDrag);
        fullscreenContainer.addEventListener('mouseleave', stopDrag);
    }

    window.loadImageFeed = initFeed;
    initFeed();
});
