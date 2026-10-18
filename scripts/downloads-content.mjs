// Human-edited copy, shared by static Downloads HTML and the existing language catalogs.
const keys = ['Download ZenithW','Your downloader. Your platform. Your choice.','Downloads','Available','Coming Soon','Under Review','Store publication is pending. Download the current release from GitHub.','View release','Download installer','Portable EXE','Copy','Command copied.','Select the command and copy it manually.','This command will be available after the WinGet package is approved.','Direct APK download','Most modern Android phones','Older 32-bit Android devices','Android x64 devices and emulators','Features and requirements','Choose format and quality, queue downloads, and select subtitles before saving.','Manage browser sessions, SponsorBlock, proxies and playlist preferences in separate settings categories.','Downloads use your device’s connection. Source availability and access conditions still apply.','The F-Droid edition will receive engine updates through app releases, instead of downloading stable or nightly engines separately.','Checksums','Windows interface','Android 7.0 or newer. Select the APK matching your device architecture.','Windows 10/11, 64-bit. The Store package requires Windows 10 version 2004 or newer.','Stay Updated','Get the latest ZenithW releases, announcements and development updates.','Join Telegram','Follow updates on Telegram'];
const values = {
 en: keys,
 tr: ['ZenithW’yi indir','İndiricin. Platformun. Seçimin.','İndirmeler','Kullanılabilir','Yakında','İncelemede','Mağaza yayını bekleniyor. Güncel sürümü GitHub’dan indirebilirsin.','Sürümü aç','Kurulum dosyasını indir','Taşınabilir EXE','Kopyala','Komut kopyalandı.','Komutu seçip elle kopyalayabilirsin.','Bu komut, WinGet paketi onaylandıktan sonra kullanılabilecek.','Doğrudan APK indir','Çoğu güncel Android telefon','Eski 32 bit Android cihazlar','Android x64 cihazlar ve emülatörler','Özellikler ve gereksinimler','Formatı ve kaliteyi seç, indirmeleri sıraya al ve kaydetmeden önce altyazıları belirle.','Tarayıcı oturumlarını, SponsorBlock’u, proxy ve oynatma listesi tercihlerini ayrı ayar kategorilerinde yönet.','İndirmeler cihazının bağlantısını kullanır. Kaynağın erişilebilirliği ve erişim koşulları geçerlidir.','F-Droid sürümünde motor güncellemeleri, kararlı veya nightly motorları ayrıca indirmek yerine uygulama sürümleriyle gelecek.','Sağlama toplamları','Windows arayüzü','Android 7.0 veya üzeri. Cihazının mimarisine uygun APK’yı seç.','Windows 10/11, 64 bit. Store paketi için Windows 10 sürüm 2004 veya üzeri gerekir.','Güncel kal','Yeni ZenithW sürümlerini, duyuruları ve geliştirme haberlerini takip et.','Telegram’a katıl','Güncellemeleri Telegram’da takip et'],
 de: ['ZenithW herunterladen','Dein Downloader. Deine Plattform. Deine Wahl.','Downloads','Verfügbar','Demnächst','Wird geprüft','Die Veröffentlichung im Store steht aus. Lade die aktuelle Version von GitHub herunter.','Version ansehen','Installer herunterladen','Portable EXE','Kopieren','Befehl kopiert.','Wähle den Befehl aus und kopiere ihn manuell.','Dieser Befehl ist verfügbar, sobald das WinGet-Paket genehmigt wurde.','APK direkt herunterladen','Die meisten aktuellen Android-Smartphones','Ältere Android-Geräte mit 32 Bit','Android-Geräte mit x64 und Emulatoren','Funktionen und Voraussetzungen','Wähle Format, Qualität und Untertitel und verwalte deine Download-Warteschlange.','Verwalte Browsersitzungen, SponsorBlock, Proxys und Wiedergabelisten in eigenen Einstellungskategorien.','Downloads nutzen die Verbindung deines Geräts. Verfügbarkeit und Zugangsbedingungen der Quelle gelten weiterhin.','Die F-Droid-Ausgabe erhält Engine-Updates mit App-Versionen, statt Stable- oder Nightly-Engines separat herunterzuladen.','Prüfsummen','Windows-Oberfläche','Android 7.0 oder neuer. Wähle die APK für die Architektur deines Geräts.','Windows 10/11, 64 Bit. Das Store-Paket benötigt Windows 10 Version 2004 oder neuer.','Auf dem Laufenden bleiben','Erhalte neue ZenithW-Versionen, Ankündigungen und Neuigkeiten zur Entwicklung.','Telegram beitreten','Updates auf Telegram verfolgen'],
 fr: ['Télécharger ZenithW','Votre outil. Votre plateforme. Votre choix.','Téléchargements','Disponible','Bientôt disponible','En cours de vérification','La publication sur la boutique est en attente. Téléchargez la version actuelle sur GitHub.','Voir la version','Télécharger le programme d’installation','EXE portable','Copier','Commande copiée.','Sélectionnez la commande et copiez-la manuellement.','Cette commande sera disponible après l’approbation du paquet WinGet.','Télécharger l’APK directement','La plupart des téléphones Android récents','Appareils Android 32 bits plus anciens','Appareils Android x64 et émulateurs','Fonctions et configuration requise','Choisissez le format, la qualité et les sous-titres, puis gérez la file des téléchargements.','Gérez les sessions du navigateur, SponsorBlock, les proxys et les listes de lecture dans leurs catégories de paramètres.','Les téléchargements utilisent la connexion de votre appareil. La disponibilité et les conditions d’accès de la source restent applicables.','L’édition F-Droid recevra les mises à jour du moteur avec celles de l’application, sans télécharger séparément un moteur stable ou nightly.','Sommes de contrôle','Interface Windows','Android 7.0 ou version ultérieure. Choisissez l’APK correspondant à l’architecture de votre appareil.','Windows 10/11, 64 bits. Le paquet Store nécessite Windows 10 version 2004 ou ultérieure.','Restez informé','Retrouvez les nouvelles versions de ZenithW, les annonces et les actualités du développement.','Rejoindre Telegram','Suivre les mises à jour sur Telegram'],
 ru: ['Скачать ZenithW','Ваш загрузчик. Ваша платформа. Ваш выбор.','Загрузки','Доступно','Скоро','На проверке','Публикация в магазине ожидается. Скачайте текущую версию с GitHub.','Открыть выпуск','Скачать установщик','Портативный EXE','Копировать','Команда скопирована.','Выделите команду и скопируйте её вручную.','Эта команда станет доступна после одобрения пакета WinGet.','Скачать APK напрямую','Большинство современных телефонов Android','Старые 32-битные устройства Android','Устройства Android x64 и эмуляторы','Возможности и требования','Выберите формат, качество и субтитры, затем управляйте очередью загрузок.','Управляйте сеансами браузера, SponsorBlock, прокси и плейлистами в отдельных разделах настроек.','Загрузки используют подключение вашего устройства. Доступность источника и его условия доступа остаются в силе.','Версия F-Droid будет получать обновления движка вместе с обновлениями приложения, без отдельной загрузки stable или nightly.','Контрольные суммы','Интерфейс Windows','Android 7.0 или новее. Выберите APK для архитектуры вашего устройства.','Windows 10/11, 64 бит. Пакет Store требует Windows 10 версии 2004 или новее.','Будьте в курсе','Новые версии ZenithW, объявления и новости разработки.','Присоединиться к Telegram','Следить за обновлениями в Telegram'],
 vi: ['Tải ZenithW','Trình tải của bạn. Nền tảng của bạn. Lựa chọn của bạn.','Tải xuống','Có sẵn','Sắp ra mắt','Đang xét duyệt','Ứng dụng đang chờ được phát hành trên cửa hàng. Hãy tải phiên bản hiện tại từ GitHub.','Xem bản phát hành','Tải trình cài đặt','EXE di động','Sao chép','Đã sao chép lệnh.','Chọn lệnh và sao chép thủ công.','Lệnh này sẽ dùng được sau khi gói WinGet được phê duyệt.','Tải APK trực tiếp','Hầu hết điện thoại Android hiện đại','Thiết bị Android 32 bit cũ','Thiết bị Android x64 và trình giả lập','Tính năng và yêu cầu','Chọn định dạng, chất lượng và phụ đề, rồi quản lý hàng đợi tải xuống.','Quản lý phiên trình duyệt, SponsorBlock, proxy và danh sách phát trong từng nhóm cài đặt.','Quá trình tải sử dụng kết nối của thiết bị. Khả năng truy cập và điều kiện của nguồn vẫn được áp dụng.','Bản F-Droid sẽ cập nhật công cụ tải cùng với ứng dụng, thay vì tải riêng công cụ stable hoặc nightly.','Mã kiểm tra','Giao diện Windows','Android 7.0 trở lên. Chọn APK phù hợp với kiến trúc thiết bị.','Windows 10/11, 64 bit. Gói Store yêu cầu Windows 10 phiên bản 2004 trở lên.','Theo dõi tin mới','Nhận bản phát hành ZenithW mới nhất, thông báo và tin tức phát triển.','Tham gia Telegram','Theo dõi cập nhật trên Telegram'],
 zh: ['下载 ZenithW','你的下载工具。你的平台。你的选择。','下载','可用','即将推出','审核中','商店版本尚未发布。请从 GitHub 下载当前版本。','查看发行版本','下载安装程序','便携版 EXE','复制','命令已复制。','请选择命令并手动复制。','WinGet 软件包获批后才能使用此命令。','直接下载 APK','大多数现代 Android 手机','较旧的 32 位 Android 设备','Android x64 设备和模拟器','功能和系统要求','选择格式、画质和字幕，然后管理下载队列。','在各自的设置分类中管理浏览器会话、SponsorBlock、代理和播放列表。','下载使用设备的网络连接，仍受源站可用性和访问条件限制。','F-Droid 版本将通过应用更新来更新下载引擎，不会单独下载 stable 或 nightly 引擎。','校验和','Windows 界面','Android 7.0 或更高版本。请选择适合设备架构的 APK。','64 位 Windows 10/11。Store 软件包要求 Windows 10 版本 2004 或更高版本。','关注最新动态','获取最新的 ZenithW 版本、公告和开发动态。','加入 Telegram','在 Telegram 上关注更新'],
 ja: ['ZenithW をダウンロード','あなたのダウンローダー。あなたの環境。あなたの選択。','ダウンロード','利用可能','近日公開','審査中','ストアでの公開を待っています。現在のバージョンは GitHub からダウンロードできます。','リリースを見る','インストーラーをダウンロード','ポータブル EXE','コピー','コマンドをコピーしました。','コマンドを選択して手動でコピーしてください。','このコマンドは WinGet パッケージの承認後に利用できます。','APK を直接ダウンロード','多くの最新 Android スマートフォン','古い 32 ビット Android 端末','Android x64 端末とエミュレーター','機能と動作環境','形式、画質、字幕を選択し、ダウンロードキューを管理できます。','ブラウザーのセッション、SponsorBlock、プロキシ、プレイリストを専用の設定項目で管理できます。','ダウンロードには端末の接続を使用します。配信元の利用可能性とアクセス条件が適用されます。','F-Droid 版のエンジンはアプリの更新とともに更新され、stable や nightly を別途ダウンロードしません。','チェックサム','Windows の画面','Android 7.0 以降。端末のアーキテクチャに合った APK を選択してください。','64 ビット Windows 10/11。Store パッケージには Windows 10 バージョン 2004 以降が必要です。','最新情報をチェック','ZenithW の最新リリース、お知らせ、開発情報を受け取れます。','Telegram に参加','Telegram で更新情報をフォロー']
};
export const downloadCopy = Object.fromEntries(Object.entries(values).map(([lang, list]) => {
  if (list.length !== keys.length) throw new Error(`Downloads copy mismatch: ${lang}`);
  return [lang,Object.fromEntries(keys.map((key,index)=>[key,list[index]]))];
}));

const submissionLabels={tr:'Başvuruyu görüntüle',en:'View submission',de:'Antrag ansehen',fr:'Voir la demande',ru:'Посмотреть заявку',vi:'Xem hồ sơ gửi duyệt',zh:'查看提交申请',ja:'申請内容を見る'};
for(const [lang,label] of Object.entries(submissionLabels))downloadCopy[lang]['View submission']=label;

// Tutorial strings feed the same Downloads catalogs and static translations.
const tutorialKeys = ["Watch Android Tutorial", "Learn how to use the Android app, step by step.", "Android tutorial", "Close tutorial", "ZenithW Android tutorial video", "YouTube loads only when you open the tutorial.", "Watch Tutorial"];
const tutorialCopy = {
  "en": [
    "Watch Android Tutorial",
    "Learn how to use the Android app, step by step.",
    "Android tutorial",
    "Close tutorial",
    "ZenithW Android tutorial video",
    "YouTube loads only when you open the tutorial.",
    "Watch Tutorial"
  ],
  "tr": [
    "Android eğitimini izle",
    "Android uygulamasını adım adım kullanmayı öğren.",
    "Android eğitimi",
    "Eğitimi kapat",
    "ZenithW Android eğitim videosu",
    "YouTube yalnızca eğitimi açtığında yüklenir.",
    "Eğitimi izle"
  ],
  "de": [
    "Android-Anleitung ansehen",
    "Lerne Schritt für Schritt, wie du die Android-App benutzt.",
    "Android-Anleitung",
    "Anleitung schließen",
    "ZenithW Android-Anleitungsvideo",
    "YouTube wird erst geladen, wenn du die Anleitung öffnest.",
    "Anleitung ansehen"
  ],
  "fr": [
    "Voir le tutoriel Android",
    "Apprenez à utiliser l’application Android, étape par étape.",
    "Tutoriel Android",
    "Fermer le tutoriel",
    "Vidéo du tutoriel Android de ZenithW",
    "YouTube se charge uniquement lorsque vous ouvrez le tutoriel.",
    "Voir le tutoriel"
  ],
  "ru": [
    "Смотреть инструкцию для Android",
    "Узнайте, как пользоваться приложением Android, шаг за шагом.",
    "Инструкция для Android",
    "Закрыть инструкцию",
    "Видеоинструкция ZenithW для Android",
    "YouTube загружается только при открытии инструкции.",
    "Смотреть инструкцию"
  ],
  "vi": [
    "Xem hướng dẫn Android",
    "Tìm hiểu cách sử dụng ứng dụng Android từng bước.",
    "Hướng dẫn Android",
    "Đóng hướng dẫn",
    "Video hướng dẫn ZenithW trên Android",
    "YouTube chỉ được tải khi bạn mở hướng dẫn.",
    "Xem hướng dẫn"
  ],
  "zh": [
    "观看 Android 教程",
    "逐步了解如何使用 Android 应用。",
    "Android 教程",
    "关闭教程",
    "ZenithW Android 教程视频",
    "只有打开教程时才会加载 YouTube。",
    "观看教程"
  ],
  "ja": [
    "Android チュートリアルを見る",
    "Android アプリの使い方を順を追って学べます。",
    "Android チュートリアル",
    "チュートリアルを閉じる",
    "ZenithW Android チュートリアル動画",
    "チュートリアルを開いたときだけ YouTube が読み込まれます。",
    "チュートリアルを見る"
  ]
};
for (const [lang, labels] of Object.entries(tutorialCopy)) {
  if (labels.length !== tutorialKeys.length) throw new Error(`Tutorial copy mismatch: ${lang}`);
  tutorialKeys.forEach((key, index) => { downloadCopy[lang][key] = labels[index]; });
}

const hubKeys = ["Your device. Your ZenithW.", "Windows or Android. Free, open source and ad-free.", "Download for Windows", "Download for Android", "Other device options", "Alternative download sources", "New releases, in the loop.", "Follow development and be the first to hear about releases.", "Free. Open source. In your control.", "Choose your platform", "Installation file", "Portable version"];
const hubCopy = {
  "en": [
    "Your device. Your ZenithW.",
    "Windows or Android. Free, open source and ad-free.",
    "Download for Windows",
    "Download for Android",
    "Other device options",
    "Alternative download sources",
    "New releases, in the loop.",
    "Follow development and be the first to hear about releases.",
    "Free. Open source. In your control.",
    "Choose your platform",
    "Installation file",
    "Portable version"
  ],
  "tr": [
    "Senin cihazın. Senin ZenithW’n.",
    "Windows veya Android. Ücretsiz, açık kaynak ve reklamsız.",
    "Windows için indir",
    "Android için indir",
    "Diğer cihaz seçenekleri",
    "Alternatif indirme kaynakları",
    "Yeni sürümlerden haberdar ol.",
    "Geliştirme sürecini takip et, duyuruları ilk sen öğren.",
    "Ücretsiz. Açık kaynak. Senin kontrolünde.",
    "Platformunu seç",
    "Kurulum dosyası",
    "Taşınabilir sürüm"
  ],
  "de": [
    "Dein Gerät. Dein ZenithW.",
    "Windows oder Android. Kostenlos, quelloffen und werbefrei.",
    "Für Windows herunterladen",
    "Für Android herunterladen",
    "Weitere Geräteoptionen",
    "Alternative Downloadquellen",
    "Neue Versionen im Blick.",
    "Verfolge die Entwicklung und erfahre zuerst von neuen Versionen.",
    "Kostenlos. Quelloffen. Unter deiner Kontrolle.",
    "Plattform wählen",
    "Installationsdatei",
    "Portable Version"
  ],
  "fr": [
    "Votre appareil. Votre ZenithW.",
    "Windows ou Android. Gratuit, open source et sans publicité.",
    "Télécharger pour Windows",
    "Télécharger pour Android",
    "Autres options pour votre appareil",
    "Autres sources de téléchargement",
    "Restez au courant des nouvelles versions.",
    "Suivez le développement et découvrez les nouvelles versions en premier.",
    "Gratuit. Open source. Sous votre contrôle.",
    "Choisir votre plateforme",
    "Fichier d’installation",
    "Version portable"
  ],
  "ru": [
    "Ваше устройство. Ваш ZenithW.",
    "Windows или Android. Бесплатно, с открытым кодом и без рекламы.",
    "Скачать для Windows",
    "Скачать для Android",
    "Другие варианты устройств",
    "Другие источники загрузки",
    "Не пропускайте новые версии.",
    "Следите за разработкой и узнавайте о выпусках первыми.",
    "Бесплатно. Открытый код. Под вашим контролем.",
    "Выберите платформу",
    "Установочный файл",
    "Портативная версия"
  ],
  "vi": [
    "Thiết bị của bạn. ZenithW của bạn.",
    "Windows hoặc Android. Miễn phí, mã nguồn mở và không quảng cáo.",
    "Tải cho Windows",
    "Tải cho Android",
    "Tùy chọn thiết bị khác",
    "Nguồn tải thay thế",
    "Theo dõi các phiên bản mới.",
    "Theo dõi quá trình phát triển và nhận tin phiên bản mới đầu tiên.",
    "Miễn phí. Mã nguồn mở. Bạn nắm quyền kiểm soát.",
    "Chọn nền tảng",
    "Tệp cài đặt",
    "Phiên bản di động"
  ],
  "zh": [
    "你的设备。你的 ZenithW。",
    "Windows 或 Android。免费、开源、无广告。",
    "下载 Windows 版",
    "下载 Android 版",
    "其他设备选项",
    "其他下载来源",
    "关注新版本。",
    "关注开发动态，第一时间了解新版本。",
    "免费。开源。由你掌控。",
    "选择平台",
    "安装文件",
    "便携版"
  ],
  "ja": [
    "あなたの端末。あなたの ZenithW。",
    "Windows または Android。無料、オープンソース、広告なし。",
    "Windows 版をダウンロード",
    "Android 版をダウンロード",
    "その他の端末向けオプション",
    "その他のダウンロード元",
    "新しいリリースをチェック。",
    "開発の進捗を追い、新しいリリースをいち早く知ることができます。",
    "無料。オープンソース。あなたがコントロール。",
    "プラットフォームを選択",
    "インストールファイル",
    "ポータブル版"
  ]
};
for (const [lang, labels] of Object.entries(hubCopy)) {
  if (labels.length !== hubKeys.length) throw new Error(`Hub copy mismatch: ${lang}`);
  hubKeys.forEach((key,index) => { downloadCopy[lang][key] = labels[index]; });
}

const hubAuxiliaryCopy = {"tr": ["Marka künyeleri", "Gezinme menüsünü aç"], "en": ["Brand credits", "Open navigation"], "de": ["Markenhinweise", "Navigation öffnen"], "fr": ["Crédits des marques", "Ouvrir la navigation"], "ru": ["Сведения о брендах", "Открыть меню навигации"], "vi": ["Thông tin thương hiệu", "Mở menu điều hướng"], "zh": ["品牌说明", "打开导航菜单"], "ja": ["ブランド表記", "ナビゲーションを開く"]};
for (const [lang,labels] of Object.entries(hubAuxiliaryCopy)) { downloadCopy[lang]['Brand credits']=labels[0]; downloadCopy[lang]['Open navigation']=labels[1]; }

const releaseFeatureKeys = [
  "Windows 10/11, 64-bit. The Microsoft Store package requires Windows 10 version 2004 (build 19041) or newer.",
  "Android 7.0+ (API 24). Select arm64-v8a, armeabi-v7a or x86_64 to match your device.",
  "Queue links and playlists, and prepare new downloads while transfers continue.",
  "Track progress, speed and estimated time, and manage concurrent downloads.",
  "Choose video, audio and subtitle formats, cover art and metadata before saving.",
  "Batch downloads have their own screen. Add up to 50 link rows with the + button.",
  "Select playlist items and adjust quality and formats with dropdown menus.",
  "Use expandable settings for language, browser sessions, SponsorBlock, network and engine updates.",
  "Internet access and enough free storage for your media files are required."
];
const releaseFeatureCopy = {
  "en": [
    "Windows 10/11, 64-bit. The Microsoft Store package requires Windows 10 version 2004 (build 19041) or newer.",
    "Android 7.0+ (API 24). Select arm64-v8a, armeabi-v7a or x86_64 to match your device.",
    "Queue links and playlists, and prepare new downloads while transfers continue.",
    "Track progress, speed and estimated time, and manage concurrent downloads.",
    "Choose video, audio and subtitle formats, cover art and metadata before saving.",
    "Batch downloads have their own screen. Add up to 50 link rows with the + button.",
    "Select playlist items and adjust quality and formats with dropdown menus.",
    "Use expandable settings for language, browser sessions, SponsorBlock, network and engine updates.",
    "Internet access and enough free storage for your media files are required."
  ],
  "tr": [
    "Windows 10/11, 64 bit. Microsoft Store paketi için Windows 10 sürüm 2004 (derleme 19041) veya üzeri gerekir.",
    "Android 7.0+ (API 24). Cihazına uygun arm64-v8a, armeabi-v7a veya x86_64 APK’sını seç.",
    "Bağlantıları ve oynatma listelerini sıraya al; aktarım sürerken yeni indirmeler hazırla.",
    "İlerlemeyi, hızı ve tahmini süreyi takip et; eşzamanlı indirmeleri yönet.",
    "Kaydetmeden önce video, ses ve altyazı biçimlerini, kapak görselini ve medya bilgilerini seç.",
    "Toplu indirme ayrı bir ekranda. + düğmesiyle en fazla 50 bağlantı satırı ekle.",
    "Oynatma listesi öğelerini seç; kaliteyi ve biçimleri açılır menülerden ayarla.",
    "Dil, tarayıcı oturumları, SponsorBlock, bağlantı ve motor güncellemelerini açılır ayarlardan yönet.",
    "İnternet bağlantısı ve medya dosyaların için yeterli boş depolama alanı gerekir."
  ],
  "de": [
    "Windows 10/11, 64 Bit. Das Microsoft-Store-Paket benötigt Windows 10 Version 2004 (Build 19041) oder neuer.",
    "Android 7.0+ (API 24). Wähle die passende APK: arm64-v8a, armeabi-v7a oder x86_64.",
    "Stelle Links und Playlists in die Warteschlange und bereite während laufender Downloads neue vor.",
    "Verfolge Fortschritt, Geschwindigkeit und Restzeit und verwalte gleichzeitige Downloads.",
    "Wähle vor dem Speichern Video-, Audio- und Untertitelformate, Cover und Metadaten.",
    "Mehrfachdownloads haben einen eigenen Bildschirm. Füge mit + bis zu 50 Linkzeilen hinzu.",
    "Wähle Playlist-Einträge sowie Qualität und Formate über Dropdown-Menüs.",
    "Verwalte Sprache, Browsersitzungen, SponsorBlock, Netzwerk und Engine-Updates in aufklappbaren Einstellungen.",
    "Internetzugang und ausreichend freier Speicher für deine Mediendateien sind erforderlich."
  ],
  "fr": [
    "Windows 10/11, 64 bits. Le paquet Microsoft Store nécessite Windows 10 version 2004 (build 19041) ou ultérieure.",
    "Android 7.0+ (API 24). Choisissez l’APK adaptée : arm64-v8a, armeabi-v7a ou x86_64.",
    "Mettez les liens et les playlists en file et préparez de nouveaux téléchargements pendant les transferts.",
    "Suivez la progression, la vitesse et le temps estimé et gérez les téléchargements simultanés.",
    "Choisissez les formats vidéo, audio et de sous-titres, les pochettes et les métadonnées avant l’enregistrement.",
    "Le téléchargement multiple dispose de son propre écran. Ajoutez jusqu’à 50 liens avec le bouton +.",
    "Sélectionnez les éléments de playlist et réglez la qualité et les formats avec les menus déroulants.",
    "Gérez la langue, les sessions du navigateur, SponsorBlock, le réseau et les mises à jour du moteur dans les paramètres dépliables.",
    "Une connexion Internet et suffisamment d’espace libre pour vos fichiers multimédias sont nécessaires."
  ],
  "ru": [
    "Windows 10/11, 64 бит. Для Microsoft Store требуется Windows 10 версии 2004 (сборка 19041) или новее.",
    "Android 7.0+ (API 24). Выберите APK для устройства: arm64-v8a, armeabi-v7a или x86_64.",
    "Добавляйте ссылки и плейлисты в очередь и готовьте новые загрузки во время передачи файлов.",
    "Следите за прогрессом, скоростью и оставшимся временем и управляйте одновременными загрузками.",
    "Перед сохранением выбирайте форматы видео, аудио и субтитров, обложки и метаданные.",
    "Для пакетных загрузок есть отдельный экран. Добавляйте до 50 ссылок кнопкой +.",
    "Выбирайте элементы плейлиста, качество и форматы в раскрывающихся меню.",
    "Управляйте языком, сеансами браузера, SponsorBlock, сетью и обновлениями движка в раскрывающихся настройках.",
    "Необходимы Интернет и достаточно свободного места для медиафайлов."
  ],
  "vi": [
    "Windows 10/11, 64 bit. Gói Microsoft Store yêu cầu Windows 10 phiên bản 2004 (bản dựng 19041) trở lên.",
    "Android 7.0+ (API 24). Chọn APK phù hợp: arm64-v8a, armeabi-v7a hoặc x86_64.",
    "Xếp liên kết và danh sách phát vào hàng đợi, chuẩn bị lượt tải mới khi quá trình truyền vẫn tiếp tục.",
    "Theo dõi tiến độ, tốc độ, thời gian dự kiến và quản lý các lượt tải đồng thời.",
    "Chọn định dạng video, âm thanh, phụ đề, ảnh bìa và siêu dữ liệu trước khi lưu.",
    "Tải hàng loạt có màn hình riêng. Thêm tối đa 50 dòng liên kết bằng nút +.",
    "Chọn mục danh sách phát, chất lượng và định dạng bằng menu thả xuống.",
    "Quản lý ngôn ngữ, phiên trình duyệt, SponsorBlock, mạng và cập nhật công cụ trong cài đặt có thể mở rộng.",
    "Cần kết nối Internet và đủ dung lượng trống cho các tệp đa phương tiện."
  ],
  "zh": [
    "64 位 Windows 10/11。Microsoft Store 软件包要求 Windows 10 版本 2004（内部版本 19041）或更高版本。",
    "Android 7.0+（API 24）。请选择适合设备的 arm64-v8a、armeabi-v7a 或 x86_64 APK。",
    "将链接和播放列表加入队列，并在传输期间准备新的下载。",
    "查看进度、速度和预计时间，并管理并发下载。",
    "保存前选择视频、音频和字幕格式、封面及元数据。",
    "批量下载有独立页面。使用 + 按钮添加最多 50 行链接。",
    "选择播放列表项目，并通过下拉菜单设置画质和格式。",
    "通过可展开设置管理语言、浏览器会话、SponsorBlock、网络和引擎更新。",
    "需要互联网连接，以及足够存放媒体文件的可用空间。"
  ],
  "ja": [
    "64 ビット Windows 10/11。Microsoft Store 版には Windows 10 バージョン 2004（ビルド 19041）以降が必要です。",
    "Android 7.0+（API 24）。端末に合う arm64-v8a、armeabi-v7a、x86_64 の APK を選んでください。",
    "リンクやプレイリストをキューに追加し、転送中も次のダウンロードを準備できます。",
    "進捗、速度、推定残り時間を確認し、同時ダウンロードを管理できます。",
    "保存前に動画・音声・字幕の形式、カバー画像、メタデータを選択できます。",
    "一括ダウンロードは専用画面にあります。+ ボタンで最大 50 行のリンクを追加できます。",
    "プレイリストの項目を選択し、ドロップダウンメニューで画質や形式を設定できます。",
    "展開できる設定で言語、ブラウザーのセッション、SponsorBlock、ネットワーク、エンジン更新を管理できます。",
    "インターネット接続とメディアファイル用の十分な空き容量が必要です。"
  ]
};
for (const [lang, labels] of Object.entries(releaseFeatureCopy)) {
  if (labels.length !== releaseFeatureKeys.length) throw new Error(`Feature copy mismatch: ${lang}`);
  releaseFeatureKeys.forEach((key, index) => { downloadCopy[lang][key] = labels[index]; });
}
