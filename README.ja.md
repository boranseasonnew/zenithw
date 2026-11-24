<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  メディアを保存。使い方はシンプル。<br>
  <a href="https://zenithw.space">Web アプリ</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.2"></a>
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

- **新しい[画像変換ツール](https://zenithw.space/ja/image-convert)：**JPEG、PNG、WebP、AVIF、TIFF、BMP、TGA、QOIなど、さまざまな形式間で変換できます。ローカル処理エンジンはさらに多くの形式に対応しています。
- **画像サイズを細かく調整：**幅と高さを自由に入力し、結果をプレビューして出力サイズを指定できます。
- **デザインを刷新した[音声分離ツール](https://zenithw.space/ja/audio-separator)：**新しいスタジオ画面で、ファイル選択、ボーカルと伴奏の操作、プレビュー、書き出しが分かりやすくなりました。
- **8言語に対応：**画像変換ツールの画面とアクセシビリティ用ラベルを、サイトの8言語すべてに対応させました。画像変換とサイズ変更はブラウザ内で処理されます。
- 互換性のあるMKV/MP4ストリームを再エンコードせずにコンテナ変換するリマックスなど、既存のメディアツールも引き続き利用できます。

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
