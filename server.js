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
app.use('/bp-images', express.static(path.join(__dirname, 'bp', 'Images'))); // Custom BP images
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

// ============ HIT STATS ROUTES ============

// Страница со списком всех игроков HitStats
app.get('/stats', (req, res) => {
    const hitStatsFile = path.join(__dirname, 'HitStats.json');
    let hitStatsData = {};
    
    if (fs.existsSync(hitStatsFile)) {
        try {
            hitStatsData = JSON.parse(fs.readFileSync(hitStatsFile, 'utf8'));
        } catch (e) {
            hitStatsData = {};
        }
    }
    
    res.render('hitstats', {
        hitStatsData
    });
});

// Страница статистики конкретного игрока
app.get('/stats/:steamId', (req, res) => {
    const steamId = req.params.steamId;
    const hitStatsFile = path.join(__dirname, 'HitStats.json');
    let hitStatsData = {};
    
    if (fs.existsSync(hitStatsFile)) {
        try {
            hitStatsData = JSON.parse(fs.readFileSync(hitStatsFile, 'utf8'));
        } catch (e) {
            hitStatsData = {};
        }
    }
    
    const playerStats = hitStatsData[steamId];
    if (!playerStats) {
        return res.redirect('/stats');
    }
    
    res.render('hitstats-player', {
        steamId,
        playerStats,
        allPlayers: hitStatsData
    });
});

// API для получения HitStats данных
app.get('/api/hitstats', (req, res) => {
    const hitStatsFile = path.join(__dirname, 'HitStats.json');
    let hitStatsData = {};
    
    if (fs.existsSync(hitStatsFile)) {
        try {
            hitStatsData = JSON.parse(fs.readFileSync(hitStatsFile, 'utf8'));
        } catch (e) {
            hitStatsData = {};
        }
    }
    
    res.json(hitStatsData);
});

// Страница настройки стаков
app.get('/stacks', (req, res) => {
    const containers = getContainers();
    
    res.render('stacks', {
        items: ALL_ITEMS,
        categories: getCategories(),
        getItemName: getItemName,
        containers,
        rustContainers: RUST_CONTAINERS
    });
});

// ============ BATTLEPASS ROUTES ============

// Hardcoded rewards from C# to display in UI
const FREE_REWARDS = [
    { shortname: "jackhammer", amount: 5, name: "Буры x5" },
    { shortname: "oretea.pure", amount: 3, name: "Чай ФАРМ Топовый x3" },
    { shortname: "metal.facemask", amount: 5, name: "МВК Маски x5" },
    { shortname: "metal.plate.torso", amount: 5, name: "МВК Грудаки x5" },
    { shortname: "roadsign.kilt", amount: 5, name: "Килты x5" },
    { shortname: "blueberries", amount: 200, name: "Ягоды x200" },
    { shortname: "ammo.rifle.incendiary", amount: 2000, name: "Зажиг. 5.56 x2000" },
    { shortname: "lmg.m249", amount: 1, name: "М249" },
    { shortname: "metal.fragments", amount: 30000, name: "Металл x30000" },
    { shortname: "premium", amount: 1, name: "Premium 1 день", type: "premium" },
    { shortname: "sulfur", amount: 50000, name: "Сера x50000" },
    { shortname: "metal.refined", amount: 1000, name: "МВК x1000" },
    { shortname: "maxhealthtea.pure", amount: 15, name: "Чай ХП Топовый x15" },
    { shortname: "wood", amount: 200000, name: "Дерево x200000" },
    { shortname: "balance", amount: 100, name: "100р баланс", type: "balance" },
    { shortname: "supertea", amount: 1, name: "Супер чай" },
    { shortname: "blueberries", amount: 200, name: "Ягоды x200" },
    { shortname: "stones", amount: 200000, name: "Камень x200000" },
    { shortname: "autoturret", amount: 30, name: "Турели x30" },
    { shortname: "elite", amount: 1, name: "Elite 1 день", type: "elite" },
    { shortname: "oretea.pure", amount: 10, name: "Чай ФАРМ Топовый x10" },
    { shortname: "balance", amount: 250, name: "250р баланс", type: "balance" },
    { shortname: "sulfur", amount: 150000, name: "Сера x150000" },
    { shortname: "metal.fragments", amount: 250000, name: "Металл x250000" },
    { shortname: "king", amount: 1, name: "King 1 день", type: "king" },
    { shortname: "blueberries", amount: 200, name: "Ягоды x200" },
    { shortname: "minicopter", amount: 10, name: "Миникоптеры x10", type: "minicopter" },
    { shortname: "metal.refined", amount: 5000, name: "МВК x5000" },
    { shortname: "maxhealthtea.pure", amount: 30, name: "Чай ХП Топовый x30" },
    { shortname: "pan", amount: 3, name: "Pan 3 дня", type: "pan" }
];

const PREMIUM_REWARDS = [
    { shortname: "blueberries", amount: 300, name: "Ягоды x300" },
    { shortname: "metal.refined", amount: 5000, name: "МВК x5000" },
    { shortname: "metal.facemask", amount: 10, name: "МВК Маски x10" },
    { shortname: "metal.plate.torso", amount: 10, name: "МВК Грудаки x10" },
    { shortname: "roadsign.kilt", amount: 10, name: "Килты x10" },
    { shortname: "sulfur", amount: 200000, name: "Сера x200000" },
    { shortname: "lmg.m249", amount: 3, name: "М249 x3" },
    { shortname: "wood", amount: 200000, name: "Дерево x200000" },
    { shortname: "balance", amount: 300, name: "300р баланс", type: "balance" },
    { shortname: "premium", amount: 7, name: "Premium 7 дней", type: "premium" },
    { shortname: "minicopter", amount: 10, name: "Миникоптеры x10", type: "minicopter" },
    { shortname: "blueberries", amount: 300, name: "Ягоды x300" },
    { shortname: "king", amount: 1, name: "King 1 день", type: "king" },
    { shortname: "stones", amount: 200000, name: "Камень x200000" },
    { shortname: "metal.fragments", amount: 300000, name: "Металл x300000" },
    { shortname: "supertea", amount: 3, name: "Супер чай x3" },
    { shortname: "oretea.pure", amount: 10, name: "Чай ФАРМ Топовый x10" },
    { shortname: "balance", amount: 300, name: "300р баланс", type: "balance" },
    { shortname: "autoturret", amount: 30, name: "Турели x30" },
    { shortname: "elite", amount: 7, name: "Elite 7 дней", type: "elite" },
    { shortname: "maxhealthtea.pure", amount: 30, name: "Чай ХП Топовый x30" },
    { shortname: "minicopter", amount: 10, name: "Миникоптеры x10", type: "minicopter" },
    { shortname: "sulfur", amount: 150000, name: "Сера x150000" },
    { shortname: "metal.refined", amount: 5000, name: "МВК x5000" },
    { shortname: "king", amount: 7, name: "King 7 дней", type: "king" },
    { shortname: "autoturret", amount: 30, name: "Турели x30" },
    { shortname: "jackhammer", amount: 15, name: "Буры x15" },
    { shortname: "balance", amount: 300, name: "300р баланс", type: "balance" },
    { shortname: "sulfur", amount: 200000, name: "Сера x200000" },
    { shortname: "pan", amount: 30, name: "Pan 30 дней", type: "pan" }
];

// Страница батлпасса
app.get('/battlepass', (req, res) => {
    const bpConfigPath = path.join(__dirname, 'bp', 'BattolepasUI.json');
    const playerDataPath = path.join(__dirname, 'bp', 'PlayerData.json');
    
    let bpConfig = {
        "Название батл пасса": "BATTLE PASS",
        "Длительность сезона (дней)": 30,
        "Дата начала сезона": "2025-01-01",
        "Количество заданий в день": 3,
        "Опыт за задание": 100,
        "Опыт для уровня": 300,
        "Награды бесплатного трека": {},
        "Награды премиум трека": {}
    };
    
    let playerData = {};
    
    if (fs.existsSync(bpConfigPath)) {
        try {
            bpConfig = JSON.parse(fs.readFileSync(bpConfigPath, 'utf8'));
        } catch (e) {
            console.error('Error loading BP config:', e);
        }
    }
    
    if (fs.existsSync(playerDataPath)) {
        try {
            playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf8'));
        } catch (e) {
            console.error('Error loading player data:', e);
        }
    }
    
    // Подсчет статистики игроков
    const stats = {
        totalPlayers: Object.keys(playerData).length,
        premiumPlayers: 0,
        totalRewardsClaimed: 0,
        averageLevel: 0,
        maxLevel: 0,
        levelDistribution: {}
    };
    
    let totalLevels = 0;
    
    Object.values(playerData).forEach(player => {
        if (player.IsPremium) stats.premiumPlayers++;
        totalLevels += player.Level || 1;
        stats.maxLevel = Math.max(stats.maxLevel, player.Level || 1);
        
        const level = player.Level || 1;
        stats.levelDistribution[level] = (stats.levelDistribution[level] || 0) + 1;
        
        if (player.ClaimedFree) {
            stats.totalRewardsClaimed += Object.keys(player.ClaimedFree).length;
        }
        if (player.ClaimedPremium) {
            stats.totalRewardsClaimed += Object.keys(player.ClaimedPremium).length;
        }
    });
    
    if (stats.totalPlayers > 0) {
        stats.averageLevel = (totalLevels / stats.totalPlayers).toFixed(1);
    }
    
    res.render('battlepass', {
        bpConfig,
        playerData,
        stats,
        items: ALL_ITEMS,
        getItemName: getItemName,
        containers: getContainers(),
        rustContainers: RUST_CONTAINERS,
        freeRewards: FREE_REWARDS,
        premiumRewards: PREMIUM_REWARDS,
        freeRewards: FREE_REWARDS,
        premiumRewards: PREMIUM_REWARDS
    });
});

// API для сохранения конфига батлпасса
app.post('/api/battlepass/config', (req, res) => {
    const bpConfigPath = path.join(__dirname, 'bp', 'BattolepasUI.json');
    
    try {
        fs.writeFileSync(bpConfigPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API для получения данных игроков
app.get('/api/battlepass/players', (req, res) => {
    const playerDataPath = path.join(__dirname, 'bp', 'PlayerData.json');
    
    if (!fs.existsSync(playerDataPath)) {
        return res.json({});
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(playerDataPath, 'utf8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API для экспорта конфига батлпасса
app.get('/api/battlepass/export', (req, res) => {
    const bpConfigPath = path.join(__dirname, 'bp', 'BattolepasUI.json');
    
    if (!fs.existsSync(bpConfigPath)) {
        return res.status(404).json({ error: 'Config not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(bpConfigPath, 'utf8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
