# 聖地巡礼マップ

Discord のスラッシュコマンドから聖地情報を投稿し、GitHub PR を経てマップへ反映するシステムです。

```
Discord /spot コマンド
  -> Cloudflare Workers (署名検証 / 座標パース / 画像圧縮)
  -> GitHub PR (レビュー待ち)
  -> マージ後にマップ反映
```

## 前提条件

- Discord Application (Bot) が作成済みであること
- GitHub App が作成済みであること

## セットアップ

### 1. リポジトリのクローン

```sh
git clone https://github.com/lovelive-academy/seichi-data.git
cd seichi-data
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定してください。

```sh
cp .env.example .env
```

| 変数名 | 説明 | 取得場所 |
|---|---|---|
| `DISCORD_APPLICATION_ID` | Discord Application の ID | Discord 開発者ポータル > General Information |
| `DISCORD_PUBLIC_KEY` | Discord Application の Public Key | Discord 開発者ポータル > General Information |
| `DISCORD_BOT_TOKEN` | Discord Bot のトークン | Discord 開発者ポータル > Bot |
| `DISCORD_GUILD_ID` | 対象の Discord サーバー ID | サーバーを右クリック > ID をコピー (開発者モード要) |
| `GITHUB_APP_ID` | GitHub App の ID | GitHub > Settings > Developer settings > GitHub Apps |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App の秘密鍵 | GitHub App の設定画面で生成 |
| `GITHUB_INSTALLATION_ID` | GitHub App のインストール ID | リポジトリへのインストール後、URL から取得 |
| `GITHUB_REPO_OWNER` | PR を作成するリポジトリのオーナー名 | GitHub リポジトリの URL から取得 |
| `GITHUB_REPO_NAME` | PR を作成するリポジトリ名 | GitHub リポジトリの URL から取得 |

秘密鍵の登録方法

```bash
cat private-key.pem | wrangler secret put GITHUB_APP_PRIVATE_KEY
```

### 3. Discord Bot の設定

Discord 開発者ポータルの Bot 設定で、以下の Privileged Gateway Intents を有効にしてください。

- Server Members Intent

### 4. スラッシュコマンドの登録

以下のコマンドを実行すると、`DISCORD_GUILD_ID` で指定したサーバーに `/spot` コマンドが即時登録されます。

```sh
deno task register
```

### 5. 開発サーバーの起動

```sh
deno i
deno task build
deno task dev
```

## Workers Builds へのデプロイ

### 1. Workers プロジェクトの作成と GitHub 連携

1. Workers & Pages > Create application > Workers を選択
2. "Connect to Git" を選択し、このリポジトリを連携
3. ビルド設定は自動検出されます (`wrangler.jsonc` が使用されます)

### 2. 環境変数の設定

Cloudflare Dashboard の Workers プロジェクト設定 > Settings > Variables and Secrets から、`.env` に記載した全ての環境変数を設定してください。

### 3. Interactions Endpoint URL の設定

デプロイ後に発行される URL (`https://<project>.<subdomain>.workers.dev`) を Discord 開発者ポータルの以下の項目に設定してください。

- General Information > Interactions Endpoint URL: `https://<project>.<subdomain>.workers.dev/interactions`

## タスク一覧

```sh
# 開発サーバー起動 (ファイル変更で自動再起動)
deno task dev

# スラッシュコマンドをギルドに登録
deno task register

# Biome でコードをチェック
deno task check

# Biome で自動修正 (unsafe を含む)
deno task check:unsafe
```
