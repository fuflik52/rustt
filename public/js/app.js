// ============ LOCAL STATE ============
let localItems = [];
let hasChanges = false;
let autoSaveInterval = null;

function initLocalState() {
    if (typeof CONTAINER_DATA !== 'undefined' && CONTAINER_DATA.lootPresets) {
        localItems = JSON.parse(JSON.stringify(CONTAINER_DATA.lootPresets));
    }
    
    // Перерисовать с правильными слотами (оружие vs обычные предметы)
    renderItems();
    
    // Автосохранение каждую минуту
    autoSaveInterval = setInterval(() => {
        if (hasChanges) saveToServer();
    }, 60000);
    
    // Автосохранение при уходе со страницы (без диалога)
    window.addEventListener('beforeunload', () => {
        if (hasChanges) {
            // Синхронный запрос для гарантированного сохранения
            navigator.sendBeacon(`/api/container/${encodeURIComponent(CONTAINER_NAME)}/items/bulk`, 
                new Blob([JSON.stringify({ items: localItems })], { type: 'application/json' }));
        }
    });
    
    // Перехватываем клики по ссылкам для сохранения перед переходом
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a[href]');
        if (link && hasChanges && !link.href.includes('#')) {
            e.preventDefault();
            await saveToServer();
            window.location.href = link.href;
        }
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', handleHotkeys);
}

async function saveToServer() {
    if (!CONTAINER_NAME || !hasChanges) return;
    
    try {
        await fetch(`/api/container/${encodeURIComponent(CONTAINER_NAME)}/items/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: localItems })
        });
        hasChanges = false;
        showToast('Сохранено на сервер', 'success');
    } catch (err) {
        showToast('Ошибка сохранения', 'error');
    }
}

function renderItems() {
    const container = document.getElementById('lootRows');
    const emptyState = document.getElementById('emptyState');
    const lootHeader = document.getElementById('lootHeader');
    const addItemRow = document.querySelector('.add-item-row');
    
    if (!container) return;
    
    // Если нет предметов - показываем empty state
    if (localItems.length === 0) {
        if (emptyState) emptyState.style.display = '';
        if (lootHeader) lootHeader.style.display = 'none';
        if (addItemRow) addItemRow.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    // Есть предметы - скрываем empty state, показываем header
    if (emptyState) emptyState.style.display = 'none';
    if (lootHeader) lootHeader.style.display = '';
    if (addItemRow) addItemRow.style.display = '';
    
    let html = localItems.map((item, index) => {
        const isWeapon = WEAPONS_WITH_MODS.includes(item.shortname);
        const attachments = item.attachments || [];
        
        let slotsHtml = '';
        
        // 5-й слот для патронов (для оружия)
        const ammoSlot = (item.ammo && item.ammo.shortname)
            ? `<div class="item-slot ammo-slot filled" onclick="event.stopPropagation(); openAmmoModal(${index})" title="${item.ammo.shortname} x${item.ammo.amount || 0}"><img src="/icons/${encodeURIComponent(item.ammo.shortname)}.png"><span class="ammo-count">${item.ammo.amount || 0}</span></div>`
            : `<div class="item-slot ammo-slot placeholder" onclick="event.stopPropagation(); openAmmoModal(${index})" title="Добавить патроны"><img src="/icons/ammo.rifle.png" class="slot-placeholder-icon"></div>`;
        
        if (isWeapon) {
            // Для оружия - 4 слота модулей + 1 слот патронов
            const slotTypes = ['scope', 'muzzle', 'magazine', 'underbarrel'];
            const slotIcons = {
                scope: 'weapon.mod.small.scope.png',
                muzzle: 'weapon.mod.silencer.png',
                magazine: 'weapon.mod.extendedmags.png',
                underbarrel: 'weapon.mod.lasersight.png'
            };
            slotsHtml = '<div class="item-slots">';
            slotTypes.forEach(slotType => {
                const slotMods = MOD_SLOTS[slotType]?.mods || [];
                const installedMod = attachments.find(att => slotMods.some(m => m.shortname === att));
                
                if (installedMod) {
                    slotsHtml += `<div class="item-slot filled" title="${installedMod}"><img src="/icons/${encodeURIComponent(installedMod)}.png"></div>`;
                } else {
                    slotsHtml += `<div class="item-slot placeholder" onclick="event.stopPropagation(); openItemEdit(${index})" title="${MOD_SLOTS[slotType]?.label || slotType}"><img src="/icons/${slotIcons[slotType]}" class="slot-placeholder-icon"></div>`;
                }
            });
            slotsHtml += ammoSlot;
            slotsHtml += '</div>';
        } else {
            // Для остальных - 1 слот чертежа + 4 заблокированных
            const bpSlot = item.isBlueprint 
                ? `<div class="item-slot filled" onclick="event.stopPropagation(); toggleBlueprint(${index})" title="Убрать чертёж"><img src="/icons/blueprintbase.png"></div>`
                : `<div class="item-slot placeholder" onclick="event.stopPropagation(); toggleBlueprint(${index})" title="Добавить чертёж"><img src="/icons/blueprintbase.png" class="slot-placeholder-icon"></div>`;
            const lockedSlot = `<div class="item-slot locked"><img src="/icons/lock.key.png" class="slot-placeholder-icon"></div>`;
            slotsHtml = `<div class="item-slots">${bpSlot}${lockedSlot}${lockedSlot}${lockedSlot}${lockedSlot}</div>`;
        }
        
        return `
        <div class="loot-row" data-index="${index}">
            <div class="loot-identity" onclick="openItemEdit(${index})" style="cursor:pointer">
                <span class="loot-num">${index + 1}</span>
                <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.style.display='none'">
                <span class="item-name">${getItemDisplayName(item.shortname)}</span>
                ${slotsHtml}
            </div>
            <input type="number" class="loot-input" value="${item.rareDrop || 100}" min="1" max="100" onchange="updateItemLocal(${index}, 'rareDrop', this.value)">
            <input type="number" class="loot-input" value="${item.amount?.minAmount || 1}" min="1" onchange="updateItemLocal(${index}, 'minAmount', this.value)">
            <input type="number" class="loot-input" value="${item.amount?.maxAmount || 1}" min="1" onchange="updateItemLocal(${index}, 'maxAmount', this.value)">
            <input type="number" class="loot-input loot-skin" value="${item.skinID || 0}" min="0" onchange="updateItemLocal(${index}, 'skinID', this.value)">
            <div class="card-inputs">
                <div class="card-input-group">
                    <span class="card-input-label">Шанс</span>
                    <input type="number" class="loot-input" value="${item.rareDrop || 100}" min="1" max="100" onchange="updateItemLocal(${index}, 'rareDrop', this.value)">
                </div>
                <div class="card-input-group">
                    <span class="card-input-label">Мин</span>
                    <input type="number" class="loot-input" value="${item.amount?.minAmount || 1}" min="1" onchange="updateItemLocal(${index}, 'minAmount', this.value)">
                </div>
                <div class="card-input-group">
                    <span class="card-input-label">Макс</span>
                    <input type="number" class="loot-input" value="${item.amount?.maxAmount || 1}" min="1" onchange="updateItemLocal(${index}, 'maxAmount', this.value)">
                </div>
                <div class="card-input-group">
                    <span class="card-input-label">Скин</span>
                    <input type="number" class="loot-input" value="${item.skinID || 0}" min="0" onchange="updateItemLocal(${index}, 'skinID', this.value)">
                </div>
            </div>
            <button class="loot-copy" onclick="copyItem(${index})" title="Копировать настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="loot-delete" onclick="removeItemLocal(${index})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    `}).join('');
    
    // Добавляем карточки "Добавить предмет" только для режима карточек
    const lootTable = document.getElementById('lootTable');
    const isCardsView = lootTable && lootTable.classList.contains('view-cards');
    
    if (isCardsView && localItems.length > 0) {
        // Рассчитываем сколько карточек в строке (примерно 7 при ширине 165px)
        const itemsPerRow = 7;
        const itemsInLastRow = localItems.length % itemsPerRow;
        // Если ряд полный (itemsInLastRow === 0) - добавляем 1 карточку для удобства
        // Если ряд неполный - добавляем недостающие карточки
        const emptySlots = itemsInLastRow === 0 ? 1 : itemsPerRow - itemsInLastRow;
        
        for (let i = 0; i < emptySlots; i++) {
            html += `
                <div class="loot-row add-card" onclick="openItemPicker()">
                    <div class="add-card-content">
                        <div class="add-card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="4 2"/>
                                <line x1="12" y1="8" x2="12" y2="16"/>
                                <line x1="8" y1="12" x2="16" y2="12"/>
                            </svg>
                        </div>
                        <span class="add-card-title">Добавить</span>
                        <span class="add-card-hint">Нажмите для выбора</span>
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

function getItemDisplayName(shortname) {
    if (typeof ALL_ITEMS !== 'undefined') {
        const item = ALL_ITEMS.find(i => i.shortname === shortname);
        if (item) return item.name;
    }
    return shortname;
}

function updateItemLocal(index, field, value) {
    if (index < 0 || index >= localItems.length) return;
    
    if (field === 'minAmount' || field === 'maxAmount') {
        if (!localItems[index].amount) localItems[index].amount = { minAmount: 1, maxAmount: 1 };
        localItems[index].amount[field] = parseInt(value) || 1;
    } else if (field === 'skinID') {
        localItems[index].skinID = parseInt(value) || 0;
    } else if (field === 'rareDrop') {
        localItems[index].rareDrop = parseInt(value) || 100;
    }
    
    hasChanges = true;
}

function toggleBlueprint(index) {
    if (index < 0 || index >= localItems.length) return;
    localItems[index].isBlueprint = !localItems[index].isBlueprint;
    hasChanges = true;
    renderItems();
    showToast(localItems[index].isBlueprint ? 'Чертёж добавлен' : 'Чертёж убран', 'success');
}

function removeItemLocal(index) {
    if (index < 0 || index >= localItems.length) return;
    localItems.splice(index, 1);
    hasChanges = true;
    renderItems();
    showToast('Предмет удалён', 'success');
}

function addItemLocal(shortname) {
    localItems.push({
        shortname,
        displayName: '',
        rareDrop: 100,
        isBlueprint: false,
        amount: { minAmount: 1, maxAmount: 1 },
        skinID: 0
    });
    hasChanges = true;
    renderItems();
    showToast('Предмет добавлен', 'success');
    
    // Скролл к новому элементу
    setTimeout(() => {
        const rows = document.querySelectorAll('.loot-row');
        if (rows.length > 0) rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// ============ THEME ============
const THEME_DATA = {
    light: { name: 'Светлая' },
    dark: { name: 'Тёмная' },
    rust: { name: 'Rust' },
    blood: { name: 'Blood' }
};

function initTheme() {
    const saved = localStorage.getItem('lootEditorTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeDropdown(saved);
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('themeDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

function toggleThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

function selectTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lootEditorTheme', theme);
    updateThemeDropdown(theme);
    
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

function updateThemeDropdown(theme) {
    const data = THEME_DATA[theme] || THEME_DATA.light;
    
    const nameEl = document.getElementById('themeCurrentName');
    if (nameEl) nameEl.textContent = data.name;
    
    // Update active state
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === theme);
    });
}

function setTheme(theme) {
    selectTheme(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const themes = ['light', 'dark', 'rust'];
    const currentIndex = themes.indexOf(current);
    const next = themes[(currentIndex + 1) % themes.length];
    selectTheme(next);
}

function updateThemeSelect() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeDropdown(current);
}

// ============ VIEW MODE ============
function initViewMode() {
    const saved = localStorage.getItem('lootEditorViewMode') || 'rows';
    setViewMode(saved, false);
}

function setViewMode(mode, save = true) {
    const lootTable = document.querySelector('.loot-table');
    const viewToggle = document.getElementById('viewToggle');
    
    if (lootTable) {
        lootTable.classList.remove('view-rows', 'view-cards');
        lootTable.classList.add(`view-${mode}`);
    }
    
    if (viewToggle) {
        viewToggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
    }
    
    if (save) {
        localStorage.setItem('lootEditorViewMode', mode);
    }
    
    // Перерисовываем предметы для обновления карточек "Добавить"
    if (typeof localItems !== 'undefined' && localItems.length > 0) {
        renderItems();
    }
}

// ============ TOAST - iOS Style ============
const toastHistory = new Map(); // Для предотвращения спама

function showToast(message, type = 'info') {
    // Проверяем, не показывали ли такое же уведомление недавно
    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShown = toastHistory.get(key);
    
    if (lastShown && now - lastShown < 2000) {
        return; // Не показываем если прошло меньше 2 секунд
    }
    toastHistory.set(key, now);
    
    // Очищаем старые записи
    if (toastHistory.size > 50) {
        const oldKeys = [...toastHistory.entries()].filter(([_, time]) => now - time > 10000);
        oldKeys.forEach(([k]) => toastHistory.delete(k));
    }
    
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Ограничиваем количество видимых тостов
    const existingToasts = container.querySelectorAll('.toast:not(.hiding)');
    if (existingToasts.length >= 3) {
        existingToasts[0].classList.add('hiding');
        setTimeout(() => existingToasts[0].remove(), 300);
    }
    
    const icons = {
        success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    
    const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Для ошибок добавляем кнопку копирования
    if (type === 'error') {
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <span>${message}</span>
            <button class="toast-copy" title="Копировать">${copyIcon}</button>
        `;
        toast.querySelector('.toast-copy').onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(message).then(() => {
                toast.querySelector('.toast-copy').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
                setTimeout(() => toast.querySelector('.toast-copy').innerHTML = copyIcon, 1000);
            });
        };
    } else {
        toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${message}</span>`;
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ============ CONFIRM DIALOG ============
function showConfirm(title, message) {
    // Предотвращаем повторное открытие
    if (document.querySelector('.confirm-overlay')) return Promise.resolve(false);
    
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay active';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="cancel-btn">Отмена <span class="hotkey-hint">Esc</span></button>
                    <button class="confirm-btn">Удалить <span class="hotkey-hint">Space</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const cleanup = () => {
            document.removeEventListener('keydown', handleKey);
            overlay.remove();
        };
        
        const handleKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                cleanup();
                resolve(true);
            } else if (e.code === 'Escape') {
                e.preventDefault();
                cleanup();
                resolve(false);
            }
        };
        
        document.addEventListener('keydown', handleKey);
        overlay.querySelector('.cancel-btn').onclick = () => { cleanup(); resolve(false); };
        overlay.querySelector('.confirm-btn').onclick = () => { cleanup(); resolve(true); };
        overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    });
}

function showNavigateConfirm(title, message) {
    // Предотвращаем повторное открытие
    if (document.querySelector('.confirm-overlay')) return Promise.resolve(false);
    
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay active';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-icon" style="background: rgba(59, 130, 246, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="cancel-btn">Нет <span class="hotkey-hint">Esc</span></button>
                    <button class="confirm-btn navigate-btn">Перейти <span class="hotkey-hint">Space</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const cleanup = () => {
            document.removeEventListener('keydown', handleKey);
            overlay.remove();
        };
        
        const handleKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                cleanup();
                resolve(true);
            } else if (e.code === 'Escape') {
                e.preventDefault();
                cleanup();
                resolve(false);
            }
        };
        
        document.addEventListener('keydown', handleKey);
        overlay.querySelector('.cancel-btn').onclick = () => { cleanup(); resolve(false); };
        overlay.querySelector('.confirm-btn').onclick = () => { cleanup(); resolve(true); };
        overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    });
}

function closeOnBackdrop(event, closeFn) {
    if (event.target === event.currentTarget) closeFn();
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initViewMode();
    if (typeof CONTAINER_NAME !== 'undefined' && CONTAINER_NAME) {
        initLocalState();
        checkClipboard();
    }
});

// ============ CONTAINER PICKER ============
function openContainerPicker() {
    renderContainerPicker();
    document.getElementById('containerPickerModal').classList.add('active');
    document.getElementById('containerSearch').value = '';
}

function closeContainerPicker() {
    document.getElementById('containerPickerModal').classList.remove('active');
}

function renderContainerPicker() {
    const grid = document.getElementById('containerPickerGrid');
    const search = document.getElementById('containerSearch').value.toLowerCase();
    let list = RUST_CONTAINERS || [];
    const existing = EXISTING_CONTAINERS || [];
    
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.shortname.toLowerCase().includes(search));
    
    grid.innerHTML = list.map(c => {
        const isExisting = existing.includes(c.shortname);
        const imageHtml = c.image 
            ? `<img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><div class="container-thumb-fallback" style="display:none"></div>`
            : `<div class="container-thumb"></div>`;
        const spawnCmd = c.spawn || `spawn ${c.shortname}`;
        return `
            <div class="container-picker-item ${isExisting ? 'exists' : ''}" onclick="addContainerFromPicker('${c.shortname}')">
                ${isExisting ? '<span class="exists-badge">Создан</span>' : ''}
                <div class="container-thumb-wrap">${imageHtml}</div>
                <span class="container-name">${c.name}</span>
                <span class="container-short">${c.shortname}</span>
                <button class="copy-spawn-btn" onclick="event.stopPropagation(); copySpawnCmd('${spawnCmd}')" title="Копировать команду спавна">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    <span>${spawnCmd}</span>
                </button>
            </div>
        `;
    }).join('');
}

function copySpawnCmd(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
        showToast('Команда скопирована: ' + cmd, 'success');
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

function filterContainers() { renderContainerPicker(); }

async function addContainerFromPicker(shortname) {
    const res = await fetch('/api/container', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shortname })
    });
    const data = await res.json();
    if (data.error === 'exists') {
        closeContainerPicker();
        const goTo = await showNavigateConfirm('Контейнер существует', `"${shortname}" уже создан. Перейти к нему?`);
        if (goTo) window.location.href = `/container/${encodeURIComponent(shortname)}`;
        return;
    }
    closeContainerPicker();
    showToast('Контейнер создан', 'success');
    setTimeout(() => window.location.href = `/container/${encodeURIComponent(shortname)}`, 300);
}

// ============ CONTAINER ACTIONS ============
async function deleteContainer(name) {
    const confirmed = await showConfirm('Удалить контейнер?', `<code>${name}</code> будет удалён безвозвратно`);
    if (!confirmed) return;
    await fetch(`/api/container/${encodeURIComponent(name)}`, { method: 'DELETE' });
    showToast('Контейнер удалён', 'success');
    setTimeout(() => {
        if (typeof CONTAINER_NAME !== 'undefined' && CONTAINER_NAME === name) window.location.href = '/';
        else window.location.reload();
    }, 300);
}

async function updateSettings() {
    if (!CONTAINER_NAME) return;
    await fetch(`/api/container/${encodeURIComponent(CONTAINER_NAME)}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            enabled: document.getElementById('containerEnabled').checked,
            minAmount: document.getElementById('minLoot').value,
            maxAmount: document.getElementById('maxLoot').value
        })
    });
    showToast('Настройки сохранены', 'success');
}

function saveAll() { saveToServer(); }

function copyCommand() {
    navigator.clipboard.writeText(`spawn ${CONTAINER_NAME}`).then(() => showToast('Команда скопирована', 'success')).catch(() => showToast('Ошибка копирования', 'error'));
}

// ============ ITEM PICKER ============
let currentCategory = null;
let selectedItems = new Set();

function openItemPicker() {
    currentCategory = null;
    selectedItems.clear();
    renderItemPicker();
    updatePickerFooter();
    document.getElementById('itemPickerModal').classList.add('active');
    document.getElementById('itemSearch').value = '';
    document.getElementById('itemSearch').focus();
}

function closeItemPicker() { 
    document.getElementById('itemPickerModal').classList.remove('active');
    selectedItems.clear();
}

function renderItemPicker() {
    const grid = document.getElementById('itemPickerGrid');
    const categories = document.getElementById('itemCategories');
    if (!grid || !categories) return;
    
    const search = document.getElementById('itemSearch').value.toLowerCase();
    let items = ALL_ITEMS || [];
    const cats = [...new Set(items.map(i => i.category))];
    
    categories.innerHTML = `<button class="category-btn ${!currentCategory ? 'active' : ''}" onclick="setCategory(null)">Все</button>`;
    cats.forEach(cat => { if (cat) categories.innerHTML += `<button class="category-btn ${currentCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</button>`; });
    
    if (currentCategory) items = items.filter(i => i.category === currentCategory);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search) || i.shortname.toLowerCase().includes(search));
    
    grid.innerHTML = items.slice(0, 150).map(item => `
        <div class="picker-item ${selectedItems.has(item.shortname) ? 'selected' : ''}" onclick="toggleItemSelection('${item.shortname}')">
            <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.style.display='none'">
            <span>${item.name}</span>
        </div>
    `).join('');
}

function toggleItemSelection(shortname) {
    if (selectedItems.has(shortname)) {
        selectedItems.delete(shortname);
    } else {
        selectedItems.add(shortname);
    }
    renderItemPicker();
    updatePickerFooter();
}

function updatePickerFooter() {
    const footer = document.getElementById('pickerFooter');
    const count = document.getElementById('selectionCount');
    if (selectedItems.size > 0) {
        footer.classList.add('active');
        count.textContent = `${selectedItems.size} выбрано`;
    } else {
        footer.classList.remove('active');
    }
}

function clearPickerSelection() {
    selectedItems.clear();
    renderItemPicker();
    updatePickerFooter();
}

function addSelectedItems() {
    if (selectedItems.size === 0) return;
    selectedItems.forEach(shortname => {
        addItemLocal(shortname);
    });
    showToast(`Добавлено ${selectedItems.size} предметов`, 'success');
    closeItemPicker();
}

function setCategory(cat) { currentCategory = cat; renderItemPicker(); }
function scrollCategories(dir) { document.getElementById('itemCategories').scrollBy({ left: dir * 150, behavior: 'smooth' }); }
function filterItems() { renderItemPicker(); }

function addItem(shortname) {
    closeItemPicker();
    addItemLocal(shortname);
}

// ============ TABLE SEARCH ============
function filterLootTable() {
    const input = document.getElementById('headerSearchInput');
    const search = input ? input.value.toLowerCase().trim() : '';
    const rows = document.querySelectorAll('#lootRows .loot-row');
    const countEl = document.getElementById('headerSearchCount');
    
    let visibleCount = 0;
    let totalCount = rows.length;
    
    rows.forEach(row => {
        const itemName = row.querySelector('.loot-identity span:not(.loot-num)')?.textContent?.toLowerCase() || '';
        const index = row.dataset.index;
        const item = localItems[index];
        const shortname = item?.shortname?.toLowerCase() || '';
        
        if (!search || itemName.includes(search) || shortname.includes(search)) {
            row.classList.remove('hidden');
            row.classList.toggle('highlight', search && search.length > 0);
            visibleCount++;
        } else {
            row.classList.add('hidden');
            row.classList.remove('highlight');
        }
    });
    
    if (countEl) {
        countEl.textContent = search ? `${visibleCount}/${totalCount}` : '';
    }
}

// ============ ITEM ACTIONS (legacy support) ============
function updateItem(index, field, value) { updateItemLocal(index, field, value); }
function removeItem(index) { removeItemLocal(index); }

// ============ COPY/PASTE ITEM ============
const CLIPBOARD_KEY = 'lootEditorClipboard';
const CLIPBOARD_CONTAINER_KEY = 'lootEditorContainerClipboard';

// ============ COPY/PASTE CONTAINER ============
const CONTAINER_CLIPBOARD_PREFIX = '###LOOT_CONTAINER###';
const ITEM_CLIPBOARD_PREFIX = '###LOOT_ITEM###';

// Проверяем есть ли разрешение на чтение буфера
let clipboardPermissionGranted = false;

async function requestClipboardPermission() {
    try {
        const result = await navigator.permissions.query({ name: 'clipboard-read' });
        if (result.state === 'granted') {
            clipboardPermissionGranted = true;
            return true;
        } else if (result.state === 'prompt') {
            // Попробуем прочитать - это вызовет запрос разрешения
            await navigator.clipboard.readText();
            clipboardPermissionGranted = true;
            return true;
        }
        return false;
    } catch (e) {
        // Попробуем напрямую
        try {
            await navigator.clipboard.readText();
            clipboardPermissionGranted = true;
            return true;
        } catch (e2) {
            return false;
        }
    }
}

async function copyItem(index) {
    if (index < 0 || index >= localItems.length) return;
    
    const item = JSON.parse(JSON.stringify(localItems[index]));
    
    // Копируем в реальный буфер обмена
    const clipboardText = ITEM_CLIPBOARD_PREFIX + JSON.stringify(item);
    
    try {
        await navigator.clipboard.writeText(clipboardText);
        
        // Показать кнопку вставки
        const pasteBtn = document.getElementById('pasteBtn');
        if (pasteBtn) pasteBtn.style.display = 'flex';
        
        showToast(`Скопировано: ${getItemDisplayName(item.shortname)}`, 'success');
        
        // Показываем баннер
        showItemClipboardBanner(item);
    } catch (e) {
        showToast('Ошибка копирования', 'error');
    }
}

function showItemClipboardBanner(item) {
    // Удаляем старый баннер если есть
    hideClipboardBanner();
    
    const banner = document.createElement('div');
    banner.className = 'clipboard-banner';
    banner.id = 'clipboardBanner';
    banner.innerHTML = `
        <div class="clipboard-banner-icon item-icon">
            <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.style.display='none'">
        </div>
        <div class="clipboard-banner-content">
            <span class="clipboard-banner-title">Предмет скопирован</span>
            <span class="clipboard-banner-info">${getItemDisplayName(item.shortname)}</span>
        </div>
        <div class="clipboard-banner-hint">
            <kbd>Ctrl</kbd> + <kbd>V</kbd> для вставки
        </div>
        <button class="clipboard-banner-close" onclick="hideClipboardBanner()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    document.body.appendChild(banner);
    
    // Анимация появления
    requestAnimationFrame(() => banner.classList.add('active'));
}

async function pasteItem() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        
        // Проверяем что это наш предмет
        if (!clipboardText || !clipboardText.startsWith(ITEM_CLIPBOARD_PREFIX)) {
            showToast('В буфере нет скопированного предмета', 'info');
            return;
        }
        
        const jsonStr = clipboardText.slice(ITEM_CLIPBOARD_PREFIX.length);
        const item = JSON.parse(jsonStr);
        
        localItems.push(item);
        hasChanges = true;
        renderItems();
        showToast(`Вставлено: ${getItemDisplayName(item.shortname)}`, 'success');
    } catch (e) {
        if (e.name === 'NotAllowedError') {
            showClipboardPermissionModal();
        } else {
            showToast('В буфере нет скопированного предмета', 'info');
        }
    }
}

async function copyContainer() {
    if (!localItems || localItems.length === 0) {
        showToast('Контейнер пуст', 'error');
        return;
    }
    
    // Проверяем/запрашиваем разрешение
    if (!clipboardPermissionGranted) {
        const granted = await requestClipboardPermission();
        if (!granted) {
            showClipboardPermissionModal();
            return;
        }
    }
    
    const containerData = {
        name: CONTAINER_NAME,
        items: JSON.parse(JSON.stringify(localItems)),
        copiedAt: Date.now()
    };
    
    // Копируем в реальный буфер обмена как текст с префиксом
    const clipboardText = CONTAINER_CLIPBOARD_PREFIX + JSON.stringify(containerData);
    
    try {
        await navigator.clipboard.writeText(clipboardText);
        showToast(`Скопировано ${localItems.length} предметов. Откройте другой контейнер и нажмите Ctrl+V`, 'success');
    } catch (e) {
        showToast('Ошибка копирования', 'error');
    }
}

function showClipboardPermissionModal() {
    // Удаляем старое окно если есть
    document.getElementById('clipboardPermissionModal')?.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'clipboardPermissionModal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="modal-content modal-small" onclick="event.stopPropagation()">
            <div class="permission-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
            </div>
            <h3>Требуется разрешение</h3>
            <p>Для копирования контейнера нужен доступ к буферу обмена.</p>
            <div class="permission-steps">
                <div class="permission-step">
                    <span class="step-num">1</span>
                    <span>Нажмите на иконку <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> слева от адресной строки</span>
                </div>
                <div class="permission-step">
                    <span class="step-num">2</span>
                    <span>Найдите "Буфер обмена" и выберите "Разрешить"</span>
                </div>
                <div class="permission-step">
                    <span class="step-num">3</span>
                    <span>Обновите страницу</span>
                </div>
            </div>
            <div class="permission-modal-actions">
                <button class="btn" onclick="this.closest('.modal').remove()">Понятно</button>
                <button class="btn btn-primary" onclick="location.reload()">Обновить страницу</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function pasteContainer() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        
        // Проверяем что это наши данные - контейнер
        if (clipboardText && clipboardText.startsWith(CONTAINER_CLIPBOARD_PREFIX)) {
            const jsonStr = clipboardText.slice(CONTAINER_CLIPBOARD_PREFIX.length);
            const containerData = JSON.parse(jsonStr);
            
            if (!containerData.items || containerData.items.length === 0) {
                showToast('Скопированный контейнер пуст', 'error');
                return;
            }
            
            // Добавляем все предметы
            containerData.items.forEach(item => {
                localItems.push(JSON.parse(JSON.stringify(item)));
            });
            
            hasChanges = true;
            renderItems();
            hideClipboardBanner();
            
            // Очищаем буфер после вставки
            await navigator.clipboard.writeText('');
            
            showToast(`Вставлено ${containerData.items.length} предметов из "${containerData.name}"`, 'success');
            return;
        }
        
        // Проверяем на предмет
        if (clipboardText && clipboardText.startsWith(ITEM_CLIPBOARD_PREFIX)) {
            const jsonStr = clipboardText.slice(ITEM_CLIPBOARD_PREFIX.length);
            const item = JSON.parse(jsonStr);
            
            localItems.push(JSON.parse(JSON.stringify(item)));
            hasChanges = true;
            renderItems();
            
            showToast(`Вставлено: ${getItemDisplayName(item.shortname)}`, 'success');
            return;
        }
        
        showToast('В буфере нет скопированных данных', 'info');
    } catch (e) {
        // Если нет разрешения - показываем модалку
        if (e.name === 'NotAllowedError') {
            showClipboardPermissionModal();
        } else {
            showToast('В буфере нет скопированных данных', 'info');
        }
    }
}

function showClipboardBanner(containerData) {
    // Не показываем баннер в том же контейнере откуда скопировали
    if (containerData.name === CONTAINER_NAME) return;
    
    // Удаляем старый баннер если есть
    hideClipboardBanner();
    
    const banner = document.createElement('div');
    banner.className = 'clipboard-banner';
    banner.id = 'clipboardBanner';
    banner.innerHTML = `
        <div class="clipboard-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
        </div>
        <div class="clipboard-banner-content">
            <span class="clipboard-banner-title">Доступна вставка</span>
            <span class="clipboard-banner-info">"${containerData.name}" • ${containerData.items.length} предметов</span>
        </div>
        <div class="clipboard-banner-hint">
            <kbd>Ctrl</kbd> + <kbd>V</kbd> для вставки
        </div>
        <button class="clipboard-banner-close" onclick="hideClipboardBanner()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    document.body.appendChild(banner);
    
    // Анимация появления
    requestAnimationFrame(() => banner.classList.add('active'));
}

function hideClipboardBanner() {
    const banner = document.getElementById('clipboardBanner');
    if (banner) {
        banner.classList.remove('active');
        setTimeout(() => banner.remove(), 300);
    }
}

// Проверить буфер при загрузке
async function checkClipboard() {
    // Проверяем реальный буфер обмена (только если есть разрешение)
    try {
        const result = await navigator.permissions.query({ name: 'clipboard-read' });
        if (result.state === 'granted') {
            clipboardPermissionGranted = true;
            const clipboardText = await navigator.clipboard.readText();
            
            // Проверяем на контейнер
            if (clipboardText && clipboardText.startsWith(CONTAINER_CLIPBOARD_PREFIX)) {
                const jsonStr = clipboardText.slice(CONTAINER_CLIPBOARD_PREFIX.length);
                const containerData = JSON.parse(jsonStr);
                // Показываем баннер только в ДРУГОМ контейнере
                if (containerData.name !== CONTAINER_NAME) {
                    showClipboardBanner(containerData);
                }
            }
            
            // Проверяем на предмет - показываем кнопку вставки
            if (clipboardText && clipboardText.startsWith(ITEM_CLIPBOARD_PREFIX)) {
                const pasteBtn = document.getElementById('pasteBtn');
                if (pasteBtn) pasteBtn.style.display = 'flex';
            }
        }
    } catch (e) {
        // Нет доступа к буферу - ничего не делаем
    }
}

// ============ QUICK PRESETS ============
function openPresetsModal() {
    document.getElementById('presetsModal').classList.add('active');
    updatePresetCounts();
}

function closePresetsModal() {
    document.getElementById('presetsModal').classList.remove('active');
    hidePresetPreview();
}

function updatePresetCounts() {
    document.querySelectorAll('.preset-count[data-category]').forEach(el => {
        const items = ALL_ITEMS.filter(i => i.category === el.dataset.category);
        el.textContent = items.length > 0 ? `${items.length}` : '';
    });
}

function showPresetPreview(category) {
    const items = ALL_ITEMS.filter(i => i.category === category);
    const previewEmpty = document.getElementById('previewEmpty');
    const previewContent = document.getElementById('previewContent');
    
    if (items.length === 0) { previewEmpty.style.display = 'flex'; previewContent.classList.remove('active'); return; }
    
    previewEmpty.style.display = 'none';
    document.getElementById('previewTitle').textContent = category;
    document.getElementById('previewCount').textContent = `${items.length} ${getItemsWord(items.length)}`;
    document.getElementById('previewItems').innerHTML = items.map((item, i) => `
        <div class="preview-item" style="animation-delay: ${Math.min(i * 20, 400)}ms">
            <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23666%22><rect width=%2224%22 height=%2224%22 rx=%224%22/></svg>'">
            <span>${item.name}</span>
        </div>
    `).join('');
    previewContent.classList.add('active');
}

function hidePresetPreview() {
    document.getElementById('previewContent').classList.remove('active');
    document.getElementById('previewEmpty').style.display = 'flex';
}

function getItemsWord(n) {
    const cases = [2, 0, 1, 1, 1, 2];
    return ['предмет', 'предмета', 'предметов'][(n % 100 > 4 && n % 100 < 20) ? 2 : cases[Math.min(n % 10, 5)]];
}

function addPreset(category) {
    const items = ALL_ITEMS.filter(i => i.category === category);
    if (items.length === 0) { showToast('Категория пуста', 'error'); return; }
    closePresetsModal();
    items.forEach(item => {
        localItems.push({ shortname: item.shortname, displayName: '', rareDrop: 100, isBlueprint: false, amount: { minAmount: 1, maxAmount: 1 }, skinID: 0 });
    });
    hasChanges = true;
    renderItems();
    showToast(`Добавлено ${items.length} предметов`, 'success');
}

async function clearAllItems() {
    closePresetsModal();
    const confirmed = await showConfirm('Очистить контейнер?', 'Все предметы будут удалены');
    if (!confirmed) return;
    localItems = [];
    hasChanges = true;
    renderItems();
    showToast('Контейнер очищен', 'success');
}

// ============ IMPORT/EXPORT ============
function openImport() { document.getElementById('importInput').click(); }

async function handleImport(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    let imported = 0, errors = 0, lastName = null;
    for (const file of files) {
        try {
            const data = JSON.parse(await file.text());
            const name = file.name.replace('.json', '');
            if (data.lootPresets !== undefined) {
                await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, data }) });
                imported++; lastName = name;
            } else if (typeof data === 'object' && !Array.isArray(data)) {
                for (const [key, value] of Object.entries(data)) {
                    if (value.lootPresets !== undefined) {
                        await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: key, data: value }) });
                        imported++; lastName = key;
                    }
                }
            }
        } catch (err) { errors++; }
    }
    event.target.value = '';
    showToast(errors > 0 ? `Импортировано: ${imported}, ошибок: ${errors}` : `Импортировано ${imported}`, errors > 0 ? 'error' : 'success');
    if (lastName) setTimeout(() => window.location.href = `/import/${encodeURIComponent(lastName)}`, 300);
    else setTimeout(() => location.reload(), 300);
}

async function exportJson() {
    if (!CONTAINER_NAME) return;
    // Сначала сохраняем локальные изменения
    if (hasChanges) await saveToServer();
    
    const res = await fetch(`/api/container/${encodeURIComponent(CONTAINER_NAME)}/export`);
    const { name, data } = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.json`; a.click();
    URL.revokeObjectURL(a.href);
    showToast('Экспортировано', 'success');
}

async function exportAll() {
    const res = await fetch('/api/containers/export');
    const containers = await res.json();
    if (Object.keys(containers).length === 0) { showToast('Нет контейнеров', 'error'); return; }
    for (const [name, data] of Object.entries(containers)) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.json`; a.click();
        URL.revokeObjectURL(a.href);
    }
    showToast(`Экспортировано ${Object.keys(containers).length}`, 'success');
}

function exportAllZip() {
    window.location.href = '/api/containers/export-zip';
    showToast('Скачивание ZIP...', 'success');
}


// ============ ITEM EDIT ============
let editingIndex = -1;
let currentSlotType = null;

// Слоты модулей по категориям
const MOD_SLOTS = {
    scope: {
        label: 'Прицел',
        mods: [
            { shortname: 'weapon.mod.8x.scope', name: '8x Прицел' },
            { shortname: 'weapon.mod.small.scope', name: '4x Прицел' },
            { shortname: 'weapon.mod.simplesight', name: 'Простой прицел' },
            { shortname: 'weapon.mod.holosight', name: 'Голографический' }
        ]
    },
    muzzle: {
        label: 'Дуло',
        mods: [
            { shortname: 'weapon.mod.silencer', name: 'Глушитель' },
            { shortname: 'weapon.mod.muzzleboost', name: 'Ускоритель' },
            { shortname: 'weapon.mod.muzzlebrake', name: 'Компенсатор' }
        ]
    },
    magazine: {
        label: 'Магазин',
        mods: [
            { shortname: 'weapon.mod.extendedmags', name: 'Расширенный магазин' }
        ]
    },
    underbarrel: {
        label: 'Подствольник',
        mods: [
            { shortname: 'weapon.mod.flashlight', name: 'Фонарик' },
            { shortname: 'weapon.mod.lasersight', name: 'Лазерный прицел' }
        ]
    }
};

// Оружие которое поддерживает модули
const WEAPONS_WITH_MODS = [
    // AK и скины
    'rifle.ak', 'rifle.ak.ice', 'rifle.ak.diver', 'rifle.ak.jungle', 'rifle.ak.med',
    // LR-300 и скины
    'rifle.lr300', 'rifle.lr300.space',
    // Остальные винтовки
    'rifle.bolt', 'rifle.l96', 'rifle.m39', 'rifle.semiauto', 'rifle.sks',
    // SMG
    'smg.2', 'smg.mp5', 'smg.thompson', 'lmg.m249', 'hmlmg',
    // Дробовики
    'shotgun.pump', 'shotgun.spas12',
    // Пистолеты
    'pistol.m92', 'pistol.python', 'pistol.revolver', 'pistol.semiauto',
    // Луки
    'crossbow', 'bow.compound'
];

// Типы патронов для оружия
const AMMO_TYPES = {
    rifle: [
        { shortname: 'ammo.rifle', name: 'Обычные 5.56' },
        { shortname: 'ammo.rifle.hv', name: 'Скоростные 5.56' },
        { shortname: 'ammo.rifle.incendiary', name: 'Зажигательные 5.56' },
        { shortname: 'ammo.rifle.explosive', name: 'Разрывные 5.56' }
    ],
    pistol: [
        { shortname: 'ammo.pistol', name: 'Обычные 9мм' },
        { shortname: 'ammo.pistol.hv', name: 'Скоростные 9мм' },
        { shortname: 'ammo.pistol.fire', name: 'Зажигательные 9мм' }
    ],
    shotgun: [
        { shortname: 'ammo.shotgun', name: 'Картечь 12к' },
        { shortname: 'ammo.shotgun.slug', name: 'Пули 12к' },
        { shortname: 'ammo.shotgun.fire', name: 'Зажигательные 12к' },
        { shortname: 'ammo.handmade.shell', name: 'Самодельные' }
    ],
    arrow: [
        { shortname: 'arrow.wooden', name: 'Деревянные стрелы' },
        { shortname: 'arrow.hv', name: 'Скоростные стрелы' },
        { shortname: 'arrow.fire', name: 'Огненные стрелы' },
        { shortname: 'arrow.bone', name: 'Костяные стрелы' }
    ]
};

// Какой тип патронов использует оружие
const WEAPON_AMMO_TYPE = {
    // Винтовки (5.56)
    'rifle.ak': 'rifle', 'rifle.ak.ice': 'rifle', 'rifle.ak.diver': 'rifle', 'rifle.ak.jungle': 'rifle', 'rifle.ak.med': 'rifle',
    'rifle.lr300': 'rifle', 'rifle.lr300.space': 'rifle',
    'rifle.bolt': 'rifle', 'rifle.l96': 'rifle', 'rifle.m39': 'rifle', 'rifle.semiauto': 'rifle', 'rifle.sks': 'rifle',
    'lmg.m249': 'rifle', 'hmlmg': 'rifle',
    // SMG и пистолеты (9мм)
    'smg.2': 'pistol', 'smg.mp5': 'pistol', 'smg.thompson': 'pistol', 't1_smg': 'pistol',
    'pistol.m92': 'pistol', 'pistol.python': 'pistol', 'pistol.revolver': 'pistol', 'pistol.semiauto': 'pistol',
    'pistol.semiauto.a.m15': 'pistol', 'pistol.prototype17': 'pistol', 'revolver.hc': 'pistol',
    // Дробовики (12 калибр)
    'shotgun.pump': 'shotgun', 'shotgun.spas12': 'shotgun', 'shotgun.double': 'shotgun', 
    'shotgun.waterpipe': 'shotgun', 'shotgun.m4': 'shotgun',
    // Луки и арбалеты (стрелы)
    'crossbow': 'arrow', 'bow.compound': 'arrow', 'bow.hunting': 'arrow', 'minicrossbow': 'arrow'
};

// Размер магазина для оружия
const WEAPON_MAG_SIZE = {
    // Винтовки
    'rifle.ak': 30, 'rifle.ak.ice': 30, 'rifle.ak.diver': 30, 'rifle.ak.jungle': 30, 'rifle.ak.med': 30,
    'rifle.lr300': 30, 'rifle.lr300.space': 30,
    'rifle.bolt': 4, 'rifle.l96': 5, 'rifle.m39': 20, 'rifle.semiauto': 16, 'rifle.sks': 16,
    'lmg.m249': 100, 'hmlmg': 100,
    // SMG
    'smg.2': 24, 'smg.mp5': 30, 'smg.thompson': 20, 't1_smg': 16,
    // Пистолеты
    'pistol.m92': 15, 'pistol.python': 6, 'pistol.revolver': 8, 'pistol.semiauto': 10,
    'pistol.semiauto.a.m15': 10, 'pistol.prototype17': 18, 'revolver.hc': 7,
    // Дробовики
    'shotgun.pump': 6, 'shotgun.spas12': 6, 'shotgun.double': 2, 'shotgun.waterpipe': 1, 'shotgun.m4': 8,
    // Луки
    'crossbow': 1, 'bow.compound': 1, 'bow.hunting': 1, 'minicrossbow': 1
};

// Открыть модальное окно выбора патронов
function openAmmoModal(index) {
    if (index < 0 || index >= localItems.length) return;
    
    const item = localItems[index];
    const ammoType = WEAPON_AMMO_TYPE[item.shortname];
    if (!ammoType) {
        showToast('Этот предмет не использует патроны', 'info');
        return;
    }
    
    const ammoList = AMMO_TYPES[ammoType] || [];
    const currentAmmo = item.ammo?.shortname || item.ammoType || (ammoList[0]?.shortname || '');
    const currentCount = item.ammo?.amount || item.ammoAmount || WEAPON_MAG_SIZE[item.shortname] || 0;
    const maxAmmo = WEAPON_MAG_SIZE[item.shortname] || 30;
    
    // Кастомный список патронов с иконками
    let ammoItemsHtml = ammoList.map(a => 
        `<div class="ammo-picker-item ${a.shortname === currentAmmo ? 'selected' : ''}" data-shortname="${a.shortname}" onclick="selectAmmoType('${a.shortname}')">
            <img src="/icons/${encodeURIComponent(a.shortname)}.png" onerror="this.style.display='none'">
            <span>${a.name}</span>
        </div>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.className = 'ammo-modal';
    modal.innerHTML = `
        <div class="ammo-modal-content">
            <div class="ammo-modal-header">
                <img src="/icons/${encodeURIComponent(item.shortname)}.png" class="ammo-modal-weapon">
                <div>
                    <h3>Патроны</h3>
                    <span class="ammo-modal-weapon-name">${getItemDisplayName(item.shortname)}</span>
                </div>
                <button class="ammo-modal-close" onclick="this.closest('.ammo-modal').remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="ammo-modal-body">
                <div class="ammo-field">
                    <label>Тип патронов</label>
                    <div class="ammo-picker-grid" id="ammoPickerGrid">
                        ${ammoItemsHtml}
                    </div>
                    <input type="hidden" id="ammoTypeSelect" value="${currentAmmo}">
                </div>
                <div class="ammo-field">
                    <label>Количество (макс: ${maxAmmo})</label>
                    <input type="number" id="ammoCountInput" value="${currentCount}" min="0" max="${maxAmmo}">
                </div>
            </div>
            <div class="ammo-modal-footer">
                <button class="btn" onclick="this.closest('.ammo-modal').remove()">Отмена</button>
                <button class="btn btn-primary" onclick="saveAmmoSelection(${index})">Сохранить</button>
            </div>
        </div>
    `;
    
    // Закрытие по клику на backdrop (пустое место)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Выбрать тип патронов
function selectAmmoType(shortname) {
    document.getElementById('ammoTypeSelect').value = shortname;
    document.querySelectorAll('.ammo-picker-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.shortname === shortname);
    });
}

// Сохранить выбор патронов
function saveAmmoSelection(index) {
    if (index < 0 || index >= localItems.length) return;
    
    const ammoType = document.getElementById('ammoTypeSelect').value;
    const ammoCount = parseInt(document.getElementById('ammoCountInput').value) || 0;
    
    // Сохраняем в новом формате
    localItems[index].ammo = {
        shortname: ammoType,
        amount: ammoCount
    };
    // Для совместимости
    localItems[index].ammoType = ammoType;
    localItems[index].ammoAmount = ammoCount;
    hasChanges = true;
    
    document.querySelector('.ammo-modal')?.remove();
    renderItems();
    showToast('Патроны обновлены', 'success');
}

function getModSlot(shortname) {
    for (const [slot, data] of Object.entries(MOD_SLOTS)) {
        if (data.mods.some(m => m.shortname === shortname)) return slot;
    }
    return null;
}

function getModName(shortname) {
    for (const data of Object.values(MOD_SLOTS)) {
        const mod = data.mods.find(m => m.shortname === shortname);
        if (mod) return mod.name;
    }
    return shortname;
}

function openItemEdit(index) {
    if (index < 0 || index >= localItems.length) return;
    editingIndex = index;
    const item = localItems[index];
    
    const itemName = getItemDisplayName(item.shortname);
    document.getElementById('editItemIcon').src = `/icons/${encodeURIComponent(item.shortname)}.png`;
    document.getElementById('editItemName').textContent = itemName;
    document.getElementById('editItemShortname').textContent = item.shortname;
    document.getElementById('editIsBlueprint').checked = item.isBlueprint || false;
    document.getElementById('editRareDrop').value = item.rareDrop || 100;
    document.getElementById('editMinAmount').value = item.amount?.minAmount || 1;
    document.getElementById('editMaxAmount').value = item.amount?.maxAmount || 1;
    document.getElementById('editSkinID').value = item.skinID || 0;
    document.getElementById('editCondition').value = item.condition || '';
    document.getElementById('editDisplayName').value = item.displayName || '';
    
    // Кнопка копирования shortname
    document.getElementById('copyShortname').onclick = () => copyShortname(item.shortname);
    
    // Обновляем заголовок страницы и URL
    document.title = `${itemName} - ${CONTAINER_NAME} - Loot Editor`;
    history.pushState({ item: item.shortname }, '', `/container/${encodeURIComponent(CONTAINER_NAME)}/${encodeURIComponent(item.shortname)}`);
    
    const isWeapon = WEAPONS_WITH_MODS.includes(item.shortname);
    const isBlueprint = item.isBlueprint || false;
    const hasDisplayName = !!(item.displayName && item.displayName.trim());
    
    // Блокируем чертёж если есть кастомное название
    document.getElementById('editIsBlueprint').disabled = hasDisplayName;
    
    // Рендерим слоты в шапке (BP или модули)
    renderHeaderSlots();
    
    // Показываем модули только для оружия и НЕ чертежа
    document.getElementById('attachmentsSection').style.display = (isWeapon && !isBlueprint) ? 'flex' : 'none';
    
    if (isWeapon && !isBlueprint) renderAttachmentSlots();
    
    // Показываем поля патронов для оружия
    const ammoType = WEAPON_AMMO_TYPE[item.shortname];
    const showAmmo = ammoType && !isBlueprint;
    document.getElementById('ammoRow').style.display = showAmmo ? 'flex' : 'none';
    document.getElementById('ammoTypeRow').style.display = showAmmo ? 'flex' : 'none';
    
    if (showAmmo) {
        document.getElementById('editAmmo').value = item.ammo ?? '';
        // Заполняем dropdown типами патронов
        populateAmmoDropdown(ammoType, item.ammoType);
    }
    
    document.getElementById('itemEditModal').classList.add('active');
}

function copyShortname(shortname) {
    navigator.clipboard.writeText(shortname).then(() => {
        const btn = document.getElementById('copyShortname');
        btn.classList.add('copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 1500);
        showToast('Скопировано', 'success');
    });
}

function renderHeaderSlots() {
    if (editingIndex < 0) return;
    const item = localItems[editingIndex];
    const slotsContainer = document.getElementById('editItemSlots');
    const isWeapon = WEAPONS_WITH_MODS.includes(item.shortname);
    const attachments = item.attachments || [];
    
    const emptySlotSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
    let html = '';
    
    // Если чертёж — показываем иконку BP
    if (item.isBlueprint) {
        html = `<div class="edit-item-slot filled"><img src="/icons/blueprintbase.png" title="Чертёж"></div>`;
    } 
    // Если оружие — показываем все 4 слота
    else if (isWeapon) {
        Object.entries(MOD_SLOTS).forEach(([slotType, slotData]) => {
            const equipped = attachments.find(att => slotData.mods.some(m => m.shortname === att));
            if (equipped) {
                html += `<div class="edit-item-slot filled"><img src="/icons/${encodeURIComponent(equipped)}.png" title="${slotData.label}"></div>`;
            } else {
                html += `<div class="edit-item-slot" title="${slotData.label}">${emptySlotSvg}</div>`;
            }
        });
    }
    
    slotsContainer.innerHTML = html;
}

function closeItemEdit() {
    document.getElementById('itemEditModal').classList.remove('active');
    editingIndex = -1;
    // Восстанавливаем заголовок и URL
    document.title = `${CONTAINER_NAME} - Loot Editor`;
    history.pushState({}, '', `/container/${encodeURIComponent(CONTAINER_NAME)}`);
    renderItems();
}

function updateEditField(field, value) {
    if (editingIndex < 0 || editingIndex >= localItems.length) return;
    const item = localItems[editingIndex];
    
    switch (field) {
        case 'isBlueprint': 
            item.isBlueprint = value;
            // Если включили чертёж — очищаем модули и скрываем секции
            if (value) {
                item.attachments = [];
                item.ammo = null;
                item.ammoType = null;
                document.getElementById('attachmentsSection').style.display = 'none';
                document.getElementById('ammoRow').style.display = 'none';
                document.getElementById('ammoTypeRow').style.display = 'none';
            } else {
                // Показываем модули и патроны если это оружие
                const isWeapon = WEAPONS_WITH_MODS.includes(item.shortname);
                const ammoType = WEAPON_AMMO_TYPE[item.shortname];
                document.getElementById('attachmentsSection').style.display = isWeapon ? 'flex' : 'none';
                document.getElementById('ammoRow').style.display = ammoType ? 'flex' : 'none';
                document.getElementById('ammoTypeRow').style.display = ammoType ? 'flex' : 'none';
                if (isWeapon) renderAttachmentSlots();
                if (ammoType) populateAmmoDropdown(ammoType, null);
            }
            renderHeaderSlots();
            break;
        case 'rareDrop': item.rareDrop = parseInt(value) || 100; break;
        case 'minAmount':
            if (!item.amount) item.amount = { minAmount: 1, maxAmount: 1 };
            item.amount.minAmount = parseInt(value) || 1;
            break;
        case 'maxAmount':
            if (!item.amount) item.amount = { minAmount: 1, maxAmount: 1 };
            item.amount.maxAmount = parseInt(value) || 1;
            break;
        case 'skinID': item.skinID = parseInt(value) || 0; break;
        case 'condition': 
            const cond = parseInt(value);
            item.condition = (cond >= 0 && cond <= 100) ? cond : null;
            break;
        case 'displayName': 
            item.displayName = value;
            // Блокируем чертёж если есть кастомное название
            const hasName = !!(value && value.trim());
            document.getElementById('editIsBlueprint').disabled = hasName;
            if (hasName && item.isBlueprint) {
                item.isBlueprint = false;
                document.getElementById('editIsBlueprint').checked = false;
                renderHeaderSlots();
            }
            break;
        case 'ammo':
            const ammoVal = parseInt(value);
            item.ammo = (ammoVal > 0) ? ammoVal : null;
            break;
        case 'ammoType':
            item.ammoType = value || null;
            break;
    }
    hasChanges = true;
}

function deleteEditItem() {
    if (editingIndex < 0) return;
    localItems.splice(editingIndex, 1);
    hasChanges = true;
    closeItemEdit();
    showToast('Предмет удалён', 'success');
}

function renderAttachmentSlots() {
    if (editingIndex < 0) return;
    const item = localItems[editingIndex];
    const attachments = item.attachments || [];
    
    const list = document.getElementById('attachmentsList');
    list.innerHTML = Object.entries(MOD_SLOTS).map(([slotType, slotData]) => {
        const equipped = attachments.find(att => slotData.mods.some(m => m.shortname === att));
        const mod = equipped ? slotData.mods.find(m => m.shortname === equipped) : null;
        
        if (equipped && mod) {
            return `
                <div class="attachment-slot filled">
                    <div class="attachment-slot-icon">
                        <img src="/icons/${encodeURIComponent(equipped)}.png" onerror="this.style.display='none'">
                    </div>
                    <div class="attachment-slot-info">
                        <div class="attachment-slot-label">${slotData.label}</div>
                        <div class="attachment-slot-name">${mod.name}</div>
                    </div>
                    <button class="attachment-slot-remove" onclick="removeAttachmentSlot('${slotType}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="attachment-slot" onclick="openAttachmentPicker('${slotType}')">
                    <div class="attachment-slot-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <div class="attachment-slot-info">
                        <div class="attachment-slot-label">${slotData.label}</div>
                        <div class="attachment-slot-empty">Не установлен</div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function removeAttachmentSlot(slotType) {
    if (editingIndex < 0) return;
    const item = localItems[editingIndex];
    if (!item.attachments) return;
    
    const slotData = MOD_SLOTS[slotType];
    item.attachments = item.attachments.filter(att => !slotData.mods.some(m => m.shortname === att));
    hasChanges = true;
    renderAttachmentSlots();
    renderHeaderSlots();
}

function openAttachmentPicker(slotType) {
    currentSlotType = slotType;
    const slotData = MOD_SLOTS[slotType];
    const grid = document.getElementById('attachmentPickerGrid');
    
    grid.innerHTML = slotData.mods.map(mod => `
        <div class="attachment-picker-item" onclick="addAttachment('${mod.shortname}')">
            <img src="/icons/${encodeURIComponent(mod.shortname)}.png" onerror="this.style.display='none'">
            <span>${mod.name}</span>
        </div>
    `).join('');
    
    document.getElementById('attachmentPickerModal').classList.add('active');
}

function closeAttachmentPicker() {
    document.getElementById('attachmentPickerModal').classList.remove('active');
    currentSlotType = null;
}

function addAttachment(shortname) {
    if (editingIndex < 0 || !currentSlotType) return;
    const item = localItems[editingIndex];
    const slotData = MOD_SLOTS[currentSlotType];
    
    if (!item.attachments) item.attachments = [];
    
    // Удаляем старый модуль из этого слота
    item.attachments = item.attachments.filter(att => !slotData.mods.some(m => m.shortname === att));
    
    // Добавляем новый
    item.attachments.push(shortname);
    hasChanges = true;
    
    closeAttachmentPicker();
    renderAttachmentSlots();
    renderHeaderSlots();
}

// ============ AMMO PICKER ============
function populateAmmoDropdown(ammoCategory, selectedValue) {
    const dropdown = document.getElementById('ammoDropdown');
    const picker = document.getElementById('ammoPicker');
    const pickerIcon = document.getElementById('ammoPickerIcon');
    const pickerText = document.getElementById('ammoPickerText');
    const ammoOptions = AMMO_TYPES[ammoCategory] || [];
    
    // Обновляем текущее значение в picker
    if (selectedValue) {
        const selected = ammoOptions.find(a => a.shortname === selectedValue);
        if (selected) {
            pickerIcon.src = `/icons/${encodeURIComponent(selected.shortname)}.png`;
            pickerIcon.style.display = 'block';
            pickerText.textContent = selected.name;
        }
    } else {
        pickerIcon.style.display = 'none';
        pickerText.textContent = 'Стандартные';
    }
    
    // Заполняем dropdown
    dropdown.innerHTML = `<div class="ammo-option ${!selectedValue ? 'selected' : ''}" onclick="selectAmmoType('')">
        <span>Стандартные</span>
    </div>` + ammoOptions.map(a => `
        <div class="ammo-option ${selectedValue === a.shortname ? 'selected' : ''}" onclick="selectAmmoType('${a.shortname}')">
            <img src="/icons/${encodeURIComponent(a.shortname)}.png" onerror="this.style.display='none'">
            <span>${a.name}</span>
        </div>
    `).join('');
}

function toggleAmmoPicker() {
    const dropdown = document.getElementById('ammoDropdown');
    const picker = document.getElementById('ammoPicker');
    const isOpen = dropdown.classList.contains('active');
    
    if (isOpen) {
        dropdown.classList.remove('active');
        picker.classList.remove('open');
    } else {
        dropdown.classList.add('active');
        picker.classList.add('open');
    }
}

function selectAmmoType(shortname) {
    const dropdown = document.getElementById('ammoDropdown');
    const picker = document.getElementById('ammoPicker');
    const pickerIcon = document.getElementById('ammoPickerIcon');
    const pickerText = document.getElementById('ammoPickerText');
    
    dropdown.classList.remove('active');
    picker.classList.remove('open');
    
    if (shortname) {
        // Найдём название
        for (const ammos of Object.values(AMMO_TYPES)) {
            const found = ammos.find(a => a.shortname === shortname);
            if (found) {
                pickerIcon.src = `/icons/${encodeURIComponent(shortname)}.png`;
                pickerIcon.style.display = 'block';
                pickerText.textContent = found.name;
                break;
            }
        }
    } else {
        pickerIcon.style.display = 'none';
        pickerText.textContent = 'Стандартные';
    }
    
    updateEditField('ammoType', shortname);
}

// Закрытие dropdown при клике вне
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('ammoDropdown');
    const picker = document.getElementById('ammoPicker');
    if (dropdown && picker && !picker.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
        picker.classList.remove('open');
    }
});


// ============ HOTKEYS ============
function handleHotkeys(e) {
    // Игнорируем если фокус в input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Ctrl+S - сохранить (работает с любой раскладкой)
    if (e.ctrlKey && (e.code === 'KeyS')) {
        e.preventDefault();
        saveToServer();
    }
    
    // Ctrl+C - копировать контейнер (работает с любой раскладкой)
    if (e.ctrlKey && (e.code === 'KeyC') && !window.getSelection().toString()) {
        e.preventDefault();
        copyContainer();
    }
    
    // Ctrl+V - вставить контейнер (работает с любой раскладкой)
    if (e.ctrlKey && (e.code === 'KeyV')) {
        e.preventDefault();
        pasteContainer();
    }
    
    // Ctrl+/ - поиск по таблице
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        toggleTableSearch();
    }
    
    // Delete - удалить выбранный предмет (если открыто редактирование)
    if (e.key === 'Delete' && editingIndex >= 0) {
        e.preventDefault();
        deleteEditItem();
    }
    
    // Escape - закрыть модалки или поиск
    if (e.key === 'Escape') {
        if (tableSearchActive) {
            toggleTableSearch();
        } else if (document.getElementById('attachmentPickerModal')?.classList.contains('active')) {
            closeAttachmentPicker();
        } else if (document.getElementById('itemEditModal')?.classList.contains('active')) {
            closeItemEdit();
        } else if (document.getElementById('itemPickerModal')?.classList.contains('active')) {
            closeItemPicker();
        } else if (document.getElementById('presetsModal')?.classList.contains('active')) {
            closePresetsModal();
        } else if (document.getElementById('containerPickerModal')?.classList.contains('active')) {
            closeContainerPicker();
        }
    }
}


// ============ LANGUAGE ============
function changeLanguage(lang) {
    localStorage.setItem('lootEditorLang', lang);
    // Пока просто сохраняем, полная локализация будет позже
    showToast(lang === 'ru' ? 'Язык: Русский' : 'Language: English', 'info');
}

// Init language
(function() {
    const saved = localStorage.getItem('lootEditorLang') || 'ru';
    const select = document.getElementById('langSelect');
    if (select) select.value = saved;
})();

