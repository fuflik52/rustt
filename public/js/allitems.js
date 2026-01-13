// Глобальный поиск предметов
// SVG иконки для категорий
const CATEGORY_ICONS = {
    'Оружие': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2l6 6-8 8-6-6 8-8z"/><path d="M4 20l4-4"/><path d="M14 14l6 6"/></svg>',
    'Патроны': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/></svg>',
    'Взрывчатка': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>',
    'Броня': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'Одежда': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
    'Инструменты': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    'Медицина': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    'Еда': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    'Ресурсы': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    'Компоненты': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    'Постройки': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'Мебель': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/></svg>',
    'Электричество': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'Ловушки': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    'Транспорт': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><polygon points="12 15 17 21 7 21 12 15"/></svg>',
    'Фарм': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 00-6.88 17.23l.9-.9A8 8 0 1112 4v8l6 3"/><circle cx="12" cy="12" r="3"/></svg>',
    'Добыча': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/></svg>',
    'Модули оружия': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    'Чаи': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>',
    'Карты доступа': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="7" y2="15.01"/><line x1="11" y1="15" x2="13" y2="15"/></svg>',
    'Декор': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'Разное': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
};

const DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const resultsContainer = document.getElementById('itemsResults');
    const resultsCount = document.getElementById('resultsCount');

    // Обновляем select категорий с иконками
    updateCategorySelect();

    function updateCategorySelect() {
        const options = categoryFilter.querySelectorAll('option');
        // Создаём кастомный dropdown
        createCustomCategoryDropdown();
    }

    function createCustomCategoryDropdown() {
        const selectWrapper = categoryFilter.parentElement;
        
        // Скрываем оригинальный select
        categoryFilter.style.display = 'none';
        
        // Создаём кастомный dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'category-dropdown';
        dropdown.innerHTML = `
            <button class="category-dropdown-btn" type="button">
                <span class="category-icon">${DEFAULT_ICON}</span>
                <span class="category-name">Все категории</span>
                <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="category-dropdown-menu">
                <div class="category-option active" data-value="">
                    <span class="category-icon">${DEFAULT_ICON}</span>
                    <span>Все категории</span>
                </div>
                ${Array.from(categoryFilter.options).slice(1).map(opt => `
                    <div class="category-option" data-value="${opt.value}">
                        <span class="category-icon">${CATEGORY_ICONS[opt.value] || DEFAULT_ICON}</span>
                        <span>${opt.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        selectWrapper.appendChild(dropdown);
        
        // Обработчики
        const btn = dropdown.querySelector('.category-dropdown-btn');
        const menu = dropdown.querySelector('.category-dropdown-menu');
        const options = dropdown.querySelectorAll('.category-option');
        
        btn.addEventListener('click', () => {
            dropdown.classList.toggle('open');
        });
        
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const value = opt.dataset.value;
                categoryFilter.value = value;
                
                // Обновляем кнопку
                const icon = opt.querySelector('.category-icon').innerHTML;
                const name = opt.querySelector('span:last-child').textContent;
                btn.querySelector('.category-icon').innerHTML = icon;
                btn.querySelector('.category-name').textContent = name;
                
                // Обновляем активный класс
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                dropdown.classList.remove('open');
                filterItems();
            });
        });
        
        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    }

    function renderResults(items) {
        resultsCount.textContent = items.length;
        
        if (items.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <p>Ничего не найдено</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = items.map(item => `
            <div class="item-result-card" data-shortname="${item.shortname}">
                <div class="item-icon">
                    <img src="/icons/${item.shortname}.png" alt="${item.name}" onerror="this.src='/icons/blueprintbase.png'">
                </div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-shortname" title="Нажмите чтобы скопировать">
                        <code>${item.shortname}</code>
                        <button class="copy-btn" onclick="copyShortname('${item.shortname}', event)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="item-category">
                        <span class="category-badge-icon">${CATEGORY_ICONS[item.category] || DEFAULT_ICON}</span>
                        <span class="category-badge">${item.category || 'Без категории'}</span>
                    </div>
                </div>
                <button class="item-details-btn" onclick="showItemDetails('${item.shortname}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Инфо
                </button>
            </div>
        `).join('');
    }

    function filterItems() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categoryFilter.value;

        if (!query && !category) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <p>Начните вводить название предмета для поиска</p>
                </div>
            `;
            resultsCount.textContent = '0';
            return;
        }

        let filtered = ALL_ITEMS;

        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }

        if (query) {
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(query) ||
                item.shortname.toLowerCase().includes(query)
            );
        }

        renderResults(filtered);
    }

    searchInput.addEventListener('input', filterItems);
    categoryFilter.addEventListener('change', filterItems);
});

// Копирование shortname
function copyShortname(shortname, event) {
    event.stopPropagation();
    navigator.clipboard.writeText(shortname).then(() => {
        showToast(`Скопировано: ${shortname}`, 'success');
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

// Показать детали предмета
async function showItemDetails(shortname) {
    const item = ALL_ITEMS.find(i => i.shortname === shortname);
    if (!item) return;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById('itemDetailsModal');
    if (oldModal) oldModal.remove();

    // Загружаем полную инфу и контейнеры параллельно
    let fullInfo = null;
    let containers = [];
    
    try {
        const [infoResp, containersResp] = await Promise.all([
            fetch(`/api/item/${encodeURIComponent(shortname)}`),
            fetch(`/api/item/${encodeURIComponent(shortname)}/containers`)
        ]);
        
        if (infoResp.ok) fullInfo = await infoResp.json();
        if (containersResp.ok) containers = await containersResp.json();
    } catch (e) {
        console.error('Error loading item details:', e);
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'itemDetailsModal';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    
    // Формируем контент
    let detailsHtml = `
        <div class="item-detail-row">
            <span class="detail-label">Shortname:</span>
            <span class="detail-value">
                <code>${shortname}</code>
                <button class="copy-btn-small" onclick="copyShortname('${shortname}', event)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </span>
        </div>
    `;

    if (fullInfo) {
        if (fullInfo.itemid) {
            detailsHtml += `
                <div class="item-detail-row">
                    <span class="detail-label">Item ID:</span>
                    <span class="detail-value">
                        <code>${fullInfo.itemid}</code>
                        <button class="copy-btn-small" onclick="copyShortname('${fullInfo.itemid}', event)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </span>
                </div>
            `;
        }
        if (fullInfo.Description) {
            detailsHtml += `
                <div class="item-detail-row item-detail-desc">
                    <span class="detail-label">Описание:</span>
                    <span class="detail-value">${fullInfo.Description}</span>
                </div>
            `;
        }
        if (fullInfo.Category) {
            detailsHtml += `
                <div class="item-detail-row">
                    <span class="detail-label">Категория:</span>
                    <span class="detail-value"><span class="category-badge">${fullInfo.Category}</span></span>
                </div>
            `;
        }
        if (fullInfo.stackable) {
            detailsHtml += `
                <div class="item-detail-row">
                    <span class="detail-label">Стак:</span>
                    <span class="detail-value">${fullInfo.stackable}</span>
                </div>
            `;
        }
        if (fullInfo.rarity) {
            detailsHtml += `
                <div class="item-detail-row">
                    <span class="detail-label">Редкость:</span>
                    <span class="detail-value"><span class="rarity-badge rarity-${fullInfo.rarity.toLowerCase()}">${fullInfo.rarity}</span></span>
                </div>
            `;
        }
    } else {
        detailsHtml += `
            <div class="item-detail-row">
                <span class="detail-label">Категория:</span>
                <span class="detail-value"><span class="category-badge">${item.category || 'Без категории'}</span></span>
            </div>
        `;
    }

    detailsHtml += `
        <div class="item-detail-row">
            <span class="detail-label">Команда выдачи:</span>
            <span class="detail-value">
                <code class="give-command">inventory.give ${shortname} 1</code>
                <button class="copy-btn-small" onclick="copyShortname('inventory.give ${shortname} 1', event)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </span>
        </div>
    `;

    // Секция контейнеров
    detailsHtml += `
        <div class="item-containers-section">
            <div class="containers-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span>В каких контейнерах</span>
                <span class="containers-count">${containers.length}</span>
            </div>
            <div class="containers-list">
                ${containers.length > 0 ? containers.map(c => `
                    <a href="/container/${encodeURIComponent(c.shortname)}" class="container-link">
                        ${c.image ? `<img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'">` : ''}
                        <div class="container-link-info">
                            <span class="container-link-name">${c.name}</span>
                            <span class="container-link-stats">
                                Шанс: ${c.itemData.rareDrop || 100}% | 
                                Кол-во: ${c.itemData.amount?.minAmount || 1}-${c.itemData.amount?.maxAmount || 1}
                            </span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </a>
                `).join('') : `
                    <div class="no-containers">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <line x1="4" y1="4" x2="20" y2="20"/>
                        </svg>
                        <span>Не добавлен ни в один контейнер</span>
                    </div>
                `}
            </div>
        </div>
    `;

    modal.innerHTML = `
        <div class="modal-content modal-item-info" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <img src="/icons/${encodeURIComponent(shortname)}.png" alt="${item.name}" onerror="this.style.display='none'" style="width:32px;height:32px;">
                    ${fullInfo?.Name || item.name}
                </h2>
                <button class="close-btn" onclick="document.getElementById('itemDetailsModal').remove()">✕</button>
            </div>
            <div class="item-details-body">
                ${detailsHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
