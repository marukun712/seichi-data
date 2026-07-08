
# 聖地巡礼マップ 仕様書 (プロトタイプ)

## スコープ

Discord スラッシュコマンドから投稿を受け付け、GitHub PRを作成するまでのフロー。
インデクサー・ビューワーは対象外。

---

## 使用ライブラリ

| 用途 | ライブラリ | 種別 |
|---|---|---|
| Discord 署名検証・型定義 | `discord-interactions` | Discord公式 npm |
| GitHub API操作 | `octokit` | GitHub公式 npm |
| 画像処理 | `@matmen/imagescript` | JSR |

import mapは `deno.json` で管理する。

```json
{
  "imports": {
    "discord-interactions": "npm:discord-interactions",
    "octokit": "npm:octokit",
    "imagescript": "jsr:@matmen/imagescript"
  }
}
```

---

## リポジトリ構成

```
impl...
public/
  series.json          # seriesのenum定義
  lovelive.geojson
  sunshine.geojson
  nijigasaki.geojson
  superstar.geojson
  hasunosora.geojson
  musical.geojson
  ikizulive.geojson
  ...
  images/
    {uuid}.jpg
```

---

## GeoJSONフォーマット

各シリーズファイルはGeoJSONのFeatureCollectionとする。

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [139.7454, 35.6585]
      },
      "properties": {
        "episode": "1期3話",
        "description": "虹ヶ咲学園の正門前",
        "image": "images/550e8400-e29b-41d4-a716-446655440000.jpg"
      }
    }
  ]
}
```

**フィールド定義**:

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| geometry.coordinates | [lng, lat] | yes | 経度・緯度の順 (GeoJSON仕様) |
| properties.episode | string | no | 自由文字列。例: "1期3話", "劇場版" |
| properties.description | string | yes | 場所の説明 |
| properties.image | string | no | `images/{uuid}.jpg` 形式のパス |

seriesはファイル名から判別するため、propertiesには含めない。

---

## series.json

```json
{
  "series": [
    { "id": "lovelive", "name": "ラブライブ！" },
    { "id": "sunshine", "name": "ラブライブ！サンシャイン!!" },
    { "id": "nijigasaki", "name": "ラブライブ！虹ヶ咲学園スクールアイドル同好会" },
    { "id": "superstar", "name": "ラブライブ！スーパースター!!" },
    { "id": "hasunosora", "name": "ラブライブ！蓮ノ空女学院スクールアイドルクラブ" },
    { "id": "musical", "name": "スクールアイドルミュージカル" },
    { "id": "ikizulive", "name": "イキヅライブ！LOVELIVE! BLUEBIRD" }
  ]
}
```

---

## Discord スラッシュコマンド

**コマンド名**: `/spot`

**オプション**:

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| series | STRING (choices) | yes | series.jsonのidから生成 |
| description | STRING | yes | 場所の説明 |
| maps_url | STRING | yes | Google Maps URL |
| episode | STRING | no | 例: "1期3話" |
| image | ATTACHMENT | no | 現地の写真 |

---

## Deno Deploy

### エンドポイント

`POST /interactions`

Discord Interactions Endpointとして機能する。

### 処理フロー

```
1. Discord署名の検証 (X-Signature-Ed25519, X-Signature-Timestamp)
2. interaction typeの確認
   - PING (type 1) → PONGを返す
   - APPLICATION_COMMAND (type 2) → 以下を処理
3. サーバー参加日時チェック
4. Google Maps URLのパース → 緯度経度取得
5. 画像の処理 (添付がある場合)
6. GitHub PRの作成
7. ユーザーへの応答
```

### 1. Discord署名の検証

`discord-interactions` の `verifyKey` を使用する。
検証失敗時は401を返す。

```ts
// https://github.com/discord/discord-interactions-js
import { verifyKey } from "discord-interactions";

const signature = req.headers.get("X-Signature-Ed25519") ?? "";
const timestamp = req.headers.get("X-Signature-Timestamp") ?? "";
const rawBody = await req.text();

const isValid = await verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
if (!isValid) return new Response(null, { status: 401 });
```

### 2. サー
