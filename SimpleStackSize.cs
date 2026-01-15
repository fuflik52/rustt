using System.Collections.Generic;
using Oxide.Core;
using Newtonsoft.Json;

namespace Oxide.Plugins
{
    [Info("SimpleStackSize", "Kiro", "2.0.0")]
    [Description("Настройка максимального размера стаков для любых предметов")]
    class SimpleStackSize : RustPlugin
    {
        private Dictionary<string, int> stackSizes = new Dictionary<string, int>();
        private const string JsonFile = "SimpleStackSize.json";

        void OnServerInitialized()
        {
            LoadStackSizes();
            ApplyStacks();
            Puts($"Загружено {stackSizes.Count} настроек стаков");
        }

        void LoadStackSizes()
        {
            stackSizes.Clear();
            
            // Пытаемся загрузить из JSON файла
            string jsonPath = $"{Interface.Oxide.DataDirectory}/{JsonFile}";
            if (System.IO.File.Exists(jsonPath))
            {
                try
                {
                    string json = System.IO.File.ReadAllText(jsonPath);
                    stackSizes = JsonConvert.DeserializeObject<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
                    Puts($"Настройки стаков загружены из {JsonFile}");
                    return;
                }
                catch (System.Exception ex)
                {
                    PrintError($"Ошибка загрузки {JsonFile}: {ex.Message}");
                }
            }
            
            // Если JSON не найден, загружаем из конфига (для обратной совместимости)
            LoadConfig();
            if (Config.Count > 0)
            {
                foreach (var entry in Config)
                {
                    if (entry.Value is int || entry.Value is long)
                    {
                        stackSizes[entry.Key] = System.Convert.ToInt32(entry.Value);
                    }
                }
                Puts("Настройки стаков загружены из конфига (старый формат)");
            }
        }

        protected override void LoadDefaultConfig()
        {
            // Создаём пример конфига для обратной совместимости
            Config["scrap"] = 10000;
            Config["wood"] = 50000;
            Config["stones"] = 50000;
            Config["metal.fragments"] = 10000;
            Config["sulfur"] = 10000;
            Config["cloth"] = 5000;
            SaveConfig();
            
            PrintWarning("Создан конфиг по умолчанию. Рекомендуется использовать веб-интерфейс для настройки стаков.");
        }

        void ApplyStacks()
        {
            int appliedCount = 0;
            foreach (var item in ItemManager.GetItemDefinitions())
            {
                if (stackSizes.ContainsKey(item.shortname))
                {
                    item.stackable = stackSizes[item.shortname];
                    appliedCount++;
                }
            }
            Puts($"Применено {appliedCount} настроек стаков");
        }

        // Хук для динамического изменения размера стака
        int OnMaxStackable(Item item)
        {
            if (item?.info == null) return -1;
            
            return stackSizes.ContainsKey(item.info.shortname) 
                ? stackSizes[item.info.shortname] 
                : item.info.stackable;
        }

        // Команда для перезагрузки настроек
        [ConsoleCommand("stacksize.reload")]
        void ReloadStackSizes(ConsoleSystem.Arg arg)
        {
            if (arg.Connection != null && !arg.Connection.authLevel >= 2) return;
            
            LoadStackSizes();
            ApplyStacks();
            Puts("Настройки стаков перезагружены");
            
            if (arg.Connection != null)
                arg.ReplyWith("Настройки стаков перезагружены");
        }

        // Команда для просмотра текущих настроек
        [ConsoleCommand("stacksize.list")]
        void ListStackSizes(ConsoleSystem.Arg arg)
        {
            if (arg.Connection != null && !arg.Connection.authLevel >= 2) return;
            
            if (stackSizes.Count == 0)
            {
                Puts("Нет настроенных стаков");
                return;
            }
            
            Puts($"Настроено стаков: {stackSizes.Count}");
            foreach (var kvp in stackSizes)
            {
                Puts($"  {kvp.Key}: {kvp.Value}");
            }
        }
    }
}
