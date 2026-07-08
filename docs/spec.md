
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

### 2. サーバー参加日時チェック

Discord APIで `/guilds/{guild_id}/members/{user_id}` を取得する。
`joined_at` から現在時刻を引いた日数が3日未満の場合、ephemeralでエラーメッセージを返して処理を終了する。

```
エラーメッセージ: "投稿にはサーバー参加から3日以上経過している必要があります。"
```

### 3. Google Maps URLのパース

以下の形式に対応する。

**短縮URL** (`maps.app.goo.gl`):
- HEADリクエストでリダイレクト先を取得してから以下のパターンで処理する。

**座標埋め込み形式**:
```
https://www.google.com/maps/place/.../@{lat},{lng},{zoom}z/...
```
`@` 以降の最初の2つの数値を lat, lng として取得する。

**クエリ形式**:
```
https://maps.google.com/?q={lat},{lng}
```
`q` パラメータをパースする。

パース失敗時はephemeralでエラーメッセージを返す。
```
エラーメッセージ: "Google Maps URLから座標を取得できませんでした。場所のURLを確認してください。"
```

### 4. 画像の処理

添付ファイルがある場合:

1. `attachment.url` からDiscord CDNをfetchする。
2. JSRの `@matmen/imagescript` を使って以下を処理する。
   - 縦が720pxを超える場合は縦720pxにリサイズする (アスペクト比維持)
   - `encodeJPEG(80)` でJPEG・品質80%に変換する
   - JPEG再エンコードによりEXIFは除去される
3. ファイル名: `{uuid}.jpg`

```ts
// https://raw.githubusercontent.com/matmen/ImageScript/master/ImageScript.js
import { Image } from "jsr:@matmen/imagescript";

const bytes = new Uint8Array(await response.arrayBuffer());
const image = await Image.decode(bytes);

if (image.height > 720) {
  image.resize(Image.RESIZE_AUTO, 720);
}

const result = await image.encodeJPEG(80);
```

### 5. GitHub PRの作成

GitHub REST APIを使用する。認証にはGitHub Appsを使う。

#### GitHub Apps 認証フロー

1. APP_IDとPrivate KeyからJWTを生成する (有効期限10分、RS256署名)
   - Web Crypto API (`crypto.subtle`) でRS256署名が可能
2. JWTを使ってInstallation Tokenを取得する
   `POST /app/installations/{installation_id}/access_tokens`
3. 取得したInstallation Token (有効期限1時間) でREST APIを叩く

#### PR作成手順

**ブランチ名**: `add-spot/{uuid}`

1. `GET /repos/{owner}/{repo}/git/ref/heads/main` でmainのSHAを取得
2. `POST /repos/{owner}/{repo}/git/refs` でブランチを作成
3. 既存の `{series}.geojson` を取得してfeatureを追記
4. 画像がある場合は `images/{uuid}.jpg` をbase64でアップロード
5. `POST /repos/{owner}/{repo}/pulls` でPRを作成

**PRタイトル**: `[{series}] {description の先頭30文字}`

**PR本文**:
```
## 投稿情報

- シリーズ: {series_name}
- エピソード: {episode または "未指定"}
- 座標: {lat}, {lng}
- 投稿者: {discord_username} ({discord_user_id})
- 投稿日時: {ISO8601}

## 説明

{description}
```

### 6. ユーザーへの応答

PR作成成功時はephemeralで以下を返す。
```
投稿を受け付けました。レビュー後にマップへ反映されます。
PR: {pr_url}
```

---

## 環境変数

| 変数名 | 説明 |
|---|---|
| DISCORD_PUBLIC_KEY | Discord Application Public Key |
| DISCORD_BOT_TOKEN | Discord Bot Token |
| DISCORD_GUILD_ID | 対象のDiscordサーバーID |
| GITHUB_APP_ID | GitHub App ID |
| GITHUB_APP_PRIVATE_KEY | GitHub App Private Key (PEM形式) |
| GITHUB_INSTALLATION_ID | GitHub App Installation ID |
| GITHUB_OWNER | リポジトリオーナー |
| GITHUB_REPO | リポジトリ名 |

環境変数の管理には、Deno Deployのシークレット管理機能を用いる。

