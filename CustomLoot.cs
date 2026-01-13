using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Oxide.Core;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("CustomLoot", "Kiro", "1.1.0")]
    class CustomLoot : RustPlugin
    {
        static CustomLoot Instance;
        static Dictionary<string, ContainerPreset> Containers = new Dictionary<string, ContainerPreset>();

        #region Data Classes
        class ContainerPreset
        {
            public bool enabled = true;
            public AmountController amountLoot = new AmountController();
            public List<LootPreset> lootPresets = new List<LootPreset>();
        }

        class AmountController
        {
            public int minAmount = 1;
            public int maxAmount = 3;
            public int GetAmount() => UnityEngine.Random.Range(minAmount, maxAmount + 1);
        }

        class LootPreset
        {
            public string shortname;
            public string displayName;
            public int rareDrop = 100;
            public bool isBlueprint;
            public AmountController amount = new AmountController();
            public ulong skinID;
            public int? condition; // Прочность 0-100%
            public int? ammo; // Патроны в магазине (null = полный)
            public string ammoType; // Тип патронов (null = стандартные)
            public List<string> attachments = new List<string>();
        }
        #endregion

        void OnServerInitialized()
        {
            Instance = this;
            LoadData();
        }

        void Unload() => Instance = null;

        void LoadData()
        {
            Containers.Clear();
            string path = "CustomLoot/Containers";
            string fullPath = $"{Interface.Oxide.DataDirectory}/{path}";
            
            if (!System.IO.Directory.Exists(fullPath))
            {
                System.IO.Directory.CreateDirectory(fullPath);
                Puts($"Создана папка: {fullPath}");
                
                var example = new ContainerPreset
                {
                    enabled = true,
                    amountLoot = new AmountController { minAmount = 2, maxAmount = 4 },
                    lootPresets = new List<LootPreset>
                    {
                        new LootPreset { shortname = "scrap", rareDrop = 100, amount = new AmountController { minAmount = 5, maxAmount = 15 } },
                        new LootPreset { shortname = "rifle.ak", rareDrop = 50, attachments = new List<string> { "weapon.mod.holosight", "weapon.mod.lasersight" } }
                    }
                };
                Interface.Oxide.DataFileSystem.WriteObject($"{path}/crate_normal", example);
                Puts("Создан пример: crate_normal.json");
            }
            
            try
            {
                var files = Interface.Oxide.DataFileSystem.GetFiles(path, "*.json");
                Puts($"Найдено {files.Length} файлов конфигурации");
                
                foreach (var file in files)
                {
                    try
                    {
                        string key = file.Substring(0, file.Length - 5);
                        var preset = Interface.Oxide.DataFileSystem.ReadObject<ContainerPreset>(key);
                        if (preset != null)
                        {
                            string name = System.IO.Path.GetFileNameWithoutExtension(key);
                            Containers[name] = preset;
                            Puts($"  ✓ {name}: {preset.lootPresets?.Count ?? 0} предметов, enabled={preset.enabled}");
                        }
                    }
                    catch (Exception ex) { PrintWarning($"Ошибка чтения {file}: {ex.Message}"); }
                }
                
                Puts($"Загружено {Containers.Count} контейнеров");
            }
            catch (Exception ex) { PrintWarning($"Ошибка загрузки: {ex.Message}"); }
        }

        [ConsoleCommand("customloot.reload")]
        void CmdReload(ConsoleSystem.Arg arg)
        {
            if (arg.Player() != null && !arg.Player().IsAdmin) return;
            LoadData();
            arg.ReplyWith($"Перезагружено {Containers.Count} контейнеров");
        }

        [ConsoleCommand("customloot.respawn")]
        void CmdRespawn(ConsoleSystem.Arg arg)
        {
            if (arg.Player() != null && !arg.Player().IsAdmin) return;
            
            int count = 0;
            foreach (var container in BaseNetworkable.serverEntities.OfType<LootContainer>().ToList())
            {
                if (container == null || container.IsDestroyed) continue;
                if (!Containers.ContainsKey(container.ShortPrefabName)) continue;
                
                ApplyLoot(container);
                count++;
            }
            
            arg.ReplyWith($"Обновлено {count} ящиков");
            Puts($"Обновлено {count} ящиков");
        }

        [ConsoleCommand("customloot.refill")]
        void CmdRefill(ConsoleSystem.Arg arg)
        {
            if (arg.Player() != null && !arg.Player().IsAdmin) return;
            
            string target = arg.HasArgs() ? arg.GetString(0) : null;
            int count = 0;
            
            foreach (var container in BaseNetworkable.serverEntities.OfType<LootContainer>().ToList())
            {
                if (container == null || container.IsDestroyed) continue;
                if (target != null && container.ShortPrefabName != target) continue;
                if (!Containers.ContainsKey(container.ShortPrefabName)) continue;
                
                ApplyLoot(container);
                count++;
            }
            
            string msg = target != null 
                ? $"Обновлено {count} ящиков типа {target}" 
                : $"Обновлено {count} ящиков";
            arg.ReplyWith(msg);
            Puts(msg);
        }

        void OnLootSpawn(LootContainer container)
        {
            if (container == null) return;
            NextTick(() => ApplyLoot(container));
        }

        void ApplyLoot(LootContainer container)
        {
            if (container?.inventory == null) return;
            if (!Containers.TryGetValue(container.ShortPrefabName, out var preset)) return;
            if (!preset.enabled || preset.lootPresets == null || preset.lootPresets.Count == 0) return;

            container.inventory.Clear();
            ItemManager.DoRemoves();

            var validItems = preset.lootPresets.Where(p => !string.IsNullOrEmpty(p.shortname)).ToList();
            if (validItems.Count == 0) return;

            // Получаем количество предметов для спавна
            int spawnCount = preset.amountLoot?.GetAmount() ?? validItems.Count;
            spawnCount = Math.Min(spawnCount, validItems.Count);

            // Взвешенный случайный выбор без дубликатов
            var available = new List<LootPreset>(validItems);
            int spawned = 0;

            for (int i = 0; i < spawnCount && available.Count > 0; i++)
            {
                int totalWeight = available.Sum(p => p.rareDrop);
                int rand = UnityEngine.Random.Range(0, totalWeight);
                
                LootPreset selected = null;
                foreach (var loot in available)
                {
                    rand -= loot.rareDrop;
                    if (rand < 0) { selected = loot; break; }
                }
                
                if (selected == null) selected = available[0];
                available.Remove(selected);

                var item = CreateItem(selected);
                if (item != null)
                {
                    if (item.MoveToContainer(container.inventory))
                        spawned++;
                    else
                        item.Remove();
                }
            }
        }

        Item CreateItem(LootPreset loot)
        {
            // Создание чертежа
            if (loot.isBlueprint)
            {
                var def = ItemManager.FindItemDefinition(loot.shortname);
                if (def == null) return null;
                var bp = ItemManager.Create(ItemManager.blueprintBaseDef);
                bp.blueprintTarget = def.itemid;
                return bp;
            }

            int amount = loot.amount?.GetAmount() ?? 1;
            var item = ItemManager.CreateByName(loot.shortname, amount, loot.skinID);
            if (item == null) return null;

            if (!string.IsNullOrEmpty(loot.displayName))
                item.name = loot.displayName;

            // Установка прочности
            if (loot.condition.HasValue && item.hasCondition)
                item.condition = item.maxCondition * (loot.condition.Value / 100f);

            // Добавление модулей на оружие
            if (loot.attachments != null && loot.attachments.Count > 0)
            {
                var weapon = item.GetHeldEntity() as BaseProjectile;
                if (weapon != null)
                {
                    foreach (var attachmentName in loot.attachments)
                    {
                        var attachmentItem = ItemManager.CreateByName(attachmentName);
                        if (attachmentItem != null && !attachmentItem.MoveToContainer(item.contents))
                            attachmentItem.Remove();
                    }
                }
            }

            // Зарядка патронов
            var proj = item.GetHeldEntity() as BaseProjectile;
            if (proj != null)
            {
                var ammoDef = loot.ammoType != null ? ItemManager.FindItemDefinition(loot.ammoType) : proj.primaryMagazine.ammoType;
                if (ammoDef != null) proj.primaryMagazine.ammoType = ammoDef;
                proj.primaryMagazine.contents = loot.ammo ?? proj.primaryMagazine.capacity;
            }

            return item;
        }
    }
}
