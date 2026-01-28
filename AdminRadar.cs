using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Plugins;
using Oxide.Game.Rust.Cui;
using Newtonsoft.Json;
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace Oxide.Plugins
{
    [Info("AdminRadar", "BublickRust", "1.1.0")]
    class AdminRadar : RustPlugin
    {
        [PluginReference] private Plugin SClan;

        private HashSet<ulong> _active = new HashSet<ulong>();
        private HashSet<ulong> _collapsed = new HashSet<ulong>();
        private Dictionary<ulong, PlayerSettings> _settings = new Dictionary<ulong, PlayerSettings>();
        private Dictionary<ulong, List<Vector3>> _hitMarkers = new Dictionary<ulong, List<Vector3>>();
        private Dictionary<string, string> _imgs = new Dictionary<string, string>();
        private Dictionary<ulong, ClanCache> _clanCache = new Dictionary<ulong, ClanCache>();
        private Dictionary<string, int> _clanGroupsPool = new Dictionary<string, int>();
        private List<PlayerData> _playersPool = new List<PlayerData>();
        private Dictionary<ulong, HitStatsData> _hitStats = new Dictionary<ulong, HitStatsData>();
        private Timer _saveTimer;
        private Timer _apiSyncTimer;
        private bool _dirty;
        private static readonly string[] Keys = { "Vector", "______________________-", "_____________________" };
        private const string UI = "AdminRadar";
        private const string UI_PANEL = "AdminRadarPanel";
        private const float S = 0.67f;
        private const float RefreshRate = 0.25f;
        private const float ClanCacheTime = 5f;
        private const float SaveInterval = 300f;
        private const float ApiSyncInterval = 900f;
        private const string ApiBaseUrl = "http://87.121.217.18:3000/api/hitstats";
        private static readonly Color ColorBlue = new Color(0.23f, 0.65f, 1f, 1f);
        private static readonly Color ColorRed = new Color(1f, 0.27f, 0.27f, 1f);

        private class ClanCache
        {
            public string Tag;
            public float Time;
        }

        private struct PlayerData
        {
            public BasePlayer Player;
            public float Dist;
            public string ClanTag;
        }

        private class HitStatsData
        {
            public string Name;
            public int Head;
            public int Neck;
            public int Chest;
            public int Spine;
            public int Pelvis;
            public int LeftArm;
            public int RightArm;
            public int LeftHand;
            public int RightHand;
            public int LeftLeg;
            public int RightLeg;
            public int LeftFoot;
            public int RightFoot;
            public int Body;
            public int Total;
            public string FirstHitTime;
            public string LastUpdateTime;
        }

        class PlayerSettings
        {
            public bool ShowNickname = true;
            public bool ShowLine = true;
            public bool ShowHitbox = true;
            public bool ShowHealth = true;
            public bool ShowSleepers = true;
            public float Distance = 300f;
        }

        PlayerSettings GetSettings(ulong oderId)
        {
            if (!_settings.TryGetValue(oderId, out var s))
            {
                s = new PlayerSettings();
                _settings[oderId] = s;
            }
            return s;
        }

        void OnServerInitialized()
        {
            var dir = $"{Interface.Oxide.DataDirectory}/{UI}/Images";
            if (!System.IO.Directory.Exists(dir)) System.IO.Directory.CreateDirectory(dir);
            ServerMgr.Instance.StartCoroutine(LoadImages(dir));
            LoadHitStats();
            _saveTimer = timer.Every(SaveInterval, SaveHitStatsIfDirty);
            _apiSyncTimer = timer.Every(ApiSyncInterval, () => SyncHitStatsToApi(null));

            foreach (var player in BasePlayer.activePlayerList)
                if (player.IsAdmin)
                    ShowPanel(player);
        }

        void LoadHitStats()
        {
            _hitStats = Interface.Oxide.DataFileSystem.ReadObject<Dictionary<ulong, HitStatsData>>($"{UI}/HitStats") ?? new Dictionary<ulong, HitStatsData>();
        }

        void SaveHitStatsIfDirty()
        {
            if (!_dirty) return;
            _dirty = false;
            Interface.Oxide.DataFileSystem.WriteObject($"{UI}/HitStats", _hitStats);
        }

        IEnumerator LoadImages(string dir)
        {
            foreach (var k in Keys)
            {
                using (var r = UnityWebRequestTexture.GetTexture($"file://{dir}/{k}.png"))
                {
                    yield return r.SendWebRequest();
                    if (r.result == UnityWebRequest.Result.Success)
                    {
                        var t = DownloadHandlerTexture.GetContent(r);
                        if (t != null) { _imgs[k] = FileStorage.server.Store(t.EncodeToPNG(), FileStorage.Type.png, CommunityEntity.ServerInstance.net.ID).ToString(); UnityEngine.Object.DestroyImmediate(t); }
                    }
                }
                yield return null;
            }
        }

        string Off(float x, float y) => $"{(x * S):F1} {(y * S):F1}";
        string OffMax(float x, float y, float w, float h) => $"{((x + w) * S):F1} {((y + h) * S):F1}";

        void OnPlayerConnected(BasePlayer player)
        {
            if (player.IsAdmin)
                timer.Once(1f, () => { if (player != null && player.IsConnected) ShowPanel(player); });
        }

        void OnPlayerDisconnected(BasePlayer player)
        {
            _active.Remove(player.userID);
            _collapsed.Remove(player.userID);
            _hitMarkers.Remove(player.userID);
        }

        void Unload()
        {
            _saveTimer?.Destroy();
            _apiSyncTimer?.Destroy();
            if (_dirty)
                Interface.Oxide.DataFileSystem.WriteObject($"{UI}/HitStats", _hitStats);
            SyncHitStatsToApi(null);
            foreach (var p in BasePlayer.activePlayerList)
            {
                CuiHelper.DestroyUi(p, UI);
                CuiHelper.DestroyUi(p, UI_PANEL);
            }
        }

        void SyncHitStatsToApi(BasePlayer caller)
        {
            if (_hitStats.Count == 0)
            {
                if (caller != null)
                    caller.ChatMessage("<color=#F44336>[AdminRadar]</color> Нет данных для отправки.");
                return;
            }

            var playersData = new Dictionary<string, object>();
            foreach (var kvp in _hitStats)
            {
                var stats = kvp.Value;
                playersData[kvp.Key.ToString()] = new Dictionary<string, object>
                {
                    ["Name"] = stats.Name ?? "Unknown",
                    ["Head"] = stats.Head,
                    ["Neck"] = stats.Neck,
                    ["Chest"] = stats.Chest,
                    ["Spine"] = stats.Spine,
                    ["Pelvis"] = stats.Pelvis,
                    ["LeftArm"] = stats.LeftArm,
                    ["RightArm"] = stats.RightArm,
                    ["LeftHand"] = stats.LeftHand,
                    ["RightHand"] = stats.RightHand,
                    ["LeftLeg"] = stats.LeftLeg,
                    ["RightLeg"] = stats.RightLeg,
                    ["LeftFoot"] = stats.LeftFoot,
                    ["RightFoot"] = stats.RightFoot,
                    ["Body"] = stats.Body,
                    ["Total"] = stats.Total,
                    ["FirstHitTime"] = stats.FirstHitTime ?? DateTime.UtcNow.ToString("o"),
                    ["LastUpdateTime"] = stats.LastUpdateTime ?? DateTime.UtcNow.ToString("o")
                };
            }

            var requestData = new Dictionary<string, object> { ["players"] = playersData };
            string json = JsonConvert.SerializeObject(requestData);

            webrequest.Enqueue(
                $"{ApiBaseUrl}/bulk",
                json,
                (code, response) =>
                {
                    if (code >= 200 && code < 300)
                    {
                        Puts($"[HitStats API] Синхронизация успешна. Отправлено {_hitStats.Count} игроков.");
                        if (caller != null)
                            caller.ChatMessage($"<color=#8BC34A>[AdminRadar]</color> Синхронизация успешна. Отправлено {_hitStats.Count} игроков.");
                    }
                    else
                    {
                        Puts($"[HitStats API] Ошибка синхронизации. Код: {code}, Ответ: {response ?? "null"}");
                        if (caller != null)
                            caller.ChatMessage($"<color=#F44336>[AdminRadar]</color> Ошибка синхронизации. Код: {code}");
                    }
                },
                this,
                RequestMethod.POST,
                new Dictionary<string, string> { 
                    ["Content-Type"] = "application/json",
                    ["Accept"] = "application/json"
                },
                30f
            );
        }

        void SendSingleHitToApi(ulong steamId, string name, string bodyPart)
        {
            var data = new Dictionary<string, object>
            {
                ["steamId"] = steamId.ToString(),
                ["name"] = name,
                ["bodyPart"] = bodyPart
            };

            webrequest.Enqueue(
                $"{ApiBaseUrl}/hit",
                JsonConvert.SerializeObject(data),
                (code, response) =>
                {
                    if (code < 200 || code >= 300)
                        Puts($"[HitStats API] Ошибка отправки хита: {code}, ответ: {response ?? "null"}");
                },
                this,
                RequestMethod.POST,
                new Dictionary<string, string> { 
                    ["Content-Type"] = "application/json",
                    ["Accept"] = "application/json"
                },
                10f
            );
        }

        [ChatCommand("syncstats")]
        void CmdSyncStats(BasePlayer player, string command, string[] args)
        {
            if (!player.IsAdmin)
            {
                player.ChatMessage("<color=#F44336>[AdminRadar]</color> Недостаточно прав.");
                return;
            }
            player.ChatMessage("<color=#FFC107>[AdminRadar]</color> Отправка статистики на API...");
            SyncHitStatsToApi(player);
        }

        [ConsoleCommand("radar.syncstats")]
        void CmdConsoleSyncStats(ConsoleSystem.Arg arg)
        {
            var player = arg?.Player();
            if (player != null && !player.IsAdmin) return;
            
            if (player != null)
                player.ChatMessage("<color=#FFC107>[AdminRadar]</color> Отправка статистики на API...");
            else
                Puts("[AdminRadar] Отправка статистики на API...");
            
            SyncHitStatsToApi(player);
        }

        void ShowPanel(BasePlayer p)
        {
            if (!p.IsAdmin) return;
            CuiHelper.DestroyUi(p, UI_PANEL);

            var s = GetSettings(p.userID);
            var e = new CuiElementContainer();
            bool collapsed = _collapsed.Contains(p.userID);

            e.Add(new CuiElement { Name = UI_PANEL, Parent = "Overlay", Components = { new CuiRectTransformComponent { AnchorMin = "0 0", AnchorMax = "1 1" } } });

            e.Add(new CuiPanel { Image = { Color = _active.Contains(p.userID) ? "0.44 0.55 0.26 0.8" : "0.89 0.85 0.82 0.31" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-536, 24), OffsetMax = OffMax(-536, 24, 74, 29) } }, UI_PANEL);
            e.Add(new CuiButton { Button = { Color = "0 0 0 0", Command = "radar.collapse" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-536, 24), OffsetMax = OffMax(-536, 24, 74, 29) }, Text = { Text = "<b>ESP</b>", FontSize = (int)(16 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" } }, UI_PANEL);

            e.Add(new CuiButton { Button = { Color = _active.Contains(p.userID) ? "0.44 0.55 0.26 1" : "0.78 0.24 0.24 1", Command = "radar.toggle" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-459, 24), OffsetMax = OffMax(-459, 24, 29, 29) }, Text = { Text = _active.Contains(p.userID) ? "<b>ON</b>" : "<b>OFF</b>", FontSize = (int)(12 * S), Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" } }, UI_PANEL);

            if (!collapsed)
            {
                AddOption(e, "NICKNAME", 58, s.ShowNickname, "radar.nickname");
                AddOption(e, "LINE", 92, s.ShowLine, "radar.line");
                AddOption(e, "HIT BOX", 126, s.ShowHitbox, "radar.hitbox");
                AddOption(e, "HEALTH", 160, s.ShowHealth, "radar.health");
                AddOption(e, "SLEEPERS", 194, s.ShowSleepers, "radar.sleepers");

                e.Add(new CuiPanel { Image = { Color = "0.89 0.85 0.82 0.31" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-457, 228), OffsetMax = OffMax(-457, 228, 108, 29) } }, UI_PANEL);
                e.Add(new CuiLabel { Text = { Text = "<b>DISTANCE</b>", FontSize = (int)(16 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-457, 228), OffsetMax = OffMax(-457, 228, 108, 29) } }, UI_PANEL);

                e.Add(new CuiButton { Button = { Color = "0.89 0.85 0.82 0.31", Command = "radar.dist -" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-344, 228), OffsetMax = OffMax(-344, 228, 29, 29) }, Text = { Text = "<b>-</b>", FontSize = (int)(20 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" } }, UI_PANEL);
                e.Add(new CuiPanel { Image = { Color = "0.05 0.05 0.05 0.6" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-312, 228), OffsetMax = OffMax(-312, 228, 60, 29) } }, UI_PANEL);
                e.Add(new CuiLabel { Text = { Text = $"<b>{s.Distance:0}m</b>", FontSize = (int)(14 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-312, 228), OffsetMax = OffMax(-312, 228, 60, 29) } }, UI_PANEL);
                e.Add(new CuiButton { Button = { Color = "0.89 0.85 0.82 0.31", Command = "radar.dist +" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-249, 228), OffsetMax = OffMax(-249, 228, 29, 29) }, Text = { Text = "<b>+</b>", FontSize = (int)(20 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" } }, UI_PANEL);
            }

            CuiHelper.AddUi(p, e);
        }

        void AddOption(CuiElementContainer e, string label, float y, bool enabled, string cmd)
        {
            e.Add(new CuiPanel { Image = { Color = "0.89 0.85 0.82 0.31" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-457, y), OffsetMax = OffMax(-457, y, 108, 29) } }, UI_PANEL);
            e.Add(new CuiLabel { Text = { Text = $"<b>{label}</b>", FontSize = (int)(16 * S), Align = TextAnchor.MiddleCenter, Color = "0.89 0.85 0.82 1" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-457, y), OffsetMax = OffMax(-457, y, 108, 29) } }, UI_PANEL);
            e.Add(new CuiPanel { Image = { Color = "0.89 0.85 0.82 0.31" }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-344, y), OffsetMax = OffMax(-344, y, 29, 29) } }, UI_PANEL);
            e.Add(new CuiButton { Button = { Color = enabled ? "0.88 0.89 0.45 1" : "0.05 0.05 0.05 0.31", Command = cmd }, RectTransform = { AnchorMin = "1.0 0.0", AnchorMax = "1.0 0.0", OffsetMin = Off(-339, y + 5), OffsetMax = OffMax(-339, y + 5, 19, 19) }, Text = { Text = "" } }, UI_PANEL);
        }

        [ConsoleCommand("radar.collapse")]
        void CmdCollapse(ConsoleSystem.Arg arg)
        {
            var p = arg?.Player();
            if (p == null || !p.IsAdmin) return;

            if (_collapsed.Contains(p.userID))
                _collapsed.Remove(p.userID);
            else
                _collapsed.Add(p.userID);
            ShowPanel(p);
        }

        [ConsoleCommand("radar.toggle")]
        void CmdToggle(ConsoleSystem.Arg arg)
        {
            var p = arg?.Player();
            if (p == null || !p.IsAdmin) return;

            if (_active.Contains(p.userID))
                _active.Remove(p.userID);
            else
            {
                _active.Add(p.userID);
                StartRadar(p);
            }
            ShowPanel(p);
        }

        [ConsoleCommand("radar.nickname")]
        void CmdNickname(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p == null || !p.IsAdmin) return; GetSettings(p.userID).ShowNickname = !GetSettings(p.userID).ShowNickname; ShowPanel(p); }

        [ConsoleCommand("radar.line")]
        void CmdLine(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p == null || !p.IsAdmin) return; GetSettings(p.userID).ShowLine = !GetSettings(p.userID).ShowLine; ShowPanel(p); }

        [ConsoleCommand("radar.hitbox")]
        void CmdHitbox(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p == null || !p.IsAdmin) return; GetSettings(p.userID).ShowHitbox = !GetSettings(p.userID).ShowHitbox; ShowPanel(p); }

        [ConsoleCommand("radar.health")]
        void CmdHealth(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p == null || !p.IsAdmin) return; GetSettings(p.userID).ShowHealth = !GetSettings(p.userID).ShowHealth; ShowPanel(p); }

        [ConsoleCommand("radar.sleepers")]
        void CmdSleepers(ConsoleSystem.Arg arg) { var p = arg?.Player(); if (p == null || !p.IsAdmin) return; GetSettings(p.userID).ShowSleepers = !GetSettings(p.userID).ShowSleepers; ShowPanel(p); }

        [ConsoleCommand("radar.dist")]
        void CmdDist(ConsoleSystem.Arg arg)
        {
            var p = arg?.Player();
            if (p == null || !p.IsAdmin) return;
            var s = GetSettings(p.userID);
            var op = arg.GetString(0);
            if (op == "+") s.Distance = Mathf.Min(s.Distance + 50f, 1000f);
            else if (op == "-") s.Distance = Mathf.Max(s.Distance - 50f, 50f);
            ShowPanel(p);
        }

        void StartRadar(BasePlayer player)
        {
            if (!_active.Contains(player.userID)) return;

            timer.Once(RefreshRate, () =>
            {
                if (player == null || !player.IsConnected || !_active.Contains(player.userID)) return;
                DrawRadar(player);
                StartRadar(player);
            });
        }

        string GetClanTagCached(ulong playerId)
        {
            float now = UnityEngine.Time.realtimeSinceStartup;
            if (_clanCache.TryGetValue(playerId, out var cache) && now - cache.Time < ClanCacheTime)
                return cache.Tag;

            string tag = SClan != null ? (string)SClan.Call("GetClanTag", playerId) ?? string.Empty : string.Empty;
            if (cache == null)
            {
                cache = new ClanCache();
                _clanCache[playerId] = cache;
            }
            cache.Tag = tag;
            cache.Time = now;
            return tag;
        }

        void DrawRadar(BasePlayer admin)
        {
            var s = GetSettings(admin.userID);
            float maxDist = s.Distance;
            float maxDistSqr = maxDist * maxDist;
            Vector3 adminPos = admin.eyes.position;
            float duration = RefreshRate + 0.05f;

            _clanGroupsPool.Clear();
            _playersPool.Clear();

            string largestClan = null;
            int largestCount = 0;

            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player == admin || player.IsDead()) continue;
                float distSqr = (adminPos - player.transform.position).sqrMagnitude;
                if (distSqr > maxDistSqr) continue;

                string tag = GetClanTagCached(player.userID);
                _playersPool.Add(new PlayerData { Player = player, Dist = Mathf.Sqrt(distSqr), ClanTag = tag });

                if (!string.IsNullOrEmpty(tag))
                {
                    _clanGroupsPool.TryGetValue(tag, out int count);
                    count++;
                    _clanGroupsPool[tag] = count;
                    if (count > largestCount)
                    {
                        largestCount = count;
                        largestClan = tag;
                    }
                }
            }

            bool hasMultipleClans = _clanGroupsPool.Count > 1;

            for (int i = 0; i < _playersPool.Count; i++)
            {
                var data = _playersPool[i];
                var player = data.Player;
                float dist = data.Dist;
                string clanTag = data.ClanTag;

                Vector3 headPos = player.eyes.position;
                headPos.y += 0.5f;

                if (s.ShowLine)
                    admin.SendConsoleCommand("ddraw.line", duration, Color.yellow, player.eyes.position, player.eyes.position + player.eyes.HeadForward() * 50f);

                Color col = Color.white;
                if (hasMultipleClans && !string.IsNullOrEmpty(clanTag))
                    col = clanTag == largestClan ? ColorBlue : ColorRed;

                string text = "";
                if (s.ShowNickname)
                    text += string.Format("<size=16>{0}</size>\n", player.displayName);
                if (s.ShowHealth)
                {
                    float hp = player.health;
                    float maxHp = player.MaxHealth();
                    string hpColor = hp > maxHp * 0.6f ? "#8BC34A" : hp > maxHp * 0.3f ? "#FFC107" : "#F44336";
                    text += string.Format("<color={0}><size=14>{1:0}/{2:0} HP</size></color>\n", hpColor, hp, maxHp);
                }
                text += string.Format("<size=13>{0:0}m</size>", dist);

                admin.SendConsoleCommand("ddraw.text", duration, col, headPos, text);
                admin.SendConsoleCommand("ddraw.box", duration, col, player.transform.position + Vector3.up * 0.9f, 0.5f);
            }

            if (s.ShowSleepers)
            {
                foreach (var player in BasePlayer.sleepingPlayerList)
                {
                    if (player == null) continue;
                    float distSqr = (adminPos - player.transform.position).sqrMagnitude;
                    if (distSqr > maxDistSqr) continue;

                    string sleepText = s.ShowNickname 
                        ? string.Format("<size=14>{0} [ZZZ]</size>\n<size=12>{1:0}m</size>", player.displayName, Mathf.Sqrt(distSqr))
                        : string.Format("<size=14>[ZZZ]</size>\n<size=12>{0:0}m</size>", Mathf.Sqrt(distSqr));
                    admin.SendConsoleCommand("ddraw.text", duration, Color.gray, player.transform.position + Vector3.up * 0.5f, sleepText);
                }
            }

            if (s.ShowHitbox && _hitMarkers.TryGetValue(admin.userID, out var markers))
            {
                foreach (var pos in markers)
                    admin.SendConsoleCommand("ddraw.sphere", RefreshRate + 0.02f, Color.red, pos, 0.1f);
            }
        }

        void OnPlayerAttack(BasePlayer attacker, HitInfo info)
        {
            if (attacker == null || info?.HitEntity == null) return;
            if (!(info.HitEntity is BasePlayer victim) || victim == attacker) return;

            int boneType = GetBoneType(info.boneName);
            RecordHit(attacker, boneType);

            foreach (var admin in BasePlayer.activePlayerList)
            {
                if (!admin.IsAdmin || !_active.Contains(admin.userID)) continue;
                var s = GetSettings(admin.userID);
                if (!s.ShowHitbox) continue;

                float maxDistSqr = s.Distance * s.Distance;
                if ((admin.transform.position - info.HitPositionWorld).sqrMagnitude > maxDistSqr) continue;

                if (!_hitMarkers.TryGetValue(admin.userID, out var markers))
                {
                    markers = new List<Vector3>();
                    _hitMarkers[admin.userID] = markers;
                }

                markers.Add(info.HitPositionWorld);

                var hitPos = info.HitPositionWorld;
                timer.Once(5f, () =>
                {
                    if (_hitMarkers.TryGetValue(admin.userID, out var m))
                        m.Remove(hitPos);
                });

                admin.SendConsoleCommand("ddraw.sphere", 5f, Color.red, info.HitPositionWorld, 0.1f);
                admin.SendConsoleCommand("ddraw.text", 5f, Color.red, info.HitPositionWorld + Vector3.up * 0.15f, string.Format("<size=12>{0}</size>", GetBoneNameFromType(boneType)));
            }
        }

        void RecordHit(BasePlayer attacker, int boneType)
        {
            string nowUtc = DateTime.UtcNow.ToString("o");
            if (!_hitStats.TryGetValue(attacker.userID, out var stats))
            {
                stats = new HitStatsData();
                stats.FirstHitTime = nowUtc;
                _hitStats[attacker.userID] = stats;
            }
            stats.Name = attacker.displayName;
            stats.LastUpdateTime = nowUtc;
            stats.Total++;

            switch (boneType)
            {
                case 0: stats.Head++; break;
                case 1: stats.Neck++; break;
                case 2: stats.Chest++; break;
                case 3: stats.Spine++; break;
                case 4: stats.Pelvis++; break;
                case 5: stats.LeftArm++; break;
                case 6: stats.RightArm++; break;
                case 7: stats.LeftHand++; break;
                case 8: stats.RightHand++; break;
                case 9: stats.LeftLeg++; break;
                case 10: stats.RightLeg++; break;
                case 11: stats.LeftFoot++; break;
                case 12: stats.RightFoot++; break;
                default: stats.Body++; break;
            }
            _dirty = true;
        }

        int GetBoneType(string bone)
        {
            if (string.IsNullOrEmpty(bone)) return 13;
            bone = bone.ToLower();
            if (bone.Contains("head")) return 0;
            if (bone.Contains("neck")) return 1;
            if (bone.Contains("chest")) return 2;
            if (bone.Contains("spine")) return 3;
            if (bone.Contains("pelvis") || bone.Contains("hip")) return 4;
            bool isLeft = bone.Contains("l_") || bone.Contains("left");
            if (bone.Contains("hand") || bone.Contains("finger")) return isLeft ? 7 : 8;
            if (bone.Contains("arm") || bone.Contains("shoulder") || bone.Contains("clavicle")) return isLeft ? 5 : 6;
            if (bone.Contains("foot") || bone.Contains("toe")) return isLeft ? 11 : 12;
            if (bone.Contains("leg") || bone.Contains("knee") || bone.Contains("thigh") || bone.Contains("calf")) return isLeft ? 9 : 10;
            return 13;
        }

        string GetBoneNameFromType(int type)
        {
            switch (type)
            {
                case 0: return "ГОЛОВА";
                case 1: return "ШЕЯ";
                case 2: return "ГРУДЬ";
                case 3: return "ПОЗВОНОЧНИК";
                case 4: return "ТАЗ";
                case 5: return "Л.РУКА";
                case 6: return "П.РУКА";
                case 7: return "Л.КИСТЬ";
                case 8: return "П.КИСТЬ";
                case 9: return "Л.НОГА";
                case 10: return "П.НОГА";
                case 11: return "Л.СТУПНЯ";
                case 12: return "П.СТУПНЯ";
                default: return "ТЕЛО";
            }
        }
    }
}
