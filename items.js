// Rust items with categories - 777+ items
const ITEMS_DATA = {
    "Оружие": [
        "rifle.ak", "rifle.ak.ice", "rifle.bolt", "rifle.l96", "rifle.lr300", "rifle.m39", "rifle.semiauto",
        "smg.2", "smg.mp5", "smg.thompson", "lmg.m249",
        "shotgun.double", "shotgun.pump", "shotgun.spas12", "shotgun.waterpipe",
        "pistol.eoka", "pistol.m92", "pistol.nailgun", "pistol.python", "pistol.revolver", "pistol.semiauto",
        "multiplegrenadelauncher", "rocket.launcher", "flamethrower",
        "bow.compound", "bow.hunting", "crossbow",
        "spear.stone", "spear.wooden", "knife.bone", "knife.butcher", "knife.combat", "knife.skinning",
        "longsword", "mace", "machete", "salvaged.cleaver", "salvaged.sword", "bone.club", "paddle",
        "snowballgun", "pitchfork", "sickle", "hmlmg"
    ],
    "Патроны": [
        "ammo.rifle", "ammo.rifle.explosive", "ammo.rifle.hv", "ammo.rifle.incendiary",
        "ammo.pistol", "ammo.pistol.fire", "ammo.pistol.hv",
        "ammo.shotgun", "ammo.shotgun.fire", "ammo.shotgun.slug",
        "ammo.rocket.basic", "ammo.rocket.fire", "ammo.rocket.hv", "ammo.rocket.mlrs", "ammo.rocket.sam", "ammo.rocket.seeker", "ammo.rocket.smoke",
        "ammo.grenadelauncher.buckshot", "ammo.grenadelauncher.he", "ammo.grenadelauncher.smoke",
        "ammo.handmade.shell", "ammo.nailgun.nails", "ammo.snowballgun",
        "arrow.wooden", "arrow.hv", "arrow.fire", "arrow.bone"
    ],
    "Взрывчатка": [
        "explosive.satchel", "explosive.timed", "explosives",
        "grenade.beancan", "grenade.f1", "grenade.flashbang", "grenade.molotov", "grenade.smoke",
        "supply.signal", "surveycharge", "rf.detonator", "firework.boomer.blue", "firework.boomer.green",
        "firework.boomer.orange", "firework.boomer.red", "firework.boomer.violet", "firework.romancandle.blue",
        "firework.romancandle.green", "firework.romancandle.red", "firework.romancandle.violet", "firework.volcano",
        "firework.volcanoviolet"
    ],
    "Броня": [
        "metal.facemask", "metal.plate.torso",
        "coffeecan.helmet", "roadsign.jacket", "roadsign.kilt", "roadsign.gloves",
        "heavy.plate.helmet", "heavy.plate.jacket", "heavy.plate.pants",
        "wood.armor.helmet", "wood.armor.jacket", "wood.armor.pants",
        "bone.armor.suit", "attire.hide.boots", "attire.hide.pants", "attire.hide.poncho", "attire.hide.vest", "attire.hide.helterneck", "attire.hide.skirt",
        "riot.helmet", "bucket.helmet", "deer.skull.mask",
        "horse.armor.roadsign", "horse.armor.wood", "horse.shoes.advanced", "horse.shoes.basic",
        "horse.saddlebag"
    ],
    "Одежда": [
        "hazmatsuit", "hazmatsuit.spacesuit", "hazmatsuit_scientist", "hazmatsuit_scientist_peacekeeper", "hazmatsuit_scientist_arctic",
        "hoodie", "jacket", "jacket.snow", "pants", "pants.shorts", "shirt.collared", "shirt.tanktop", "tshirt", "tshirt.long",
        "shoes.boots", "burlap.gloves", "burlap.headwrap", "burlap.shirt", "burlap.shoes", "burlap.trousers",
        "hat.beenie", "hat.boonie", "hat.candle", "hat.cap", "hat.miner", "hat.wolf",
        "mask.balaclava", "mask.bandana", "tactical.gloves",
        "diving.fins", "diving.mask", "diving.tank", "diving.wetsuit", "nightvisiongoggles",
        "attire.bunny.onesie", "attire.bunnyears", "attire.egg.suit", "attire.nesthat",
        "santahat", "scarecrow.suit", "scarecrowhead", "gloweyes",
        "clatter.helmet", "twitch.headset", "sunglasses", "sunglasses02", "sunglasses03",
        "halloween.mummysuit", "halloween.surgeonsuit", "halloween.lootbag.small", "halloween.lootbag.medium", "halloween.lootbag.large"
    ],
    "Инструменты": [
        "hatchet", "pickaxe", "axe.salvaged", "icepick.salvaged", "jackhammer", "chainsaw",
        "stone.pickaxe", "stonehatchet", "rock", "hammer", "hammer.salvaged", "torch", "flashlight.held",
        "tool.binoculars", "tool.camera", "geiger.counter", "building.planner", "map", "compass",
        "fun.casetterecorder", "cassette", "cassette.medium", "cassette.short",
        "wiretool", "toolgun", "fun.boomboxportable"
    ],
    "Медицина": [
        "syringe.medical", "largemedkit", "bandage", "antiradpills", "blood",
        "healingtea", "healingtea.advanced", "healingtea.pure",
        "maxhealthtea", "maxhealthtea.advanced", "maxhealthtea.pure",
        "radiationresisttea", "radiationresisttea.advanced", "radiationresisttea.pure"
    ],
    "Еда": [
        "apple", "apple.spoiled", "black.raspberries", "blueberries", "cactusflesh", "lemon", "orange",
        "chicken.cooked", "chicken.raw", "chicken.burned", "chicken.spoiled",
        "deermeat.cooked", "deermeat.raw", "deermeat.burned",
        "fish.cooked", "fish.raw", "fish.minnows", "fish.troutsmall", "fish.anchovy", "fish.catfish", "fish.herring",
        "fish.orangeroughy", "fish.salmon", "fish.sardine", "fish.smallshark", "fish.yellowperch",
        "bearmeat", "bearmeat.cooked", "bearmeat.burned",
        "horsemeat.cooked", "horsemeat.raw", "horsemeat.burned",
        "humanmeat.cooked", "humanmeat.raw", "humanmeat.burned", "humanmeat.spoiled",
        "meat.boar", "meat.boar.cooked", "meat.boar.burned",
        "wolfmeat.cooked", "wolfmeat.raw", "wolfmeat.burned", "wolfmeat.spoiled",
        "chocolate", "corn", "corn.cooked", "granolabar", "mushroom", "mushroom.cooked",
        "potato", "potato.cooked", "pumpkin", "pumpkin.cooked",
        "can.beans", "can.beans.empty", "can.tuna", "can.tuna.empty",
        "wheat", "sunflower", "jar.pickle", "candycane", "smallwaterbottle"
    ],
    "Ресурсы": [
        "wood", "stones", "metal.fragments", "metal.ore", "metal.refined", "hq.metal.ore",
        "sulfur", "sulfur.ore", "charcoal", "gunpowder", "lowgradefuel", "crude.oil",
        "cloth", "leather", "fat.animal", "bone.fragments", "scrap",
        "skull.human", "skull.wolf", "wolfskull.burned",
        "horsedung", "fertilizer"
    ],
    "Компоненты": [
        "gears", "metalblade", "metalpipe", "metalspring", "propanetank", "roadsigns",
        "riflebody", "semibody", "smgbody", "techparts", "targeting.computer",
        "rope", "sewingkit", "tarp", "ducttape", "glue", "sheetmetal", "fuse",
        "bleach", "sticks", "innertube", "vehicle.module"
    ],
    "Постройки": [
        "door.hinged.metal", "door.hinged.wood", "door.hinged.toptier",
        "door.double.hinged.metal", "door.double.hinged.wood", "door.double.hinged.toptier",
        "wall.external.high.stone", "wall.external.high", "wall.external.high.ice",
        "gates.external.high.stone", "gates.external.high.wood",
        "wall.frame.cell", "wall.frame.cell.gate", "wall.frame.fence", "wall.frame.fence.gate",
        "wall.frame.garagedoor", "wall.frame.netting", "wall.frame.shopfront", "wall.frame.shopfront.metal",
        "wall.window.bars.metal", "wall.window.bars.toptier", "wall.window.bars.wood", "wall.window.glass.reinforced",
        "floor.grill", "floor.ladder.hatch", "floor.triangle.grill", "floor.triangle.ladder.hatch",
        "ladder.wooden.wall", "shutter.metal.embrasure.a", "shutter.metal.embrasure.b", "shutter.wood.a",
        "barricade.concrete", "barricade.metal", "barricade.sandbags", "barricade.stone", "barricade.wood", "barricade.woodwire", "barricade.cover.wood",
        "lock.code", "lock.key", "door.key",
        "gates.external.high.stone", "gates.external.high.wood",
        "wall.ice.wall", "wall.graveyard.fence"
    ],
    "Мебель": [
        "box.wooden", "box.wooden.large", "box.repair.bench", "coffin.storage", "dropbox", "locker", "fridge", "shelves",
        "bed", "sleepingbag", "sleepingbag.leather",
        "chair", "chair.icethrone", "sofa", "sofa.pattern", "secretlabchair", "table", "rug", "rug.bear",
        "stash.small", "furnace", "furnace.large", "campfire", "fireplace.stone", "bbq", "skull.trophy", "skull.trophy.jar", "skull.trophy.jar2", "skull.trophy.table",
        "cupboard.tool", "research.table", "workbench1", "workbench2", "workbench3",
        "mixingtable", "repairbench", "vendingmachine", "mailbox", "npcvendingmachine",
        "piano", "xylophone", "drumkit", "fun.guitar", "fun.jerrycanguitar", "fun.tuba", "fun.trumpet", "fun.cowbell",
        "microphonestand", "discoball", "discofloor", "discofloor.largetiles", "connected.speaker", "boogieboard",
        "paddlingpool", "innertube", "innertube.horse", "innertube.unicorn",
        "photoframe.large", "photoframe.portrait", "photoframe.landscape",
        "sign.hanging", "sign.hanging.banner.large", "sign.hanging.ornate", "sign.pictureframe.landscape", "sign.pictureframe.portrait", "sign.pictureframe.tall", "sign.pictureframe.xl", "sign.pictureframe.xxl",
        "sign.pole.banner.large", "sign.post.double", "sign.post.single", "sign.post.town", "sign.post.town.roof",
        "sign.wooden.huge", "sign.wooden.large", "sign.wooden.medium", "sign.wooden.small", "sign.neon.125x125", "sign.neon.125x215.animated", "sign.neon.125x215", "sign.neon.xl", "sign.neon.xl.animated"
    ],
    "Электричество": [
        "electric.fuelgenerator.small", "electric.generator.small", "electric.solarpanel.large", "generator.wind.scrap",
        "electric.battery.rechargable.small", "electric.battery.rechargable.medium", "electric.battery.rechargable.large",
        "electric.switch", "electric.button", "electric.pressurepad", "electric.timer", "electric.counter",
        "electric.blocker", "electrical.branch", "electrical.combiner", "electrical.memorycell", "electric.splitter",
        "electric.andswitch", "electric.orswitch", "electric.random.switch", "electric.xorswitch",
        "electric.simplelight", "electric.fluorescentlight", "electric.flasherlight", "electric.sirenlight", "electric.spotlight", "ceilinglight",
        "electric.doorcontroller", "electric.heater", "electric.igniter", "electric.teslacoil",
        "electric.rf.broadcaster", "electric.rf.receiver", "electric.rf.pager", "electric.audioalarm", "electric.sprinkler",
        "storage.monitor", "cctv.camera", "computer.station", "smart.alarm", "smart.switch",
        "electric.hbhfsensor", "electric.laserdetector", "electric.modularcarlift",
        "poweredwaterpurifier", "powered.water.purifier.large", "electric.elevator", "elevator.lift",
        "industrial.conveyor", "industrial.combiner", "industrial.splitter", "industrial.crafter",
        "industrial.wall.light", "industrial.wall.light.green", "industrial.wall.light.red"
    ],
    "Ловушки": [
        "autoturret", "flameturret", "guntrap", "samsite", "searchlight",
        "trap.bear", "trap.landmine", "spikes.floor",
        "sentry.bandit.static", "sentry.scientist.static"
    ],
    "Транспорт": [
        "minicopter", "scraptransportheli", "attackhelicopter",
        "sedan", "sedan.chassis", "modularcar", "modularcar.2module", "modularcar.3module", "modularcar.4module",
        "vehicle.1mod.cockpit", "vehicle.1mod.cockpit.armored", "vehicle.1mod.cockpit.with.engine", "vehicle.1mod.engine", "vehicle.1mod.flatbed", "vehicle.1mod.passengers.armored", "vehicle.1mod.rear.seats", "vehicle.1mod.storage", "vehicle.1mod.taxi",
        "vehicle.2mod.camper", "vehicle.2mod.flatbed", "vehicle.2mod.fuel.tank", "vehicle.2mod.passengers",
        "rhib", "rowboat", "kayak", "submarinesolo", "submarineduo", "tugboat",
        "snowmobile", "snowmobiletomaha", "motorbike", "motorbike.sidecar", "pedalbike", "pedaltrike",
        "parachute", "hot.air.balloon", "locomotive", "workcart", "workcart.aboveground", "workcart.aboveground2",
        "mlrs"
    ],
    "Фарм": [
        "seed.corn", "seed.hemp", "seed.potato", "seed.pumpkin", "seed.red.berry", "seed.white.berry", "seed.green.berry", "seed.blue.berry", "seed.yellow.berry", "seed.black.berry",
        "clone.corn", "clone.hemp", "clone.potato", "clone.pumpkin",
        "planter.large", "planter.small", "composter", "beehive", "fertilizer",
        "water.barrel", "water.catcher.large", "water.catcher.small", "water.purifier", "bucket.water", "waterjug", "botabag", "water", "water.salt",
        "spraycan", "spraycan.decor", "stocking.large", "stocking.small",
        "fishtrap.small", "hose.tool", "sprinkler.standing", "fluid.combiner", "fluid.splitter", "fluid.switch"
    ],
    "Добыча": [
        "mining.quarry", "mining.pumpjack", "small.oil.refinery", "electric.furnace",
        "surveycharge", "jackolantern.angry", "jackolantern.happy", "chineselantern", "chineselanternwhite",
        "lantern", "tunalight", "hat.candle"
    ],
    "Модули оружия": [
        "weapon.mod.8x.scope", "weapon.mod.small.scope", "weapon.mod.simplesight", "weapon.mod.holosight",
        "weapon.mod.flashlight", "weapon.mod.lasersight",
        "weapon.mod.muzzleboost", "weapon.mod.muzzlebrake", "weapon.mod.silencer", "weapon.mod.extendedmags"
    ],
    "Чаи": [
        "oretea", "oretea.advanced", "oretea.pure",
        "woodtea", "woodtea.advanced", "woodtea.pure",
        "scraptea", "scraptea.advanced", "scraptea.pure",
        "healingtea", "healingtea.advanced", "healingtea.pure",
        "maxhealthtea", "maxhealthtea.advanced", "maxhealthtea.pure",
        "radiationresisttea", "radiationresisttea.advanced", "radiationresisttea.pure"
    ],
    "Карты доступа": [
        "keycard_blue", "keycard_green", "keycard_red"
    ],
    "Декор": [
        "xmas.present.large", "xmas.present.medium", "xmas.present.small", "xmas.tree", "xmas.decoration.baubels", "xmas.decoration.candycanes", "xmas.decoration.gingerbreadmen", "xmas.decoration.lights", "xmas.decoration.pinecone", "xmas.decoration.star", "xmas.decoration.tinsel",
        "xmas.door.garland", "xmas.lightstring", "xmas.window.garland", "xmasdoorwreath",
        "snowman", "snowman.large", "giantcandycanedecor", "giantlollipops",
        "easter.bronzeegg", "easter.goldegg", "easter.paintedeggs", "easter.silveregg",
        "rustige_egg_a", "rustige_egg_b", "rustige_egg_c", "rustige_egg_d", "rustige_egg_e",
        "bunny.ears", "bunny.onesie", "egg.suit",
        "carvable.pumpkin", "pookie.bear", "dragondoorknocker", "gravestone", "skull.trophy", "skull.trophy.jar", "skull.trophy.jar2", "skull.trophy.table",
        "twitchsunglasses", "arcade.machine.chippy", "cardtable", "sled", "sled.xmas",
        "spiderweb", "cursedcauldron", "fogmachine", "pitchfork", "graveyard.fence", "wall.graveyard.fence",
        "frankensteins.monster.01.head", "frankensteins.monster.01.legs", "frankensteins.monster.01.torso",
        "frankensteins.monster.02.head", "frankensteins.monster.02.legs", "frankensteins.monster.02.torso",
        "frankensteins.monster.03.head", "frankensteins.monster.03.legs", "frankensteins.monster.03.torso",
        "skullspikes.candles", "skullspikes.pumpkin", "skulldoorknocker", "scarecrow",
        "wall.frame.netting", "spookyspeaker", "strobe.light", "confetti.cannon", "balloon"
    ],
    "Разное": [
        "battery.small", "blueprintbase", "coal", "coolingtea", "flare", "note", "paper", "snowball",
        "vending.machine", "fun.guitar", "arcade.machine.chippy", "telephone", "telephone.deployed",
        "megaphone", "spraycandecor", "map.note", "map.scroll", "map.table",
        "drone", "drone.repair", "rf.pager", "ptz.cctv.camera",
        "captainslog", "cardtable", "chippy.arcade.game", "poker.machine",
        "twitchsunglasses", "lootbag.small", "lootbag.medium", "lootbag.large",
        "present.large", "present.medium", "present.small",
        "wrappedgift", "wrappingpaper", "gingerbreadsuit",
        "bota.bag", "bucket.helmet", "bucket.water",
        "cakefiveyear", "cakeseventhyear", "cake",
        "candycaneclub", "coal.stocking", "coal.xmas",
        "door.closer", "frog.boots", "movember.moustache",
        "pants.heavy", "shirt.heavy", "boots.heavy",
        "tactical.gloves", "nightvisiongoggles",
        "tool.instant_camera", "photo", "portrait.photo.frame"
    ]
};

// Названия предметов на русском
const ITEM_NAMES = {
    "rifle.ak": "АК-47", "rifle.ak.ice": "АК-47 Лёд", "rifle.bolt": "Болтовка", "rifle.l96": "L96", "rifle.lr300": "LR-300", "rifle.m39": "M39", "rifle.semiauto": "Полуавтомат",
    "smg.2": "Самопал", "smg.mp5": "MP5", "smg.thompson": "Томпсон", "lmg.m249": "M249", "hmlmg": "HMLMG",
    "shotgun.double": "Двустволка", "shotgun.pump": "Помповик", "shotgun.spas12": "SPAS-12", "shotgun.waterpipe": "Самопал-дробовик",
    "pistol.eoka": "Эока", "pistol.m92": "M92", "pistol.nailgun": "Гвоздомёт", "pistol.python": "Питон", "pistol.revolver": "Револьвер", "pistol.semiauto": "Полуавтомат пистолет",
    "multiplegrenadelauncher": "Гранатомёт", "rocket.launcher": "РПГ", "flamethrower": "Огнемёт",
    "bow.compound": "Блочный лук", "bow.hunting": "Охотничий лук", "crossbow": "Арбалет", "snowballgun": "Снежкомёт",
    "spear.stone": "Каменное копьё", "spear.wooden": "Деревянное копьё", "knife.bone": "Костяной нож", "knife.butcher": "Мясницкий нож", "knife.combat": "Боевой нож", "knife.skinning": "Нож для свежевания",
    "longsword": "Длинный меч", "mace": "Булава", "machete": "Мачете", "salvaged.cleaver": "Тесак", "salvaged.sword": "Меч", "bone.club": "Костяная дубина", "paddle": "Весло",
    "ammo.rifle": "Патроны 5.56", "ammo.rifle.explosive": "Разрывные 5.56", "ammo.rifle.hv": "Скоростные 5.56", "ammo.rifle.incendiary": "Зажигательные 5.56",
    "ammo.pistol": "Патроны 9мм", "ammo.pistol.fire": "Зажигательные 9мм", "ammo.pistol.hv": "Скоростные 9мм",
    "ammo.shotgun": "Дробь", "ammo.shotgun.fire": "Зажигательная дробь", "ammo.shotgun.slug": "Пули для дробовика",
    "ammo.rocket.basic": "Ракета", "ammo.rocket.hv": "Скоростная ракета", "ammo.rocket.fire": "Зажигательная ракета", "ammo.rocket.smoke": "Дымовая ракета",
    "arrow.wooden": "Деревянная стрела", "arrow.hv": "Скоростная стрела", "arrow.fire": "Огненная стрела", "arrow.bone": "Костяная стрела",
    "explosive.satchel": "Сатчел", "explosive.timed": "С4", "explosives": "Взрывчатка",
    "grenade.beancan": "Консервная граната", "grenade.f1": "Граната Ф1", "grenade.flashbang": "Светошумовая", "grenade.molotov": "Молотов", "grenade.smoke": "Дымовая граната",
    "metal.facemask": "Металлическая маска", "metal.plate.torso": "Металлический нагрудник",
    "coffeecan.helmet": "Шлем из банки", "roadsign.jacket": "Куртка из знаков", "roadsign.kilt": "Юбка из знаков", "roadsign.gloves": "Перчатки из знаков",
    "heavy.plate.helmet": "Тяжёлый шлем", "heavy.plate.jacket": "Тяжёлая куртка", "heavy.plate.pants": "Тяжёлые штаны",
    "wood.armor.helmet": "Деревянный шлем", "wood.armor.jacket": "Деревянная куртка", "wood.armor.pants": "Деревянные штаны",
    "hazmatsuit": "Хазмат", "hazmatsuit.spacesuit": "Скафандр",
    "syringe.medical": "Шприц", "largemedkit": "Большая аптечка", "bandage": "Бинт", "antiradpills": "Антирад",
    "wood": "Дерево", "stones": "Камень", "metal.fragments": "Металл", "metal.ore": "Металлическая руда", "metal.refined": "МВК", "hq.metal.ore": "Руда МВК",
    "sulfur": "Сера", "sulfur.ore": "Серная руда", "charcoal": "Уголь", "gunpowder": "Порох", "lowgradefuel": "Топливо", "crude.oil": "Сырая нефть",
    "cloth": "Ткань", "leather": "Кожа", "fat.animal": "Животный жир", "bone.fragments": "Кости", "scrap": "Скрап",
    "gears": "Шестерни", "metalblade": "Лезвие", "metalpipe": "Труба", "metalspring": "Пружина", "techparts": "Техчасти", "targeting.computer": "Прицельный компьютер",
    "rope": "Верёвка", "sewingkit": "Швейный набор", "tarp": "Брезент", "ducttape": "Скотч", "glue": "Клей", "sheetmetal": "Листовой металл", "fuse": "Предохранитель",
    "hatchet": "Топор", "pickaxe": "Кирка", "axe.salvaged": "Спасённый топор", "icepick.salvaged": "Спасённая кирка", "jackhammer": "Отбойник", "chainsaw": "Бензопила",
    "stone.pickaxe": "Каменная кирка", "stonehatchet": "Каменный топор", "rock": "Камень", "hammer": "Молоток", "torch": "Факел",
    "autoturret": "Автотурель", "flameturret": "Огнемётная турель", "guntrap": "Ружейная ловушка", "samsite": "ПВО", "searchlight": "Прожектор",
    "trap.bear": "Капкан", "trap.landmine": "Мина", "spikes.floor": "Шипы",
    "supply.signal": "Сигналка", "surveycharge": "Геологический заряд",
    "lock.code": "Кодовый замок", "lock.key": "Ключевой замок", "door.key": "Ключ",
    "door.hinged.metal": "Металлическая дверь", "door.hinged.wood": "Деревянная дверь", "door.hinged.toptier": "Бронированная дверь",
    "door.double.hinged.metal": "Двойная металлическая", "door.double.hinged.wood": "Двойная деревянная", "door.double.hinged.toptier": "Двойная бронированная",
    "wall.external.high.stone": "Каменная стена", "wall.external.high": "Высокая стена",
    "gates.external.high.stone": "Каменные ворота", "gates.external.high.wood": "Деревянные ворота",
    "box.wooden": "Ящик", "box.wooden.large": "Большой ящик", "fridge": "Холодильник", "locker": "Шкафчик",
    "furnace": "Печь", "furnace.large": "Большая печь", "campfire": "Костёр", "fireplace.stone": "Камин",
    "cupboard.tool": "Шкаф", "research.table": "Стол исследований", "workbench1": "Верстак 1", "workbench2": "Верстак 2", "workbench3": "Верстак 3",
    "minicopter": "Миникоптер", "scraptransportheli": "Транспортный вертолёт", "attackhelicopter": "Боевой вертолёт",
    "sedan": "Седан", "rhib": "RHIB", "rowboat": "Лодка", "kayak": "Каяк", "submarinesolo": "Подлодка соло", "submarineduo": "Подлодка дуо",
    "snowmobile": "Снегоход", "motorbike": "Мотоцикл", "pedalbike": "Велосипед", "parachute": "Парашют", "hot.air.balloon": "Воздушный шар",
    "keycard_blue": "Синяя карта", "keycard_green": "Зелёная карта", "keycard_red": "Красная карта",
    "electric.fuelgenerator.small": "Генератор", "electric.solarpanel.large": "Солнечная панель", "generator.wind.scrap": "Ветряк",
    "cctv.camera": "Камера", "computer.station": "Компьютер", "smart.alarm": "Умная сирена", "smart.switch": "Умный переключатель"
};


// Build items array
const ALL_ITEMS = [];
for (const [category, items] of Object.entries(ITEMS_DATA)) {
    for (const shortname of items) {
        ALL_ITEMS.push({
            shortname,
            name: ITEM_NAMES[shortname] || shortname.replace(/\./g, ' ').replace(/_/g, ' '),
            category
        });
    }
}

function getAllItems() { return ALL_ITEMS; }
function getItemName(shortname) { return ITEM_NAMES[shortname] || shortname; }
function getCategories() { return Object.keys(ITEMS_DATA); }

// Count items
console.log('Total items:', ALL_ITEMS.length);
    