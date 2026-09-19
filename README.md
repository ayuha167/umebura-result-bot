# ウメブラ結果画像Bot（順位テキスト版）

Discordの `/result account:<選手名またはstart.ggプロフィールURL>` に対し、
ウメブラSP12 Singlesの最終順位を文字と画像で返します。
画像は `assets/result-images` からランダムに背景を選び、
画像がない場合は `assets/YourResults01.png` を背景に、
`I got Nth place` を中央に合成した1920 x 1080 pxのPNGです。
初回起動時だけstart.gg APIから全参加者を取得し、
`data/standings.json` へ保存します。

## セットアップ

```bash
cp .env.example .env
npm install
npm test
npm run register
npm start
```

保存後の `/result` はstart.gg APIにアクセスしません。
大会進行中などで順位ファイルを取り直す場合は、Botを停止して次を実行します。

```bash
npm run refresh-standings
```

`.env` の `STARTGG_EVENT_SLUG` を別の大会イベントに変更すると、
次回起動時に新しい順位へ自動更新します。

任意の順位の画像だけをプレビューする場合：

```bash
npm run preview-result -- 13
```

`.env`には次の2つの秘密情報を入力します。

- `DISCORD_BOT_TOKEN`: Discord Developer Portalの「Bot」ページで発行
- `STARTGG_TOKEN`: start.ggのDeveloper Settingsで発行

`.env`は`.gitignore`対象です。Tokenをチャットへ貼ったりGitへコミットしたり
しないでください。

背景画像を追加する場合は `assets/result-images` に配置してください。

## Discordでの使い方

```text
/result account:選手名
```

または、同名選手を区別したい場合：

```text
/result account:https://www.start.gg/user/xxxxxxxx
```

返信はコマンドを実行したチャンネルへ公開され、チャンネルを見られる全員に表示されます。

## AI質問機能

OpenAI PlatformでAPIキーを発行し、`.env`に設定します。

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6-luna
```

APIキーはDiscordやGitHubへ貼らないでください。
ChatGPTの有料プランとOpenAI APIの利用料は別です。

```text
/ask question:質問内容
```

初期状態では1人1日5回までです。「サーバーを管理」権限のある
運営メンバーは次を使用できます。

```text
/ask-settings status
/ask-settings enabled value:true
/ask-settings channel target:#質問チャンネル
/ask-settings channel
/ask-settings limit count:10
```

`/ask-settings channel` でチャンネルを省略すると、チャンネル制限を解除します。
