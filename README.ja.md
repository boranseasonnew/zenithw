<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  メディアを保存。使い方はシンプル。<br>
  <a href="https://zenithw.space">Web アプリ</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=electron&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>ダウンロード数はGitHubの全リリース添付ファイルの累計で、利用者数やMicrosoft Storeのインストール数ではありません。</sub></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v4.2.0 · Android v3.1.1

[Zenith Type](https://zenithw.space/typing) ではタイピング練習と対戦ができます。ランク戦は最大50,000 Eloに対応し、双方の同意による再戦と、相手ごとの勝敗を確認できる対戦履歴を備えています。オンライン対戦にはアカウントが必要です。ルールと公開状況は[ドキュメント](docs/TYPING.md)を参照してください。 WPMランキングとランク戦Eloは30日ごとにリセットされ、シーズンの残り時間が表示されます。 プライベートルームのホストは試合開始前に設定を変更できます。所有者限定の正しいキー入力支援はプレイ中にも切り替えられます。プライベート対戦にはプロフィールに表示される独立した永続Eloがあり、シーズンでリセットされず、ランキングには影響しません。

ZenithW は、動画・音声のダウンロード、音声抽出、変換、リマックスができるオープンソースのメディアツールです。広告やサブスクリプションはなく、アカウント登録も不要です。

対応するリンクを貼り付け、形式を選んでダウンロードします。利用できる形式は配信元によって異なります。

## Web 17.0の変更点

- [音声分離](https://zenithw.space/audio-separator)の反応を改善。波形処理の分割、必要時の再生メモリ確保、キャンセル可能なWAV／ZIP書き出しに対応。MP3とFLACも利用できます。
- [リマックス](https://zenithw.space/remux)で開始前に出力形式を選択。対応するストリームではMKV ↔ MP4を利用でき、非対応コーデックは変換が必要です。
- 8言語でメディアツールの説明と検索向け情報を充実し、画面移動のリンクを修正しました。
- 依存関係のセキュリティ更新、サムネイル取得の総時間制限、Typeアバター同時変更への対策。サーバーとアプリには個別の配備が必要です。

音声分離は端末内で動作し、96 MiBまでのファイルと最長4分の区間に対応します。初回はモデルなどをダウンロードし、速度は端末に依存します。WindowsとAndroidのバージョン番号はそれぞれ維持されます。

[更新情報](https://zenithw.space/updates) · [セキュリティ・検証レポート（英語）](docs/full-code-audit-2026-11-02.md)

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
