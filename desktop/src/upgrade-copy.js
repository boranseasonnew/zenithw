'use strict';
// Extend the existing four-language dictionary, including dynamic status labels.
const upgradeRows=`
Oynatma listesinden seç|Choose from playlist|Выбрать из плейлиста|Aus Playlist auswählen
Ayarlar ve kitaplık|Settings and library|Настройки и библиотека|Einstellungen und Mediathek
Hakkında ve sürüm|About and version|О программе и версии|Über die App und Version
Çoklu bağlantı|Multiple links|Несколько ссылок|Mehrere Links
Çoklu indirme|Batch download|Пакетная загрузка|Mehrere Downloads
Her satıra bir bağlantı ekle. Yinelenen bağlantılar ayıklanır; indirmeler ayarladığın eşzamanlı sınırla sırayla başlar.|Add one link per line. Duplicates are removed; downloads start in order within your concurrency limit.|Добавь по одной ссылке в строке. Повторы удаляются; загрузки запускаются по очереди с учётом лимита одновременных задач.|Füge pro Zeile einen Link ein. Duplikate werden entfernt; Downloads starten der Reihe nach bis zum festgelegten Parallelitätslimit.
Video veya ses bağlantıları|Video or audio links|Ссылки на видео или аудио|Video- oder Audio-Links
İndirme türü|Download type|Тип загрузки|Download-Typ
Bağlantılardaki listeleri indir|Download playlists in these links|Скачать плейлисты по этим ссылкам|Playlists aus diesen Links herunterladen
En fazla 50 bağlantı ekleyebilirsin. Format, kapak ve klasör için mevcut ayarların kullanılır. Tüm kuyruğun sınırı 100 iştir.|Add up to 50 links. Your current format, artwork and folder settings apply. The entire queue is limited to 100 jobs.|Можно добавить до 50 ссылок. Используются текущие настройки формата, обложки и папки. Общий лимит очереди — 100 задач.|Füge bis zu 50 Links hinzu. Deine aktuellen Format-, Cover- und Ordnereinstellungen gelten. Die gesamte Warteschlange ist auf 100 Aufträge begrenzt.
Kuyruğa ekle|Add to queue|Добавить в очередь|Zur Warteschlange hinzufügen
Kuyruğa eklendi|Added to queue|Добавлено в очередь|Zur Warteschlange hinzugefügt
Yinelenen|Duplicates|Повторы|Duplikate
Eklenemedi|Not added|Не добавлено|Nicht hinzugefügt
1 ile 50 arasında bağlantı gir.|Enter 1 to 50 links.|Введи от 1 до 50 ссылок.|Gib 1 bis 50 Links ein.
Kuyruk en fazla 100 indirme alabilir.|The queue can hold up to 100 downloads.|Очередь вмещает до 100 загрузок.|Die Warteschlange fasst bis zu 100 Downloads.
Sırada|Queued|В очереди|In Warteschlange
Son işleme|Processing|Обработка|Nachbearbeitung
Dosya doğrulanıyor ve kaydediliyor…|Validating and saving the file…|Проверка и сохранение файла…|Datei wird geprüft und gespeichert…
Kapak kareye dönüştürülüyor…|Preparing square artwork…|Подготовка квадратной обложки…|Quadratisches Cover wird vorbereitet…
Kare kapak hazırlanamadı; özgün kapak korundu.|Square artwork could not be prepared; original artwork was kept.|Не удалось подготовить квадратную обложку; исходная обложка сохранена.|Das quadratische Cover konnte nicht erstellt werden; das Original wurde beibehalten.
Liste öğesi|Playlist item|Элемент плейлиста|Playlist-Eintrag
Akış|Stream|Поток|Stream
Bu akış için tahmini süre|Estimated time for this stream|Оставшееся время этого потока|Geschätzte Restzeit dieses Streams
Aktarım için tahmini süre|Estimated transfer time|Оставшееся время передачи|Geschätzte Übertragungsdauer
Yüzde bu akışa aittir|Percentage applies to this stream|Процент относится к этому потоку|Prozentwert gilt für diesen Stream
ZenithW, video ve ses dosyalarını kendi bilgisayarında düzenleyip indirmen için Boran tarafından geliştirilen açık kaynaklı bir medya çalışma alanıdır.|ZenithW is an open-source media workspace created by Boran to download and organize video and audio on your own computer.|ZenithW — открытая медиаплатформа, разработанная Бораном для загрузки и организации видео и аудио на твоём компьютере.|ZenithW ist eine von Boran entwickelte Open-Source-Medienumgebung zum Herunterladen und Organisieren von Video und Audio auf deinem Computer.
İndirme, dönüştürme, kare kapak, çoklu bağlantı ve oynatma listesi işlemleri yerel yt-dlp ve FFmpeg araçlarıyla yürütülür. Reklam veya zorunlu üyelik yoktur; ZenithW indirme sunucusuna medya yüklenmez.|Downloads, conversion, square artwork, batch links and playlists use local yt-dlp and FFmpeg tools. There are no ads or mandatory accounts; media is not uploaded to a ZenithW download server.|Загрузка, преобразование, квадратные обложки, пакетные ссылки и плейлисты обрабатываются локальными yt-dlp и FFmpeg. Нет рекламы и обязательной регистрации; медиа не отправляются на сервер загрузки ZenithW.|Downloads, Konvertierung, quadratische Cover, mehrere Links und Playlists werden mit lokalen yt-dlp- und FFmpeg-Werkzeugen verarbeitet. Keine Werbung oder Pflichtkonten; Medien werden nicht auf einen ZenithW-Downloadserver hochgeladen.
Bağlantıları analiz etmek ve indirmek için seçtiğin kaynak siteyle iletişim kurulur. Çerezler ve geçmiş yalnızca bilgisayarında saklanır. Yalnızca indirme hakkına sahip olduğun içerikleri kullan.|The source website is contacted to analyze and download your links. Cookies and history stay on your computer. Only download content you have the right to use.|Для анализа и загрузки выполняются запросы к исходному сайту. Cookie и история хранятся на твоём компьютере. Загружай только контент, на использование которого у тебя есть право.|Zur Analyse und zum Download wird die jeweilige Quellwebsite kontaktiert. Cookies und Verlauf bleiben auf deinem Computer. Lade nur Inhalte herunter, die du verwenden darfst.
Uygulama güncellemeleri|Application updates|Обновления приложения|App-Updates
Yeni sürümler resmî GitHub Releases sayfasından kontrol edilir.|New versions are checked on the official GitHub Releases page.|Новые версии проверяются на официальной странице GitHub Releases.|Neue Versionen werden auf der offiziellen GitHub-Releases-Seite geprüft.
Güncellemeleri kontrol et|Check for updates|Проверить обновления|Nach Updates suchen
Sürümü görüntüle|View release|Открыть выпуск|Version ansehen
GitHub sürümleri kontrol ediliyor…|Checking GitHub releases…|Проверка выпусков GitHub…|GitHub-Versionen werden geprüft…
Yeni sürüm mevcut:|New version available:|Доступна новая версия:|Neue Version verfügbar:
Bu sürüm, yayımlanan son sürümden daha yeni.|This version is newer than the latest published release.|Эта версия новее последнего опубликованного выпуска.|Diese Version ist neuer als die zuletzt veröffentlichte Version.
Şu anda güncelleme yok. Güncel sürümü kullanıyorsun.|No updates right now. You are up to date.|Обновлений нет. Установлена актуальная версия.|Derzeit keine Updates. Du verwendest die aktuelle Version.
Güncelleme kontrol edilemedi. Bağlantını kontrol edip tekrar dene.|Could not check updates. Check your connection and try again.|Не удалось проверить обновления. Проверь подключение и повтори попытку.|Updates konnten nicht geprüft werden. Prüfe deine Verbindung und versuche es erneut.
Kaynak kodu|Source code|Исходный код|Quellcode
ZenithW web sitesi|ZenithW website|Сайт ZenithW|ZenithW-Website
ZenithW ve birlikte dağıtılan araçların lisansları uygulama paketinde bulunur. yt-dlp, FFmpeg, aria2 ve Deno kendi geliştiricilerine aittir.|Licenses for ZenithW and bundled tools are included in the application package. yt-dlp, FFmpeg, aria2 and Deno belong to their respective developers.|Лицензии ZenithW и встроенных инструментов включены в пакет приложения. yt-dlp, FFmpeg, aria2 и Deno принадлежат их разработчикам.|Die Lizenzen für ZenithW und mitgelieferte Werkzeuge liegen dem App-Paket bei. yt-dlp, FFmpeg, aria2 und Deno gehören ihren jeweiligen Entwicklern.
`;
upgradeRows.trim().split('\n').forEach(row=>{const values=row.split('|');uiCopy.set(values[0],values);});
