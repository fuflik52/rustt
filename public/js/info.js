// Info page JS
let lootItems = CONTAINER_DATA.lootPresets || [];

// Theme
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Init theme
(function() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

// Get item info
function getItemInfo(shortname) {
    return ALL_ITEMS.find(i => i.shortname === shortname) || { name: shortname, category: 'Misc' };
}

// Update stats
function updateStats() {
    const total = lootItems.length;
    const avgChance = total > 0 ? Math.round(lootItems.reduce((s, i) => s + (i.rareDrop || 100), 0) / total) : 0;
    const blueprints = lootItems.filter(i => i.isBlueprint || i.isBplueprint).length;
    const withMods = lootItems.filter(i => i.attachments && i.attachments.length > 0).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAvgChance').textContent = avgChance + '%';
    document.getElementById('statBlueprints').textContent = blueprints;
    document.getElementById('statWithMods').textContent = withMods;
    document.getElementById('itemsCountBadge').textContent = total + ' предметов';
}

// Pie chart colors
const PIE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9'
];

// Render categories distribution as donut chart
function renderCategoriesDistribution() {
    const container = document.getElementById('categoriesDistribution');
    const categories = {};
    
    lootItems.forEach(item => {
        const info = getItemInfo(item.shortname);
        const cat = info.category || 'Misc';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const total = lootItems.length || 1;
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="pie-empty">Нет данных</div>';
        return;
    }
    
    // Build donut chart with stroke-dasharray
    const size = 200;
    const center = size / 2;
    const radius = 70;
    const strokeWidth = 28;
    const circumference = 2 * Math.PI * radius;
    
    let offset = 0;
    const slices = sorted.map(([cat, count], i) => {
        const percent = (count / total) * 100;
        const dashLength = (percent / 100) * circumference;
        const gap = circumference - dashLength;
        const color = PIE_COLORS[i % PIE_COLORS.length];
        const slice = { cat, count, percent, dashLength, gap, offset, color };
        offset += dashLength;
        return slice;
    });
    
    const circles = slices.map((slice, i) => `
        <circle 
            cx="${center}" cy="${center}" r="${radius}"
            fill="none" 
            stroke="${slice.color}" 
            stroke-width="${strokeWidth}"
            stroke-dasharray="${slice.dashLength} ${slice.gap}"
            stroke-dashoffset="${-slice.offset}"
            class="donut-slice"
            data-cat="${slice.cat}" 
            data-count="${slice.count}" 
            data-percent="${slice.percent.toFixed(1)}"
            style="--delay: ${i * 0.08}s"
        />
    `).join('');
    
    const legendItems = slices.map(slice => `
        <div class="pie-legend-item" data-cat="${slice.cat}">
            <span class="pie-legend-color" style="background: ${slice.color}"></span>
            <span class="pie-legend-name">${slice.cat}</span>
            <span class="pie-legend-value">${slice.count} шт · ${slice.percent.toFixed(0)}%</span>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="pie-chart-wrapper">
            <div class="pie-chart-container">
                <svg viewBox="0 0 ${size} ${size}" class="donut-chart">
                    <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--bg-tertiary)" stroke-width="${strokeWidth}" class="donut-bg"/>
                    ${circles}
                </svg>
                <div class="donut-center">
                    <span class="donut-total">${total}</span>
                    <span class="donut-label">предметов</span>
                </div>
                <div class="pie-tooltip" id="pieTooltip"></div>
            </div>
            <div class="pie-legend">${legendItems}</div>
        </div>
    `;
    
    // Add hover events
    const tooltip = document.getElementById('pieTooltip');
    const centerTotal = container.querySelector('.donut-total');
    const centerLabel = container.querySelector('.donut-label');
    
    container.querySelectorAll('.donut-slice').forEach(slice => {
        slice.addEventListener('mouseenter', (e) => {
            const cat = e.target.dataset.cat;
            const count = e.target.dataset.count;
            const percent = e.target.dataset.percent;
            
            // Update center text
            centerTotal.textContent = count;
            centerLabel.textContent = cat;
            
            // Show tooltip
            tooltip.innerHTML = `<strong>${cat}</strong><br>${count} предметов · ${percent}%`;
            tooltip.classList.add('active');
            
            // Highlight slice
            e.target.style.strokeWidth = '32';
            e.target.style.filter = 'brightness(1.1)';
        });
        slice.addEventListener('mouseleave', (e) => {
            centerTotal.textContent = total;
            centerLabel.textContent = 'предметов';
            tooltip.classList.remove('active');
            e.target.style.strokeWidth = '';
            e.target.style.filter = '';
        });
        slice.addEventListener('mousemove', (e) => {
            const rect = container.querySelector('.pie-chart-container').getBoundingClientRect();
            tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
            tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        });
    });
    
    // Legend hover
    container.querySelectorAll('.pie-legend-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const cat = item.dataset.cat;
            container.querySelectorAll('.donut-slice').forEach(slice => {
                if (slice.dataset.cat === cat) {
                    slice.style.strokeWidth = '32';
                    slice.style.filter = 'brightness(1.1)';
                    centerTotal.textContent = slice.dataset.count;
                    centerLabel.textContent = cat;
                } else {
                    slice.style.opacity = '0.3';
                }
            });
        });
        item.addEventListener('mouseleave', () => {
            centerTotal.textContent = total;
            centerLabel.textContent = 'предметов';
            container.querySelectorAll('.donut-slice').forEach(slice => {
                slice.style.strokeWidth = '';
                slice.style.filter = '';
                slice.style.opacity = '';
            });
        });
    });
}

// Render items by category
function renderItemsByCategory() {
    const container = document.getElementById('itemsByCategory');
    const categories = {};
    
    lootItems.forEach((item, index) => {
        const info = getItemInfo(item.shortname);
        const cat = info.category || 'Misc';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ ...item, index, info });
    });
    
    const sorted = Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]));
    
    container.innerHTML = sorted.map(([cat, items]) => `
        <div class="category-group">
            <div class="category-group-header">
                <span>${cat}</span>
                <span class="category-group-count">${items.length} предметов</span>
            </div>
            <div class="category-group-items">
                ${items.map(item => `
                    <div class="category-item">
                        <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.style.opacity='0.3'">
                        <div class="category-item-info">
                            <span class="category-item-name">${item.info.name}</span>
                            <span class="category-item-meta">${item.rareDrop || 100}% · ${item.amount?.minAmount || 1}-${item.amount?.maxAmount || 1} шт.</span>
                        </div>
                        ${(item.isBlueprint || item.isBplueprint) ? '<img src="/icons/blueprintbase.png" class="bp-icon" title="Чертёж">' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Simulate loot (Генератор дропа)
function simulateLoot() {
    const container = document.getElementById('simulationResult');
    const minLoot = CONTAINER_DATA.amountLoot?.minAmount || 1;
    const maxLoot = CONTAINER_DATA.amountLoot?.maxAmount || 3;
    const dropCount = Math.floor(Math.random() * (maxLoot - minLoot + 1)) + minLoot;
    
    if (lootItems.length === 0) {
        container.innerHTML = '<div class="simulation-empty"><p>Нет предметов для генерации</p></div>';
        return;
    }
    
    // Weighted random selection without duplicates
    const dropped = [];
    const available = [...lootItems]; // Copy to track available items
    const actualDropCount = Math.min(dropCount, available.length);
    
    for (let i = 0; i < actualDropCount; i++) {
        const totalWeight = available.reduce((s, item) => s + (item.rareDrop || 100), 0);
        let rand = Math.random() * totalWeight;
        
        for (let j = 0; j < available.length; j++) {
            rand -= (available[j].rareDrop || 100);
            if (rand <= 0) {
                const item = available[j];
                const info = getItemInfo(item.shortname);
                const amount = Math.floor(Math.random() * ((item.amount?.maxAmount || 1) - (item.amount?.minAmount || 1) + 1)) + (item.amount?.minAmount || 1);
                dropped.push({ ...item, info, amount });
                available.splice(j, 1); // Remove from available to prevent duplicates
                break;
            }
        }
    }
    
    container.innerHTML = `
        <div class="simulation-items">
            ${dropped.map((item, i) => `
                <div class="simulation-item" style="animation-delay: ${i * 0.08}s">
                    <img src="/icons/${encodeURIComponent(item.shortname)}.png" onerror="this.style.opacity='0.3'">
                    <div class="simulation-item-info">
                        <span class="simulation-item-name">${item.info.name}</span>
                        <span class="simulation-item-amount">x${item.amount}</span>
                    </div>
                    ${(item.isBlueprint || item.isBplueprint) ? '<img src="/icons/blueprintbase.png" class="bp-icon-small" title="Чертёж">' : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    renderCategoriesDistribution();
    renderItemsByCategory();
});


// Language
function changeLanguage(lang) {
    localStorage.setItem('lootEditorLang', lang);
}

(function() {
    const saved = localStorage.getItem('lootEditorLang') || 'ru';
    const select = document.getElementById('langSelect');
    if (select) select.value = saved;
})();
