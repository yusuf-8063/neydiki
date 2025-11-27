// feed.js - Görsel Olmayan Gönderiler Desteği Eklendi
document.addEventListener('DOMContentLoaded', function() {
    const imageFeed = document.getElementById('image-feed');
    const addPostModal = document.getElementById('add-post-modal');
    const imageUploadArea = document.getElementById('image-upload-area');
    const imagePreview = document.getElementById('image-preview');
    const sharePostBtn = document.getElementById('share-post-btn');

    // Örnek görsel verileri - Görsel olmayan gönderiler eklendi
    let posts = JSON.parse(localStorage.getItem('neydikiPosts')) || [
        {
            id: 1,
            image: 'linear-gradient(45deg, #a1c4fd, #c2e9fb)',
            imageType: 'gradient',
            caption: 'Sadelik en yüksek gelişmişlik düzeyidir. #neydiki #tasarım #sanat',
            username: 'test',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            likes: 24,
            comments: [
                { 
                    id: 1, 
                    user: 'design_lover', 
                    text: 'Harika bir tasarım! Renk paleti mükemmel.', 
                    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), 
                    likes: 3, 
                    likedBy: ['user1'] 
                }
            ]
        },
        {
            id: 2,
            image: null,
            imageType: 'none',
            caption: 'Bugün harika bir gün! Doğa yürüyüşü yaptım ve kendimi çok iyi hissediyorum. 🏞️ #doğa #huzur #mutluluk',
            username: 'nature_lover',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            likes: 15,
            comments: [
                { 
                    id: 1, 
                    user: 'outdoor_enthusiast', 
                    text: 'Doğa yürüyüşleri gerçekten ruhu dinlendiriyor!', 
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), 
                    likes: 2, 
                    likedBy: ['user2'] 
                }
            ]
        },
        {
            id: 3,
            image: 'linear-gradient(45deg, #ffecd2, #fcb69f)',
            imageType: 'gradient',
            caption: 'Renklerin uyumu ruhu dinlendirir. #modern #fotograf #doğa',
            username: 'design_daily',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            likes: 18,
            comments: []
        },
        {
            id: 4,
            image: null,
            imageType: 'none',
            caption: 'Yeni bir kitaba başladım - "Minimalizm Sanatı". İlk izlenimlerim harika! 📚 #okuma #kitap #minimalizm',
            username: 'book_worm',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            likes: 8,
            comments: []
        },
        {
            id: 5,
            image: null,
            imageType: 'none', 
            caption: 'Bugün kendime söz verdim: Daha fazla anı yaşayacağım ve küçük mutlulukların tadını çıkaracağım. ✨ #motivasyon #kişiselgelişim #mutluluk',
            username: 'mindful_living',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            likes: 32,
            comments: [
                { 
                    id: 1, 
                    user: 'positive_thinker', 
                    text: 'Harika bir karar! Küçük mutluluklar hayatın anlamı ❤️', 
                    timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), 
                    likes: 5, 
                    likedBy: ['user3'] 
                },
                { 
                    id: 2, 
                    user: 'life_coach', 
                    text: 'Anı yaşamak en büyük zenginliktir. Tebrikler!', 
                    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), 
                    likes: 3, 
                    likedBy: ['user4'] 
                }
            ]
        }
    ];

    let selectedImage = null;
    let fileInput = null;
    let currentFilters = null;

    // Görsel akışını yükle
    function loadImageFeed(filters = null) {
        console.log('Görsel akışı yükleniyor...', posts);
        if (!imageFeed) return;
        
        imageFeed.innerHTML = '';
        
        let filteredPosts = [...posts];
        currentFilters = filters;
        
        // Filtreleme uygula
        if (filters) {
            filteredPosts = filterPostsData(filteredPosts, filters);
        }
        
        if (filteredPosts.length === 0) {
            showNoPostsMessage(filters);
            return;
        }
        
        const sortedPosts = sortPosts(filteredPosts, filters?.sort || 'newest');
        
        sortedPosts.forEach(post => {
            const postElement = createPostElement(post);
            imageFeed.appendChild(postElement);
        });
    }

    // Gönderi bulunamadı mesajı
    function showNoPostsMessage(filters) {
        const hasActiveFilters = filters && (
            filters.sort !== 'newest' || 
            filters.time !== 'all' || 
            (filters.category && filters.category.length > 0)
        );

        if (hasActiveFilters) {
            imageFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <h3>Gönderi bulunamadı</h3>
                    <p>Seçtiğiniz filtrelerle eşleşen gönderi bulunamadı</p>
                    <button class="filter-btn secondary" onclick="clearAllFilters()" style="margin-top: 15px;">
                        <i class="fas fa-eraser"></i>
                        Filtreleri Temizle
                    </button>
                </div>
            `;
        } else {
            imageFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>Henüz gönderi yok</h3>
                    <p>İlk gönderiyi paylaşmak için + butonuna tıklayın</p>
                </div>
            `;
        }
    }

    // Gönderileri filtrele
    function filterPostsData(posts, filters) {
        return posts.filter(post => {
            // Zaman filtresi
            if (filters.time && filters.time !== 'all') {
                const postDate = new Date(post.timestamp);
                const now = new Date();
                const timeDiff = now - postDate;
                
                switch (filters.time) {
                    case 'today':
                        if (timeDiff > 24 * 60 * 60 * 1000) return false;
                        break;
                    case 'week':
                        if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
                        break;
                    case 'month':
                        if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
                        break;
                }
            }
            
            // Kategori filtresi
            if (filters.category && filters.category.length > 0) {
                const postCategories = extractCategories(post.caption);
                const hasMatchingCategory = filters.category.some(cat => 
                    postCategories.includes(cat)
                );
                if (!hasMatchingCategory) return false;
            }
            
            return true;
        });
    }

    // Gönderileri sırala
    function sortPosts(posts, sortType) {
        const sorted = [...posts];
        
        switch (sortType) {
            case 'newest':
                return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            case 'popular':
                return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            case 'most-liked':
                return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            default:
                return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
    }

    // Kategorileri çıkar (hashtag analizi)
    function extractCategories(caption) {
        if (!caption) return [];
        const hashtags = caption.match(/#[\wğüşıöçĞÜŞİÖÇ]+/g) || [];
        return hashtags.map(tag => tag.toLowerCase().replace('#', ''));
    }

    // Global filtreleme fonksiyonu
    window.filterPosts = function(filters) {
        loadImageFeed(filters);
    };

    // Global arama fonksiyonu
    window.searchPosts = function(searchTerm) {
        const filteredPosts = posts.filter(post => {
            const searchLower = searchTerm.toLowerCase();
            return (
                post.caption?.toLowerCase().includes(searchLower) ||
                post.username?.toLowerCase().includes(searchLower) ||
                extractCategories(post.caption).some(cat => cat.includes(searchLower))
            );
        });
        
        if (filteredPosts.length > 0) {
            loadImageFeed();
            // Filtrelenmiş gönderileri göster
            const currentPosts = document.querySelectorAll('.image-card');
            currentPosts.forEach(postElement => {
                const postId = parseInt(postElement.dataset.postId);
                const isVisible = filteredPosts.some(post => post.id === postId);
                postElement.style.display = isVisible ? 'block' : 'none';
            });
            
            showNotification(`${filteredPosts.length} sonuç bulundu`, 'success');
        } else {
            imageFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Arama sonucu bulunamadı</h3>
                    <p>"${searchTerm}" için herhangi bir gönderi bulunamadı</p>
                </div>
            `;
        }
    };

    // Tüm filtreleri temizle
    window.clearAllFilters = function() {
        if (typeof window.getActiveFilters === 'function') {
            window.setActiveFilters({
                sort: 'newest',
                category: [],
                time: 'all'
            });
        }
        loadImageFeed();
    };

    // Gönderi elementi oluştur - Görsel olmayan gönderiler için güncellendi
    function createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'image-card';
        postDiv.setAttribute('data-post-id', post.id);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isOwnPost = currentUser && currentUser.username === post.username;
        
        // Görsel olmayan gönderiler için özel işaretleme
        const hasNoImage = !post.image || post.imageType === 'none';
        
        let imageSection = '';
        if (hasNoImage) {
            // Görsel olmayan gönderiler için özel tasarım
            const gradientClass = getRandomGradientClass();
            const iconClass = getRandomIconClass();
            
            imageSection = `
                <div class="card-image no-image-post ${gradientClass}">
                    <div class="no-image-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="no-image-text">Sadece Yazı</div>
                </div>
            `;
        } else {
            // Görsel içeren gönderiler
            let imageStyle = '';
            if (post.imageType === 'gradient') {
                imageStyle = `background: ${post.image}`;
            } else {
                imageStyle = `background-image: url("${post.image}"); background-size: cover; background-position: center;`;
            }
            
            imageSection = `<div class="card-image" style="${imageStyle}" data-post-id="${post.id}"></div>`;
        }
        
        postDiv.innerHTML = `
            <div class="card-header">
                <div class="user-avatar" style="background: ${getUserGradient(post.username)}"></div>
                <div class="user-info">
                    <div class="username">${post.username}</div>
                    <div class="post-time">${formatTime(post.timestamp)}</div>
                </div>
                ${isOwnPost ? `
                    <button class="delete-post-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
            ${imageSection}
            <div class="image-actions">
                <div class="action-left">
                    <button class="action-btn like-btn ${isPostLiked(post.id) ? 'active' : ''}" data-post-id="${post.id}">
                        <i class="fas fa-heart"></i>
                        <span class="like-count">${post.likes}</span>
                    </button>
                </div>
                <button class="discussion-btn" data-post-id="${post.id}">
                    <i class="fas fa-comment"></i> Tartışma (${post.comments.length})
                </button>
            </div>
            <div class="card-content ${hasNoImage ? 'post-content-only' : ''}">
                <p>${post.caption}</p>
            </div>
            
            <div class="discussion-section" id="discussion-${post.id}">
                <div class="discussion-content">
                    <div class="comments-container">
                        <div class="comments-list" id="comments-list-${post.id}">
                            <!-- Yorumlar buraya eklenecek -->
                        </div>
                    </div>
                    
                    <div class="add-comment">
                        <input type="text" class="comment-input" placeholder="Yorumunuzu yazın..." data-post-id="${post.id}">
                        <button class="submit-comment" data-post-id="${post.id}">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Event listener'ları ekle
        setupPostEventListeners(postDiv, post.id);

        // Yorumları yükle
        loadComments(post.id, post.comments);

        return postDiv;
    }

    // Rastgele gradient sınıfı seç
    function getRandomGradientClass() {
        const gradients = [
            'no-image-gradient-1',
            'no-image-gradient-2', 
            'no-image-gradient-3',
            'no-image-gradient-4',
            'no-image-gradient-5',
            'no-image-gradient-6'
        ];
        return gradients[Math.floor(Math.random() * gradients.length)];
    }

    // Rastgele ikon seç
    function getRandomIconClass() {
        const icons = [
            'fas fa-feather',
            'fas fa-pen-fancy',
            'fas fa-quote-right',
            'fas fa-comment-dots',
            'fas fa-lightbulb',
            'fas fa-heart',
            'fas fa-star',
            'fas fa-book',
            'fas fa-music',
            'fas fa-cloud',
            'fas fa-leaf',
            'fas fa-fire',
            'fas fa-water',
            'fas fa-mountain',
            'fas fa-sun',
            'fas fa-moon',
            'fas fa-cloud-sun',
            'fas fa-seedling',
            'fas fa-feather-alt',
            'fas fa-pencil-alt'
        ];
        return icons[Math.floor(Math.random() * icons.length)];
    }

    // Gönderi event listener'larını kur
    function setupPostEventListeners(postDiv, postId) {
        const discussionBtn = postDiv.querySelector('.discussion-btn');
        const likeBtn = postDiv.querySelector('.like-btn');
        const deleteBtn = postDiv.querySelector('.delete-post-btn');
        const submitBtn = postDiv.querySelector('.submit-comment');
        const commentInput = postDiv.querySelector('.comment-input');

        if (discussionBtn) {
            discussionBtn.addEventListener('click', function() {
                toggleDiscussion(postId);
            });
        }

        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                handleLike(postId);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deletePost(postId);
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                handleCommentSubmit(postId, commentInput);
            });
        }

        if (commentInput) {
            commentInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleCommentSubmit(postId, this);
                }
            });
        }
    }

    // Tartışma alanını aç/kapa
    function toggleDiscussion(postId) {
        const discussionSection = document.getElementById(`discussion-${postId}`);
        const discussionBtn = document.querySelector(`.discussion-btn[data-post-id="${postId}"]`);
        
        if (!discussionSection || !discussionBtn) return;
        
        if (discussionSection.classList.contains('expanded')) {
            discussionSection.classList.remove('expanded');
            discussionBtn.innerHTML = `<i class="fas fa-comment"></i> Tartışma (${getPost(postId).comments.length})`;
        } else {
            // Diğer açık tartışma alanlarını kapat
            document.querySelectorAll('.discussion-section.expanded').forEach(section => {
                section.classList.remove('expanded');
            });
            
            discussionSection.classList.add('expanded');
            discussionBtn.innerHTML = `<i class="fas fa-comment"></i> Tartışmayı Kapat`;
            
            // Yorumları yeniden yükle
            const post = getPost(postId);
            loadComments(postId, post.comments);
        }
    }

    // Beğenme işlemi
    function handleLike(postId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            showNotification('Beğenmek için giriş yapmalısınız!', 'error');
            const accountNav = document.getElementById('account-nav');
            if (accountNav) accountNav.click();
            return;
        }
        toggleLike(postId);
    }

    // Yorum gönderme işlemi
    function handleCommentSubmit(postId, commentInput) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            showNotification('Yorum yapmak için giriş yapmalısınız!', 'error');
            const accountNav = document.getElementById('account-nav');
            if (accountNav) accountNav.click();
            return;
        }

        if (!commentInput.value.trim()) {
            showNotification('Lütfen bir yorum yazın!', 'error');
            return;
        }

        addComment(postId, commentInput.value);
        commentInput.value = '';
    }

    // Yorumları yükle
    function loadComments(postId, comments) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) return;

        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>Henüz yorum yok</p>
                    <p>İlk yorumu siz yapın!</p>
                </div>
            `;
            return;
        }

        // Yorumları tarihe göre sırala (en yeni en üstte)
        const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedComments.forEach(comment => {
            const commentElement = createCommentElement(comment, postId);
            commentsList.appendChild(commentElement);
        });
    }

    // Yorum elementi oluştur
    function createCommentElement(comment, postId) {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.setAttribute('data-comment-id', comment.id);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isOwnComment = currentUser && currentUser.username === comment.user;
        const isCommentLiked = currentUser && comment.likedBy && comment.likedBy.includes(currentUser.username);
        
        commentElement.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${comment.user}</span>
                <span class="comment-time">${formatTime(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-actions">
                <button class="comment-like-btn ${isCommentLiked ? 'active' : ''}" data-comment-id="${comment.id}" data-post-id="${postId}">
                    <i class="fas fa-heart"></i>
                    <span class="comment-like-count">${comment.likes || 0}</span>
                </button>
                ${isOwnComment ? `
                    <button class="comment-delete-btn" data-comment-id="${comment.id}" data-post-id="${postId}">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                ` : ''}
            </div>
        `;

        // Yorum event listener'larını ekle
        const likeBtn = commentElement.querySelector('.comment-like-btn');
        const deleteBtn = commentElement.querySelector('.comment-delete-btn');

        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleCommentLike(comment.id, postId);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteComment(comment.id, postId);
            });
        }

        return commentElement;
    }

    // Yorum ekle
    function addComment(postId, commentText) {
        const post = getPost(postId);
        if (!post) return;

        // Yeni yorum ID'si oluştur
        const newCommentId = post.comments.length > 0 ? Math.max(...post.comments.map(c => c.id)) + 1 : 1;

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        const newComment = {
            id: newCommentId,
            user: currentUser.username,
            text: commentText.trim(),
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: []
        };

        post.comments.unshift(newComment); // En yeni yorum en üstte
        savePosts();
        
        // Tartışma butonundaki sayıyı güncelle
        const discussionBtn = document.querySelector(`.discussion-btn[data-post-id="${postId}"]`);
        if (discussionBtn) {
            const isExpanded = document.getElementById(`discussion-${postId}`).classList.contains('expanded');
            discussionBtn.innerHTML = isExpanded ? 
                `<i class="fas fa-comment"></i> Tartışmayı Kapat` : 
                `<i class="fas fa-comment"></i> Tartışma (${post.comments.length})`;
        }
        
        // Yorumları yeniden yükle
        loadComments(postId, post.comments);
        
        showNotification('Yorumunuz eklendi!', 'success');
    }

    // Yorum beğenme işlemi
    function toggleCommentLike(commentId, postId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            showNotification('Yorumu beğenmek için giriş yapmalısınız!', 'error');
            return;
        }

        const post = getPost(postId);
        if (!post) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        // Yorum beğenilerini başlat
        if (!comment.likedBy) comment.likedBy = [];
        if (!comment.likes) comment.likes = 0;

        const isLiked = comment.likedBy.includes(currentUser.username);

        if (isLiked) {
            // Unlike
            comment.likes = Math.max(0, comment.likes - 1);
            comment.likedBy = comment.likedBy.filter(user => user !== currentUser.username);
        } else {
            // Like
            comment.likes++;
            comment.likedBy.push(currentUser.username);
        }

        savePosts();
        
        // Yorumları yeniden yükle
        loadComments(postId, post.comments);
    }

    // Yorum silme işlemi
    function deleteComment(commentId, postId) {
        const confirmDelete = confirm('Bu yorumu silmek istediğinizden emin misiniz?');
        if (!confirmDelete) return;

        const post = getPost(postId);
        if (!post) return;

        post.comments = post.comments.filter(c => c.id !== commentId);
        savePosts();
        
        // Tartışma butonundaki sayıyı güncelle
        const discussionBtn = document.querySelector(`.discussion-btn[data-post-id="${postId}"]`);
        if (discussionBtn) {
            const isExpanded = document.getElementById(`discussion-${postId}`).classList.contains('expanded');
            discussionBtn.innerHTML = isExpanded ? 
                `<i class="fas fa-comment"></i> Tartışmayı Kapat` : 
                `<i class="fas fa-comment"></i> Tartışma (${post.comments.length})`;
        }
        
        // Yorumları yeniden yükle
        loadComments(postId, post.comments);
        
        showNotification('Yorum silindi!', 'success');
    }

    // Like işlemi
    function toggleLike(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
        const isLiked = likedPosts.includes(postId);

        if (isLiked) {
            // Unlike
            post.likes = Math.max(0, post.likes - 1);
            localStorage.setItem('likedPosts', JSON.stringify(likedPosts.filter(id => id !== postId)));
        } else {
            // Like
            post.likes = (post.likes || 0) + 1;
            likedPosts.push(postId);
            localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        }

        savePosts();
        loadImageFeed(currentFilters);
    }

    // Gönderi silme fonksiyonu
    function deletePost(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const confirmDelete = confirm('Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
        
        if (confirmDelete) {
            posts = posts.filter(p => p.id !== postId);
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
            const updatedLikedPosts = likedPosts.filter(id => id !== postId);
            localStorage.setItem('likedPosts', JSON.stringify(updatedLikedPosts));
            
            savePosts();
            loadImageFeed(currentFilters);
            
            if (typeof window.onNewPostAdded === 'function') {
                window.onNewPostAdded();
            }
            
            showNotification('Gönderi başarıyla silindi!', 'success');
        }
    }

    // Yardımcı fonksiyonlar
    function getPost(postId) {
        return posts.find(p => p.id === postId);
    }

    function savePosts() {
        localStorage.setItem('neydikiPosts', JSON.stringify(posts));
    }

    // Gönderi beğenilmiş mi kontrol et
    function isPostLiked(postId) {
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
        return likedPosts.includes(postId);
    }

    function formatTime(timestamp) {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - postTime) / 1000);
        
        if (diffInSeconds < 60) return 'şimdi';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
        return postTime.toLocaleDateString('tr-TR');
    }

    function getUserGradient(username) {
        const hue = username.length * 30 % 360;
        return `linear-gradient(45deg, hsl(${hue}, 70%, 60%), hsl(${hue + 30}, 70%, 60%))`;
    }

    // Görsel yükleme ve paylaşma
    function initializeFileUpload() {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    selectedImage = e.target.result;
                    imagePreview.src = selectedImage;
                    imagePreview.style.display = 'block';
                    imageUploadArea.querySelector('.file-upload-text').textContent = 'Görsel değiştir';
                };
                
                reader.readAsDataURL(file);
                showNotification(`"${file.name}" dosyası seçildi!`, 'success');
            }
        });
        
        document.body.appendChild(fileInput);
    }

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', function() {
            if (!fileInput) {
                initializeFileUpload();
            }
            fileInput.click();
        });
    }

    // GÖNDERİ PAYLAŞMA - Görsel olmayan gönderiler için güncellendi
    if (sharePostBtn) {
        sharePostBtn.addEventListener('click', function() {
            const caption = document.getElementById('post-caption')?.value || '';
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!currentUser) {
                showNotification('Gönderi paylaşmak için giriş yapmalısınız!', 'error');
                closeModal(addPostModal);
                const accountNav = document.getElementById('account-nav');
                if (accountNav) accountNav.click();
                return;
            }
            
            if (!selectedImage && !caption.trim()) {
                showNotification('Lütfen bir görsel seçin veya açıklama yazın!', 'error');
                return;
            }

            const newPost = {
                id: Date.now(),
                image: selectedImage || null,
                imageType: selectedImage ? 'uploaded' : 'none', // Görsel yoksa 'none'
                caption: caption.trim(),
                username: currentUser.username,
                timestamp: new Date().toISOString(),
                likes: 0,
                comments: []
            };

            // Eğer görsel seçilmediyse ve açıklama varsa, görsel olmayan gönderi oluştur
            if (!selectedImage && caption.trim()) {
                newPost.imageType = 'none';
                newPost.image = null;
            }

            posts.unshift(newPost);
            savePosts();
            loadImageFeed(currentFilters);
            
            if (typeof window.onNewPostAdded === 'function') {
                window.onNewPostAdded();
            }
            
            // Modalı temizle ve kapat
            selectedImage = null;
            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.src = '';
            }
            const postCaptionInput = document.getElementById('post-caption');
            if (postCaptionInput) postCaptionInput.value = '';
            if (imageUploadArea) {
                imageUploadArea.querySelector('.file-upload-text').textContent = 'Görsel seçmek için dokun';
            }
            
            closeModal(addPostModal);
            
            // Başarı mesajı - gönderi tipine göre özelleştir
            if (newPost.imageType === 'none') {
                showNotification('Metin gönderiniz paylaşıldı! 📝', 'success');
            } else {
                showNotification('Gönderiniz paylaşıldı! 🖼️', 'success');
            }
        });
    }

    // Sayfa yüklendiğinde görsel akışını yükle
    loadImageFeed();
});