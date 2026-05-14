// feed.js - ÖNBELLEK (STALE-WHILE-REVALIDATE) EKLENTİSİYLE GÜNCELLENDİ
document.addEventListener('DOMContentLoaded', function() {
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
    
    let rawPosts = [];          
    let lastVisibleDoc = null;  
    let isFetching = false;     
    let isAllFetched = false;   
    let feedObserver = null;    
    let viewMode = 'paginated'; 

    let selectedImages = []; 
    let openDiscussionIds = new Set(); 
    
    let activeFilters = {
        sort: 'newest',
        mediaType: [],
        dateStart: null,
        dateEnd: null,
        search: ''
    };

    window.showUserListModal = async function(title, userIds) {
        const modal = document.getElementById('user-list-modal');
        const titleEl = document.getElementById('user-list-title');
        const container = document.getElementById('user-list-container');
        
        if(!modal || !titleEl || !container) return;
        
        titleEl.textContent = title;
        container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="feed-spinner" style="margin: 0 auto;"></div><p style="margin-top:15px; color:var(--text-light);">Yükleniyor...</p></div>';
        
        if (window.openModal) window.openModal(modal);
        else { modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false'); }
        
        if(!userIds || userIds.length === 0) {
            container.innerHTML = '<div class="empty-user-list"><i class="fas fa-users-slash"></i>Kimse bulunamadı.</div>';
            return;
        }
        
        try {
            const userDocs = await Promise.all(userIds.map(id => window.db.collection('users').doc(id).get()));
            
            container.innerHTML = '';
            let hasUsers = false;
            
            userDocs.forEach(doc => {
                if (doc.exists) {
                    hasUsers = true;
                    const uData = doc.data();
                    const id = doc.id;
                    
                    const item = document.createElement('div');
                    item.className = 'user-list-item';
                    
                    let avatarHtml = '';
                    if (uData.profilePic && uData.profilePic.trim() !== "") {
                        avatarHtml = `<div class="user-list-avatar" style="background-image: url('${uData.profilePic}')"></div>`;
                    } else {
                        avatarHtml = `<div class="user-list-avatar default-avatar"><i class="fas fa-user"></i></div>`;
                    }
                    
                    item.innerHTML = `
                        ${avatarHtml}
                        <div class="user-list-info">
                            <span class="user-list-username">@${uData.username || 'anonim'}</span>
                            <span class="user-list-fullname">${uData.fullname || ''}</span>
                        </div>
                    `;
                    
                    item.onclick = () => {
                        if (window.closeModal) window.closeModal(modal);
                        else modal.style.display = 'none';
                        
                        setTimeout(() => {
                            window.openUserProfile(id);
                        }, 300);
                    };
                    
                    container.appendChild(item);
                }
            });
            
            if (!hasUsers) {
                container.innerHTML = '<div class="empty-user-list"><i class="fas fa-users-slash"></i>Kimse bulunamadı.</div>';
            }
        } catch (err) {
            console.error("Kullanıcı listesi çekilemedi:", err);
            container.innerHTML = '<div class="empty-user-list" style="color:var(--like-color);"><i class="fas fa-exclamation-triangle"></i>Bir hata oluştu.</div>';
        }
    };

    let currentProfileUnsubscribe = null;
    let currentProfilePostsUnsubscribe = null;

    window.openUserProfile = function(targetUserId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if(currentUser && currentUser.uid === targetUserId) {
            if(window.switchTab) window.switchTab('account');
            return;
        }

        if(window.switchTab) window.switchTab('profile');

        const profileUsername = document.getElementById('profile-username');
        const profileAvatar = document.getElementById('profile-avatar-img');
        const followerCount = document.getElementById('follower-count');
        const followingCount = document.getElementById('following-count');
        const postCount = document.getElementById('post-count');
        const followBtn = document.getElementById('follow-user-btn');
        const unfollowBtn = document.getElementById('unfollow-user-btn');
        const postsTab = document.getElementById('posts-tab');
        const profileBioText = document.getElementById('profile-bio-text');

        postsTab.innerHTML = '<div class="feed-spinner" style="margin:40px auto;"></div>';
        
        if(currentProfileUnsubscribe) currentProfileUnsubscribe();
        
        let isUserPrivate = false;

        currentProfileUnsubscribe = window.db.collection('users').doc(targetUserId).onSnapshot(doc => {
            if(!doc.exists) {
                if(typeof showNotification === 'function') showNotification('Kullanıcı bulunamadı', 'error');
                if(window.switchTab) window.switchTab('home');
                return;
            }
            
            const userData = doc.data();
            isUserPrivate = userData.isPrivate || false;

            profileUsername.textContent = '@' + userData.username;
            if(profileBioText) profileBioText.textContent = userData.fullname || '';
            
            profileAvatar.style.display = 'flex';
            profileAvatar.style.alignItems = 'center';
            profileAvatar.style.justifyContent = 'center';
            
            if(userData.profilePic && userData.profilePic.trim() !== "") {
                profileAvatar.style.background = `url('${userData.profilePic}') center/cover no-repeat`;
                profileAvatar.innerHTML = '';
            } else {
                profileAvatar.style.background = '#e1e1e1';
                profileAvatar.innerHTML = '<i class="fas fa-user" style="font-size: 40px; color: #999;"></i>';
            }

            const followers = userData.followers || [];
            const following = userData.following || [];
            const followRequests = userData.followRequests || [];
            
            followerCount.textContent = followers.length;
            followingCount.textContent = following.length;

            const followerStat = followerCount.closest('.stat');
            const followingStat = followingCount.closest('.stat');
            
            if (followerStat) {
                followerStat.style.cursor = 'pointer';
                followerStat.onclick = () => window.showUserListModal('Kitle (' + followers.length + ')', followers);
            }
            if (followingStat) {
                followingStat.style.cursor = 'pointer';
                followingStat.onclick = () => window.showUserListModal('Odak (' + following.length + ')', following);
            }

            if(currentUser) {
                if(followers.includes(currentUser.uid)) {
                    followBtn.style.display = 'none';
                    unfollowBtn.style.display = 'flex';
                    unfollowBtn.innerHTML = '<i class="fas fa-user-check"></i> Odaktan Çık';
                    unfollowBtn.onclick = () => window.toggleFollow(targetUserId, false);
                } else if(followRequests.includes(currentUser.uid)) {
                    followBtn.style.display = 'none';
                    unfollowBtn.style.display = 'flex';
                    unfollowBtn.innerHTML = '<i class="fas fa-clock"></i> İstek Gönderildi';
                    unfollowBtn.onclick = () => window.toggleFollow(targetUserId, false);
                } else {
                    followBtn.style.display = 'flex';
                    unfollowBtn.style.display = 'none';
                    followBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Odaklan';
                    followBtn.onclick = () => window.toggleFollow(targetUserId, true);
                }
            } else {
                followBtn.style.display = 'flex';
                unfollowBtn.style.display = 'none';
                followBtn.onclick = () => window.toggleFollow(targetUserId, true);
            }
        });

        if(currentProfilePostsUnsubscribe) currentProfilePostsUnsubscribe();
        
        currentProfilePostsUnsubscribe = window.db.collection('posts').where('userId', '==', targetUserId).onSnapshot(snapshot => {
            postCount.textContent = snapshot.docs.length;
            postsTab.innerHTML = '';
            
            const isOwner = currentUser && currentUser.uid === targetUserId;
            const isFollowing = currentUser && currentUser.following && currentUser.following.includes(targetUserId);

            if (isUserPrivate && !isOwner && !isFollowing) {
                postsTab.innerHTML = `
                    <div class="private-account-message">
                        <i class="fas fa-lock"></i>
                        <h3>Bu Hesap Gizli</h3>
                        <p>Gönderilerini görmek için bu kullanıcıya odaklanmalısın.</p>
                    </div>
                `;
                return;
            }

            if(snapshot.empty) {
                postsTab.innerHTML = '<div class="empty-account-posts" style="grid-column: 1/-1; padding:40px; text-align:center; color: var(--text-light);"><i class="fas fa-camera" style="font-size: 40px; opacity:0.5; margin-bottom:10px;"></i><p>Henüz paylaşım yok.</p></div>';
                return;
            }
            
            let posts = [];
            snapshot.forEach(d => { let p = d.data(); p.id = d.id; posts.push(p); });
            posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            posts.forEach(post => {
                const pEl = document.createElement('div');
                pEl.className = 'account-post-item'; 
                pEl.style.cursor = 'pointer';
                
                const displayImage = (post.images && post.images.length > 0) ? post.images[0] : post.image;
                const hasMultiple = post.images && post.images.length > 1;

                let mediaHtml = '';
                if (post.imageType === 'none' || !displayImage) {
                    mediaHtml = `<div class="account-post-image no-image-bg"><i class="fas fa-align-left" style="font-size:24px;"></i></div>`;
                } else {
                    mediaHtml = `<div class="account-post-image" style="background-image: url('${displayImage}')"></div>`;
                }
                
                const multiIconHtml = hasMultiple ? `<div class="multi-image-icon"><i class="fas fa-clone"></i></div>` : '';

                pEl.innerHTML = `
                    ${mediaHtml}
                    ${multiIconHtml}
                    <div class="account-post-overlay">
                        <div class="account-post-stats">
                            <span class="stat-item"><i class="fas fa-heart"></i> ${post.likes||0}</span>
                            <span class="stat-item"><i class="fas fa-comment"></i> ${post.comments ? post.comments.length : 0}</span>
                        </div>
                    </div>
                `;
                
                pEl.onclick = () => {
                     if (window.openPostDetail) {
                         window.openPostDetail(post);
                     } else {
                         if(post.images && post.images.length > 0) {
                              if(window.openFullscreenImage) window.openFullscreenImage(post.images, 0);
                         } else if (post.image) {
                              if(window.openFullscreenImage) window.openFullscreenImage(post.image);
                         } else {
                              if(typeof showNotification === 'function') showNotification('Bu sadece bir yazı gönderisi.', 'info');
                         }
                     }
                };
                postsTab.appendChild(pEl);
            });
        });
    };

    window.openProfileByUsername = async function(username) {
        try {
            const discModal = document.getElementById('discussion-modal');
            if (discModal && discModal.style.display !== 'none') {
                if (window.closeModal) window.closeModal(discModal);
                else { discModal.style.display = 'none'; document.body.style.overflow = 'auto'; }
            }

            const snapshot = await window.db.collection('users').where('username', '==', username).get();
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                window.openUserProfile(userDoc.id);
            } else {
                if(typeof showNotification === 'function') showNotification('Kullanıcı bulunamadı.', 'error');
            }
        } catch(err) {
            console.error("Profil açma hatası:", err);
        }
    };

    window.toggleFollow = async function(targetUid, isFollowingAction) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if(!currentUser) { 
            if(typeof showNotification === 'function') showNotification('Odaklanmak için giriş yapmalısınız.', 'error'); 
            return; 
        }

        const targetRef = window.db.collection('users').doc(targetUid);
        const currentRef = window.db.collection('users').doc(currentUser.uid);

        const followBtn = document.getElementById('follow-user-btn');
        const unfollowBtn = document.getElementById('unfollow-user-btn');
        if(followBtn) followBtn.disabled = true;
        if(unfollowBtn) unfollowBtn.disabled = true;

        try {
            const targetDoc = await targetRef.get();
            const isPrivate = targetDoc.data().isPrivate || false;

            if(isFollowingAction) {
                if (isPrivate) {
                    await targetRef.update({ followRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                    if(window.sendNotification) window.sendNotification(targetUid, 'follow_request');
                    if(typeof showNotification === 'function') showNotification('Takip isteği gönderildi!', 'success');
                } else {
                    await targetRef.update({ followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                    await currentRef.update({ following: firebase.firestore.FieldValue.arrayUnion(targetUid) });
                    if(window.sendNotification) window.sendNotification(targetUid, 'follow');
                    if(typeof showNotification === 'function') showNotification('Kullanıcıya odaklanıldı!', 'success');
                }
            } else {
                await targetRef.update({ 
                    followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                    followRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
                await currentRef.update({ following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
                if(typeof showNotification === 'function') showNotification('Takipten / İstekten çıkıldı.', 'info');
            }
        } catch(err) {
            console.error(err);
            if(typeof showNotification === 'function') showNotification('İşlem başarısız oldu.', 'error');
        } finally {
            if(followBtn) followBtn.disabled = false;
            if(unfollowBtn) unfollowBtn.disabled = false;
        }
    };

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
                resolve(canvas.toDataURL('image/webp', 0.8)); 
            };
            img.onerror = () => resolve(base64Str);
        });
    }

    // PERFORMANS: Stale-while-revalidate eklendi
    function initFeed() {
        if (!imageFeed || !window.db) return;
        
        const cachedFeed = localStorage.getItem('neyDiki_feedCache');
        if (cachedFeed) {
            try {
                const parsedPosts = JSON.parse(cachedFeed);
                if (parsedPosts && parsedPosts.length > 0) {
                    rawPosts = parsedPosts;
                    imageFeed.innerHTML = ''; 
                    renderBatch(rawPosts, true);
                }
            } catch (e) {
                console.error("Cache okuma hatası", e);
            }
        }
        
        fetchPosts(true); // Arka planda gerçek veriyi çek
    }

    function createSentinel() {
        const oldSentinel = document.getElementById('feed-sentinel');
        if (oldSentinel) oldSentinel.remove();
        const sentinel = document.createElement('div');
        sentinel.id = 'feed-sentinel';
        sentinel.innerHTML = '<div class="feed-spinner small"></div>'; 
        imageFeed.appendChild(sentinel);
        const options = { root: null, rootMargin: '400px', threshold: 0.1 };
        feedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isFetching && !isAllFetched && viewMode === 'paginated') {
                    fetchPosts(false);
                }
            });
        }, options);
        feedObserver.observe(sentinel);
    }

    async function fetchPosts(isInitial = false) {
        if (isFetching) return;
        isFetching = true;
        const sentinel = document.getElementById('feed-sentinel');
        if (sentinel) sentinel.style.opacity = '1';

        try {
            let query = window.db.collection("posts").orderBy("timestamp", "desc");
            if (viewMode === 'paginated') {
                query = query.limit(5);
                if (!isInitial && lastVisibleDoc) query = query.startAfter(lastVisibleDoc);
            }
            const snapshot = await query.get();

            if (snapshot.empty) {
                isAllFetched = true;
                if (sentinel) sentinel.style.display = 'none';
                if (isInitial && rawPosts.length === 0) {
                    imageFeed.innerHTML = `<div class="empty-state"><i class="fas fa-camera"></i><h3>Akış Boş</h3><p>İlk gönderiyi sen paylaş!</p></div>`;
                }
                isFetching = false;
                return;
            }

            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            const newPosts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            if (isInitial) {
                rawPosts = newPosts;
                // PERFORMANS: Yeni veriyi önbelleğe kaydet
                localStorage.setItem('neyDiki_feedCache', JSON.stringify(newPosts.slice(0, 10)));
                imageFeed.innerHTML = ''; // İskeletleri temizle
                createSentinel(); 
            } else {
                const existingIds = new Set(rawPosts.map(p => p.id));
                const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                rawPosts = [...rawPosts, ...uniqueNewPosts];
            }
            
            if (isInitial) {
                renderBatch(rawPosts, true);
            } else {
                renderBatch(newPosts, false);
            }
            
        } catch (error) {
            console.error("Veri hatası:", error);
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
            const isPriority = clearContainer && index < 2; 
            const el = createPostElement(post, currentUser, isPriority);
            fragment.appendChild(el);
        });

        if (clearContainer) {
            Array.from(imageFeed.children).forEach(child => {
                if (child.id !== 'feed-sentinel') child.remove();
            });
        }
        if (sentinel) imageFeed.insertBefore(fragment, sentinel);
        else imageFeed.appendChild(fragment);
    }

    function checkPostFilter(post) {
        if (post.isPrivate) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) return false; 
            if (post.userId !== currentUser.uid && (!currentUser.following || !currentUser.following.includes(post.userId))) {
                return false; 
            }
        }

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
        const requiresFullData = activeFilters.search !== '' || activeFilters.sort === 'most-liked' || activeFilters.sort === 'most-commented' || activeFilters.sort === 'oldest';
        imageFeed.innerHTML = `<div class="feed-loading"><div class="feed-spinner"></div><p>Sonuçlar filtreleniyor...</p></div>`;
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
            const dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
            const likesA = a.likes || 0, likesB = b.likes || 0;
            const commentsA = a.comments ? a.comments.length : 0, commentsB = b.comments ? b.comments.length : 0;
            switch (activeFilters.sort) {
                case 'oldest': return dateA - dateB;
                case 'most-liked': return likesB - likesA;
                case 'most-commented': return commentsB - commentsA;
                case 'hybrid': return (likesB + commentsB) - (likesA + commentsA);
                case 'newest': default: return dateB - dateA;
            }
        });

        imageFeed.innerHTML = ''; 
        const sentinel = document.getElementById('feed-sentinel');
        if(sentinel) sentinel.remove(); 

        if (processed.length === 0) {
            imageFeed.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Sonuç Bulunamadı</h3><p>Filtrelerinize uygun gönderi yok.</p></div>`;
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const fragment = document.createDocumentFragment();
        processed.forEach((post, index) => {
            fragment.appendChild(createPostElement(post, currentUser, index < 2));
        });
        imageFeed.appendChild(fragment);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function createPostElement(post, currentUser, isPriority = false) {
        const div = document.createElement('div');
        div.className = 'image-card';
        div.setAttribute('data-post-id', post.id);
        div.style.animation = "fadeInUp 0.5s ease backwards";
        
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isOwnPost = currentUser && currentUser.username === post.username;
        const canDelete = isOwnPost || isAdmin; 

        const commentCount = post.comments ? post.comments.length : 0;
        const isLikedByMe = post.likedBy && currentUser && post.likedBy.includes(currentUser.uid);
        const safeLikes = Math.max(0, post.likes || 0);

        let contentHtml = '';
        
        const hasMultipleImages = post.images && post.images.length > 1;
        const displayImage = (post.images && post.images.length > 0) ? post.images[0] : post.image;

        if (post.imageType === 'none' || !displayImage) {
            contentHtml = `
                <div class="card-image no-image-post" style="padding: 40px 20px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 250px;">
                    <i class="fas fa-quote-left" style="font-size:32px; color:white; margin-bottom:15px; opacity:0.8;" aria-hidden="true"></i>
                    <div style="color:white; font-weight:600; font-size:18px; text-align:center; text-shadow:0 2px 4px rgba(0,0,0,0.1);">Düşünce Paylaşımı</div>
                </div>`;
        } else if (hasMultipleImages) {
            const slidesHtml = post.images.map(imgSrc => `
                <div class="slider-slide">
                     <img src="${imgSrc}" loading="lazy" alt="Post görseli">
                </div>
            `).join('');

            const dotsHtml = post.images.map((_, i) => `
                <div class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>
            `).join('');

            contentHtml = `
                <div class="post-media-container slider-container" id="slider-${post.id}">
                    <div class="slider-track">${slidesHtml}</div>
                    <div class="slider-dots">${dotsHtml}</div>
                    <div class="slider-arrow slider-prev"><i class="fas fa-chevron-left"></i></div>
                    <div class="slider-arrow slider-next"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        } else {
            contentHtml = `
                <div class="post-media-container">
                    <div class="media-blur-bg" style="background-image: url('${displayImage}')"></div>
                    <img src="${displayImage}" class="card-image" loading="${isPriority ? 'eager' : 'lazy'}" ${isPriority ? 'fetchpriority="high"' : ''} decoding="async" alt="Gönderi resmi: ${post.caption || 'Başlıksız'}">
                </div>`;
        }

        let avatarStyle = 'display: flex; align-items: center; justify-content: center; cursor: pointer;';
        let avatarContent = '';
        
        const userPic = (isOwnPost && currentUser.profilePic) ? currentUser.profilePic : post.userProfilePic;
        
        if (userPic && userPic.trim() !== "") {
            avatarStyle += `background: url('${userPic}') center/cover no-repeat;`;
        } else {
            avatarStyle += `background: #e1e1e1;`;
            avatarContent = `<i class="fas fa-user" style="color: #999; font-size: 18px;" aria-hidden="true"></i>`;
        }

        const adminBadge = post.role === 'admin' ? '<i class="fas fa-check-circle" style="color:var(--primary); margin-left:4px;" title="Yönetici"></i>' : '';

        div.innerHTML = `
            <div class="card-header">
                <div class="user-avatar" style="${avatarStyle}" onclick="window.openUserProfile('${post.userId}')" aria-label="${post.username} profil resmi">${avatarContent}</div>
                <div class="user-info">
                    <div class="username" style="display:flex; align-items:center; cursor:pointer;" onclick="window.openUserProfile('${post.userId}')">
                        ${post.username || 'Anonim'}
                        ${adminBadge}
                    </div>
                    <div class="post-time">${window.timeAgoGlobal ? window.timeAgoGlobal(post.timestamp) : "Az önce"}</div>
                </div>
                ${canDelete ? `<button class="delete-post-btn" aria-label="Gönderiyi sil"><i class="fas fa-trash" aria-hidden="true"></i></button>` : ''}
            </div>
            ${contentHtml}
            <div class="card-content">
                <p><strong>${post.username}</strong> ${post.caption || ''}</p>
            </div>
            <div class="image-actions">
                <div class="action-left">
                    <button class="action-btn like-post-btn ${isLikedByMe ? 'active' : ''}" aria-label="Beğen">
                        <i class="${isLikedByMe ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i> 
                        <span>${safeLikes}</span>
                    </button>
                </div>
                <button class="discussion-btn toggle-comments-btn" aria-label="Yorumları göster">
                    <i class="far fa-comments" aria-hidden="true"></i> Tartışma (${commentCount})
                </button>
            </div>
            <div class="discussion-section" id="discussion-${post.id}">
                <div class="comments-container"><div class="comments-list" data-loaded="false"></div></div>
                <div class="add-comment">
                    <form action="javascript:void(0);" autocomplete="off" style="width:100%; display:flex; align-items:center; margin:0; padding:0; border:none; background:transparent;">
                        <input 
                            type="text" 
                            class="comment-input" 
                            name="fld_${post.id}_${Math.random().toString(36).substring(7)}" 
                            placeholder="Yorumunuzu yazın..." 
                            autocomplete="off" 
                            autocorrect="off" 
                            autocapitalize="off" 
                            spellcheck="false" 
                            enterkeyhint="send"
                            readonly
                            onfocus="this.removeAttribute('readonly');"
                            aria-label="Yorum yaz"
                        >
                        <button class="submit-comment inline-submit-btn" type="button" aria-label="Yorum gönder"><i class="fas fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
        `;

        if (hasMultipleImages) {
            setTimeout(() => window.setupPostSlider(div.querySelector(`#slider-${post.id}`)), 0);
        } else {
            const postImage = div.querySelector('.card-image');
            if (postImage && post.imageType !== 'none') {
                postImage.addEventListener('click', (e) => {
                    e.stopPropagation(); e.preventDefault(); openFullscreenImage(post.image);
                });
            }
        }
        
        const delBtn = div.querySelector('.delete-post-btn');
        if(delBtn) delBtn.addEventListener('click', (e) => { e.preventDefault(); deletePost(post.id); });
        
        const likeBtn = div.querySelector('.like-post-btn');
        if(likeBtn) likeBtn.addEventListener('click', (e) => { e.preventDefault(); togglePostLike(post.id); });
        
        const discBtn = div.querySelector('.toggle-comments-btn');
        const discSection = div.querySelector('.discussion-section');
        const commentInput = div.querySelector('.comment-input');
        const commentsListEl = div.querySelector('.comments-list');

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
                    if (commentsListEl.getAttribute('data-loaded') === 'false') {
                        commentsListEl.innerHTML = renderCommentsHTML(post.comments, currentUser);
                        commentsListEl.setAttribute('data-loaded', 'true');
                    }
                    discSection.classList.add('expanded'); 
                    openDiscussionIds.add(post.id);
                    const scrollContainer = div.querySelector('.comments-container');
                    if(scrollContainer) setTimeout(() => { scrollContainer.scrollTop = scrollContainer.scrollHeight; }, 100); 
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

        commentsListEl.addEventListener('click', (e) => {
            if(e.target.classList.contains('comment-user')) {
                e.preventDefault();
                if(window.openProfileByUsername) window.openProfileByUsername(e.target.textContent.trim());
                return;
            }

            const delCommentBtn = e.target.closest('.comment-delete-btn');
            if(delCommentBtn) { e.preventDefault(); deleteComment(post.id, delCommentBtn.dataset.id); }
            const likeCommentBtn = e.target.closest('.comment-like-btn');
            if(likeCommentBtn) { e.preventDefault(); toggleCommentLike(post.id, likeCommentBtn.dataset.id); }
            if(e.target.classList.contains('read-more-btn')) {
                e.preventDefault();
                const container = e.target.previousElementSibling;
                if(container) {
                    container.classList.toggle('collapsed');
                    e.target.textContent = container.classList.contains('collapsed') ? 'Devamını oku' : 'Daha az';
                }
            }
        });

        return div;
    }

    function renderCommentsHTML(comments, currentUser) {
        if (!comments || comments.length === 0) return '<div style="text-align:center; color:var(--text-light); font-size:13px; padding:20px;">Henüz yorum yok. İlk yorumu sen yap!</div>';
        
        const isAdmin = currentUser && currentUser.role === 'admin';

        return comments.map(c => {
            const isMyComment = currentUser && currentUser.username === c.username;
            const isLiked = c.likedBy && currentUser && c.likedBy.includes(currentUser.uid);
            const isLongText = c.text && c.text.length > 120;
            
            const canDelete = isMyComment || isAdmin;

            return `
                <div class="comment-item ${isMyComment ? 'mine' : ''}">
                    <div class="comment-header"><span class="comment-user">${c.username}</span></div>
                    <div class="${isLongText ? 'comment-text collapsed' : 'comment-text'}">${c.text}</div>
                    ${isLongText ? '<button class="read-more-btn">Devamını oku</button>' : ''}
                    <div class="comment-footer">
                        <div class="footer-left"><button class="comment-like-btn ${isLiked ? 'active' : ''}" data-id="${c.id}"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${c.likes > 0 ? c.likes : ''}</button></div>
                        <div class="footer-right">${canDelete ? `<button class="comment-delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>` : ''}<span class="comment-time">${window.timeAgoGlobal ? window.timeAgoGlobal(c.timestamp) : "Az önce"}</span></div>
                    </div>
                </div>`;
        }).join('');
    }

    function togglePostLike(postId) {
        const user = getCurrentUserOrAlert(); if(!user) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        const ref = window.db.collection("posts").doc(postId);
        
        let newLikes = currentPost.likes || 0;
        let likedBy = currentPost.likedBy || [];
        
        if (likedBy.includes(user.uid)) {
            newLikes--; likedBy = likedBy.filter(u => u !== user.uid);
            ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid) });
        } else {
            newLikes++; likedBy.push(user.uid);
            ref.update({ likes: firebase.firestore.FieldValue.increment(1), likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            
            if(window.sendNotification) window.sendNotification(currentPost.userId, 'like', postId, (currentPost.images && currentPost.images[0]) || currentPost.image || null);
        }
        currentPost.likes = newLikes; currentPost.likedBy = likedBy;
        
        if(card) {
            const btn = card.querySelector('.like-post-btn');
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            btn.classList.toggle('active');
            icon.className = btn.classList.contains('active') ? 'fas fa-heart' : 'far fa-heart';
            span.textContent = newLikes;
        }
    }

    function toggleCommentLike(postId, commentId) {
        const user = getCurrentUserOrAlert(); if(!user) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        let updatedComments = [...currentPost.comments];
        const commentIndex = updatedComments.findIndex(c => c.id === commentId); if(commentIndex === -1) return;
        let comment = updatedComments[commentIndex];
        
        if(!comment.likedBy) comment.likedBy = [];
        const isLiked = comment.likedBy.includes(user.uid);
        
        if(isLiked) { 
            if (comment.likes > 0) comment.likes--; 
            comment.likedBy = comment.likedBy.filter(id => id !== user.uid); 
        } else { 
            if(!comment.likes) comment.likes = 0;
            comment.likes++; 
            comment.likedBy.push(user.uid); 
        }
        updatedComments[commentIndex] = comment;
        
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        if(card) {
             const cBtn = card.querySelector(`.comment-like-btn[data-id="${commentId}"]`);
             if(cBtn) { 
                 cBtn.innerHTML = `<i class="${!isLiked ? 'fas' : 'far'} fa-heart"></i> ${comment.likes > 0 ? comment.likes : ''}`; 
                 cBtn.classList.toggle('active'); 
             }
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
                const list = card.querySelector('.comments-list'); 
                const btn = card.querySelector('.toggle-comments-btn');
                if(list) list.innerHTML = renderCommentsHTML(post.comments, user);
                if(btn) btn.innerHTML = `<i class="far fa-comments"></i> Tartışma (${post.comments.length})`;
                const scrollContainer = card.querySelector('.comments-container');
                if(scrollContainer) setTimeout(() => { scrollContainer.scrollTop = scrollContainer.scrollHeight; }, 50); 
            }
        }
        window.db.collection("posts").doc(postId).update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) })
            .then(() => {
                if(typeof showNotification==='function') showNotification('Yorum gönderildi', 'success');
                if(post && window.sendNotification) window.sendNotification(post.userId, 'comment', postId, (post.images && post.images[0]) || post.image || null, text);
            });
    }

    function deleteComment(postId, cId) {
        if(!confirm("Yorumu silmek istiyor musunuz?")) return;
        const currentPost = rawPosts.find(p => p.id === postId); if(!currentPost) return;
        const updated = currentPost.comments.filter(c => c.id !== cId);
        currentPost.comments = updated; 
        const card = document.querySelector(`.image-card[data-post-id="${postId}"]`);
        if(card) { 
            const list = card.querySelector('.comments-list'); 
            const user = JSON.parse(localStorage.getItem('currentUser')); 
            if(list) list.innerHTML = renderCommentsHTML(updated, user); 
        }
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
            if (selectedImages.length === 0 && !caption) { if(typeof showNotification==='function') showNotification('Görsel veya açıklama ekleyin.', 'error'); return; }
            
            sharePostBtn.textContent = 'Paylaşılıyor...'; sharePostBtn.disabled = true;
            
            const mainImage = selectedImages.length > 0 ? selectedImages[0] : null;
            
            const newPost = { 
                username: user.username, 
                userId: user.uid, 
                role: user.role || 'user', 
                caption: caption, 
                image: mainImage,
                images: selectedImages,
                imageType: selectedImages.length > 0 ? 'uploaded' : 'none', 
                timestamp: new Date().toISOString(), 
                likes: 0, 
                likedBy: [], 
                comments: [], 
                userProfilePic: user.profilePic || null,
                isPrivate: user.isPrivate || false 
            };
            
            window.db.collection("posts").add(newPost).then((docRef) => {
                newPost.id = docRef.id; rawPosts.unshift(newPost);
                const card = createPostElement(newPost, user, true);
                if(imageFeed.firstChild) imageFeed.insertBefore(card, imageFeed.firstChild); else imageFeed.appendChild(card);
                if(addPostModal) { addPostModal.style.display = 'none'; document.body.style.overflow = 'auto'; }
                if (typeof window.switchTab === 'function') window.switchTab('home');
                
                document.getElementById('post-caption').value = ''; 
                selectedImages = [];
                const gallery = document.getElementById('preview-gallery');
                if(gallery) gallery.remove();
                if(imagePreview) imagePreview.style.display = 'none';
                document.querySelector('.file-upload-text').textContent = 'Görsel seçmek için dokun';
                
                sharePostBtn.textContent = 'Paylaş'; sharePostBtn.disabled = false;
                if(typeof showNotification==='function') showNotification('Paylaşıldı!', 'success');
            }).catch((error) => { console.error("Paylaşım hatası:", error); sharePostBtn.textContent = 'Paylaş'; sharePostBtn.disabled = false; });
        });
    }

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const input = document.createElement('input'); 
            input.type = 'file'; 
            input.accept = 'image/*';
            input.multiple = true; 
            
            input.onchange = async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    selectedImages = []; 
                    const files = Array.from(e.target.files).slice(0, 10); 
                    
                    if(imagePreview) {
                        imagePreview.style.display = 'none'; 
                        const oldGallery = document.getElementById('preview-gallery');
                        if(oldGallery) oldGallery.remove();
                    }

                    const galleryDiv = document.createElement('div');
                    galleryDiv.id = 'preview-gallery';
                    galleryDiv.style.cssText = "display:flex; gap:10px; overflow-x:auto; padding:10px; white-space:nowrap; width:100%;";
                    imageUploadArea.appendChild(galleryDiv);

                    let loadedCount = 0;
                    for (let file of files) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            compressImage(ev.target.result).then(compressedBase64 => {
                                selectedImages.push(compressedBase64);
                                
                                const img = document.createElement('img');
                                img.src = compressedBase64;
                                img.style.cssText = "min-width:80px; width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border);";
                                galleryDiv.appendChild(img);
                                
                                loadedCount++;
                                document.querySelector('.file-upload-text').textContent = `${loadedCount} görsel seçildi`;
                            });
                        };
                        reader.readAsDataURL(file);
                    }
                }
            };
            input.click();
        });
    }

    const fullscreenViewer = document.getElementById('fullscreen-viewer');
    const fullscreenImg = document.getElementById('fullscreen-image');
    const closeFullscreenBtn = document.getElementById('close-fullscreen-btn');
    const fullscreenContainer = document.getElementById('fullscreen-img-container');
    const fsPrevBtn = document.getElementById('fs-prev-btn');
    const fsNextBtn = document.getElementById('fs-next-btn');

    let state = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
    const minScale = 1, maxScale = 5;
    let fsImages = []; let fsIndex = 0;   

    function openFullscreenImage(source, index = 0) {
        if (!fullscreenViewer || !fullscreenImg) return;
        if (Array.isArray(source)) { fsImages = source; fsIndex = index; } 
        else { fsImages = [source]; fsIndex = 0; }
        updateFullscreenView(); 
        fullscreenViewer.classList.add('active');
        fullscreenViewer.setAttribute('aria-hidden', 'false'); 
        document.body.style.overflow = 'hidden'; 
        resetZoom();
    }

    function updateFullscreenView() {
        if (fsImages.length === 0) return;
        const src = fsImages[fsIndex];
        fullscreenImg.src = src;
        fullscreenViewer.style.setProperty('--fullscreen-bg', `url('${src}')`);
        if (fsImages.length > 1 && fsPrevBtn && fsNextBtn) { fsPrevBtn.style.display = 'flex'; fsNextBtn.style.display = 'flex'; } 
        else if (fsPrevBtn && fsNextBtn) { fsPrevBtn.style.display = 'none'; fsNextBtn.style.display = 'none'; }
    }

    function closeFullscreenImage() {
        if (!fullscreenViewer) return;
        if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
        fullscreenViewer.classList.remove('active');
        fullscreenViewer.setAttribute('aria-hidden', 'true'); 
        
        let isAnyModalOpen = false;
        document.querySelectorAll('.modal').forEach(m => {
            if (window.getComputedStyle(m).display !== 'none') {
                isAnyModalOpen = true;
            }
        });

        if (!isAnyModalOpen) {
            document.body.style.overflow = 'auto'; 
        }

        setTimeout(() => { if(fullscreenImg) fullscreenImg.src = ''; }, 300);
    }

    function resetZoom() {
        state = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
        if(fullscreenImg) { fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; updateTransform(); }
    }

    function updateTransform() { if(fullscreenImg) fullscreenImg.style.transform = `translate(${state.pointX}px, ${state.pointY}px) scale(${state.scale})`; }

    if (closeFullscreenBtn) { closeFullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); closeFullscreenImage(); }); }
    if (fsPrevBtn) { fsPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); if (fsImages.length > 1) { fsIndex = (fsIndex - 1 + fsImages.length) % fsImages.length; updateFullscreenView(); resetZoom(); } }); }
    if (fsNextBtn) { fsNextBtn.addEventListener('click', (e) => { e.stopPropagation(); if (fsImages.length > 1) { fsIndex = (fsIndex + 1) % fsImages.length; updateFullscreenView(); resetZoom(); } }); }

    if (fullscreenViewer) {
        fullscreenViewer.addEventListener('click', (e) => {
            if (state.scale === 1 && !state.panning) { if (e.target === fullscreenViewer || e.target === fullscreenContainer) closeFullscreenImage(); }
        });
    }
    
    if (fullscreenContainer && fullscreenImg) {
        let lastTap = 0, isPinching = false, initialPinchDistance = 0, initialScale = 1;
        let initialPinchCenter = { x: 0, y: 0 }, initialPoint = { x: 0, y: 0 };
        let swipeStartX = 0;

        fullscreenContainer.addEventListener('touchend', function (e) {
            const currentTime = new Date().getTime(); const tapLength = currentTime - lastTap;
            if (!isPinching && tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
                e.preventDefault(); fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                if (state.scale > 1) resetZoom(); else { state.scale = 2; state.pointX = 0; state.pointY = 0; updateTransform(); }
            }
            if (e.touches.length === 0) {
                state.panning = false; fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                if (state.scale < 1) resetZoom();
                if (!isPinching && state.scale === 1) {
                    const swipeEndX = e.changedTouches[0].clientX; const diff = swipeStartX - swipeEndX;
                    if (Math.abs(diff) > 50) {
                         if (diff > 0) { if (fsImages.length > 1) { fsIndex = (fsIndex + 1) % fsImages.length; updateFullscreenView(); resetZoom(); } } 
                         else { if (fsImages.length > 1) { fsIndex = (fsIndex - 1 + fsImages.length) % fsImages.length; updateFullscreenView(); resetZoom(); } }
                    }
                }
                if (isPinching) { isPinching = false; return; }
            }
            lastTap = currentTime;
        });

        fullscreenContainer.addEventListener('dblclick', (e) => {
            fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            if (state.scale > 1) resetZoom(); else { state.scale = 2; updateTransform(); }
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
                state.panning = true; state.startX = e.touches[0].pageX - state.pointX; state.startY = e.touches[0].pageY - state.pointY;
                swipeStartX = e.touches[0].clientX;
            }
        });

        fullscreenContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                const currentDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                const currentCenter = { x: (e.touches[0].pageX + e.touches[1].pageX) / 2, y: (e.touches[0].pageY + e.touches[1].pageY) / 2 };
                if (initialPinchDistance > 0) {
                    const diff = currentDistance / initialPinchDistance;
                    let newScale = initialScale * diff; newScale = Math.min(Math.max(minScale, newScale), maxScale); state.scale = newScale;
                    const dx = currentCenter.x - initialPinchCenter.x; const dy = currentCenter.y - initialPinchCenter.y;
                    state.pointX = initialPoint.x + dx; state.pointY = initialPoint.y + dy; updateTransform();
                }
            } else if (e.touches.length === 1 && state.panning && state.scale > 1) {
                state.pointX = e.touches[0].pageX - state.startX; state.pointY = e.touches[0].pageY - state.startY; updateTransform();
            }
        });

        fullscreenContainer.addEventListener('wheel', (e) => {
            e.preventDefault(); fullscreenImg.style.transition = 'none';
            const zoomFactor = 0.1; const direction = e.deltaY < 0 ? 1 : -1;
            let newScale = state.scale + (direction * zoomFactor * state.scale); newScale = Math.min(Math.max(minScale, newScale), maxScale);
            if (newScale <= 1) resetZoom(); else { state.scale = newScale; updateTransform(); }
        }, { passive: false });

        let isMouseDown = false;
        fullscreenContainer.addEventListener('mousedown', (e) => {
            if (state.scale > 1) {
                e.preventDefault(); fullscreenImg.style.transition = 'none';
                isMouseDown = true; state.startX = e.clientX - state.pointX; state.startY = e.clientY - state.pointY;
                fullscreenContainer.style.cursor = 'grabbing';
            }
        });

        fullscreenContainer.addEventListener('mousemove', (e) => { if (isMouseDown && state.scale > 1) { e.preventDefault(); state.pointX = e.clientX - state.startX; state.pointY = e.clientY - state.startY; updateTransform(); } });

        const stopDrag = () => { if (isMouseDown) { isMouseDown = false; fullscreenContainer.style.cursor = 'zoom-out'; fullscreenImg.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; } };
        fullscreenContainer.addEventListener('mouseup', stopDrag);
        fullscreenContainer.addEventListener('mouseleave', stopDrag);
    }
    
    window.openFullscreenImage = openFullscreenImage;
    window.loadImageFeed = initFeed;
    initFeed();
});

window.setupPostSlider = function(container) {
    if (!container) return;
    const track = container.querySelector('.slider-track');
    const slides = container.querySelectorAll('.slider-slide');
    const dots = container.querySelectorAll('.slider-dot');
    const prevBtn = container.querySelector('.slider-prev');
    const nextBtn = container.querySelector('.slider-next');
    
    if(!track || slides.length === 0) return;

    let currentIndex = 0; const totalSlides = slides.length;
    let startX = 0; let isDragging = false;

    const allImagesSrc = Array.from(slides).map(s => { const img = s.querySelector('img'); return img ? img.src : null; }).filter(src => src !== null);

    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, index) => { if(dot) dot.classList.toggle('active', index === currentIndex); });
    }

    if(prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); if (currentIndex > 0) currentIndex--; updateSlider(); });
    if(nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); if (currentIndex < totalSlides - 1) currentIndex++; updateSlider(); });

    container.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
    container.addEventListener('touchend', (e) => {
        if (!isDragging) return; const endX = e.changedTouches[0].clientX; const diff = startX - endX;
        if (Math.abs(diff) > 50) { if (diff > 0 && currentIndex < totalSlides - 1) { currentIndex++; } else if (diff < 0 && currentIndex > 0) { currentIndex--; } }
        updateSlider(); isDragging = false;
    });
    
    slides.forEach((slide, index) => {
        const img = slide.querySelector('img');
        if(img) {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                if(window.openFullscreenImage) window.openFullscreenImage(allImagesSrc, index);
            });
        }
    });
};

/* --- GLOBAL NOTIFICATION SYSTEM --- */
window.timeAgoGlobal = function(date) {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return "Az önce";
    if (s < 3600) return Math.floor(s/60) + "dk";
    if (s < 86400) return Math.floor(s/3600) + "sa";
    return Math.floor(s/86400) + "g";
};

window.sendNotification = async function(userId, type, postId = null, postImage = null, text = null) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.uid === userId) return; 

    try {
        await window.db.collection('notifications').add({
            userId: userId,
            senderId: currentUser.uid,
            senderUsername: currentUser.username,
            senderPic: currentUser.profilePic || null,
            type: type,
            postId: postId,
            postImage: postImage,
            text: text,
            timestamp: new Date().toISOString(),
            isRead: false
        });
    } catch(e) { console.error("Bildirim gönderilemedi:", e); }
};

window.initNotifications = function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    if (window.notificationsUnsubscribe) window.notificationsUnsubscribe();
    
    window.notificationsUnsubscribe = window.db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            let hasUnread = false;
            let notifs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                notifs.push(data);
                if (!data.isRead) hasUnread = true;
            });
            
            const badge = document.getElementById('nav-notif-badge');
            if (badge) badge.style.display = hasUnread ? 'block' : 'none';
            
            window.currentNotifications = notifs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const notifModal = document.getElementById('notifications-modal');
            if (notifModal && notifModal.style.display === 'flex') {
                window.renderNotifications();
            }
        });
};

window.renderNotifications = function() {
    const list = document.getElementById('notifications-list');
    if (!list) return;
    
    if (!window.currentNotifications || window.currentNotifications.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-light);">Henüz bildirim yok.</div>';
        return;
    }

    list.innerHTML = '';
    window.currentNotifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notification-item ${!notif.isRead ? 'unread' : ''}`;
        
        const newBadge = !notif.isRead ? `<span class="new-tag">YENİ</span>` : '';
        const avatar = notif.senderPic ? `url('${notif.senderPic}')` : '';
        const avatarHtml = avatar ? `<div class="notification-avatar" style="background-image: ${avatar}"></div>` : `<div class="notification-avatar"><i class="fas fa-user" style="color:#999;"></i></div>`;
        
        let contentText = '';
        let actionHtml = '';
        let rightHtml = '';

        const safeUsername = `<strong class="notif-user-link" data-username="${notif.senderUsername}">@${notif.senderUsername}</strong>`;

        if (notif.type === 'like') {
            contentText = `${safeUsername} gönderini beğendi.`;
            if (notif.postImage) rightHtml = `<div class="notif-post-thumbnail" style="background-image: url('${notif.postImage}')"></div>`;
        } else if (notif.type === 'comment') {
            contentText = `${safeUsername} gönderine yorum yaptı: "${notif.text || ''}"`;
            if (notif.postImage) rightHtml = `<div class="notif-post-thumbnail" style="background-image: url('${notif.postImage}')"></div>`;
        } else if (notif.type === 'follow') {
            contentText = `${safeUsername} sana odaklanmaya başladı.`;
        } else if (notif.type === 'follow_request') {
            contentText = `${safeUsername} seni takip etmek istiyor.`;
            actionHtml = `
                <div class="notification-actions">
                    <button class="notif-btn accept" data-sender="${notif.senderId}" data-notif="${notif.id}">Onayla</button>
                    <button class="notif-btn reject" data-sender="${notif.senderId}" data-notif="${notif.id}">Reddet</button>
                </div>`;
        } else if (notif.type === 'follow_accept') {
            contentText = `${safeUsername} takip isteğini onayladı.`;
        }

        item.innerHTML = `
            ${newBadge}
            ${avatarHtml}
            <div class="notification-content">
                ${contentText}
                ${actionHtml}
                <span class="notification-time">${window.timeAgoGlobal ? window.timeAgoGlobal(notif.timestamp) : "Az önce"}</span>
            </div>
            ${rightHtml}
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('notif-btn')) return; 
            
            if (e.target.classList.contains('notif-user-link')) {
                e.stopPropagation();
                const notifModal = document.getElementById('notifications-modal');
                if (window.closeModal) window.closeModal(notifModal); else notifModal.style.display = 'none';
                if (window.openProfileByUsername) window.openProfileByUsername(notif.senderUsername);
                window.db.collection('notifications').doc(notif.id).update({ isRead: true });
                return;
            }

            window.db.collection('notifications').doc(notif.id).update({ isRead: true });
            
            if (notif.postId && (notif.type === 'like' || notif.type === 'comment')) {
                const notifModal = document.getElementById('notifications-modal');
                if (window.closeModal) window.closeModal(notifModal); else notifModal.style.display = 'none';
                window.db.collection('posts').doc(notif.postId).get().then(doc => {
                    if(doc.exists && window.openPostDetail) window.openPostDetail({id: doc.id, ...doc.data()});
                });
            } else if (notif.type === 'follow' || notif.type === 'follow_accept') {
                const notifModal = document.getElementById('notifications-modal');
                if (window.closeModal) window.closeModal(notifModal); else notifModal.style.display = 'none';
                if (window.openUserProfile) window.openUserProfile(notif.senderId);
            }
        });

        const acceptBtn = item.querySelector('.accept');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const senderId = acceptBtn.getAttribute('data-sender');
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                await window.db.collection('users').doc(currentUser.uid).update({
                    followers: firebase.firestore.FieldValue.arrayUnion(senderId),
                    followRequests: firebase.firestore.FieldValue.arrayRemove(senderId)
                });
                await window.db.collection('users').doc(senderId).update({
                    following: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                
                await window.db.collection('notifications').doc(notif.id).update({ type: 'follow', isRead: true });
                window.sendNotification(senderId, 'follow_accept');
                if (typeof showNotification === 'function') showNotification('İstek onaylandı.', 'success');
            });
        }

        const rejectBtn = item.querySelector('.reject');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const senderId = rejectBtn.getAttribute('data-sender');
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                await window.db.collection('users').doc(currentUser.uid).update({ followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) });
                await window.db.collection('notifications').doc(notif.id).delete();
                if (typeof showNotification === 'function') showNotification('İstek reddedildi.', 'info');
            });
        }

        list.appendChild(item);
    });
};
