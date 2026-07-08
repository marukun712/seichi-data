# 聖地巡礼マップ

Discord のスラッシュコマンドから聖地情報を投稿し、GitHub PR を経てマップへ反映するシステムです。

```
Discord /spot コマンド
  -> Deno Deploy (署名検証 / 座標パース / 画像圧縮)
  -> GitHub PR (レビュー待ち)
  -> マージ後にマップ反映
```

## 前提条件

- [Deno](https://deno.land/) がインストールされていること
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
| `GITHUB_APP_PRIVATE_KEY` | GitHub App の秘密鍵 (PEM 形式) | GitHub App の設定画面で生成 |
| `GITHUB_INSTALLATION_ID` | GitHub App のインストール ID | リポジトリへのインストール後、URL から取得 |
| `GITHUB_REPO_OWNER` | PR を作成するリポジトリのオーナー名 | GitHub リポジトリの URL から取得 |
| `GITHUB_REPO_NAME` | PR を作成するリポジトリ名 | GitHub リポジトリの URL から取得 |

`GITHUB_APP_PRIVATE_KEY` は複数行の PEM ファイルです。`.env` に設定する際は改行を `\n` に置き換えてください。

```sh
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private-key.pem
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
deno task dev
```

サーバーが起動したら、[ngrok](https://ngrok.com/) などを使用してローカルサーバーを公開し、Discord 開発者ポータルの Interactions Endpoint URL に設定してください。

```sh
ngrok http 8000
```

## Deno Deploy へのデプロイ

### 1. プロジェクトの作成

[Deno Deploy](https://deno.com/deploy) でプロジェクトを作成し、このリポジトリと連携してください。エントリポイントは `main.ts` を指定します。

### 2. 環境変数の設定

Deno Deploy のプロジェクト設定から、`.env` に記載した全ての環境変数を設定してください。

### 3. Interactions Endpoint URL の設定

デプロイ後に発行される URL (`https://<project>.deno.dev`) を Discord 開発者ポータルの以下の項目に設定してください。

- General Information > Interactions Endpoint URL: `https://<project>.deno.dev/interactions`

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
