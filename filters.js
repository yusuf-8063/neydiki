// filters.js - Filtreleme Sistemi (Scroll Düzeltmeli)
document.addEventListener('DOMContentLoaded', function() {
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const filtersSidebar = document.getElementById('filters-sidebar');
    const closeFilters = document.getElementById('close-filters');
    const filterOptions = document.querySelectorAll('.filter-option');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const activeFiltersContainer = document.getElementById('active-filters');
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');

    let activeFilters = {
        sort: 'newest',
        category: [],
        time: 'all'
    };

    // Event Listeners
    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', toggleFiltersSidebar);
    }

    if (closeFilters) {
        closeFilters.addEventListener('click', closeFiltersSidebar);
    }

    if (filterOptions) {
        filterOptions.forEach(option => {
            option.addEventListener('click', handleFilterOptionClick);
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Filtre sidebar'ını aç/kapa
    function toggleFiltersSidebar() {
        if (filtersSidebar) {
            filtersSidebar.classList.toggle('active');
            document.body.style.overflow = filtersSidebar.classList.contains('active') ? 'hidden' : 'auto';
        }
    }

    function closeFiltersSidebar() {
        if (filtersSidebar) {
            filtersSidebar.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // Filtre seçeneklerini işle
    function handleFilterOptionClick(e) {
        const option = e.currentTarget;
        const filterType = option.dataset.filter;
        const filterValue = option.dataset.value;

        if (filterType === 'sort' || filterType === 'time') {
            // Tek seçimlik filtreler
            document.querySelectorAll(`.filter-option[data-filter="${filterType}"]`).forEach(opt => {
                opt.classList.remove('active');
            });
            option.classList.add('active');
            activeFilters[filterType] = filterValue;
        } else {
            // Çoklu seçim filtreleri
            option.classList.toggle('active');
            const index = activeFilters[filterType].indexOf(filterValue);
            if (index > -1) {
                activeFilters[filterType].splice(index, 1);
            } else {
                activeFilters[filterType].push(filterValue);
            }
        }

        updateActiveFiltersDisplay();
    }

    // Aktif filtreleri güncelle
    function updateActiveFiltersDisplay() {
        if (!activeFiltersContainer) return;

        activeFiltersContainer.innerHTML = '';

        // Sıralama filtresi
        if (activeFilters.sort && activeFilters.sort !== 'newest') {
            const tag = createFilterTag('Sıralama: ' + getFilterDisplayName('sort', activeFilters.sort), 'sort', activeFilters.sort);
            activeFiltersContainer.appendChild(tag);
        }

        // Kategori filtreleri
        activeFilters.category.forEach(category => {
            const tag = createFilterTag('Kategori: ' + getFilterDisplayName('category', category), 'category', category);
            activeFiltersContainer.appendChild(tag);
        });

        // Zaman filtresi
        if (activeFilters.time && activeFilters.time !== 'all') {
            const tag = createFilterTag('Zaman: ' + getFilterDisplayName('time', activeFilters.time), 'time', activeFilters.time);
            activeFiltersContainer.appendChild(tag);
        }

        // Aktif filtre sayısını güncelle
        updateActiveFilterCount();
    }

    // Filtre etiketi oluştur
    function createFilterTag(text, filterType, filterValue) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${text}
            <i class="fas fa-times"></i>
        `;

        tag.addEventListener('click', function() {
            removeFilter(filterType, filterValue);
        });

        return tag;
    }

    // Aktif filtre sayısını güncelle
    function updateActiveFilterCount() {
        const filterBadge = document.getElementById('active-filter-count');
        if (!filterBadge) return;

        let count = 0;
        if (activeFilters.sort !== 'newest') count++;
        if (activeFilters.time !== 'all') count++;
        count += activeFilters.category.length;

        filterBadge.textContent = count;
        filterBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Filtre kaldır
    function removeFilter(filterType, filterValue) {
        if (filterType === 'sort' || filterType === 'time') {
            activeFilters[filterType] = filterType === 'sort' ? 'newest' : 'all';
            document.querySelectorAll(`.filter-option[data-filter="${filterType}"]`).forEach(opt => {
                opt.classList.remove('active');
            });
            const defaultOption = document.querySelector(`.filter-option[data-filter="${filterType}"][data-value="${filterType === 'sort' ? 'newest' : 'all'}"]`);
            if (defaultOption) defaultOption.classList.add('active');
        } else {
            const index = activeFilters[filterType].indexOf(filterValue);
            if (index > -1) {
                activeFilters[filterType].splice(index, 1);
                const option = document.querySelector(`.filter-option[data-filter="${filterType}"][data-value="${filterValue}"]`);
                if (option) option.classList.remove('active');
            }
        }

        updateActiveFiltersDisplay();
        applyFilters();
    }

    // Filtre görünen adını al
    function getFilterDisplayName(filterType, value) {
        const displayNames = {
            sort: {
                'newest': 'En Yeni',
                'popular': 'En Popüler',
                'most-liked': 'En Çok Beğenilen'
            },
            category: {
                'design': 'Tasarım',
                'art': 'Sanat',
                'photography': 'Fotoğraf',
                'nature': 'Doğa'
            },
            time: {
                'today': 'Bugün',
                'week': 'Bu Hafta',
                'month': 'Bu Ay',
                'all': 'Tüm Zamanlar'
            }
        };

        return displayNames[filterType]?.[value] || value;
    }

    // Tüm filtreleri temizle
    function clearAllFilters() {
        activeFilters = {
            sort: 'newest',
            category: [],
            time: 'all'
        };

        // Tüm filtre seçeneklerini sıfırla
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('active');
        });

        // Varsayılan seçenekleri aktif et
        const defaultSort = document.querySelector('.filter-option[data-filter="sort"][data-value="newest"]');
        const defaultTime = document.querySelector('.filter-option[data-filter="time"][data-value="all"]');
        
        if (defaultSort) defaultSort.classList.add('active');
        if (defaultTime) defaultTime.classList.add('active');

        updateActiveFiltersDisplay();
        applyFilters();
    }

    // Filtreleri uygula
    function applyFilters() {
        if (typeof window.filterPosts === 'function') {
            window.filterPosts(activeFilters);
        }
        
        // Mobilde filtreleri kapat
        if (window.innerWidth <= 768) {
            closeFiltersSidebar();
            
            // Mobilde uygula butonundan sonra ek boşluk bırak
            setTimeout(() => {
                const floatingNav = document.querySelector('.floating-nav');
                if (floatingNav) {
                    floatingNav.style.marginBottom = '20px';
                }
            }, 100);
        }
        
        showNotification('Filtreler uygulandı!', 'success');
    }

    // Arama işlemi
    function handleSearch() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            if (typeof window.searchPosts === 'function') {
                window.searchPosts(searchTerm);
            }
            showNotification(`"${searchTerm}" için arama yapılıyor...`, 'info');
        }
    }

    // Global fonksiyonlar
    window.getActiveFilters = function() {
        return activeFilters;
    };

    window.setActiveFilters = function(newFilters) {
        activeFilters = { ...activeFilters, ...newFilters };
        updateActiveFiltersDisplay();
    };

    // Başlangıçta aktif filtreleri göster
    updateActiveFiltersDisplay();

    // Mobilde dışarı tıklama ile kapatma
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && filtersSidebar && filtersSidebar.classList.contains('active')) {
            if (!filtersSidebar.contains(e.target) && !mobileFilterToggle.contains(e.target)) {
                closeFiltersSidebar();
            }
        }
    });

    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && filtersSidebar && filtersSidebar.classList.contains('active')) {
            closeFiltersSidebar();
        }
    });
});