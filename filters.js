// filters.js - ANLIK ARAMA VE FİLTRELEME SİSTEMİ (GÜNCEL)
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

    // Varsayılan Filtre Durumu
    let currentFilters = {
        sort: 'newest', // newest, oldest, most-liked, most-commented
        mediaType: [],  // image, text
        dateStart: null,
        dateEnd: null,
        search: ''
    };

    // --- ARAMA İŞLEMLERİ (REAL-TIME / CANLI) ---
    
    // Arama fonksiyonu: Hem input değişiminde hem butonda kullanılır
    const handleLiveSearch = (e) => {
        if(searchInput) {
            const term = searchInput.value.trim().toLowerCase();
            
            // Eğer arama terimi değiştiyse işlem yap
            if (currentFilters.search !== term) {
                currentFilters.search = term;
                applyFiltersToFeed();
                renderActiveTags();
            }
        }
    };

    // 1. Yazarken anlık filtreleme (Silince otomatik düzelir)
    if (searchInput) {
        searchInput.addEventListener('input', handleLiveSearch);
        
        // Enter tuşuna basılınca klavyeyi kapatmak için (Mobilde)
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchInput.blur();
            }
        });
    }

    // 2. Büyüteç ikonuna tıklayınca da çalışsın
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLiveSearch();
        });
    }

    // --- DİĞER FİLTRE EVENTLERİ ---

    // Mobil Menü Aç/Kapa
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

    // Seçenek Tıklamaları (Sıralama ve Kategoriler)
    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.dataset.filter;
            const value = this.dataset.value;

            if (type === 'sort') {
                // Sıralama (Tekli Seçim)
                document.querySelectorAll(`.filter-option[data-filter="sort"]`).forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                currentFilters.sort = value;
            } else if (type === 'mediaType') {
                // Medya Tipi (Çoklu Seçim)
                this.classList.toggle('active');
                if (this.classList.contains('active')) {
                    if (!currentFilters.mediaType.includes(value)) currentFilters.mediaType.push(value);
                } else {
                    currentFilters.mediaType = currentFilters.mediaType.filter(item => item !== value);
                }
            }
            renderActiveTags();
        });
    });

    // Tarih Değişimleri
    if(startDateInput) startDateInput.addEventListener('change', renderActiveTags);
    if(endDateInput) endDateInput.addEventListener('change', renderActiveTags);

    // Temizle Butonu
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            // UI Sıfırla
            document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('active'));
            const defaultSort = document.querySelector('.filter-option[data-value="newest"]');
            if(defaultSort) defaultSort.classList.add('active');
            
            if(startDateInput) startDateInput.value = '';
            if(endDateInput) endDateInput.value = '';
            
            // Arama kutusunu da temizle
            if(searchInput) searchInput.value = '';

            // Hafızayı Sıfırla
            currentFilters = {
                sort: 'newest',
                mediaType: [],
                dateStart: null,
                dateEnd: null,
                search: ''
            };
            
            renderActiveTags();
            applyFiltersToFeed();
            showNotification('Filtreler ve arama sıfırlandı.', 'info');
        });
    }

    // Uygula Butonu (Sidebar içindeki)
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.dateStart = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
            currentFilters.dateEnd = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;

            if (currentFilters.dateStart && currentFilters.dateEnd && currentFilters.dateStart > currentFilters.dateEnd) {
                showNotification('Başlangıç tarihi bitiş tarihinden sonra olamaz!', 'error');
                return;
            }

            applyFiltersToFeed();
            
            if (window.innerWidth <= 768) {
                filtersSidebar.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
            
            showNotification('Sonuçlar güncellendi', 'success');
        });
    }

    // --- ENTEGRASYON ---
    function applyFiltersToFeed() {
        if (typeof window.updateFeedFilters === 'function') {
            window.updateFeedFilters(currentFilters);
            updateBadge();
        } else {
            console.error('Hata: Feed.js henüz yüklenmedi.');
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

        // 1. Arama Etiketi (En önde görünsün)
        if (currentFilters.search) {
            createTag(`<i class="fas fa-search"></i> "${currentFilters.search}"`);
        }

        // 2. Sıralama
        if(currentFilters.sort !== 'newest') {
            let labelText = '';
            switch(currentFilters.sort) {
                case 'oldest': labelText = 'En Eski'; break;
                case 'most-liked': labelText = 'En Çok Beğenilen'; break;
                case 'most-commented': labelText = 'En Çok Tartışılan'; break;
            }
            if(labelText) createTag(labelText);
        }

        // 3. Medya Tipi
        currentFilters.mediaType.forEach(type => {
            if(type === 'image') createTag('Görsel Paylaşımlar');
            if(type === 'text') createTag('Sadece Yazı');
        });

        // 4. Tarih
        const sDate = startDateInput ? startDateInput.value : null;
        const eDate = endDateInput ? endDateInput.value : null;
        if (sDate || eDate) createTag('Tarih Filtresi');

        if (!hasActive) {
            activeFiltersContainer.innerHTML = '<div class="no-filters">Henüz filtre seçilmedi</div>';
        }
    }

    // Filtre Sayısı Rozeti
    function updateBadge() {
        const badge = document.getElementById('active-filter-count');
        if (!badge) return;

        let count = 0;
        if (currentFilters.sort !== 'newest') count++;
        if (currentFilters.mediaType.length > 0) count++;
        if (currentFilters.dateStart || currentFilters.dateEnd) count++;
        // Arama yapılıyorsa onu da sayıya dahil et
        if (currentFilters.search) count++;
        
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    renderActiveTags();
});
