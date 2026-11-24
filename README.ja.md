<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  メディアを保存。使い方はシンプル。<br>
  <a href="https://zenithw.space">Web アプリ</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ ZenithW が生まれた理由（英語）</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

[Zenith Type](https://zenithw.space/typing) ではタイピング練習と対戦ができます。ランク戦は最大50,000 Eloに対応し、双方の同意による再戦と、相手ごとの勝敗を確認できる対戦履歴を備えています。オンライン対戦にはアカウントが必要です。ルールと公開状況は[ドキュメント](docs/TYPING.md)を参照してください。 WPMランキングとランク戦Eloは30日ごとにリセットされ、シーズンの残り時間が表示されます。 プライベートルームのホストは試合開始前に設定を変更できます。所有者限定の正しいキー入力支援はプレイ中にも切り替えられます。プライベート対戦にはプロフィールに表示される独立した永続Eloがあり、シーズンでリセットされず、ランキングには影響しません。

ZenithW は、動画・音声のダウンロード、音声抽出、変換、リマックスができるオープンソースのメディアツールです。広告やサブスクリプションはなく、アカウント登録も不要です。

対応するリンクを貼り付け、形式を選んでダウンロードします。利用できる形式は配信元によって異なります。

## ZenithW が生まれた理由

必須アカウント、サブスクリプション、広告なしでメディアをダウンロード・処理できるオープンソースのワークスペースです。

## 機能

- 対応ソースからシンプルなリンク操作でメディアをダウンロード。
- メディアから音声を抽出して処理。
- 形式を変換し、対応するMKV/MP4ストリームを再エンコードせずにリマックス。
- 画像をブラウザ内でローカル変換・リサイズ。
- Audio Separatorでボーカルと伴奏を分離。

## クイックスタート

リポジトリをクローンし、プロジェクトディレクトリに移動します。

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

`.env.example` を `.env` にコピーし、`SECRET_KEY` を強力なランダム値に設定します。

```bash
docker compose up -d --build
```

ブラウザで `http://localhost:8080` を開きます：

## Web 17.2の新機能

- **公開Web版でVimeoを無効化：**一部のVimeoリンクではCookieが必要で、yt-dlpとの互換性も安定しないため、Web版の対応を終了しました。
- **翻訳を修正：**AVIなどの形式名やRumbleなどのプラットフォーム名が誤って翻訳されなくなりました。
- **設定リンクを修正：**ダウンロードパネルのリンクから「外観」タブではなく、該当する動画設定を直接開けるようになりました。
- **SEOメタデータを各言語に対応：**ページタイトルと共有プレビューに、それぞれのサイト言語が正しく反映されます。
- **アプリ紹介ポップアップを削除：**リンク入力中に表示されなくなりました。

WindowsとAndroidはそれぞれ独自のバージョン番号を維持します。この番号はWeb版のバージョンです。
## プロジェクト

- [Web インターフェース](frontend/) と [API](backend/)
- [Windows アプリ](desktop/) · [Android ソースコード](https://github.com/boranseasonnew/zenithw-android)

## ドキュメント

- [使い方と制限（英語）](docs/USAGE.md)
- [セルフホストと開発（英語）](docs/SELF_HOSTING.md)
- [端末内でのメディア処理（英語）](docs/LOCAL_MEDIA.md)
- [サービスの状況](https://zenithw.space/status) · [更新情報](https://zenithw.space/updates)

公開 Web サービスでは YouTube のダウンロードを無効にしています。Windows、Android、セルフホスト版はそれぞれのネットワーク接続を使いますが、配信元の制限は引き続き適用されます。

## 責任ある利用

自分が所有するコンテンツ、または利用を許可されたコンテンツだけをダウンロードしてください。配信元の利用規約と著作権を尊重してください。ZenithW は対応プラットフォームと提携していません。

Web 版の履歴はブラウザ内に保存され、サーバー上で準備されたファイルは期限切れになると削除されます。永続的なクラウドストレージではありません。

## 貢献

不具合報告、翻訳、プルリクエストを歓迎します。[貢献ガイド](CONTRIBUTING.md)をご覧いただくか、[Issue](https://github.com/boranseasonnew/zenithw/issues)を作成してください。

## 謝辞

yt-dlp、FFmpeg、Mediabunny などのオープンソースプロジェクトを使用しています。各プロジェクトの開発者と ZenithW の貢献者の皆さんに感謝します。

## ライセンス

[AGPL-3.0-only](LICENSE)。サードパーティの各コンポーネントにはそれぞれのライセンスが適用されます。[ライセンス情報](THIRD_PARTY_NOTICES.md)をご覧ください。
