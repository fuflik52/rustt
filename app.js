// Loot Editor App
let containers = {};
let currentContainer = null;
let editingItemIndex = null;
let currentCategory = null;
let viewMode = localStorage.getItem('lootViewMode') || 'rows';

// Close modal on backdrop click
function closeOnBackdrop(event, closeFn) {
    if (event.target === event.currentTarget) closeFn();
}

// Theme
function initTheme() {
    const saved = localStorage.getItem('lootEditorTheme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else document.documentElement.setAttribute('data-theme', 'dark');
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lootEditorTheme', next);
}

// Toast
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Confirm Dialog
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay active';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="cancel-btn">Отмена</button>
                    <button class="confirm-btn">Удалить</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.cancel-btn').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); resolve(true); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
}


// Init
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadFromStorage();
    renderContainerList();
    renderWelcomeContainers();
    updateContainerCount();
    initViewMode();
});

// View Mode
function initViewMode() {
    setViewMode(viewMode);
}

function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('lootViewMode', mode);
    
    document.getElementById('viewRows').classList.toggle('active', mode === 'rows');
    document.getElementById('viewCards').classList.toggle('active', mode === 'cards');
    
    const lootTable = document.getElementById('lootTable');
    lootTable.classList.toggle('view-cards', mode === 'cards');
    
    renderLootTable();
}

// Storage
function loadFromStorage() {
    const saved = localStorage.getItem('lootEditorData');
    if (saved) containers = JSON.parse(saved);
}

function saveToStorage() {
    localStorage.setItem('lootEditorData', JSON.stringify(containers));
}

// Update container count badge
function updateContainerCount() {
    const count = Object.keys(containers).length;
    document.getElementById('containerCount').textContent = count;
}

// Container List
function renderContainerList() {
    const list = document.getElementById('containerList');
    list.innerHTML = '';
    
    for (const [name, data] of Object.entries(containers)) {
        const containerInfo = RUST_CONTAINERS.find(c => c.shortname === name) || { color: '#666', icon: 'basic' };
        const itemCount = data.lootPresets?.length || 0;
        
        const div = document.createElement('div');
        div.className = 'container-item' + (currentContainer === name ? ' active' : '');
        div.innerHTML = `
            <div class="container-item-icon" style="background: ${containerInfo.color}20; color: ${containerInfo.color}">
                ${getContainerIcon(containerInfo.icon)}
            </div>
            <div class="container-item-info">
                <div class="container-item-name">${name}</div>
                <div class="container-item-count">${itemCount} предметов</div>
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteContainer('${name}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        `;
        div.onclick = () => selectContainer(name);
        list.appendChild(div);
    }
    updateContainerCount();
}

// Welcome containers
function renderWelcomeContainers() {
    const grid = document.getElementById('welcomeContainersGrid');
    const welcomeSection = document.getElementById('welcomeContainers');
    
    if (Object.keys(containers).length === 0) {
        welcomeSection.style.display = 'none';
        return;
    }
    
    welcomeSection.style.display = 'block';
    grid.innerHTML = '';
    
    for (const [name] of Object.entries(containers)) {
        const containerInfo = RUST_CONTAINERS.find(c => c.shortname === name) || { color: '#666', icon: 'basic' };
        
        const chip = document.createElement('div');
        chip.className = 'welcome-container-chip';
        chip.innerHTML = `
            <div class="chip-icon" style="background: ${containerInfo.color}30; color: ${containerInfo.color}">
                ${getContainerIcon(containerInfo.icon)}
            </div>
            <span>${name}</span>
        `;
        chip.onclick = () => selectContainer(name);
        grid.appendChild(chip);
    }
}

function selectContainer(name) {
    currentContainer = name;
    renderContainerList();
    showEditorScreen();
    renderContainerSettings();
    renderLootTable();
}

function showEditorScreen() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('editorScreen').style.display = 'flex';
}

function showWelcomeScreen() {
    document.getElementById('welcomeScreen').style.display = 'flex';
    document.getElementById('editorScreen').style.display = 'none';
    currentContainer = null;
    renderContainerList();
    renderWelcomeContainers();
}


async function deleteContainer(name) {
    const confirmed = await showConfirm('Удалить контейнер?', `"${name}" будет удалён безвозвратно`);
    if (!confirmed) return;
    
    delete containers[name];
    if (currentContainer === name) {
        showWelcomeScreen();
    }
    saveToStorage();
    renderContainerList();
    renderWelcomeContainers();
    showToast('Контейнер удалён', 'success');
}

// Container Settings
function renderContainerSettings() {
    if (!currentContainer) return;
    
    const data = containers[currentContainer];
    const containerInfo = RUST_CONTAINERS.find(c => c.shortname === currentContainer) || { color: '#666', icon: 'basic', name: currentContainer };
    const itemCount = data.lootPresets?.length || 0;
    
    document.getElementById('containerTitle').textContent = containerInfo.name || currentContainer;
    document.getElementById('containerSubtitle').textContent = `${itemCount} предметов`;
    
    const editorIcon = document.getElementById('editorIcon');
    editorIcon.style.background = `${containerInfo.color}20`;
    editorIcon.style.color = containerInfo.color;
    editorIcon.innerHTML = getContainerIcon(containerInfo.icon);
    
    document.getElementById('containerEnabled').checked = data.enabled;
    document.getElementById('minLoot').value = data.amountLoot?.minAmount || 1;
    document.getElementById('maxLoot').value = data.amountLoot?.maxAmount || 3;
    updateLootRangeLabel();
}

function updateLootRangeLabel() {
    const min = document.getElementById('minLoot').value;
    const max = document.getElementById('maxLoot').value;
    document.getElementById('lootRangeLabel').textContent = `${min} - ${max}`;
}

function updateContainer() {
    if (!currentContainer) return;
    containers[currentContainer].enabled = document.getElementById('containerEnabled').checked;
    containers[currentContainer].amountLoot = {
        minAmount: parseInt(document.getElementById('minLoot').value) || 1,
        maxAmount: parseInt(document.getElementById('maxLoot').value) || 3
    };
    saveToStorage();
}

// Icon
function getIconPath(shortname) {
    return `icons/${encodeURIComponent(shortname)}.png`;
}

// Loot Table
function renderLootTable() {
    const rows = document.getElementById('lootRows');
    const emptyState = document.getElementById('lootEmpty');
    const header = document.querySelector('.loot-table-header');
    rows.innerHTML = '';
    
    if (!currentContainer) return;
    
    const items = containers[currentContainer].lootPresets || [];
    const itemCount = items.length;
    
    document.getElementById('containerSubtitle').textContent = `${itemCount} предметов`;
    
    if (itemCount === 0) {
        emptyState.style.display = 'flex';
        rows.style.display = 'none';
        header.style.display = viewMode === 'rows' ? 'grid' : 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    rows.style.display = viewMode === 'cards' ? 'grid' : 'block';
    header.style.display = viewMode === 'rows' ? 'grid' : 'none';
    
    if (viewMode === 'cards') {
        items.forEach((item, index) => {
            const itemName = typeof getItemName === 'function' ? getItemName(item.shortname) : item.shortname;
            const div = document.createElement('div');
            div.className = 'loot-card';
            div.innerHTML = `
                <button class="card-delete" onclick="event.stopPropagation(); removeItem(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
                <div class="card-icon">
                    <img src="${getIconPath(item.shortname)}" onerror="this.style.display='none'">
                </div>
                <div class="card-name">${itemName}${item.isBplueprint ? '<span class="bp-badge">BP</span>' : ''}</div>
                <div class="card-stats">
                    <div class="card-stat">
                        <span class="stat-label">Шанс</span>
                        <input type="number" class="card-input" value="${item.rareDrop || 100}" min="1" max="100" onchange="updateItemField(${index}, 'rareDrop', this.value)">
                    </div>
                    <div class="card-stat">
                        <span class="stat-label">Мин</span>
                        <input type="number" class="card-input" value="${item.amount?.minAmount || 1}" min="1" onchange="updateItemField(${index}, 'minAmount', this.value)">
                    </div>
                    <div class="card-stat">
                        <span class="stat-label">Макс</span>
                        <input type="number" class="card-input" value="${item.amount?.maxAmount || 1}" min="1" onchange="updateItemField(${index}, 'maxAmount', this.value)">
                    </div>
                </div>
            `;
            rows.appendChild(div);
        });
    } else {
        items.forEach((item, index) => {
            const itemName = typeof getItemName === 'function' ? getItemName(item.shortname) : item.shortname;
            const div = document.createElement('div');
            div.className = 'loot-row';
            div.innerHTML = `
                <div class="loot-identity">
                    <img src="${getIconPath(item.shortname)}" onerror="this.style.display='none'">
                    <span class="item-name">${itemName}${item.isBplueprint ? '<span class="bp-badge">BP</span>' : ''}</span>
                </div>
                <input type="number" class="loot-input" value="${item.rareDrop || 100}" min="1" max="100" onchange="updateItemField(${index}, 'rareDrop', this.value)">
                <input type="number" class="loot-input" value="${item.amount?.minAmount || 1}" min="1" onchange="updateItemField(${index}, 'minAmount', this.value)">
                <input type="number" class="loot-input" value="${item.amount?.maxAmount || 1}" min="1" onchange="updateItemField(${index}, 'maxAmount', this.value)">
                <button class="loot-delete" onclick="removeItem(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            `;
            rows.appendChild(div);
        });
    }
    
    renderContainerList();
}


function updateItemField(index, field, value) {
    const item = containers[currentContainer].lootPresets[index];
    const numValue = Math.min(Math.max(parseInt(value) || 1, 1), 1000000);
    
    if (field === 'rareDrop') {
        item.rareDrop = Math.min(numValue, 100);
    } else if (field === 'minAmount') {
        item.amount = item.amount || {};
        item.amount.minAmount = numValue;
    } else if (field === 'maxAmount') {
        item.amount = item.amount || {};
        item.amount.maxAmount = numValue;
    }
    saveToStorage();
}

function removeItem(index) {
    containers[currentContainer].lootPresets.splice(index, 1);
    saveToStorage();
    renderLootTable();
}

// Item Picker
function openItemPicker() {
    currentCategory = null;
    renderItemPicker();
    document.getElementById('itemPickerModal').classList.add('active');
    document.getElementById('itemSearch').value = '';
}

function closeItemPicker() {
    document.getElementById('itemPickerModal').classList.remove('active');
}

function renderItemPicker() {
    const grid = document.getElementById('itemPickerGrid');
    const categories = document.getElementById('itemCategories');
    grid.innerHTML = '';
    
    const search = document.getElementById('itemSearch').value.toLowerCase();
    let items = getAllItems();
    
    const cats = typeof getCategories === 'function' ? getCategories() : [...new Set(items.map(i => i.category))];
    categories.innerHTML = `<button class="category-btn ${!currentCategory ? 'active' : ''}" onclick="setCategory(null)">Все</button>`;
    cats.forEach(cat => {
        if (cat) categories.innerHTML += `<button class="category-btn ${currentCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</button>`;
    });
    
    if (currentCategory) items = items.filter(i => i.category === currentCategory);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search) || i.shortname.toLowerCase().includes(search));
    
    items.slice(0, 150).forEach(item => {
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.innerHTML = `<img src="${getIconPath(item.shortname)}" onerror="this.style.display='none'"><span>${item.name}</span>`;
        div.onclick = () => addItem(item);
        grid.appendChild(div);
    });
}

function setCategory(cat) {
    currentCategory = cat;
    renderItemPicker();
}

function scrollCategories(direction) {
    const container = document.getElementById('itemCategories');
    container.scrollBy({ left: direction * 150, behavior: 'smooth' });
}

function filterItems() {
    renderItemPicker();
}

function addItem(item) {
    if (!currentContainer) return;
    containers[currentContainer].lootPresets.push({
        shortname: item.shortname,
        displayName: '',
        rareDrop: 100,
        isBplueprint: false,
        amount: { minAmount: 1, maxAmount: 1 }
    });
    saveToStorage();
    renderLootTable();
    closeItemPicker();
    showToast('Предмет добавлен', 'success');
}

// Item Edit
function openItemEdit(index) {
    editingItemIndex = index;
    const item = containers[currentContainer].lootPresets[index];
    
    document.getElementById('editItemTitle').textContent = item.shortname;
    document.getElementById('editRareDrop').value = item.rareDrop || 100;
    document.getElementById('editMinAmount').value = item.amount?.minAmount || 1;
    document.getElementById('editMaxAmount').value = item.amount?.maxAmount || 1;
    document.getElementById('editIsBlueprint').checked = item.isBplueprint || false;
    updateRareDropLabel();
    
    document.getElementById('itemEditModal').classList.add('active');
}

function closeItemEdit() {
    document.getElementById('itemEditModal').classList.remove('active');
    editingItemIndex = null;
}

function updateRareDropLabel() {
    document.getElementById('rareDropLabel').textContent = document.getElementById('editRareDrop').value + '%';
}

function saveItemEdit() {
    if (editingItemIndex === null) return;
    const item = containers[currentContainer].lootPresets[editingItemIndex];
    item.rareDrop = parseInt(document.getElementById('editRareDrop').value);
    item.amount = {
        minAmount: parseInt(document.getElementById('editMinAmount').value) || 1,
        maxAmount: parseInt(document.getElementById('editMaxAmount').value) || 1
    };
    item.isBplueprint = document.getElementById('editIsBlueprint').checked;
    saveToStorage();
    renderLootTable();
    closeItemEdit();
    showToast('Сохранено', 'success');
}

function deleteItem() {
    if (editingItemIndex === null) return;
    containers[currentContainer].lootPresets.splice(editingItemIndex, 1);
    saveToStorage();
    renderLootTable();
    closeItemEdit();
    showToast('Удалено', 'success');
}


// Import/Export
function saveAll() {
    saveToStorage();
    showToast('Сохранено', 'success');
}

function exportJson() {
    if (Object.keys(containers).length === 0) {
        showToast('Нет контейнеров для экспорта', 'error');
        return;
    }
    
    for (const [name, data] of Object.entries(containers)) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    showToast(`Экспортировано ${Object.keys(containers).length} файлов`, 'success');
}

function exportCurrentContainer() {
    if (!currentContainer) return;
    
    const data = containers[currentContainer];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentContainer}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    showToast('Контейнер экспортирован', 'success');
}

function duplicateContainer() {
    if (!currentContainer) return;
    
    let newName = currentContainer + '_copy';
    let counter = 1;
    while (containers[newName]) {
        newName = currentContainer + '_copy' + counter;
        counter++;
    }
    
    containers[newName] = JSON.parse(JSON.stringify(containers[currentContainer]));
    saveToStorage();
    selectContainer(newName);
    showToast('Контейнер дублирован', 'success');
}

function importJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        let imported = 0;
        let errors = 0;
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const name = file.name.replace('.json', '');
                    
                    if (data.lootPresets !== undefined) {
                        containers[name] = data;
                        imported++;
                    } else if (typeof data === 'object' && !Array.isArray(data)) {
                        for (const [key, value] of Object.entries(data)) {
                            if (value.lootPresets !== undefined) {
                                containers[key] = value;
                                imported++;
                            }
                        }
                    }
                    
                    saveToStorage();
                    renderContainerList();
                    renderWelcomeContainers();
                    
                    if (imported > 0 && !currentContainer) {
                        const firstKey = Object.keys(containers)[0];
                        if (firstKey) selectContainer(firstKey);
                    }
                    
                } catch (err) {
                    console.error('Ошибка импорта:', file.name, err);
                    errors++;
                }
                
                if (imported + errors === files.length) {
                    if (errors > 0) {
                        showToast(`Импортировано: ${imported}, ошибок: ${errors}`, 'error');
                    } else {
                        showToast(`Импортировано ${imported} контейнеров`, 'success');
                    }
                }
            };
            reader.readAsText(file);
        });
    };
    input.click();
}


// Container Picker
const RUST_CONTAINERS = [
    { shortname: 'crate_elite', name: 'Elite Crate', icon: 'elite', color: '#ffd700' },
    { shortname: 'crate_normal', name: 'Normal Crate', icon: 'military', color: '#4a7c4e' },
    { shortname: 'crate_normal_2', name: 'Normal Crate 2', icon: 'military', color: '#5a8c5e' },
    { shortname: 'crate_normal_2_food', name: 'Food Crate', icon: 'food', color: '#8b4513' },
    { shortname: 'crate_normal_2_medical', name: 'Medical Crate', icon: 'medical', color: '#dc3545' },
    { shortname: 'crate_tools', name: 'Tool Crate', icon: 'tools', color: '#cd5c5c' },
    { shortname: 'crate_underwater_basic', name: 'Underwater Basic', icon: 'underwater', color: '#1e90ff' },
    { shortname: 'crate_underwater_advanced', name: 'Underwater Advanced', icon: 'underwater', color: '#00bfff' },
    { shortname: 'crate_basic', name: 'Basic Crate', icon: 'basic', color: '#8b7355' },
    { shortname: 'crate_mine', name: 'Mine Crate', icon: 'mine', color: '#696969' },
    { shortname: 'bradley_crate', name: 'Bradley Crate', icon: 'bradley', color: '#556b2f' },
    { shortname: 'heli_crate', name: 'Heli Crate', icon: 'heli', color: '#2f4f4f' },
    { shortname: 'supply_drop', name: 'Supply Drop', icon: 'airdrop', color: '#228b22' },
    { shortname: 'loot_barrel_1', name: 'Barrel 1', icon: 'barrel', color: '#4682b4' },
    { shortname: 'loot_barrel_2', name: 'Barrel 2', icon: 'barrel', color: '#5f9ea0' },
    { shortname: 'oil_barrel', name: 'Oil Barrel', icon: 'oil', color: '#2f2f2f' },
    { shortname: 'foodbox', name: 'Food Box', icon: 'food', color: '#a0522d' },
    { shortname: 'vehicle_parts', name: 'Vehicle Parts', icon: 'vehicle', color: '#708090' },
    { shortname: 'crate_ammunition', name: 'Ammo Crate', icon: 'ammo', color: '#b8860b' },
    { shortname: 'crate_fuel', name: 'Fuel Crate', icon: 'fuel', color: '#ff6347' },
    { shortname: 'minecart', name: 'Minecart', icon: 'minecart', color: '#8b4513' }
];

function getContainerIcon(type) {
    const icons = {
        elite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
        military: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 10h18"/><path d="M8 6v4M16 6v4"/><path d="M7 14h2M11 14h2M15 14h2"/></svg>',
        food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>',
        medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M12 9v6M9 12h6"/></svg>',
        tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="1" fill="none"/><path d="M14.7 10.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l1.5-1.5a3 3 0 01-4-4l-1.5 1.5z"/><path d="M8 15l3-3"/></svg>',
        underwater: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M6 14c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0"/><circle cx="8" cy="10" r="1"/><circle cx="16" cy="10" r="1"/></svg>',
        basic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="16" height="10" rx="1"/><path d="M4 11h16"/><path d="M9 7v4M15 7v4"/></svg>',
        mine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="8" width="18" height="10" rx="1"/><path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/><path d="M12 12v3"/><circle cx="12" cy="13" r="2"/></svg>',
        bradley: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="10" width="20" height="8" rx="1"/><path d="M6 10V8a1 1 0 011-1h10a1 1 0 011 1v2"/><circle cx="6" cy="15" r="2"/><circle cx="18" cy="15" r="2"/><path d="M14 7l4-3"/></svg>',
        heli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="18" height="8" rx="1"/><path d="M6 10V8l6-4 6 4v2"/><path d="M4 6h16"/><circle cx="12" cy="4" r="1"/></svg>',
        airdrop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="12" width="14" height="10" rx="1"/><path d="M8 12V9a4 4 0 018 0v3"/><path d="M12 2v4"/><path d="M8 4l4 2 4-2"/></svg>',
        barrel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3"/></svg>',
        oil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>',
        vehicle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="8" width="18" height="10" rx="1"/><circle cx="7" cy="15" r="2"/><circle cx="17" cy="15" r="2"/><path d="M3 12h18"/></svg>',
        ammo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="8" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="16" cy="12" r="2"/></svg>',
        fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="12" height="14" rx="1"/><path d="M16 10h2a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M8 2v4M12 2v4"/><path d="M7 12h6"/></svg>',
        minecart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10h16l-2 8H6l-2-8z"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M6 10V7a2 2 0 012-2h8a2 2 0 012 2v3"/></svg>'
    };
    return icons[type] || icons.basic;
}

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
    grid.innerHTML = '';
    
    const search = document.getElementById('containerSearch').value.toLowerCase();
    let list = RUST_CONTAINERS;
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.shortname.toLowerCase().includes(search));
    
    list.forEach(container => {
        const div = document.createElement('div');
        div.className = 'container-picker-item';
        div.innerHTML = `
            <div class="container-picker-icon" style="background: ${container.color}20; color: ${container.color}">
                ${getContainerIcon(container.icon)}
            </div>
            <div class="container-picker-info">
                <span class="container-name">${container.name}</span>
                <span class="container-short">${container.shortname}</span>
            </div>
        `;
        div.onclick = () => addContainerFromPicker(container.shortname);
        grid.appendChild(div);
    });
}

function filterContainers() {
    renderContainerPicker();
}

function addContainerFromPicker(shortname) {
    if (containers[shortname]) {
        showToast('Контейнер уже существует', 'error');
        return;
    }
    containers[shortname] = {
        enabled: true,
        amountLoot: { minAmount: 1, maxAmount: 3 },
        lootPresets: []
    };
    saveToStorage();
    selectContainer(shortname);
    closeContainerPicker();
    showToast('Контейнер создан', 'success');
}
