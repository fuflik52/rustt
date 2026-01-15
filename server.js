require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Явно отдаём style.css с правильным MIME типом
app.get('/style.css', (req, res) => {
    res.type('text/css');
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.use(express.static('public'));
app.use('/icons', express.static('icons')); // Иконки из папки icons
app.use('/crates', express.static('public/crates')); // Фото ящиков
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Папка для данных контейнеров
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Загрузка списка предметов из items-list.json
let ALL_ITEMS = [];
const ITEMS_FILE = path.join(__dirname, 'items-list.json');
if (fs.existsSync(ITEMS_FILE)) {
    ALL_ITEMS = JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf8'));
}

// Загрузка полной информации о предметах из JSON файлов в папке icons
const ICONS_DIR = path.join(__dirname, 'icons');
let ITEMS_INFO = {};
if (fs.existsSync(ICONS_DIR)) {
    const jsonFiles = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.json'));
    jsonFiles.forEach(file => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(ICONS_DIR, file), 'utf8'));
            if (data.shortname) {
                ITEMS_INFO[data.shortname] = data;
            }
        } catch (e) {}
    });
}

function getCategories() {
    return [...new Set(ALL_ITEMS.map(i => i.category))].filter(Boolean).sort();
}

function getItemName(shortname) {
    const item = ALL_ITEMS.find(i => i.shortname === shortname);
    return item ? item.name : shortname;
}

const RUST_CONTAINERS = [
    { shortname: 'crate_elite', name: 'Elite Crate', image: '/crates/elite-crate-removebg-preview.png' },
    { shortname: 'crate_normal', name: 'Normal Crate', image: '/crates/radtown-crate-normal.avif' },
    { shortname: 'crate_normal_2', name: 'Normal Crate 2', image: '/crates/radtown-crate-normal-2 (1).avif' },
    { shortname: 'crate_normal_2_food', name: 'Food Crate', image: '/crates/food-crate-removebg-preview.png' },
    { shortname: 'crate_normal_2_medical', name: 'Medical Crate', image: '/crates/medical-crate-removebg-preview.png' },
    { shortname: 'crate_tools', name: 'Tool Crate', image: '/crates/tool-crate-removebg-preview.png' },
    { shortname: 'crate_underwater_basic', name: 'Underwater Basic', image: '/crates/underwater-labs-blue-crate-removebg-preview.png' },
    { shortname: 'crate_underwater_advanced', name: 'Underwater Advanced', image: '/crates/box-wooden-large.avif' },
    { shortname: 'crate_basic', name: 'Basic Crate', image: '/crates/radtown-crate-basic (1).jpeg' },
    { shortname: 'crate_mine', name: 'Mine Crate', image: '/crates/radtown-crate-normal-2 (1).avif' },
    { shortname: 'bradley_crate', name: 'Bradley Crate', image: '/crates/bradley-crate-removebg-preview.png' },
    { shortname: 'heli_crate', name: 'Heli Crate', image: '/crates/elite-crate-removebg-preview.png' },
    { shortname: 'supply_drop', name: 'Supply Drop', image: '/crates/supply-drop-removebg-preview.png' },
    { shortname: 'loot_barrel_1', name: 'Barrel 1', image: '/crates/autospawn-resource-loot-loot-barrel-1.avif' },
    { shortname: 'loot_barrel_2', name: 'Barrel 2', image: '/crates/autospawn-resource-loot-loot-barrel-2.avif' },
    { shortname: 'oil_barrel', name: 'Oil Barrel', image: '/crates/radtown-oil-barrel.avif' },
    { shortname: 'foodbox', name: 'Food Box', image: '/crates/underwater-labs-ration-box-removebg-preview.png' },
    { shortname: 'vehicle_parts', name: 'Vehicle Parts', image: '/crates/vehicle-parts-removebg-preview.png' },
    { shortname: 'crate_ammunition', name: 'Ammo Crate', image: '/crates/radtown-underwater-labs-crate-ammunition.avif' },
    { shortname: 'crate_fuel', name: 'Fuel Crate', image: '/crates/radtown-underwater-labs-crate-fuel.avif' },
    { shortname: 'minecart', name: 'Minecart', image: '/crates/radtown-minecart.avif' },
    { shortname: 'codelockedhackablecrate', name: 'Hackable Crate', image: '/crates/codelockedhackablecrate-removebg-preview.png' }
];

// ============ ROUTES ============

// Секретная страница экспорта иконок (не показывается нигде)
app.get('/generateurl', (req, res) => {
    // Определяем базовый URL
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.render('secret-icons', {
        items: ALL_ITEMS,
        baseUrl: baseUrl
    });
});

// Скрытая страница статистики прогресса (не показывается в меню)
app.get('/testprogress', (req, res) => {
    const progressFile = path.join(__dirname, 'PlayerSpins.json');
    let progressData = {};
    
    if (fs.existsSync(progressFile)) {
        try {
            progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        } catch (e) {
            progressData = {};
        }
    }
    
    res.render('testprogress', {
        progressData,
        items: ALL_ITEMS,
        getItemName: getItemName
    });
});

// Страница всех игроков (testprogress/players)
app.get('/testprogress/players', (req, res) => {
    const progressFile = path.join(__dirname, 'PlayerSpins.json');
    let progressData = {};
    
    if (fs.existsSync(progressFile)) {
        try {
            progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        } catch (e) {
            progressData = {};
        }
    }
    
    res.render('testprogress-players', {
        progressData,
        items: ALL_ITEMS,
        getItemName: getItemName
    });
});

// Страница профиля игрока (testprogress/player/:steamId)
app.get('/testprogress/player/:steamId', (req, res) => {
    const steamId = req.params.steamId;
    const progressFile = path.join(__dirname, 'PlayerSpins.json');
    let progressData = {};
    
    if (fs.existsSync(progressFile)) {
        try {
            progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        } catch (e) {
            progressData = {};
        }
    }
    
    const player = progressData[steamId];
    if (!player || !player.History || player.History.length === 0) {
        return res.redirect('/testprogress/players');
    }
    
    // Агрегируем данные игрока
    const aggregated = {};
    let totalItems = 0;
    const history = [];
    
    player.History.forEach(entry => {
        const shortname = entry.Reward;
        const amount = entry.Amount || 1;
        const name = getItemName(shortname);
        totalItems += amount;
        
        history.push({ shortname, amount, date: entry.Date, name });
        
        if (!aggregated[shortname]) {
            aggregated[shortname] = { count: 0, total: 0, name };
        }
        aggregated[shortname].count++;
        aggregated[shortname].total += amount;
    });
    
    const playerData = {
        totalSpins: player.History.length,
        totalItems,
        uniqueCount: Object.keys(aggregated).length,
        availableSpins: player.AvailableSpins || 0,
        aggregated,
        history
    };
    
    res.render('testprogress-player', {
        steamId,
        playerName: 'Player ' + steamId.slice(-6),
        playerData,
        items: ALL_ITEMS,
        getItemName: getItemName
    });
});

// Страница игроков
app.get('/players', (req, res) => {
    const progressFile = path.join(__dirname, 'PlayerSpins.json');
    let progressData = {};
    
    if (fs.existsSync(progressFile)) {
        try {
            progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        } catch (e) {
            progressData = {};
        }
    }
    
    res.render('players', {
        progressData,
        items: ALL_ITEMS,
        getItemName: getItemName
    });
});

// Страница настройки стаков
app.get('/stacks', (req, res) => {
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    let stacksData = {};
    
    if (fs.existsSync(stacksFile)) {
        try {
            stacksData = JSON.parse(fs.readFileSync(stacksFile, 'utf8'));
        } catch (e) {
            stacksData = {};
        }
    }
    
    const containers = getContainers();
    
    res.render('stacks', {
        stacksData,
        items: ALL_ITEMS,
        categories: getCategories(),
        getItemName: getItemName,
        containers,
        rustContainers: RUST_CONTAINERS
    });
});

// API для списка предметов
app.get('/items-list.json', (req, res) => {
    res.json(ALL_ITEMS);
});

// Steam API ключ из переменной окружения
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

// Кэш Steam профилей (чтобы не делать много запросов)
const steamProfilesCache = {};

// API для получения Steam профилей
app.get('/api/steam/profiles', async (req, res) => {
    const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 100);
    if (ids.length === 0) {
        return res.json([]);
    }
    
    // Проверяем кэш
    const cached = [];
    const toFetch = [];
    ids.forEach(id => {
        if (steamProfilesCache[id]) {
            cached.push(steamProfilesCache[id]);
        } else {
            toFetch.push(id);
        }
    });
    
    if (toFetch.length === 0) {
        return res.json(cached);
    }
    
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${toFetch.join(',')}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.response && data.response.players) {
            data.response.players.forEach(player => {
                const profile = {
                    steamid: player.steamid,
                    personaname: player.personaname,
                    avatar: player.avatarmedium || player.avatar,
                    avatarfull: player.avatarfull,
                    profileurl: player.profileurl
                };
                steamProfilesCache[player.steamid] = profile;
                cached.push(profile);
            });
        }
        
        res.json(cached);
    } catch (err) {
        console.error('Steam API error:', err);
        // Возвращаем заглушки для тех, кого не удалось загрузить
        toFetch.forEach(id => {
            cached.push({
                steamid: id,
                personaname: 'Player ' + id.slice(-6),
                avatar: ''
            });
        });
        res.json(cached);
    }
});

// API для полной информации о предмете
app.get('/api/item/:shortname', (req, res) => {
    const shortname = req.params.shortname;
    const info = ITEMS_INFO[shortname];
    if (info) {
        res.json(info);
    } else {
        res.status(404).json({ error: 'Item not found' });
    }
});

// API для получения контейнеров, в которых участвует предмет
app.get('/api/item/:shortname/containers', (req, res) => {
    const shortname = req.params.shortname;
    const containers = getContainers();
    const result = [];
    
    containers.forEach(containerName => {
        const filePath = path.join(DATA_DIR, `${containerName}.json`);
        if (fs.existsSync(filePath)) {
            const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const itemInContainer = containerData.lootPresets?.find(item => item.shortname === shortname);
            if (itemInContainer) {
                const containerInfo = RUST_CONTAINERS.find(c => c.shortname === containerName);
                result.push({
                    shortname: containerName,
                    name: containerInfo?.name || containerName,
                    image: containerInfo?.image || null,
                    itemData: itemInContainer
                });
            }
        }
    });
    
    res.json(result);
});

// Страница глобального поиска предметов
app.get('/allitems', (req, res) => {
    const containers = getContainers();
    res.render('allitems', {
        containers,
        currentContainer: null,
        items: ALL_ITEMS,
        categories: getCategories(),
        rustContainers: RUST_CONTAINERS
    });
});

// Главная страница
app.get('/', (req, res) => {
    const containers = getContainers();
    res.render('index', { 
        containers, 
        currentContainer: null,
        rustContainers: RUST_CONTAINERS
    });
});

// Страница контейнера
app.get('/container/:name', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.redirect('/?error=notfound');
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const containers = getContainers();
    
    res.render('container', {
        containers,
        currentContainer: name,
        containerData,
        items: ALL_ITEMS,
        categories: getCategories(),
        getItemName: getItemName,
        rustContainers: RUST_CONTAINERS
    });
});

// Страница контейнера с предметом (редирект на основную)
app.get('/container/:name/:item', (req, res) => {
    const name = req.params.name;
    const item = req.params.item;
    
    // Если это info - показываем страницу статистики
    if (item === 'info') {
        const filePath = path.join(DATA_DIR, `${name}.json`);
        if (!fs.existsSync(filePath)) {
            return res.redirect('/?error=notfound');
        }
        const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const containers = getContainers();
        return res.render('container-info', {
            containers,
            currentContainer: name,
            containerData,
            items: ALL_ITEMS,
            categories: getCategories(),
            getItemName: getItemName,
            rustContainers: RUST_CONTAINERS
        });
    }
    
    // Редирект на основную страницу контейнера
    res.redirect(`/container/${encodeURIComponent(name)}`);
});

// Страница импортированного контейнера (URL: /import/crate_tools)
app.get('/import/:name', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.redirect('/?error=notfound');
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const containers = getContainers();
    
    res.render('container', {
        containers,
        currentContainer: name,
        containerData,
        items: ALL_ITEMS,
        categories: getCategories(),
        getItemName: getItemName,
        rustContainers: RUST_CONTAINERS,
        isImported: true
    });
});

// ============ API ============

// Создать контейнер
app.post('/api/container', (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.json({ error: 'empty name' });
    }
    
    const filePath = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(filePath)) {
        return res.json({ error: 'exists' });
    }
    
    // supply_drop может иметь до 24 слотов, остальные до 6
    const isSupplyDrop = name === 'supply_drop';
    const containerData = {
        enabled: true,
        amountLoot: { minAmount: 1, maxAmount: isSupplyDrop ? 6 : 3 },
        lootPresets: []
    };
    
    fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    res.json({ success: true, name });
});

// Обновить настройки контейнера
app.post('/api/container/:name/settings', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    containerData.enabled = req.body.enabled === 'true' || req.body.enabled === true;
    containerData.amountLoot = {
        minAmount: parseInt(req.body.minAmount) || 1,
        maxAmount: parseInt(req.body.maxAmount) || 3
    };
    
    fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    res.json({ success: true });
});

// Добавить предмет
app.post('/api/container/:name/item', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    containerData.lootPresets.push({
        shortname: req.body.shortname,
        displayName: '',
        rareDrop: parseInt(req.body.rareDrop) || 100,
        isBplueprint: req.body.isBlueprint === 'true' || req.body.isBlueprint === true,
        amount: {
            minAmount: parseInt(req.body.minAmount) || 1,
            maxAmount: parseInt(req.body.maxAmount) || 1
        },
        skinID: parseInt(req.body.skinID) || 0
    });
    
    fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    res.json({ success: true });
});

// Обновить предмет
app.put('/api/container/:name/item/:index', (req, res) => {
    const name = req.params.name;
    const index = parseInt(req.params.index);
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (index >= 0 && index < containerData.lootPresets.length) {
        const item = containerData.lootPresets[index];
        if (req.body.rareDrop !== undefined) item.rareDrop = parseInt(req.body.rareDrop);
        if (req.body.minAmount !== undefined) item.amount.minAmount = parseInt(req.body.minAmount);
        if (req.body.maxAmount !== undefined) item.amount.maxAmount = parseInt(req.body.maxAmount);
        if (req.body.isBlueprint !== undefined) item.isBplueprint = req.body.isBlueprint === 'true' || req.body.isBlueprint === true;
        if (req.body.skinID !== undefined) item.skinID = parseInt(req.body.skinID) || 0;
        
        fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    }
    
    res.json({ success: true });
});

// Удалить предмет
app.delete('/api/container/:name/item/:index', (req, res) => {
    const name = req.params.name;
    const index = parseInt(req.params.index);
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (index >= 0 && index < containerData.lootPresets.length) {
        containerData.lootPresets.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    }
    
    res.json({ success: true });
});

// Обновить все предметы (bulk)
app.put('/api/container/:name/items/bulk', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    containerData.lootPresets = req.body.items || [];
    fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    
    res.json({ success: true });
});

// Удалить все предметы из контейнера
app.delete('/api/container/:name/items/clear', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.json({ error: 'not found' });
    }
    
    const containerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    containerData.lootPresets = [];
    fs.writeFileSync(filePath, JSON.stringify(containerData, null, 2));
    
    res.json({ success: true });
});

// Удалить контейнер
app.delete('/api/container/:name', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    
    res.json({ success: true });
});

// ============ STACK SIZE API ============

// Получить все настройки стаков
app.get('/api/stacks', (req, res) => {
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    let stacksData = {};
    
    if (fs.existsSync(stacksFile)) {
        try {
            stacksData = JSON.parse(fs.readFileSync(stacksFile, 'utf8'));
        } catch (e) {
            stacksData = {};
        }
    }
    
    res.json(stacksData);
});

// Обновить размер стака для предмета
app.post('/api/stacks/:shortname', (req, res) => {
    const shortname = req.params.shortname;
    const stackSize = parseInt(req.body.stackSize);
    
    if (!stackSize || stackSize < 1) {
        return res.json({ error: 'invalid stack size' });
    }
    
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    let stacksData = {};
    
    if (fs.existsSync(stacksFile)) {
        try {
            stacksData = JSON.parse(fs.readFileSync(stacksFile, 'utf8'));
        } catch (e) {
            stacksData = {};
        }
    }
    
    stacksData[shortname] = stackSize;
    fs.writeFileSync(stacksFile, JSON.stringify(stacksData, null, 2));
    
    res.json({ success: true });
});

// Удалить настройку стака (вернуть к стандартному)
app.delete('/api/stacks/:shortname', (req, res) => {
    const shortname = req.params.shortname;
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    let stacksData = {};
    
    if (fs.existsSync(stacksFile)) {
        try {
            stacksData = JSON.parse(fs.readFileSync(stacksFile, 'utf8'));
        } catch (e) {
            stacksData = {};
        }
    }
    
    delete stacksData[shortname];
    fs.writeFileSync(stacksFile, JSON.stringify(stacksData, null, 2));
    
    res.json({ success: true });
});

// Экспорт настроек стаков
app.get('/api/stacks/export', (req, res) => {
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    let stacksData = {};
    
    if (fs.existsSync(stacksFile)) {
        try {
            stacksData = JSON.parse(fs.readFileSync(stacksFile, 'utf8'));
        } catch (e) {
            stacksData = {};
        }
    }
    
    res.json(stacksData);
});

// Импорт настроек стаков
app.post('/api/stacks/import', (req, res) => {
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
        return res.json({ error: 'invalid data' });
    }
    
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    fs.writeFileSync(stacksFile, JSON.stringify(data, null, 2));
    
    res.json({ success: true });
});

// Очистить все настройки стаков
app.delete('/api/stacks', (req, res) => {
    const stacksFile = path.join(__dirname, 'SimpleStackSize.json');
    fs.writeFileSync(stacksFile, JSON.stringify({}, null, 2));
    
    res.json({ success: true });
});

// Экспорт контейнера
app.get('/api/container/:name/export', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(DATA_DIR, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ name, data });
});

// Экспорт всех контейнеров
app.get('/api/containers/export', (req, res) => {
    const containers = {};
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    
    files.forEach(file => {
        const name = file.replace('.json', '');
        const filePath = path.join(DATA_DIR, file);
        containers[name] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
    
    res.json(containers);
});

// Экспорт всех контейнеров в ZIP
app.get('/api/containers/export-zip', (req, res) => {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
        return res.status(404).json({ error: 'no containers' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=CustomLoot_containers.zip');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    
    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        archive.file(filePath, { name: file });
    });
    
    archive.finalize();
});

// Импорт контейнера
app.post('/api/import', (req, res) => {
    const { name, data } = req.body;
    
    if (!name || !data) {
        return res.json({ error: 'invalid data' });
    }
    
    const filePath = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({ success: true, name });
});

// ============ HELPERS ============

function getContainers() {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

// ============ START ============

app.listen(PORT, () => {
    console.log(`Loot Editor запущен: http://localhost:${PORT}`);
});
