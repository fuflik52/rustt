// Items data - загружается из items-list.json
let ALL_ITEMS = [];

// Загрузка при старте
(async function loadItems() {
    try {
        const res = await fetch('/items-list.json');
        ALL_ITEMS = await res.json();
        console.log(`Loaded ${ALL_ITEMS.length} items`);
    } catch (err) {
        console.error('Failed to load items:', err);
    }
})();

function getAllItems() { return ALL_ITEMS; }

function getItemName(shortname) {
    const item = ALL_ITEMS.find(i => i.shortname === shortname);
    return item ? item.name : shortname;
}

function getCategories() {
    return [...new Set(ALL_ITEMS.map(i => i.category))].filter(Boolean).sort();
}
