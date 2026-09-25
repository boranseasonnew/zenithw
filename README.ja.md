# ZenithW

> 利用する権利のあるコンテンツをダウンロード、変換、リマックスするための、広告のないシンプルなメディアワークスペースです。✨

[Web アプリ](https://zenithw.space) · [ステータス](https://zenithw.space/status) · [更新情報](https://zenithw.space/updates) · [English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

現在のリリース: **v14.4**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ ZenithW を選ぶ理由

ZenithW はメディア操作を意図的にシンプルに保ちます。対応リンクを貼り付け、配信元が実際に提供している内容を確認し、出力を選択して、準備されたファイルを保存します。

アカウント、ブラウザ拡張、ペイウォール、サブスクリプション、広告レイヤーは必要ありません。

実用的なメディアツール、分かりやすい操作、そして明確な制限だけを提供します。

- ダウンロード、音声抽出、変換、リマックスを行う **1 つのワークスペース**
- **プライバシー重視:** 履歴はブラウザ内に保持され、準備済みファイルは自動的に期限切れになります
- **正直な設定:** プロファイルは優先設定であり、すべての配信元ですべての形式が利用できることを保証するものではありません
- **広告なし:** ZenithW はダウンロード処理に広告を挿入しません
- **セルフホスト対応:** Docker Compose を使って、自分の PC やサーバー上で UI と API を実行できます 🐳

## 主な機能

ZenithW は、対応している yt-dlp 互換メディアソースで動作します。

公開サービスでは現在、次のようなプラットフォームをサポートしています。

- TikTok
- Instagram
- X
- Reddit
- その他、現在の yt-dlp 統合で対応している互換ソース

ZenithW では次のことができます。

- 動画と音声のダウンロード
- メディアからの音声抽出
- 対応している場合の無音動画ダウンロード
- プレイリストや少数のリンクをまとめて処理
- FFmpeg による変換
- 不要な再エンコードを行わずに互換ストリームをリマックス
- 字幕のダウンロード
- 対応メタデータの保持
- サムネイルのダウンロードと埋め込み
- 利用可能な場合の SponsorBlock
- 実行中ジョブのキャンセル
- リアルタイム進捗表示
- サーバーアカウントを必要とせず、履歴をブラウザ内に保存

> **YouTube に関する注意:** ホスティング環境やデータセンター経由の Web リクエストに影響する上流側のアクセス制限により、公開 ZenithW サービスでは現在 YouTube ダウンロードを無効化しています。詳しくは **YouTube の利用可否** を参照してください。

ZenithW の流れはシンプルです。

1. 対応リンクを貼り付けます。
2. メディア情報と利用可能な形式を確認します。
3. 出力設定を選びます。
4. ジョブを開始します。
5. 準備されたファイルをブラウザから直接ダウンロードします。

Web 版ではアカウント、ブラウザ拡張、デスクトップクライアントは不要です。

## ダウンロード設定

メイン画面では次の設定を利用できます。

- 自動形式選択
- 動画ダウンロード
- 音声抽出
- 無音動画
- プレイリスト処理
- 少数リンクの一括処理
- 解像度
- コンテナ
- コーデック優先設定
- 音声ビットレート
- 字幕
- メタデータ埋め込み
- サムネイル
- ファイル名テンプレート
- SponsorBlock 設定

利用可能な設定は、配信元が実際に提供している内容によって異なります。

ZenithW は存在しない形式を利用可能であるかのように表示しません。

### ダウンロードプロファイル

ZenithW には 3 つの実用的なプロファイルがあります。

#### Minimal

小さいファイル、速い転送、幅広い互換性、少ないストレージ使用量を優先します。

#### Standard

品質と互換性のバランスを取ることを目的としています。

一般的な目標:

- 1080p
- H.264
- MP4
- 192 kbps 音声

実際の出力は配信元のストリームに依存します。

#### Quality

利用可能な場合は高品質ストリームを優先します。

候補:

- 高解像度
- AV1
- WebM
- Opus 音声

プロファイルはあくまで優先設定であり、保証ではありません。

実際に利用できるストリームは各プラットフォーム側によって決まります。

## メディアツール

ZenithW にはリンクダウンロード以外にローカルファイル向けのツールもあります。

### Convert

Convert はローカルファイルをアップロードし、FFmpeg で指定した形式へ変換します。

次のような用途に便利です。

- 別のコンテナが必要な場合
- 別の音声形式が必要な場合
- 端末互換性を高めたい場合
- よりシンプルな出力形式が必要な場合

### Remux

Remux は互換性のある音声・映像ストリームを再エンコードせず別のコンテナへコピーします。

完全な変換より大幅に速い場合があり、不要な品質低下も避けられます。

ただし、ソースストリームと対象コンテナが互換である必要があります。

Convert と Remux は:

- 進捗を表示します
- 一時的な準備済みファイルを返します
- 永続的なクラウドストレージとしては機能しません
- サーバー側のサイズ・処理制限があります

## 端末上での処理 · Beta

Convert と Remux には実験的な端末内処理モードがあります。

- **Server**
- **Prefer this device**
- **Only this device**

端末内 Beta では、互換性のあるストリームを再エンコードせずコピーしたり、互換音声をローカルで抽出したりできます。

### Server

ZenithW バックエンドで処理します。

これが既定値です。

### Prefer this device

まず現在の端末上で処理を試みます。

失敗した場合、サーバーへアップロードする前に明示的な確認を求めます。

### Only this device

ファイルは ZenithW サーバーへ送信されません。

端末で処理できない場合、ジョブはローカルで失敗します。

### 現在の制限

- デスクトップ: 最大 **64 MiB**
- モバイル / 低メモリ端末: 最大 **24 MiB**
- 最大メディア長: **30 分**

現在の Beta では次の内容は保持されません。

- 字幕
- チャプター
- 添付データ

リンクからのダウンロードは引き続きバックエンドを利用します。

参照:

[ローカルメディア処理ドキュメント](docs/LOCAL_MEDIA.md)

## YouTube の利用可否

YouTube ダウンロードは現在、**公開 ZenithW サービスでは無効化されています**。

これは通常の ZenithW アプリケーション障害ではありません。

YouTube は、ホスティングされた Web インフラ、クラウドサーバー、データセンター IP からのアクセスを制限する場合があります。

ZenithW の公開バックエンドはホスティング環境上にあるため、通常の家庭回線やブラウザからのアクセスとは異なる扱いを受ける可能性があります。

そのため、次のすべてが正常でも YouTube 側で拒否または制限されることがあります。

- ZenithW 本体
- yt-dlp
- FFmpeg
- バックエンドの稼働状態
- メディア処理パイプライン

### 試した方法

YouTube へのアクセスを安定させるため、複数のアプリケーション側対策を試しました。

- 認証済み Cookie の更新
- Cookie の自動更新
- Cookie 更新サービス
- PO Token 統合
- PO Token 生成サービス
- yt-dlp 更新
- extractor 更新
- セッション調整
- リクエスト調整

一部の方法は個別のケースで一時的に改善しましたが、公開サービスとして十分に安定したアクセスは得られませんでした。

### Cookie と PO Token だけでは不十分な理由

Cookie や PO Token は一部の条件では役立ちますが、リクエストの許可・拒否を決めるすべての要素を制御できるわけではありません。

YouTube は次のような要素も評価する可能性があります。

- データセンター / クラウド IP の評価
- リクエスト元
- アカウント状態
- セッション状態
- 認証要件
- プラットフォーム側のレート制限
- 不正利用対策システム
- 地域制限
- 頻繁に変化するプラットフォーム側の挙動

そのため、有効な Cookie や PO Token があっても、公開クラウドバックエンドからのアクセス成功は **保証されません**。

ZenithW はこれらを万能な回避手段として扱いません。

### 公開サービスで YouTube を無効化した理由

同じホスティング環境からリクエストを繰り返すと、安定した体験を提供できないまま不要な失敗だけが増えます。

また、根本的な制限を解決できないまま共有バックエンド IP に負荷をかけることにもなります。

そのため、公開 ZenithW サイトでは YouTube を意図的に無効化しています。

### YouTube は永久に削除されたのですか？

いいえ。

YouTube サポートは **ZenithW プロジェクトから永久に削除されたわけではありません**。

信頼性が高く保守可能な方法が見つかれば、公開サービスへ復帰する可能性があります。

現在の制限は、特に公開ホスト版 ZenithW に関するものです。

### セルフホスト

セルフホスト環境では独自の:

- IP アドレス
- ネットワーク接続
- yt-dlp
- 認証状態
- Cookie
- 任意の Token 設定

を使用します。

そのため、YouTube の動作は公開サービスと異なる場合があります。

ただしセルフホストでも YouTube へのアクセスは保証されません。

利用可否は YouTube 側のルールとネットワーク環境に依存します。

## プラットフォームの利用可否

第三者サイトの対応は best-effort として扱われます。

ZenithW の制御外にある理由で失敗することがあります。

- 削除されたメディア
- 非公開メディア
- 年齢制限
- ログイン要件
- 地域制限
- 利用できない形式
- レート制限
- API / サイトの変更
- 不正利用対策システム
- ネットワーク制限
- 削除済みコンテンツ

ZenithW は、利用できない出力を成功扱いするのではなく、その制限を表示するよう設計されています。

## ユーザー体験とプライバシー

ZenithW は軽量な UI を維持します。

- リアルタイム進捗
- キャンセル
- ブラウザ内履歴
- デスクトップ対応 UI
- モバイル対応 UI
- 複数言語
- アカウント不要

準備済みファイルは短時間だけ保持されます。

ダウンロードリンクは:

- 一時的
- 必要に応じて要求元クライアントに紐づく
- 使用後または期限切れ後に自動削除

ZenithW は永続的なオンラインメディアストレージではありません。

### ブラウザ内履歴

ダウンロード履歴は ZenithW アカウントではなくブラウザ内に保存されます。

登録なしで基本的な利便性を提供できます。

ブラウザデータを削除すると、この履歴も消える場合があります。

## アーキテクチャ

| レイヤー | 実行環境 |
|---|---|
| Frontend | Cloudflare Pages 上の Vanilla HTML / CSS / JavaScript |
| Edge | Cloudflare DNS、Proxy、TLS、Origin 検証 |
| Backend | Amazon EC2 上の Flask、Gunicorn、gevent、Socket.IO |
| Media | yt-dlp、FFmpeg、Deno/EJS、任意の Token 統合 |
| Service management | Ubuntu、Nginx、systemd |

バックエンドは意図的に **1 worker** で動作します。

ジョブ状態、Socket.IO room、準備済みファイルの所有情報はプロセスローカルです。

複数 worker / replica に拡張するには共有状態とストレージが必要です。

## 🐳 Docker Compose でセルフホスト

完全な ZenithW を起動する最も簡単な方法は Docker Compose です。

次をまとめて実行します。

- frontend
- reverse proxy
- API
- FFmpeg
- download workspace
- 永続的な一時ストレージ

既定構成では **1 backend worker** を維持します。

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

その後、以下を開きます。

```text
http://localhost:8080
```

別ポートや公開ドメインを使う場合は `.env` の次の値を同時に変更します。

- `ZENITHW_PORT`
- `SELF_HOSTED_ORIGIN`

その後再起動:

```bash
docker compose up -d
```

## Docker ストレージ

`zenithw-downloads` Docker volume は一時処理ファイルを保持します。

これらは通常の期限切れクリーンアップで削除されます。

永続 volume は主に、コンテナ更新が進行中の転送を即座に壊さないためにあります。

永続メディア保存用途ではありません。

## 任意のプライベート Cookie

一部のソースではログイン済みブラウザセッションが必要な場合があります。

セルフホスト環境ではプライベート Cookie ファイルを任意で指定できます。

```bash
mkdir -p private
```

Netscape 形式の Cookie を次へ配置します。

```text
private/cookies.txt
```

次に:

```bash
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

次のファイルは Git に commit したり公開共有してはいけません。

```text
private/cookies.txt
compose.cookies.yml
```

Cookie は任意であり、必ず非公開で扱ってください。

また、第三者プラットフォーム制限に対する **万能な回避手段ではありません**。

## 公開ホスティング

公開ホスティングでは Docker の前段に HTTPS と適切な firewall または reverse proxy を配置してください。

公式 ZenithW では Cloudflare を使っていますが、セルフホストには必須ではありません。

## 🛠️ ローカル開発

### 必要環境

- Python 3.10+
- FFmpeg
- 最新のブラウザ

リポジトリを clone:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw/backend
```

仮想環境を作成:

```bash
python -m venv .venv
```

OS に応じたコマンドで有効化してください。

その後依存関係をインストール:

```bash
pip install --require-hashes -r requirements.lock
```

バックエンドを起動:

```bash
python app.py
```

API:

```text
http://localhost:5000
```

`frontend/` は任意の static file server で配信できます。

Development CORS はローカル cross-origin 開発時のみ有効にしてください。

## 🔐 Production の基本

Production 環境では次の値に強い秘密値が必要です。

```text
SECRET_KEY
ORIGIN_SECRET
```

実行制限、一時ファイル容量、trusted proxy、同時実行制御、diagnostics アクセスはバックエンドで定義された環境変数から設定されます。

重要事項:

- Secret を Git に入れない
- Export Cookie を Git に入れない
- ブラウザのプライベートデータを公開しない
- EC2 origin を設定済み proxy chain の背後に置く
- 必要に応じて共有 origin secret を検証する
- Visitor header は信頼できる proxy 経由のみ信頼する
- Diagnostics は非公開にする
- Public health response は最小限にする
- 共有 job state と file coordination ができるまで worker 数を増やさない

## 主な Endpoint

| Endpoint | 用途 |
|---|---|
| `POST /info` | メタデータと形式を解決 |
| `POST /download` | ダウンロード / 抽出ジョブ開始 |
| `POST /convert` | アップロード済みファイルを変換 / remux |
| `POST /cancel` | 実行中ジョブをキャンセル |
| `GET /files/<token>` | 一時的な準備済みファイルを転送 |
| `GET /health` | 最小限の liveness response |
| `GET /ready` | 依存関係とキャパシティの readiness |

## セキュリティ

ZenithW は任意のインターネット入力を安全と仮定せず、リモートメディア処理に制限を設けます。

主な保護:

- リモート対象検証
- private destination のブロック
- link-local destination のブロック
- redirect 制限
- media protocol 制限
- concurrency 制限
- processing 制限
- disk usage 制限
- 一時ファイル期限
- 短時間有効な file token
- 準備済みファイル配布の制限

インターネットサービスは絶対的な匿名性、無制限の可用性、第三者プラットフォーム変更への完全な耐性を保証できません。

ZenithW は保持データを減らし、一時処理の範囲と寿命を制限する方針です。

## 責任ある利用

ZenithW は次のコンテンツにのみ使用してください。

- 自分が所有しているもの
- ダウンロード許可を得ているもの
- 法的に利用できるもの

第三者プラットフォームの利用規約および著作権ルールは利用者の責任です。

ZenithW は YouTube、TikTok、Instagram、X、Reddit その他の対応プラットフォームと提携していません。

対応していることは提携、推奨、公式統合を意味しません。

## バグ報告

再現可能なバグは以下から報告できます。

[GitHub Issues](https://github.com/boranseasonnew/zenithw/issues)

報告時:

- 問題を明確に説明
- 可能なら再現手順を記載
- ZenithW のバージョンを記載
- 有用なエラー情報を追加
- 個人情報や機密情報を削除

公開 Issue に以下を含めないでください。

- Cookie
- Password
- private URL
- authentication token
- API secret
- personal data

## ライセンス

- **ZenithW:** AGPL-3.0-only
- **第三者依存関係:** 各ライセンスに従う
- 詳細: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
