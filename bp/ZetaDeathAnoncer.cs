using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("DeathAnnouncer", "Optimized", "2.0.0")]
    class ZetaDeathAnoncer : RustPlugin
    {
        private const int MaxKills = 7, TextSize = 14, Offset = 20;
        private const float Timeout = 7f;
        private const string Color1 = "#9cd579", Color2 = "#a8e6cf", Color3 = "#5dade2";
        
        private readonly List<KillInfo> _kills = new List<KillInfo>();
        private readonly Dictionary<NetworkableId, ulong> _heliDamage = new Dictionary<NetworkableId, ulong>();
        private string _guiJson;

        private readonly Dictionary<string, string> _weapons = new Dictionary<string, string>
        {
            {"ak47u.entity","AK-47"},{"lr300.entity","LR-300"},{"m249.entity","M249"},{"mp5.entity","MP5"},
            {"thompson.entity","Томсон"},{"smg.entity","SMG"},{"semi_auto_rifle.entity","SAR"},{"m39.entity","M39"},
            {"l96.entity","L96"},{"bolt_rifle.entity","Болт"},{"spas12.entity","Spas-12"},{"shotgun_pump.entity","Помпа"},
            {"double_shotgun.entity","Двустволка"},{"m92.entity","M92"},{"python.entity","Питон"},
            {"pistol_revolver.entity","Револьвер"},{"pistol_semiauto.entity","P250"},{"bow_hunting.entity","Лук"},
            {"crossbow.entity","Арбалет"},{"compound_bow.entity","Блочный лук"},{"longsword.entity","Меч"},
            {"machete.weapon","Мачете"},{"salvaged_sword.entity","Самод. меч"},{"knife.combat.entity","Нож"}
        };

        void OnServerInitialized() => _guiJson = "[{{\"name\":\"{0}\",\"parent\":\"Hud\",\"components\":[{{\"type\":\"UnityEngine.UI.Text\",\"text\":\"{1}\",\"fontSize\":" + TextSize + ",\"fadeIn\":\"0.3\",\"align\":\"UpperRight\"}},{{\"type\":\"UnityEngine.UI.Outline\",\"color\":\"0 0 0 0.7\",\"distance\":\"0.6 0.6\"}},{{\"type\":\"RectTransform\",\"anchormin\":\"1 1\",\"anchormax\":\"1 1\",\"offsetmin\":\"-400 {2}\",\"offsetmax\":\"-5 {3}\"}}],\"fadeOut\":\"0.1\"}}]";

        void Unload() { foreach (var k in _kills) DestroyUI(k.Guid); }

        void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
        {
            if (entity is PatrolHelicopter && info?.InitiatorPlayer != null)
                _heliDamage[entity.net.ID] = info.InitiatorPlayer.userID;
        }

        void OnEntityDeath(BaseCombatEntity entity, HitInfo info)
        {
            if (entity is PatrolHelicopter && _heliDamage.ContainsKey(entity.net.ID))
            {
                var player = BasePlayer.FindByID(_heliDamage[entity.net.ID]);
                if (player != null) AddKill(player, null, "Вертолёт", 0, true);
                _heliDamage.Remove(entity.net.ID);
            }
            else if (entity is BradleyAPC && info?.InitiatorPlayer != null)
                AddKill(info.InitiatorPlayer, null, "Танк", 0, true);
        }

        void OnPlayerDeath(BasePlayer victim, HitInfo info)
        {
            if (victim == null || info == null) return;
            
            var attacker = info.InitiatorPlayer;
            if (attacker != null && attacker != victim)
            {
                var weapon = info.WeaponPrefab?.ShortPrefabName ?? "Unknown";
                var dist = (int)Vector3.Distance(attacker.transform.position, victim.transform.position);
                AddKill(attacker, victim, GetWeapon(weapon), dist, false);
                return;
            }
            
            if (info.Initiator is PatrolHelicopter)
                AddKillFromEntity(victim, "Вертолёт");
            else if (info.Initiator is BradleyAPC)
                AddKillFromEntity(victim, "Танк");
            else if (info.Initiator is AutoTurret)
                AddKillFromEntity(victim, "Турель");
            else if (info.Initiator is GunTrap)
                AddKillFromEntity(victim, "Ган трап");
            else if (info.Initiator is FlameTurret)
                AddKillFromEntity(victim, "Огн. турель");
            else if (info.Initiator is SamSite)
                AddKillFromEntity(victim, "Зенитка");
        }

        void AddKillFromEntity(BasePlayer victim, string entityName)
        {
            var kill = new KillInfo
            {
                Guid = $"kill_{Random.Range(0, 99999)}",
                VictimId = victim.userID,
                VictimTeam = victim.Team?.members?.ToList() ?? new List<ulong>(),
                Message = $"<color={Color3}>{entityName}</color> убил <color=COL1>{Truncate(victim.displayName)}</color>"
            };
            AddKillToList(kill);
        }

        void AddKill(BasePlayer attacker, BasePlayer victim, string weapon, int dist, bool isEvent)
        {
            var kill = new KillInfo
            {
                Guid = $"kill_{Random.Range(0, 99999)}",
                AttackerId = attacker.userID,
                AttackerTeam = attacker.Team?.members?.ToList() ?? new List<ulong>()
            };

            if (isEvent)
            {
                kill.Message = $"<color=COL2>{Truncate(attacker.displayName)}</color> уничтожил <color={Color3}>{weapon}</color>";
            }
            else
            {
                kill.VictimId = victim.userID;
                kill.VictimTeam = victim.Team?.members?.ToList() ?? new List<ulong>();
                kill.Message = $"<color=COL2>{Truncate(attacker.displayName)}</color> убил <color=COL1>{Truncate(victim.displayName)}</color> ({weapon}, {dist}м)";
            }
            AddKillToList(kill);
        }

        void AddKillToList(KillInfo kill)
        {
            if (_kills.Count >= MaxKills) RemoveKill(_kills[0]);
            _kills.Add(kill);
            RefreshUI();
            timer.Once(Timeout, () => { if (_kills.Contains(kill)) RemoveKill(kill); });
        }

        void RemoveKill(KillInfo kill) { DestroyUI(kill.Guid); _kills.Remove(kill); RefreshUI(); }

        void RefreshUI()
        {
            foreach (var p in BasePlayer.activePlayerList)
            {
                for (int i = 0; i < _kills.Count; i++)
                {
                    var k = _kills[i];
                    CommunityEntity.ServerInstance.ClientRPCEx(new Network.SendInfo(p.net.connection), null, "DestroyUI", k.Guid);
                    var msg = k.Message
                        .Replace("COL1", GetColor(p, k.VictimId, k.VictimTeam))
                        .Replace("COL2", GetColor(p, k.AttackerId, k.AttackerTeam));
                    var min = -10 - ((_kills.Count - 1 - i) * Offset) - 18;
                    CommunityEntity.ServerInstance.ClientRPCEx(new Network.SendInfo(p.net.connection), null, "AddUI", string.Format(_guiJson, k.Guid, msg, min, min + 18));
                }
            }
        }

        string GetColor(BasePlayer p, ulong id, List<ulong> team)
        {
            if (id == 0) return Color3;
            return p.userID == id ? Color1 : (team != null && team.Contains(p.userID)) ? Color2 : Color3;
        }
        
        string GetWeapon(string w) { string n; return _weapons.TryGetValue(w, out n) ? n : w.Replace(".entity", "").Replace(".", " "); }
        string Truncate(string s) => s.Length > 14 ? s.Substring(0, 14) : s;
        void DestroyUI(string guid) { foreach (var c in Network.Net.sv.connections) CommunityEntity.ServerInstance.ClientRPCEx(new Network.SendInfo(c), null, "DestroyUI", guid); }

        [ChatCommand("testkill")]
        void CmdTestKill(BasePlayer player)
        {
            AddKill(player, player, "AK-47", 150, false);
            timer.Once(1f, () => AddKillFromEntity(player, "Турель"));
            timer.Once(2f, () => AddKill(player, null, "Вертолёт", 0, true));
            timer.Once(3f, () => AddKillFromEntity(player, "Танк"));
        }

        class KillInfo 
        { 
            public string Guid, Message; 
            public ulong VictimId, AttackerId; 
            public List<ulong> VictimTeam = new List<ulong>(), AttackerTeam = new List<ulong>(); 
        }
    }
}
