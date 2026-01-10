// filters.js - ANLIK ARAMA VE FİLTRELEME SİSTEMİ (CHECKBOX GÜNCELLEMESİ)
document.addEventListener('DOMContentLoaded', function() {
    // Element Seçimleri
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const filtersSidebar = document.getElementById('filters-sidebar');
    const closeFilters = document.getElementById('close-filters');
    const filterOptions = document.querySelectorAll('.filter-option');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    
    // Arama Elementleri
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    const activeFiltersContainer = document.getElementById('active-filters');

    // İç Durum (Logic State)
    let internalState = {
        timeSort: 'newest',       // 'newest' veya 'oldest'
        isLiked: false,           // 'most-liked' seçili mi?
        isDiscussed: false        // 'most-commented' seçili mi?
    };

    // Global Filtre Durumu (Feed.js'e gidecek olan)
    let currentFilters = {
        sort: 'newest', 
        mediaType: [],
        dateStart: null,
        dateEnd: null,
        search: ''
    };

    // --- ARAMA İŞLEMLERİ (REAL-TIME / CANLI) ---
    
    const handleLiveSearch = (e) => {
        if(searchInput) {
            const term = searchInput.value.trim().toLowerCase();
            if (currentFilters.search !== term) {
                currentFilters.search = term;
                applyFiltersToFeed();
                renderActiveTags();
            }
        }
    };

    if (searchInput) {
        searchInput.addEventListener('input', handleLiveSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchInput.blur();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLiveSearch();
        });
    }

    // --- DİĞER FİLTRE EVENTLERİ ---

    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', () => {
            filtersSidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
            renderActiveTags();
        });
    }

    if (closeFilters) {
        closeFilters.addEventListener('click', () => {
            filtersSidebar.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    // --- TIKLAMA MANTIĞI GÜNCELLEMESİ ---
    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.dataset.filter;
            const value = this.dataset.value;

            // 1. ZAMAN SIRALAMASI (Radio Mantığı)
            if (type === 'timeSort') {
                document.querySelectorAll(`.filter-option[data-filter="timeSort"]`).forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                internalState.timeSort = value;
                
                // Zaman değişince özel sıralamaları (like/discuss) kaldırabiliriz veya tutabiliriz.
                // Kullanıcı deneyimi için: Zaman seçerse, özel sıralamayı kapatmıyoruz ama
                // mantık olarak özel sıralama seçiliyse o baskın gelir.
            } 
            
            // 2. POPÜLERLİK SIRALAMASI (Checkbox Mantığı - Öncelikli)
            else if (type === 'featureSort') {
                if (value === 'most-liked') {
                    internalState.isLiked = !internalState.isLiked;
                    // Eğer Beğeni seçildiyse, Tartışmayı kapat (Tekil sıralama için)
                    if(internalState.isLiked) internalState.isDiscussed = false;
                } else if (value === 'most-commented') {
                    internalState.isDiscussed = !internalState.isDiscussed;
                    // Eğer Tartışma seçildiyse, Beğeniyi kapat
                    if(internalState.isDiscussed) internalState.isLiked = false;
                }
                
                // UI Güncelleme
                updateCheckboxUI();
            } 
            
            // 3. MEDYA TİPİ (Çoklu Seçim)
            else if (type === 'mediaType') {
                this.classList.toggle('active');
                if (this.classList.contains('active')) {
                    if (!currentFilters.mediaType.includes(value)) currentFilters.mediaType.push(value);
                } else {
                    currentFilters.mediaType = currentFilters.mediaType.filter(item => item !== value);
                }
            }

            // SIRALAMA KARARI VER
            determineFinalSort();
            renderActiveTags();
        });
    });

    function updateCheckboxUI() {
        const likedBtn = document.querySelector(`.filter-option[data-value="most-liked"]`);
        const discussedBtn = document.querySelector(`.filter-option[data-value="most-commented"]`);

        if (internalState.isLiked) likedBtn.classList.add('active');
        else likedBtn.classList.remove('active');

        if (internalState.isDiscussed) discussedBtn.classList.add('active');
        else discussedBtn.classList.remove('active');
    }

    function determineFinalSort() {
        // Öncelik: Özel Sıralamalar > Zaman Sıralaması
        if (internalState.isLiked) {
            currentFilters.sort = 'most-liked';
        } else if (internalState.isDiscussed) {
            currentFilters.sort = 'most-commented';
        } else {
            currentFilters.sort = internalState.timeSort;
        }
    }

    if(startDateInput) startDateInput.addEventListener('change', renderActiveTags);
    if(endDateInput) endDateInput.addEventListener('change', renderActiveTags);

    // Temizle Butonu
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            // UI Sıfırla
            document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('active'));
            
            // Varsayılan Zamanı Seç
            const defaultSort = document.querySelector('.filter-option[data-value="newest"]');
            if(defaultSort) defaultSort.classList.add('active');
            
            if(startDateInput) startDateInput.value = '';
            if(endDateInput) endDateInput.value = '';
            if(searchInput) searchInput.value = '';

            // Hafızayı Sıfırla
            internalState = {
                timeSort: 'newest',
                isLiked: false,
                isDiscussed: false
            };
            
            currentFilters = {
                sort: 'newest',
                mediaType: [],
                dateStart: null,
                dateEnd: null,
                search: ''
            };
            
            renderActiveTags();
            applyFiltersToFeed();
            showNotification('Filtreler sıfırlandı.', 'info');
        });
    }

    // Uygula Butonu
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.dateStart = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
            currentFilters.dateEnd = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;

            if (currentFilters.dateStart && currentFilters.dateEnd && currentFilters.dateStart > currentFilters.dateEnd) {
                showNotification('Tarih hatası!', 'error');
                return;
            }

            applyFiltersToFeed();
            
            if (window.innerWidth <= 768) {
                filtersSidebar.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
            
            showNotification('Güncellendi', 'success');
        });
    }

    // --- ENTEGRASYON ---
    function applyFiltersToFeed() {
        if (typeof window.updateFeedFilters === 'function') {
            window.updateFeedFilters(currentFilters);
            updateBadge();
        }
    }

    // --- ETİKETLERİ GÖSTER ---
    function renderActiveTags() {
        if(!activeFiltersContainer) return;
        activeFiltersContainer.innerHTML = '';
        
        let hasActive = false;
        const createTag = (text) => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `<span>${text}</span>`;
            activeFiltersContainer.appendChild(tag);
            hasActive = true;
        };

        if (currentFilters.search) createTag(`<i class="fas fa-search"></i> "${currentFilters.search}"`);

        // Etiket Mantığı
        if (internalState.isLiked) createTag('En Çok Beğenilen');
        else if (internalState.isDiscussed) createTag('En Çok Tartışılan');
        else if (internalState.timeSort === 'oldest') createTag('En Eski');
        // 'En Yeni' varsayılan olduğu için etiket göstermiyoruz

        currentFilters.mediaType.forEach(type => {
            if(type === 'image') createTag('Görsel');
            if(type === 'text') createTag('Yazı');
        });

        if (startDateInput && startDateInput.value) createTag('Tarih');

        if (!hasActive) {
            activeFiltersContainer.innerHTML = '<div class="no-filters">Henüz filtre seçilmedi</div>';
        }
    }

    function updateBadge() {
        const badge = document.getElementById('active-filter-count');
        if (!badge) return;

        let count = 0;
        if (currentFilters.sort !== 'newest') count++;
        if (currentFilters.mediaType.length > 0) count++;
        if (currentFilters.dateStart || currentFilters.dateEnd) count++;
        if (currentFilters.search) count++;
        
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    renderActiveTags();
});
