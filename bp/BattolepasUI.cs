using Oxide.Core;
using Oxide.Core.Plugins;
using Oxide.Game.Rust.Cui;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("BattolepasUI", "BublickRust", "1.1.1")]
    [Description("Battle Pass UI с 30 уровнями - OPTIMIZED")]
    class BattolepasUI : RustPlugin
    {
        // Настройки магазина GameStores
        private const string GameStoreID = "52281";
        private const string GameStoreSecret = "2f12fca74502228b0eaa4365b48e561c";
        
        #region Assets Loader
        private class UIAssetsLoader
        {
            private readonly Dictionary<string, string> _ids = new Dictionary<string, string>();
            private readonly string _pluginName;
            private readonly BattolepasUI _plugin;
            private readonly HashSet<string> _missingLogged = new HashSet<string>();
            private bool _cancel;
            public int Requested { get; private set; }
            public int Loaded { get; private set; }
            public int Failed { get; private set; }
            public UIAssetsLoader(string pluginName, BattolepasUI plugin) { _pluginName = pluginName; _plugin = plugin; }
            public void StartLoad(IEnumerable<string> keys) { _cancel = false; ServerMgr.Instance.StartCoroutine(LoadRoutine(keys)); }
            public void Cancel() { _cancel = true; }
            private System.Collections.IEnumerator LoadRoutine(IEnumerable<string> keys)
            {
                foreach (var key in keys)
                {
                    if (_cancel) yield break;
                    var path = $"file://{Interface.Oxide.DataDirectory}/{_pluginName}/Images/{key}.png";
                    using (var req = UnityEngine.Networking.UnityWebRequestTexture.GetTexture(path))
                    {
                        Requested++;
                        yield return req.SendWebRequest();
                        if (req.result == UnityEngine.Networking.UnityWebRequest.Result.ConnectionError || req.result == UnityEngine.Networking.UnityWebRequest.Result.ProtocolError)
                        {
                            Failed++;
                        }
                        else
                        {
                            var tex = UnityEngine.Networking.DownloadHandlerTexture.GetContent(req);
                            if (tex != null)
                            {
                                var bytes = tex.EncodeToPNG();
                                var id = FileStorage.server.Store(bytes, FileStorage.Type.png, CommunityEntity.ServerInstance.net.ID).ToString();
                                _ids[key] = id;
                                Loaded++;
                                UnityEngine.Object.DestroyImmediate(tex);
                            }
                            else { Failed++; }
                        }
                    }
                    yield return null;
                }
            }
            public string Get(string key) => _ids.TryGetValue(key, out var id) ? id : null;
        }
        #endregion

        #region Переменные и кэши
        private UIAssetsLoader assets;
        private const string UIName = "Battolepas";
        private const float DefaultScale = 0.67f;
        
        private readonly HashSet<ulong> playersWithUI = new HashSet<ulong>();
        private readonly Dictionary<ulong, float> playerScale = new Dictionary<ulong, float>();
        private Dictionary<ulong, PlayerBPData> playerData = new Dictionary<ulong, PlayerBPData>();
        
        // === КЭШИ ДЛЯ ОПТИМИЗАЦИИ ===
        private static Dictionary<string, ItemDefinition> _itemDefCache;
        private static Dictionary<string, List<int>> _questsByShortName; // shortname -> индексы квестов
        private static readonly Dictionary<string, string> _specialRewardImageCache = new Dictionary<string, string>();
        
        private DateTime lastQuestReset;
        private Timer resetTimer;
        private Timer saveTimer;
        private Timer privilegeCheckTimer;
        private bool _dataDirty;
        
        private static readonly string[] _assetKeys = { 
            "Group_292", "Rectangle_161124430", "Rectangle_161124431", 
            "Rectangle_161124432", "Rectangle_161124433", "Rectangle_161124442"
        };
        #endregion

        #region Данные игрока
        public class PlayerBPData
        {
            public int Level = 1;
            public bool IsPremium;
            public Dictionary<int, bool> ClaimedFree = new Dictionary<int, bool>();
            public Dictionary<int, bool> ClaimedPremium = new Dictionary<int, bool>();
            public List<ActiveQuest> DailyQuests = new List<ActiveQuest>();
            public DateTime LastQuestReset = DateTime.MinValue;
            public List<ulong> OpenedCratesList = new List<ulong>();
            public Dictionary<string, DateTime> ActivePrivileges = new Dictionary<string, DateTime>();
            
            [JsonIgnore] private HashSet<ulong> _openedCratesCache;
            [JsonIgnore] public HashSet<ulong> OpenedCrates => _openedCratesCache ?? (_openedCratesCache = OpenedCratesList != null ? new HashSet<ulong>(OpenedCratesList) : new HashSet<ulong>());
            
            public void AddOpenedCrate(ulong crateId)
            {
                if (OpenedCrates.Add(crateId))
                {
                    if (OpenedCratesList == null) OpenedCratesList = new List<ulong>();
                    OpenedCratesList.Add(crateId);
                }
            }
            
            public void ClearOpenedCrates() { OpenedCratesList?.Clear(); _openedCratesCache?.Clear(); }
        }

        public class ActiveQuest
        {
            public string QuestId;
            public int Current;
            public int Required;
            public bool Completed;
            public bool IsPremiumQuest;
        }
        #endregion

        #region Награды Battle Pass (статические)
        public class RewardDef
        {
            public string ItemShortName;
            public int Amount;
            public string DisplayName;
            [JsonIgnore] public ItemDefinition CachedItemDef;
            [JsonIgnore] public string CachedImageKey;
        }

        private static readonly RewardDef[] FreeRewards = {
            new RewardDef { ItemShortName = "jackhammer", Amount = 5, DisplayName = "Буры x5" },
            new RewardDef { ItemShortName = "oretea.pure", Amount = 3, DisplayName = "Чай ФАРМ Топовый x3" },
            new RewardDef { ItemShortName = "metal.facemask", Amount = 5, DisplayName = "МВК Маски x5" },
            new RewardDef { ItemShortName = "metal.plate.torso", Amount = 5, DisplayName = "МВК Грудаки x5" },
            new RewardDef { ItemShortName = "roadsign.kilt", Amount = 5, DisplayName = "Килты x5" },
            new RewardDef { ItemShortName = "blueberries", Amount = 200, DisplayName = "Ягоды x200" },
            new RewardDef { ItemShortName = "ammo.rifle.incendiary", Amount = 2000, DisplayName = "Зажиг. 5.56 x2000" },
            new RewardDef { ItemShortName = "lmg.m249", Amount = 1, DisplayName = "М249" },
            new RewardDef { ItemShortName = "metal.fragments", Amount = 30000, DisplayName = "Металл x30000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Premium 1 день" },
            new RewardDef { ItemShortName = "sulfur", Amount = 50000, DisplayName = "Сера x50000" },
            new RewardDef { ItemShortName = "metal.refined", Amount = 1000, DisplayName = "МВК x1000" },
            new RewardDef { ItemShortName = "maxhealthtea.pure", Amount = 15, DisplayName = "Чай ХП Топовый x15" },
            new RewardDef { ItemShortName = "wood", Amount = 200000, DisplayName = "Дерево x200000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "100р баланс" },
            new RewardDef { ItemShortName = "supertea", Amount = 1, DisplayName = "Супер чай" },
            new RewardDef { ItemShortName = "blueberries", Amount = 200, DisplayName = "Ягоды x200" },
            new RewardDef { ItemShortName = "stones", Amount = 200000, DisplayName = "Камень x200000" },
            new RewardDef { ItemShortName = "autoturret", Amount = 30, DisplayName = "Турели x30" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Elite 1 день" },
            new RewardDef { ItemShortName = "oretea.pure", Amount = 10, DisplayName = "Чай ФАРМ Топовый x10" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "250р баланс" },
            new RewardDef { ItemShortName = "sulfur", Amount = 150000, DisplayName = "Сера x150000" },
            new RewardDef { ItemShortName = "metal.fragments", Amount = 250000, DisplayName = "Металл x250000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "King 1 день" },
            new RewardDef { ItemShortName = "blueberries", Amount = 200, DisplayName = "Ягоды x200" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Миникоптеры x10" },
            new RewardDef { ItemShortName = "metal.refined", Amount = 5000, DisplayName = "МВК x5000" },
            new RewardDef { ItemShortName = "maxhealthtea.pure", Amount = 30, DisplayName = "Чай ХП Топовый x30" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Pan 3 дня" },
        };

        private static readonly RewardDef[] PremiumRewards = {
            new RewardDef { ItemShortName = "blueberries", Amount = 300, DisplayName = "Ягоды x300" },
            new RewardDef { ItemShortName = "metal.refined", Amount = 5000, DisplayName = "МВК x5000" },
            new RewardDef { ItemShortName = "metal.facemask", Amount = 10, DisplayName = "МВК Маски x10" },
            new RewardDef { ItemShortName = "metal.plate.torso", Amount = 10, DisplayName = "МВК Грудаки x10" },
            new RewardDef { ItemShortName = "roadsign.kilt", Amount = 10, DisplayName = "Килты x10" },
            new RewardDef { ItemShortName = "sulfur", Amount = 200000, DisplayName = "Сера x200000" },
            new RewardDef { ItemShortName = "lmg.m249", Amount = 3, DisplayName = "М249 x3" },
            new RewardDef { ItemShortName = "wood", Amount = 200000, DisplayName = "Дерево x200000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "300р баланс" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Premium 7 дней" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Миникоптеры x10" },
            new RewardDef { ItemShortName = "blueberries", Amount = 300, DisplayName = "Ягоды x300" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "King 1 день" },
            new RewardDef { ItemShortName = "stones", Amount = 200000, DisplayName = "Камень x200000" },
            new RewardDef { ItemShortName = "metal.fragments", Amount = 300000, DisplayName = "Металл x300000" },
            new RewardDef { ItemShortName = "supertea", Amount = 3, DisplayName = "Супер чай x3" },
            new RewardDef { ItemShortName = "oretea.pure", Amount = 10, DisplayName = "Чай ФАРМ Топовый x10" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "300р баланс" },
            new RewardDef { ItemShortName = "autoturret", Amount = 30, DisplayName = "Турели x30" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Elite 7 дней" },
            new RewardDef { ItemShortName = "maxhealthtea.pure", Amount = 30, DisplayName = "Чай ХП Топовый x30" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Миникоптеры x10" },
            new RewardDef { ItemShortName = "sulfur", Amount = 150000, DisplayName = "Сера x150000" },
            new RewardDef { ItemShortName = "metal.refined", Amount = 5000, DisplayName = "МВК x5000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "King 7 дней" },
            new RewardDef { ItemShortName = "autoturret", Amount = 30, DisplayName = "Турели x30" },
            new RewardDef { ItemShortName = "jackhammer", Amount = 15, DisplayName = "Буры x15" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "300р баланс" },
            new RewardDef { ItemShortName = "sulfur", Amount = 200000, DisplayName = "Сера x200000" },
            new RewardDef { ItemShortName = null, Amount = 0, DisplayName = "Pan 30 дней" },
        };
        #endregion

        #region Список заданий
        public class QuestDef
        {
            public string Id;
            public string Name;
            public string ShortName;
            public int Amount;
        }

        private static readonly QuestDef[] AllQuests = {
            new QuestDef { Id = "wood_3kk", Name = "ДОБЫТЬ 3.000.000 ДЕРЕВА", ShortName = "wood", Amount = 3000000 },
            new QuestDef { Id = "wood_2kk", Name = "ДОБЫТЬ 2.000.000 ДЕРЕВА", ShortName = "wood", Amount = 2000000 },
            new QuestDef { Id = "wood_1kk", Name = "ДОБЫТЬ 1.000.000 ДЕРЕВА", ShortName = "wood", Amount = 1000000 },
            new QuestDef { Id = "stone_20kk", Name = "ДОБЫТЬ 20.000.000 КАМНЯ", ShortName = "stones", Amount = 20000000 },
            new QuestDef { Id = "stone_15kk", Name = "ДОБЫТЬ 15.000.000 КАМНЯ", ShortName = "stones", Amount = 15000000 },
            new QuestDef { Id = "stone_10kk", Name = "ДОБЫТЬ 10.000.000 КАМНЯ", ShortName = "stones", Amount = 10000000 },
            new QuestDef { Id = "metal_10kk", Name = "ДОБЫТЬ 10.000.000 МЕТАЛЛА", ShortName = "metal.ore", Amount = 10000000 },
            new QuestDef { Id = "metal_5kk", Name = "ДОБЫТЬ 5.000.000 МЕТАЛЛА", ShortName = "metal.ore", Amount = 5000000 },
            new QuestDef { Id = "sulfur_5kk", Name = "ДОБЫТЬ 5.000.000 СЕРЫ", ShortName = "sulfur.ore", Amount = 5000000 },
            new QuestDef { Id = "sulfur_2kk", Name = "ДОБЫТЬ 2.000.000 СЕРЫ", ShortName = "sulfur.ore", Amount = 2000000 },
            new QuestDef { Id = "sulfur_1kk", Name = "ДОБЫТЬ 1.000.000 СЕРЫ", ShortName = "sulfur.ore", Amount = 1000000 },
            new QuestDef { Id = "barrel_1000", Name = "ДОБЫТЬ 1000 БОЧЕК", ShortName = "barrel", Amount = 1000 },
            new QuestDef { Id = "barrel_800", Name = "ДОБЫТЬ 800 БОЧЕК", ShortName = "barrel", Amount = 800 },
            new QuestDef { Id = "barrel_500", Name = "ДОБЫТЬ 500 БОЧЕК", ShortName = "barrel", Amount = 500 },
            new QuestDef { Id = "barrel_300", Name = "ДОБЫТЬ 300 БОЧЕК", ShortName = "barrel", Amount = 300 },
            new QuestDef { Id = "barrel_200", Name = "ДОБЫТЬ 200 БОЧЕК", ShortName = "barrel", Amount = 200 },
            new QuestDef { Id = "elite_30", Name = "ОТКРЫТЬ 30 ЭЛИТНЫХ ЯЩИКОВ", ShortName = "crate_elite", Amount = 30 },
            new QuestDef { Id = "elite_20", Name = "ОТКРЫТЬ 20 ЭЛИТНЫХ ЯЩИКОВ", ShortName = "crate_elite", Amount = 20 },
            new QuestDef { Id = "elite_10", Name = "ОТКРЫТЬ 10 ЭЛИТНЫХ ЯЩИКОВ", ShortName = "crate_elite", Amount = 10 },
            new QuestDef { Id = "military_40", Name = "ОТКРЫТЬ 40 ВОЕННЫХ ЯЩИКОВ", ShortName = "crate_normal", Amount = 40 },
            new QuestDef { Id = "military_30", Name = "ОТКРЫТЬ 30 ВОЕННЫХ ЯЩИКОВ", ShortName = "crate_normal", Amount = 30 },
            new QuestDef { Id = "military_20", Name = "ОТКРЫТЬ 20 ВОЕННЫХ ЯЩИКОВ", ShortName = "crate_normal", Amount = 20 },
            new QuestDef { Id = "military_10", Name = "ОТКРЫТЬ 10 ВОЕННЫХ ЯЩИКОВ", ShortName = "crate_normal", Amount = 10 },
            new QuestDef { Id = "basic_50", Name = "ОТКРЫТЬ 50 ОБЫЧНЫХ ЯЩИКОВ", ShortName = "crate_basic", Amount = 50 },
            new QuestDef { Id = "basic_40", Name = "ОТКРЫТЬ 40 ОБЫЧНЫХ ЯЩИКОВ", ShortName = "crate_basic", Amount = 40 },
            new QuestDef { Id = "basic_30", Name = "ОТКРЫТЬ 30 ОБЫЧНЫХ ЯЩИКОВ", ShortName = "crate_basic", Amount = 30 },
            new QuestDef { Id = "basic_20", Name = "ОТКРЫТЬ 20 ОБЫЧНЫХ ЯЩИКОВ", ShortName = "crate_basic", Amount = 20 },
            new QuestDef { Id = "bear_10", Name = "УБИТЬ 10 МЕДВЕДЕЙ", ShortName = "bear", Amount = 10 },
            new QuestDef { Id = "boar_25", Name = "УБИТЬ 25 КАБАНОВ", ShortName = "boar", Amount = 25 },
            new QuestDef { Id = "player_50", Name = "УБИТЬ 50 ИГРОКОВ", ShortName = "player", Amount = 50 },
            new QuestDef { Id = "player_40", Name = "УБИТЬ 40 ИГРОКОВ", ShortName = "player", Amount = 40 },
            new QuestDef { Id = "player_30", Name = "УБИТЬ 30 ИГРОКОВ", ShortName = "player", Amount = 30 },
            new QuestDef { Id = "player_20", Name = "УБИТЬ 20 ИГРОКОВ", ShortName = "player", Amount = 20 },
            new QuestDef { Id = "cloth_100", Name = "СОБРАТЬ 100 КУСТОВ КОНОПЛИ", ShortName = "hemp_collectable", Amount = 100 }
        };
        
        private static readonly Dictionary<string, QuestDef> _questById = new Dictionary<string, QuestDef>();
        #endregion

        #region Инициализация кэшей
        private void InitCaches()
        {
            // Кэш ItemDefinition
            _itemDefCache = new Dictionary<string, ItemDefinition>();
            foreach (var reward in FreeRewards)
            {
                if (reward.ItemShortName != null && !_itemDefCache.ContainsKey(reward.ItemShortName))
                {
                    var def = ItemManager.FindItemDefinition(reward.ItemShortName);
                    if (def != null) _itemDefCache[reward.ItemShortName] = def;
                }
                reward.CachedItemDef = reward.ItemShortName != null && _itemDefCache.TryGetValue(reward.ItemShortName, out var d) ? d : null;
                reward.CachedImageKey = GetSpecialRewardImageKeyStatic(reward.DisplayName);
            }
            foreach (var reward in PremiumRewards)
            {
                if (reward.ItemShortName != null && !_itemDefCache.ContainsKey(reward.ItemShortName))
                {
                    var def = ItemManager.FindItemDefinition(reward.ItemShortName);
                    if (def != null) _itemDefCache[reward.ItemShortName] = def;
                }
                reward.CachedItemDef = reward.ItemShortName != null && _itemDefCache.TryGetValue(reward.ItemShortName, out var d) ? d : null;
                reward.CachedImageKey = GetSpecialRewardImageKeyStatic(reward.DisplayName);
            }
            
            // Кэш квестов по ShortName
            _questsByShortName = new Dictionary<string, List<int>>();
            _questById.Clear();
            for (int i = 0; i < AllQuests.Length; i++)
            {
                var q = AllQuests[i];
                _questById[q.Id] = q;
                if (!_questsByShortName.TryGetValue(q.ShortName, out var list))
                {
                    list = new List<int>();
                    _questsByShortName[q.ShortName] = list;
                }
                list.Add(i);
            }
        }
        
        private static string GetSpecialRewardImageKeyStatic(string displayName)
        {
            if (displayName == null) return null;
            if (_specialRewardImageCache.TryGetValue(displayName, out var cached)) return cached;
            var lower = displayName.ToLower();
            string result = null;
            if (lower.Contains("pan")) result = "Rectangle_161124430";
            else if (lower.Contains("king")) result = "Rectangle_161124431";
            else if (lower.Contains("elite")) result = "Rectangle_161124432";
            else if (lower.Contains("premium")) result = "Rectangle_161124433";
            else if (lower.Contains("миникоптер")) result = "Rectangle_161124442";
            _specialRewardImageCache[displayName] = result;
            return result;
        }
        #endregion

        #region Хелперы
        private float GetScale(BasePlayer player) => player != null && playerScale.TryGetValue(player.userID, out float s) ? s : DefaultScale;
        private void SetScale(BasePlayer player, float value) { if (player != null) playerScale[player.userID] = Mathf.Clamp(value, 0.5f, 1f); }
        private bool HasUI(BasePlayer player) => playersWithUI.Contains(player.userID);

        private PlayerBPData GetPlayerData(ulong oderId)
        {
            if (playerData.TryGetValue(oderId, out var data))
            {
                if (data.DailyQuests == null || data.DailyQuests.Count < 7)
                    AssignDailyQuests(oderId);
                return data;
            }
            data = new PlayerBPData();
            playerData[oderId] = data;
            AssignDailyQuests(oderId);
            return data;
        }
        
        private float GetPlayerGatherRate(BasePlayer player)
        {
            // Всегда x10 для всех игроков
            return 10f;
        }
        
        private void MarkDirty() => _dataDirty = true;
        #endregion

        #region Привилегии
        private void GivePrivilege(BasePlayer player, string groupName, int days)
        {
            var data = GetPlayerData(player.userID);
            var expireTime = DateTime.Now.AddDays(days);
            
            if (data.ActivePrivileges.TryGetValue(groupName, out var currentExpire) && currentExpire > DateTime.Now)
                expireTime = currentExpire.AddDays(days);
            
            data.ActivePrivileges[groupName] = expireTime;
            
            if (!permission.GroupExists(groupName))
                permission.CreateGroup(groupName, groupName, 0);
            permission.AddUserGroup(player.UserIDString, groupName);
            
            MarkDirty();
        }
        
        private void CheckPrivileges()
        {
            var now = DateTime.Now;
            var toRemove = new List<KeyValuePair<ulong, string>>();
            
            foreach (var kvp in playerData)
            {
                var data = kvp.Value;
                if (data.ActivePrivileges == null || data.ActivePrivileges.Count == 0) continue;
                
                foreach (var priv in data.ActivePrivileges)
                {
                    if (priv.Value <= now)
                        toRemove.Add(new KeyValuePair<ulong, string>(kvp.Key, priv.Key));
                }
            }
            
            foreach (var item in toRemove)
            {
                if (playerData.TryGetValue(item.Key, out var data))
                {
                    data.ActivePrivileges.Remove(item.Value);
                    permission.RemoveUserGroup(item.Key.ToString(), item.Value);
                    MarkDirty();
                    
                    var player = BasePlayer.FindByID(item.Key);
                    if (player != null && player.IsConnected)
                        player.ChatMessage($"<color=#c85050>Ваша привилегия {item.Value.ToUpper()} истекла!</color>");
                }
            }
        }
        
        private void GiveMinicopterFlare(BasePlayer player)
        {
            if (!_itemDefCache.TryGetValue("supply.signal", out var itemDef))
            {
                itemDef = ItemManager.FindItemDefinition("supply.signal");
                if (itemDef != null) _itemDefCache["supply.signal"] = itemDef;
            }
            if (itemDef == null) return;
            
            var item = ItemManager.Create(itemDef, 1, 2847225498);
            if (item == null) return;
            item.name = "Вызов миникоптера";
            if (!player.inventory.GiveItem(item))
                item.Drop(player.GetDropPosition(), player.GetDropVelocity());
        }
        #endregion

        #region Хуки Oxide
        void OnServerInitialized()
        {
            LoadData();
            InitCaches();
            
            var imagesDir = System.IO.Path.Combine(Interface.Oxide.DataDirectory, "BattolepasUI", "Images");
            if (!System.IO.Directory.Exists(imagesDir))
                System.IO.Directory.CreateDirectory(imagesDir);
            
            assets = new UIAssetsLoader("BattolepasUI", this);
            assets.StartLoad(_assetKeys);
            
            CheckQuestReset();
            resetTimer = timer.Every(60f, CheckQuestReset);
            privilegeCheckTimer = timer.Every(60f, CheckPrivileges);
            CheckPrivileges();
            
            // Сохранение только если данные изменились
            saveTimer = timer.Every(300f, () => { if (_dataDirty) { SaveData(); _dataDirty = false; } });
            
            foreach (var player in BasePlayer.activePlayerList)
                OnPlayerConnected(player);
        }

        void OnPlayerConnected(BasePlayer player)
        {
            GetPlayerData(player.userID);
            CheckPlayerQuestReset(player.userID);
        }

        void OnPlayerDisconnected(BasePlayer player)
        {
            playersWithUI.Remove(player.userID);
            if (_dataDirty) { SaveData(); _dataDirty = false; }
        }

        void Unload()
        {
            assets?.Cancel();
            resetTimer?.Destroy();
            saveTimer?.Destroy();
            privilegeCheckTimer?.Destroy();
            foreach (var p in BasePlayer.activePlayerList)
                CuiHelper.DestroyUi(p, UIName);
            SaveData();
        }
        #endregion

        #region Хуки прогресса (оптимизированные)
        void OnDispenserBonus(ResourceDispenser dispenser, BaseEntity entity, Item item) => OnDispenserGather(dispenser, entity, item);
        
        void OnDispenserGather(ResourceDispenser dispenser, BaseEntity entity, Item item)
        {
            var player = entity?.ToPlayer();
            if (player == null) return;
            UpdateQuestProgress(player, item.info.shortname, (int)(item.amount * GetPlayerGatherRate(player)));
        }

        void OnCollectiblePickup(CollectibleEntity collectible, BasePlayer player)
        {
            if (player == null || collectible == null) return;
            
            // Проверяем, это куст конопли (hemp)
            var prefabName = collectible.ShortPrefabName;
            if (prefabName != null && prefabName.Contains("hemp"))
            {
                // Считаем 1 куст, а не количество ткани
                UpdateQuestProgress(player, "hemp_collectable", 1);
            }
            
            // Остальные коллектиблы считаем по количеству ресурса
            if (collectible.itemList != null)
            {
                float rate = GetPlayerGatherRate(player);
                foreach (var item in collectible.itemList)
                {
                    // Пропускаем ткань - она уже посчитана как куст
                    if (item.itemDef.shortname == "cloth") continue;
                    UpdateQuestProgress(player, item.itemDef.shortname, (int)(item.amount * rate));
                }
            }
        }

        void OnEntityDeath(BaseCombatEntity entity, HitInfo info)
        {
            if (entity == null || info?.InitiatorPlayer == null) return;
            var player = info.InitiatorPlayer;
            
            if (entity is BasePlayer victim && victim != player)
                UpdateQuestProgress(player, "player", 1);
            else if (entity.ShortPrefabName.Contains("bear"))
                UpdateQuestProgress(player, "bear", 1);
            else if (entity.ShortPrefabName.Contains("boar"))
                UpdateQuestProgress(player, "boar", 1);
        }

        void OnLootEntity(BasePlayer player, BaseEntity entity)
        {
            if (entity?.net == null || player == null) return;
            var crateId = entity.net.ID.Value;
            if (crateId == 0) return;
            
            var data = GetPlayerData(player.userID);
            if (data.OpenedCrates.Contains(crateId)) return;
            
            var name = entity.ShortPrefabName;
            string questType = null;
            
            if (name.Contains("crate_elite")) questType = "crate_elite";
            else if (name.Contains("crate_normal") || name.Contains("crate_underwater")) questType = "crate_normal";
            else if (name.Contains("crate_basic") || name.Contains("crate_mine") || name.Contains("crate_tools")) questType = "crate_basic";
            
            if (questType != null)
            {
                data.AddOpenedCrate(crateId);
                UpdateQuestProgress(player, questType, 1);
            }
        }

        void OnEntityKill(BaseNetworkable entity)
        {
            if (entity == null) return;
            var name = entity.ShortPrefabName;
            if (!name.Contains("barrel")) return;
            
            var barrel = entity as LootContainer;
            var lastAttacker = barrel?.lastAttacker as BasePlayer;
            if (lastAttacker != null)
                UpdateQuestProgress(lastAttacker, "barrel", 1);
        }

        void OnGrowableGathered(GrowableEntity growable, Item item, BasePlayer player)
        {
            if (player == null || item == null) return;
            UpdateQuestProgress(player, item.info.shortname, (int)(item.amount * GetPlayerGatherRate(player)));
        }
        #endregion

        #region Логика заданий (оптимизированная)
        private void CheckQuestReset()
        {
            var resetTime = DateTime.Now.Date;
            if (lastQuestReset.Date < resetTime.Date)
            {
                lastQuestReset = resetTime;
                foreach (var kvp in playerData)
                    ResetPlayerQuests(kvp.Key);
            }
        }

        private void CheckPlayerQuestReset(ulong oderId)
        {
            if (playerData.TryGetValue(oderId, out var data) && data.LastQuestReset.Date < DateTime.Now.Date)
                ResetPlayerQuests(oderId);
        }

        private void ResetPlayerQuests(ulong oderId)
        {
            if (!playerData.TryGetValue(oderId, out var data)) return;
            data.DailyQuests.Clear();
            data.LastQuestReset = DateTime.Now;
            data.ClearOpenedCrates();
            AssignDailyQuests(oderId);
            MarkDirty();
        }

        private void AssignDailyQuests(ulong oderId)
        {
            if (!playerData.TryGetValue(oderId, out var data))
            {
                data = new PlayerBPData();
                playerData[oderId] = data;
            }
            
            data.DailyQuests.Clear();
            
            // Быстрый shuffle - Fisher-Yates на месте
            var count = AllQuests.Length;
            var picked = new int[7];
            var used = new bool[count];
            
            for (int i = 0; i < 7; i++)
            {
                int idx;
                do { idx = UnityEngine.Random.Range(0, count); } while (used[idx]);
                used[idx] = true;
                picked[i] = idx;
            }
            
            for (int i = 0; i < 7; i++)
            {
                var quest = AllQuests[picked[i]];
                data.DailyQuests.Add(new ActiveQuest
                {
                    QuestId = quest.Id,
                    Current = 0,
                    Required = quest.Amount,
                    Completed = false,
                    IsPremiumQuest = i >= 4
                });
            }
        }

        private void UpdateQuestProgress(BasePlayer player, string shortName, int amount)
        {
            if (amount <= 0) return;
            var data = GetPlayerData(player.userID);
            if (data.DailyQuests == null || data.DailyQuests.Count == 0) return;
            
            bool changed = false;
            foreach (var quest in data.DailyQuests)
            {
                if (quest.Completed) continue;
                if (!_questById.TryGetValue(quest.QuestId, out var questDef)) continue;
                if (questDef.ShortName != shortName) continue;
                
                quest.Current = Math.Min(quest.Current + amount, quest.Required);
                changed = true;
                
                if (quest.Current >= quest.Required)
                {
                    quest.Completed = true;
                    player.ChatMessage($"<color=#71b83c>Задание выполнено:</color> {questDef.Name}");
                    
                    if (data.Level < 30 && (!quest.IsPremiumQuest || data.IsPremium))
                    {
                        data.Level++;
                        player.ChatMessage($"<color=#71b83c>Поздравляем! Вы достигли {data.Level} уровня Battle Pass!</color>");
                    }
                    else if (quest.IsPremiumQuest && !data.IsPremium)
                    {
                        player.ChatMessage($"<color=#f5a623>Купите Premium чтобы получить уровень за это задание!</color>");
                    }
                }
            }
            if (changed) MarkDirty();
        }
        #endregion

        #region Данные
        private void LoadData()
        {
            try { playerData = Interface.Oxide.DataFileSystem.ReadObject<Dictionary<ulong, PlayerBPData>>($"{Name}/PlayerData") ?? new Dictionary<ulong, PlayerBPData>(); }
            catch { playerData = new Dictionary<ulong, PlayerBPData>(); }
        }

        private void SaveData() => Interface.Oxide.DataFileSystem.WriteObject($"{Name}/PlayerData", playerData);
        #endregion

        #region Команды
        [ChatCommand("battolepas")]
        void CmdToggleUI(BasePlayer player, string command, string[] args) => OpenBattlePassMenu(player, args);

        [ChatCommand("bp")]
        void CmdBP(BasePlayer player, string command, string[] args) => OpenBattlePassMenu(player, args);

        [ChatCommand("battlepass")]
        void CmdBattlePass(BasePlayer player, string command, string[] args) => OpenBattlePassMenu(player, args);

        private void OpenBattlePassMenu(BasePlayer player, string[] args)
        {
            if (args != null && args.Length > 0)
            {
                var sub = args[0].ToLowerInvariant();
                if (sub == "scale" || sub == "s")
                {
                    if (args.Length < 2) { player.ChatMessage($"Текущий масштаб UI: {GetScale(player):0.00}"); return; }
                    if (float.TryParse(args[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float v))
                    {
                        SetScale(player, v);
                        ShowUI(player);
                    }
                    return;
                }
            }
            
            var el1 = plugins.Find("El1UI");
            if (el1 != null)
            {
                bool el1Open = (bool)(el1.Call("HasUI", player) ?? false);
                player.SendConsoleCommand(el1Open ? "el1.ui battlepass" : "el1.opentab battlepass");
                return;
            }
            if (HasUI(player)) CloseUI(player); else ShowUI(player);
        }

        [ChatCommand("vip")]
        void CmdVipStatus(BasePlayer player, string command, string[] args)
        {
            var data = GetPlayerData(player.userID);
            if (data.ActivePrivileges == null || data.ActivePrivileges.Count == 0)
            {
                player.ChatMessage("<color=#c85050>У вас нет активных привилегий.</color>");
                return;
            }
            
            player.ChatMessage("<color=#71b83c>═══ Ваши привилегии ═══</color>");
            var now = DateTime.Now;
            foreach (var priv in data.ActivePrivileges)
            {
                if (priv.Value <= now) continue;
                var remaining = priv.Value - now;
                string timeStr = remaining.TotalDays >= 1 ? $"{(int)remaining.TotalDays}д {remaining.Hours}ч" :
                                 remaining.TotalHours >= 1 ? $"{(int)remaining.TotalHours}ч {remaining.Minutes}м" : $"{remaining.Minutes}м";
                player.ChatMessage($"<color=#84BBE2>{priv.Key.ToUpper()}</color>: осталось <color=#BEDA8F>{timeStr}</color>");
            }
        }

        [ConsoleCommand("battolepas.open")]
        void CmdOpenUI(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p != null) ShowUI(p); }

        [ConsoleCommand("battolepas.close")]
        void CmdCloseUI(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p != null) CloseUI(p); }

        [ConsoleCommand("battlepass.open")]
        void CmdBattlepassOpen(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p != null) ShowUI(p); }

        [ConsoleCommand("battlepass.close")]
        void CmdBattlepassClose(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p != null) CloseUI(p); }

        [ConsoleCommand("battlepass.claim")]
        void CmdClaim(ConsoleSystem.Arg arg)
        {
            var player = arg?.Player();
            if (player == null) return;
            ClaimReward(player, arg.GetInt(0, 0), arg.GetBool(1, false));
        }

        private void ClaimReward(BasePlayer player, int level, bool isPremium)
        {
            var data = GetPlayerData(player.userID);
            
            if (data.Level < level) { player.ChatMessage("<color=#c85050>Вы еще не достигли этого уровня!</color>"); return; }
            if (isPremium && !data.IsPremium) { player.ChatMessage("<color=#c85050>Требуется Premium Battle Pass!</color>"); return; }
            
            var claimedDict = isPremium ? data.ClaimedPremium : data.ClaimedFree;
            if (claimedDict.TryGetValue(level, out bool claimed) && claimed) { player.ChatMessage("<color=#c85050>Награда уже получена!</color>"); return; }
            
            var rewards = isPremium ? PremiumRewards : FreeRewards;
            if (level < 1 || level > rewards.Length) { player.ChatMessage("<color=#c85050>Неверный уровень!</color>"); return; }
            
            var reward = rewards[level - 1];
            
            if (reward.ItemShortName == null)
            {
                var displayLower = reward.DisplayName.ToLower();
                
                if (displayLower.Contains("premium") || displayLower.Contains("elite") || displayLower.Contains("king") || displayLower.Contains("pan"))
                {
                    string groupName = displayLower.Contains("premium") ? "premium" : displayLower.Contains("elite") ? "elite" : displayLower.Contains("king") ? "king" : "pan";
                    int days = 0;
                    foreach (var part in reward.DisplayName.Split(' '))
                        if (int.TryParse(part, out int d)) { days = d; break; }
                    
                    if (days > 0)
                    {
                        GivePrivilege(player, groupName, days);
                        player.ChatMessage($"<color=#71b83c>Получена привилегия {groupName.ToUpper()} на {days} дней!</color>");
                    }
                }
                else if (displayLower.Contains("баланс"))
                {
                    int amount = 0;
                    foreach (var part in reward.DisplayName.Split(' '))
                    {
                        var numPart = part.Replace("р", "").Replace("Р", "");
                        if (int.TryParse(numPart, out int a)) { amount = a; break; }
                    }
                    
                    if (amount > 0)
                    {
                        var playerId = player.userID;
                        var playerRef = player;
                        var rewardLevel = level;
                        var rewardIsPremium = isPremium;
                        
                        // Прямой HTTP запрос к GameStores API (как в EventCh)
                        var url = $"http://gamestores.app/api?shop_id={GameStoreID}&secret={GameStoreSecret}&action=moneys&type=plus&steam_id={player.UserIDString}&amount={amount}&mess=Награда Battle Pass";
                        
                        webrequest.Enqueue(url, null, (code, response) =>
                        {
                            Puts($"[BattlePass] GameStore response: code={code}, response={response}");
                            
                            if (playerRef == null || !playerRef.IsConnected) return;
                            
                            if (code == 200 && response != null && response.Contains("success"))
                            {
                                playerRef.SendConsoleCommand("gametip.showtoast", 0, $"Вам начислено {amount}р на баланс магазина!");
                                Effect.server.Run("assets/bundled/prefabs/fx/notice/loot.copy.fx.prefab", playerRef.transform.position);
                                
                                var pData = GetPlayerData(playerId);
                                var claimed = rewardIsPremium ? pData.ClaimedPremium : pData.ClaimedFree;
                                claimed[rewardLevel] = true;
                                MarkDirty();
                                if (HasUI(playerRef)) UpdateSlotButton(playerRef, rewardLevel, rewardIsPremium);
                            }
                            else if (response != null && response.Contains("not found"))
                            {
                                playerRef.SendConsoleCommand("gametip.showtoast", 1, "Привяжите аккаунт в магазине! /store");
                            }
                            else
                            {
                                playerRef.SendConsoleCommand("gametip.showtoast", 1, "Ошибка начисления баланса!");
                            }
                        }, this);
                        return;
                    }
                }
                else if (displayLower.Contains("миникоптер"))
                {
                    int amount = 10;
                    var parts = reward.DisplayName.Split('x', 'X');
                    if (parts.Length > 1) int.TryParse(parts[1].Trim(), out amount);
                    if (amount <= 0) amount = 10;
                    
                    for (int i = 0; i < amount; i++) GiveMinicopterFlare(player);
                    player.ChatMessage($"<color=#71b83c>Вы получили {amount} сигнальных ракет для вызова миникоптера!</color>");
                }
                
                claimedDict[level] = true;
                MarkDirty();
                Effect.server.Run("assets/bundled/prefabs/fx/notice/loot.copy.fx.prefab", player.transform.position);
                if (HasUI(player)) UpdateSlotButton(player, level, isPremium);
                return;
            }
            
            var item = reward.CachedItemDef != null ? ItemManager.Create(reward.CachedItemDef, reward.Amount) : ItemManager.CreateByName(reward.ItemShortName, reward.Amount);
            if (item != null)
            {
                player.GiveItem(item);
                Effect.server.Run("assets/bundled/prefabs/fx/notice/loot.copy.fx.prefab", player.transform.position);
                player.ChatMessage($"<color=#71b83c>Получено:</color> {reward.DisplayName}");
            }
            
            claimedDict[level] = true;
            MarkDirty();
            if (HasUI(player)) UpdateSlotButton(player, level, isPremium);
        }
        
        private void UpdateSlotButton(BasePlayer player, int level, bool isPremium)
        {
            var s = GetScale(player);
            float slotWidth = 110f * s;
            float slotGap = 10f * s;
            float btnHeight = 35f * s;
            float xPos = (level - 1) * (slotWidth + slotGap);
            
            var elements = new CuiElementContainer();
            string oldBtnName = isPremium ? $"bp_prem_btn_{level}" : $"bp_free_btn_{level}";
            CuiHelper.DestroyUi(player, oldBtnName);
            
            string anchor = isPremium ? "0 0" : "0 0.52";
            elements.Add(new CuiButton
            {
                Button = { Color = "0.443 0.545 0.267 1.0", Command = "" },
                RectTransform = { AnchorMin = anchor, AnchorMax = anchor, OffsetMin = $"{xPos} 0", OffsetMax = $"{xPos + slotWidth} {btnHeight}" },
                Text = { Text = "✓", FontSize = (int)(18f * s), Align = TextAnchor.MiddleCenter, Color = "0.745 0.855 0.561 1.0", Font = "robotocondensed-bold.ttf" }
            }, "battolepas_scrollview", oldBtnName);
            
            CuiHelper.AddUi(player, elements);
        }
        #endregion

        #region Админ команды
        [ConsoleCommand("battlepass.setlevel")]
        void CmdSetLevel(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            if (arg.Args == null || arg.Args.Length < 2) { arg.ReplyWith("Использование: battlepass.setlevel <steamid/имя> <уровень>"); return; }
            
            var target = FindPlayer(arg.Args[0]);
            if (target == null) { arg.ReplyWith($"Игрок '{arg.Args[0]}' не найден!"); return; }
            if (!int.TryParse(arg.Args[1], out int level) || level < 1 || level > 30) { arg.ReplyWith("Уровень должен быть от 1 до 30!"); return; }
            
            GetPlayerData(target.userID).Level = level;
            MarkDirty();
            arg.ReplyWith($"Уровень игрока {target.displayName} установлен на {level}");
            target.ChatMessage($"<color=#71b83c>Ваш уровень Battle Pass установлен на {level}!</color>");
        }

        [ConsoleCommand("battlepass.resetall")]
        void CmdResetAll(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            playerData.Clear();
            SaveData();
            foreach (var player in BasePlayer.activePlayerList)
            {
                GetPlayerData(player.userID);
                if (HasUI(player)) ShowUI(player);
            }
            arg.ReplyWith("Все данные Battle Pass сброшены!");
        }

        [ConsoleCommand("battlepass.givepremium")]
        void CmdGivePremium(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            if (arg.Args == null || arg.Args.Length < 1) { arg.ReplyWith("Использование: battlepass.givepremium <steamid/имя>"); return; }
            
            var target = FindPlayer(arg.Args[0]);
            if (target == null) { arg.ReplyWith($"Игрок '{arg.Args[0]}' не найден!"); return; }
            
            GetPlayerData(target.userID).IsPremium = true;
            MarkDirty();
            arg.ReplyWith($"Игроку {target.displayName} выдан Premium Battle Pass!");
            target.ChatMessage("<color=#71b83c>Вам выдан Premium Battle Pass!</color>");
            if (HasUI(target)) ShowUI(target);
        }

        [ConsoleCommand("battlepass.removepremium")]
        void CmdRemovePremium(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            if (arg.Args == null || arg.Args.Length < 1) { arg.ReplyWith("Использование: battlepass.removepremium <steamid/имя>"); return; }
            
            var target = FindPlayer(arg.Args[0]);
            if (target == null) { arg.ReplyWith($"Игрок '{arg.Args[0]}' не найден!"); return; }
            
            GetPlayerData(target.userID).IsPremium = false;
            MarkDirty();
            arg.ReplyWith($"У игрока {target.displayName} забран Premium Battle Pass!");
            target.ChatMessage("<color=#c85050>Ваш Premium Battle Pass был отозван!</color>");
            if (HasUI(target)) ShowUI(target);
        }

        [ConsoleCommand("battlepass.resetquests")]
        void CmdResetQuests(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            if (arg.Args == null || arg.Args.Length < 1) { arg.ReplyWith("Использование: battlepass.resetquests <steamid/имя>"); return; }
            
            var target = FindPlayer(arg.Args[0]);
            if (target == null) { arg.ReplyWith($"Игрок '{arg.Args[0]}' не найден!"); return; }
            
            ResetPlayerQuests(target.userID);
            arg.ReplyWith($"Задания игрока {target.displayName} сброшены!");
            target.ChatMessage("<color=#71b83c>Ваши задания Battle Pass были сброшены!</color>");
            if (HasUI(target)) ShowUI(target);
        }

        [ConsoleCommand("battlepass.resetme")]
        void CmdResetMe(ConsoleSystem.Arg arg)
        {
            if (!arg.IsAdmin && arg.Connection != null) { arg.ReplyWith("Требуются права администратора!"); return; }
            var player = arg?.Player();
            if (player == null) { arg.ReplyWith("Эта команда только для игроков!"); return; }
            
            var data = GetPlayerData(player.userID);
            data.Level = 1;
            data.ClaimedFree.Clear();
            data.ClaimedPremium.Clear();
            ResetPlayerQuests(player.userID);
            player.ChatMessage("<color=#71b83c>Ваш Battle Pass полностью сброшен! Уровень: 1</color>");
            if (HasUI(player)) ShowUI(player);
        }

        private BasePlayer FindPlayer(string nameOrId)
        {
            if (ulong.TryParse(nameOrId, out ulong oderId))
                return BasePlayer.FindByID(oderId) ?? BasePlayer.FindSleeping(oderId);
            
            var lowerName = nameOrId.ToLower();
            foreach (var player in BasePlayer.activePlayerList)
                if (player.displayName.ToLower().Contains(lowerName)) return player;
            return null;
        }
        #endregion

        #region UI (оптимизированный)
        private void ShowUI(BasePlayer player)
        {
            CuiHelper.DestroyUi(player, UIName);
            playersWithUI.Add(player.userID);

            var elements = new CuiElementContainer();
            var s = GetScale(player);
            var data = GetPlayerData(player.userID);

            // Основной контейнер
            elements.Add(new CuiElement { Name = UIName, Parent = "Overlay", Components = { new CuiRectTransformComponent { AnchorMin = "0 0", AnchorMax = "1 1" } } });

            // Время до обновления
            var nextReset = DateTime.Now.Date.AddDays(1);
            var remaining = nextReset - DateTime.Now;
            string timeText = $"До обновления заданий: {remaining.Hours}ч {remaining.Minutes}м";
            
            AddPanel(elements, UIName, "battolepas_time", "0.325 0.325 0.325 0.600", 25f, 246f, 575f, 49f, s);
            AddLabel(elements, "battolepas_time", timeText, 20, "0.776 0.769 0.761 1.000", TextAnchor.MiddleLeft, s, "15 0", "-10 0");

            // Описание
            AddPanel(elements, UIName, "battolepas_desc", "0.325 0.325 0.325 0.600", -160f, 30f, 760f, 157f, s);
            AddLabel(elements, "battolepas_desc", "Интерактивная система прогрессии с эксклюзивными наградами. Выполняйте задания, повышайте уровень и получайте уникальные предметы. Ограниченный по времени сезон создает азарт и цель. Платный пропуск открывает премиум-трек с самыми ценными трофеями. Ваш путь к вершине успеха и стиля.", 16, "0.776 0.769 0.761 1.000", TextAnchor.UpperLeft, s, "10 10", "-10 -10");

            // Статус
            AddPanel(elements, UIName, "battolepas_status", "0.325 0.325 0.325 0.600", -160f, 192f, 510f, 49f, s);
            AddLabel(elements, "battolepas_status", $"ВАШ СТАТУС: {(data.IsPremium ? "PREMIUM" : "FREE")}", 24, "0.776 0.769 0.761 1.000", TextAnchor.MiddleLeft, s, "12 0", "-10 0");

            // BATTLE PASS заголовок
            AddPanel(elements, UIName, "battolepas_header", "0.325 0.325 0.325 0.600", -160f, 246f, 180f, 49f, s);
            AddLabel(elements, "battolepas_header", "BATTLE PASS", 24, "0.776 0.769 0.761 1.000", TextAnchor.MiddleCenter, s);

            // Кнопка премиума
            string soonColor = data.IsPremium ? "0.443 0.545 0.267 0.780" : "0.090 0.380 0.569 0.780";
            string soonText = data.IsPremium ? "PREMIUM АКТИВЕН" : "КУПИТЬ PREMIUM";
            AddPanel(elements, UIName, "battolepas_soon", soonColor, 355f, 192f, 245f, 49f, s);
            AddLabel(elements, "battolepas_soon", soonText, 21, "0.776 0.769 0.761 1.000", TextAnchor.MiddleCenter, s);

            if (!data.IsPremium)
            {
                AddLabel(elements, UIName, "Нажмите → выделите → Ctrl+C", 14, "0.7 0.7 0.7 1", TextAnchor.MiddleCenter, s, null, null, 355f, 274f, 245f, 20f);
                AddPanel(elements, UIName, "battolepas_link_panel", "0.1 0.1 0.1 0.8", 355f, 246f, 245f, 28f, s);
                elements.Add(new CuiElement
                {
                    Name = "battolepas_link_input", Parent = "battolepas_link_panel",
                    Components = {
                        new CuiInputFieldComponent { Text = "pan.gamestores.app", FontSize = (int)(14f * s), Align = TextAnchor.MiddleCenter, Color = "0.518 0.733 0.886 1", CharsLimit = 50, ReadOnly = true },
                        new CuiRectTransformComponent { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = "5 0", OffsetMax = "-5 0" }
                    }
                });
            }

            // Разделители
            AddPanel(elements, UIName, "battolepas_line_top", "0.325 0.325 0.325 0.600", -160f, 4f, 760f, 22f, s);
            AddLabel(elements, "battolepas_line_top", "← Листайте награды колёсиком мыши →", 18, "0.776 0.769 0.761 0.9", TextAnchor.MiddleCenter, s);
            AddPanel(elements, UIName, "battolepas_line_bottom", "0.325 0.325 0.325 0.600", -160f, -295f, 760f, 10f, s);

            // Скролл область
            float scrollAreaWidth = 760f * s;
            float scrollAreaHeight = 280f * s;
            float scrollAreaX = -160f * s;
            float scrollAreaY = -280f * s;
            float slotWidth = 110f * s;
            float slotHeight = 102f * s;
            float slotGap = 10f * s;
            float btnHeight = 35f * s;
            float totalContentWidth = 30 * (slotWidth + slotGap);

            elements.Add(new CuiPanel
            {
                Image = { Color = "0 0 0 0" },
                RectTransform = { AnchorMin = "0.5 0.5", AnchorMax = "0.5 0.5", OffsetMin = $"{scrollAreaX} {scrollAreaY}", OffsetMax = $"{scrollAreaX + scrollAreaWidth} {scrollAreaY + scrollAreaHeight}" }
            }, UIName, "battolepas_scroll_area");

            elements.Add(new CuiElement
            {
                Name = "battolepas_scrollview", Parent = "battolepas_scroll_area",
                Components = {
                    new CuiScrollViewComponent
                    {
                        ContentTransform = new CuiRectTransform { AnchorMin = "1 0", AnchorMax = "1 1", OffsetMin = $"{-totalContentWidth} 0", OffsetMax = "0 0" },
                        Horizontal = true, Vertical = false, MovementType = UnityEngine.UI.ScrollRect.MovementType.Elastic,
                        Elasticity = 0.1f, Inertia = true, DecelerationRate = 0.135f, ScrollSensitivity = -30f
                    },
                    new CuiRectTransformComponent { AnchorMin = "0 0", AnchorMax = "1 1" }
                }
            });

            // Слоты наград
            for (int lvl = 1; lvl <= 30; lvl++)
            {
                float xPos = (lvl - 1) * (slotWidth + slotGap);
                
                // FREE
                bool freeUnlocked = data.Level >= lvl;
                bool freeClaimed = data.ClaimedFree.TryGetValue(lvl, out bool fc) && fc;
                string freeBgColor = freeClaimed ? "0.3 0.3 0.3 0.5" : (freeUnlocked ? "0.443 0.545 0.267 0.600" : "0.325 0.325 0.325 0.600");
                
                elements.Add(new CuiPanel { Image = { Color = freeBgColor }, RectTransform = { AnchorMin = "0 0.52", AnchorMax = "0 1", OffsetMin = $"{xPos} {btnHeight}", OffsetMax = $"{xPos + slotWidth} 0" } }, "battolepas_scrollview", $"bp_free_{lvl}");
                elements.Add(new CuiLabel { Text = { Text = $"LVL {lvl}", FontSize = (int)(18f * s), Align = TextAnchor.UpperCenter, Color = "1 1 1 1", Font = "robotocondensed-bold.ttf" }, RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = "2 2", OffsetMax = "-2 -2" } }, $"bp_free_{lvl}");

                var freeReward = FreeRewards[lvl - 1];
                AddRewardContent(elements, $"bp_free_{lvl}", freeReward, s);

                string freeBtnColor = freeClaimed || freeUnlocked ? "0.443 0.545 0.267 1.0" : "0.788 0.239 0.239 1.0";
                string freeBtnTextColor = freeClaimed || freeUnlocked ? "0.745 0.855 0.561 1.0" : "0.969 0.784 0.784 1.0";
                string freeBtnText = freeClaimed ? "✓" : (freeUnlocked ? "ЗАБРАТЬ" : "ЗАКРЫТО");
                string freeCommand = freeUnlocked && !freeClaimed ? $"battlepass.claim {lvl} false" : "";
                elements.Add(new CuiButton { Button = { Color = freeBtnColor, Command = freeCommand }, RectTransform = { AnchorMin = "0 0.52", AnchorMax = "0 0.52", OffsetMin = $"{xPos} 0", OffsetMax = $"{xPos + slotWidth} {btnHeight}" }, Text = { Text = freeBtnText, FontSize = (int)(18f * s), Align = TextAnchor.MiddleCenter, Color = freeBtnTextColor, Font = "robotocondensed-bold.ttf" } }, "battolepas_scrollview", $"bp_free_btn_{lvl}");

                // PREMIUM
                bool premUnlocked = data.Level >= lvl && data.IsPremium;
                bool premClaimed = data.ClaimedPremium.TryGetValue(lvl, out bool pc) && pc;
                string premBgColor = premClaimed ? "0.3 0.3 0.3 0.5" : "0.518 0.733 0.886 0.300";
                
                elements.Add(new CuiPanel { Image = { Color = premBgColor }, RectTransform = { AnchorMin = "0 0", AnchorMax = "0 0.48", OffsetMin = $"{xPos} {btnHeight}", OffsetMax = $"{xPos + slotWidth} 0" } }, "battolepas_scrollview", $"bp_prem_{lvl}");
                elements.Add(new CuiLabel { Text = { Text = "PREMIUM", FontSize = (int)(14f * s), Align = TextAnchor.UpperCenter, Color = "0.518 0.733 0.886 1", Font = "robotocondensed-bold.ttf" }, RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = "2 2", OffsetMax = "-2 -2" } }, $"bp_prem_{lvl}");

                var premReward = PremiumRewards[lvl - 1];
                AddRewardContent(elements, $"bp_prem_{lvl}", premReward, s);

                string premBtnColor = premClaimed || premUnlocked ? "0.443 0.545 0.267 1.0" : "0.788 0.239 0.239 1.0";
                string premBtnTextColor = premClaimed || premUnlocked ? "0.745 0.855 0.561 1.0" : "0.969 0.784 0.784 1.0";
                string premBtnText = premClaimed ? "✓" : (premUnlocked ? "ЗАБРАТЬ" : (data.IsPremium ? "ЗАКРЫТО" : "PREMIUM"));
                string premCommand = premUnlocked && !premClaimed ? $"battlepass.claim {lvl} true" : "";
                elements.Add(new CuiButton { Button = { Color = premBtnColor, Command = premCommand }, RectTransform = { AnchorMin = "0 0", AnchorMax = "0 0", OffsetMin = $"{xPos} 0", OffsetMax = $"{xPos + slotWidth} {btnHeight}" }, Text = { Text = premBtnText, FontSize = (int)(18f * s), Align = TextAnchor.MiddleCenter, Color = premBtnTextColor, Font = "robotocondensed-bold.ttf" } }, "battolepas_scrollview", $"bp_prem_btn_{lvl}");
            }

            CuiHelper.AddUi(player, elements);
        }

        private void AddRewardContent(CuiElementContainer elements, string parent, RewardDef reward, float s)
        {
            if (reward.CachedItemDef != null)
            {
                elements.Add(new CuiElement { Parent = parent, Components = { new CuiImageComponent { ItemId = reward.CachedItemDef.itemid }, new CuiRectTransformComponent { AnchorMin = "0.15 0.15", AnchorMax = "0.85 0.85" } } });
                elements.Add(new CuiLabel { Text = { Text = $"x{reward.Amount}", FontSize = (int)(17f * s), Align = TextAnchor.LowerRight, Color = "1 1 1 1", Font = "robotocondensed-bold.ttf" }, RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = "3 3", OffsetMax = "-3 -3" } }, parent);
            }
            else
            {
                var imageId = reward.CachedImageKey != null ? assets?.Get(reward.CachedImageKey) : null;
                if (imageId != null)
                    elements.Add(new CuiElement { Parent = parent, Components = { new CuiRawImageComponent { Png = imageId }, new CuiRectTransformComponent { AnchorMin = "0.1 0.1", AnchorMax = "0.9 0.85" } } });
                else
                    elements.Add(new CuiLabel { Text = { Text = reward.DisplayName, FontSize = (int)(14f * s), Align = TextAnchor.MiddleCenter, Color = "1 1 1 1", Font = "robotocondensed-bold.ttf" }, RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = "3 3", OffsetMax = "-3 -3" } }, parent);
            }
        }

        private void AddPanel(CuiElementContainer elements, string parent, string name, string color, float x, float y, float w, float h, float s)
        {
            int minX = Mathf.RoundToInt(x * s), minY = Mathf.RoundToInt(y * s);
            int maxX = minX + Mathf.RoundToInt(w * s), maxY = minY + Mathf.RoundToInt(h * s);
            elements.Add(new CuiPanel { Image = { Color = color }, RectTransform = { AnchorMin = "0.5 0.5", AnchorMax = "0.5 0.5", OffsetMin = $"{minX} {minY}", OffsetMax = $"{maxX} {maxY}" } }, parent, name);
        }

        private void AddLabel(CuiElementContainer elements, string parent, string text, int fontSize, string color, TextAnchor align, float s, string offsetMin = "0 0", string offsetMax = "0 0")
        {
            elements.Add(new CuiLabel { Text = { Text = text, FontSize = (int)(fontSize * s), Align = align, Color = color }, RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1", OffsetMin = offsetMin, OffsetMax = offsetMax } }, parent);
        }

        private void AddLabel(CuiElementContainer elements, string parent, string text, int fontSize, string color, TextAnchor align, float s, string offsetMin, string offsetMax, float x, float y, float w, float h)
        {
            int minX = Mathf.RoundToInt(x * s), minY = Mathf.RoundToInt(y * s);
            int maxX = minX + Mathf.RoundToInt(w * s), maxY = minY + Mathf.RoundToInt(h * s);
            elements.Add(new CuiLabel { Text = { Text = text, FontSize = (int)(fontSize * s), Align = align, Color = color }, RectTransform = { AnchorMin = "0.5 0.5", AnchorMax = "0.5 0.5", OffsetMin = $"{minX} {minY}", OffsetMax = $"{maxX} {maxY}" } }, parent);
        }

        private void CloseUI(BasePlayer player)
        {
            CuiHelper.DestroyUi(player, UIName);
            playersWithUI.Remove(player.userID);
        }
        #endregion

        #region API
        public void API_Open(BasePlayer player) { if (player != null) ShowUI(player); }
        public void API_Close(BasePlayer player) { if (player != null) CloseUI(player); }
        
        private object API_GetPlayerQuests(ulong oderId)
        {
            var data = GetPlayerData(oderId);
            var result = new List<Dictionary<string, object>>();
            if (data.DailyQuests == null) return result;
            
            foreach (var quest in data.DailyQuests)
            {
                _questById.TryGetValue(quest.QuestId, out var questDef);
                result.Add(new Dictionary<string, object>
                {
                    { "QuestId", quest.QuestId }, { "Name", questDef?.Name ?? "НЕИЗВЕСТНО" },
                    { "Current", quest.Current }, { "Required", quest.Required },
                    { "Completed", quest.Completed }, { "IsPremiumQuest", quest.IsPremiumQuest }
                });
            }
            return result;
        }

        public void API_GivePrivilege(BasePlayer player, string groupName, int days)
        {
            if (player != null && !string.IsNullOrEmpty(groupName) && days > 0)
                GivePrivilege(player, groupName.ToLower(), days);
        }
        #endregion
    }
}
