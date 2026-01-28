# HitStats API Documentation

API для получения и обновления статистики попаданий игроков.

## Base URL
```
http://your-server:3000/api/hitstats
```

---

## Endpoints

### 1. Добавить одно попадание
**POST** `/api/hitstats/hit`

Используйте этот endpoint когда игрок попал по другому игроку.

**Request Body:**
```json
{
    "steamId": "76561199203698166",
    "name": "PlayerName",
    "bodyPart": "Head"
}
```

**Допустимые bodyPart:**
- `Head` - Голова
- `Neck` - Шея
- `Chest` - Грудь
- `Spine` - Позвоночник
- `Pelvis` - Таз
- `LeftArm` / `RightArm` - Руки
- `LeftHand` / `RightHand` - Кисти
- `LeftLeg` / `RightLeg` - Ноги
- `LeftFoot` / `RightFoot` - Ступни
- `Body` - Другое

**Response:**
```json
{
    "success": true,
    "steamId": "76561199203698166",
    "bodyPart": "Head",
    "newValue": 15,
    "total": 100
}
```

---

### 2. Обновить статистику игрока
**POST** `/api/hitstats/update`

Полное обновление статистики одного игрока.

**Request Body:**
```json
{
    "steamId": "76561199203698166",
    "name": "PlayerName",
    "hitData": {
        "Head": 14,
        "Neck": 5,
        "Chest": 10,
        "Spine": 3,
        "Pelvis": 8,
        "LeftArm": 12,
        "RightArm": 15,
        "LeftHand": 6,
        "RightHand": 10,
        "LeftLeg": 4,
        "RightLeg": 2,
        "LeftFoot": 1,
        "RightFoot": 2,
        "Body": 3
    }
}
```

**Response:**
```json
{
    "success": true,
    "player": {
        "Name": "PlayerName",
        "Head": 14,
        "Total": 95
    }
}
```

---

### 3. Массовая синхронизация (Bulk)
**POST** `/api/hitstats/bulk`

Полная замена всех данных статистики. Используйте для синхронизации с плагином.

**Request Body:**
```json
{
    "players": {
        "76561199203698166": {
            "Name": "Player1",
            "Head": 14,
            "Neck": 5,
            "Chest": 10,
            "Total": 95
        },
        "76561198123456789": {
            "Name": "Player2",
            "Head": 20,
            "Total": 150
        }
    }
}
```

**Response:**
```json
{
    "success": true,
    "playersCount": 2
}
```

---

### 4. Получить всю статистику
**GET** `/api/hitstats`

**Response:**
```json
{
    "76561199203698166": {
        "Name": "Player1",
        "Head": 14,
        "Neck": 5,
        "Total": 95
    }
}
```

---

### 5. Получить статистику игрока
**GET** `/api/hitstats/player/:steamId`

**Example:** `GET /api/hitstats/player/76561199203698166`

**Response:**
```json
{
    "steamId": "76561199203698166",
    "Name": "Player1",
    "Head": 14,
    "Neck": 5,
    "Total": 95
}
```

---

### 6. Удалить игрока
**DELETE** `/api/hitstats/player/:steamId`

**Example:** `DELETE /api/hitstats/player/76561199203698166`

**Response:**
```json
{
    "success": true,
    "message": "Player 76561199203698166 deleted"
}
```

---

### 7. Очистить всю статистику
**DELETE** `/api/hitstats/clear`

**Response:**
```json
{
    "success": true,
    "message": "All stats cleared"
}
```

---

## Пример использования в Rust плагине (C#)

```csharp
using Oxide.Core.Libraries;
using Newtonsoft.Json;

// При попадании по игроку
void OnPlayerAttack(BasePlayer attacker, HitInfo info)
{
    if (attacker == null || info?.HitBone == null) return;
    
    string bodyPart = GetBodyPartName(info.HitBone);
    
    var data = new Dictionary<string, object>
    {
        ["steamId"] = attacker.UserIDString,
        ["name"] = attacker.displayName,
        ["bodyPart"] = bodyPart
    };
    
    webrequest.Enqueue(
        "http://your-server:3000/api/hitstats/hit",
        JsonConvert.SerializeObject(data),
        (code, response) => {
            if (code != 200) Puts($"HitStats Error: {response}");
        },
        this,
        RequestMethod.POST,
        new Dictionary<string, string> { ["Content-Type"] = "application/json" }
    );
}

string GetBodyPartName(uint boneId)
{
    // Маппинг костей Rust на части тела
    switch (boneId)
    {
        case 698017942: return "Head";
        case 2412236376: return "Neck";
        case 3771609363: return "Chest";
        case 827230707: return "Spine";
        case 2306822461: return "Pelvis";
        // ... добавьте остальные кости
        default: return "Body";
    }
}
```

---

## Web Pages

- **Список всех игроков:** `http://your-server:3000/stats`
- **Статистика игрока:** `http://your-server:3000/stats/{steamId}`
