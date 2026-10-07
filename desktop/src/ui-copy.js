'use strict';
// Four complete interface dictionaries. Media titles, paths and tool output are never translated.
const copyRows = `
Altyazı öncesi bekleme|Subtitle delay|Задержка субтитров|Untertitelpause
Altyazıları dosyaya göm|Embed subtitles|Встроить субтитры|Untertitel einbetten
Analiz yeniden denemesi|Analysis retries|Повторы анализа|Analyse wiederholen
Arşiv|Archive|Архив|Archiv
Arşivdeki ilk kayıtta dur|Stop at the first archived item|Остановиться на первом скачанном|Beim ersten archivierten Eintrag stoppen
Atla|Skip|Пропустить|Überspringen
Ayarları aç|Open settings|Открыть настройки|Einstellungen öffnen
Ayarlarını taşı|Move your settings|Перенос настроек|Einstellungen übertragen
Ayrıntılı ayarları aç →|Open full settings →|Все настройки →|Alle Einstellungen →
Açıklamaları gizle|Hide help notes|Скрыть подсказки|Hinweise ausblenden
Açıklamayı kaydet|Save description|Сохранить описание|Beschreibung speichern
Bağlantı|Network|Сеть|Verbindung
Bağlantıya odaklan|Focus the link field|Перейти к ссылке|Linkfeld fokussieren
Bağlantıyı hazırla|Prepare the link|Подготовить ссылку|Link vorbereiten
Başlangıç|Start|Начало|Anfang
Başlangıç ayarları|First-run setup|Первоначальная настройка|Ersteinrichtung
Başlayalım|Let's begin|Начнём|Los geht’s
Başlık [ID]|Title [ID]|Название [ID]|Titel [ID]
Başlık + ID|Title + ID|Название + ID|Titel + ID
Bekleme aralıkları|Delays|Интервалы ожидания|Wartezeiten
Bilgi dosyası kaydet|Save info file|Сохранить файл информации|Infodatei speichern
Bitiş|End|Конец|Ende
Bölüm olarak işaretle|Mark as chapters|Отметить как главы|Als Kapitel markieren
Bölümleri ayrı dosyalara ayır|Split chapters into files|Сохранить главы отдельно|Kapitel als einzelne Dateien speichern
Bölümü indir|Download a clip|Скачать фрагмент|Ausschnitt herunterladen
Cookie dosyası|Cookie file|Файл cookie|Cookie-Datei
Daha sonra|Later|Позже|Später
Dosya adlarına sıra numarası ekle|Add playlist numbers|Добавить номера плейлиста|Playlistnummern hinzufügen
Dosya biçimi|File format|Формат файла|Dateiformat
Dosya erişimi yeniden denemesi|File access retries|Повторы доступа к файлу|Dateizugriff wiederholen
Dosya onarımı|File repair|Исправление файла|Dateireparatur
Dosya seç|Choose a file|Выбрать файл|Datei auswählen
Dosya seçilmedi|No file selected|Файл не выбран|Keine Datei ausgewählt
Dışa aktar|Export|Экспорт|Exportieren
Eksik parçalar|Missing fragments|Отсутствующие фрагменты|Fehlende Fragmente
En fazla bekleme|Maximum delay|Максимальная задержка|Maximale Wartezeit
Format ve kalite|Format and quality|Формат и качество|Format und Qualität
Gelişmiş mod|Advanced mode|Расширенный режим|Erweiterter Modus
Hassas kırpma|Accurate trimming|Точная обрезка|Genauer Zuschnitt
Hata durumunda|On error|При ошибке|Bei einem Fehler
Hazırla|Prepare|Подготовить|Vorbereiten
Kaldır|Remove|Удалить|Entfernen
Kanal - Başlık|Channel - Title|Канал - Название|Kanal - Titel
Kanal + başlık|Channel + title|Канал + название|Kanal + Titel
Kapak & altyazı|Cover and subtitles|Обложка и субтитры|Cover und Untertitel
Kapak dosyası kaydet|Save cover file|Сохранить обложку|Cover speichern
Karışık sırayla indir|Shuffle playlist|Случайный порядок|Playlist mischen
Kaydedildikten sonra|After saving|После сохранения|Nach dem Speichern
Kaydedildikten sonra dosyası|After-download script|Скрипт после загрузки|Skript nach dem Download
Kaydet|Save|Сохранить|Speichern
Kaynak analizi|Extraction|Анализ источника|Quellanalyse
Kaynak biçimi|Source format|Исходный формат|Quellformat
Kaynak dosyaları sakla|Keep original files|Сохранить исходные файлы|Originaldateien behalten
Kaynağa özel seçenek|Source preset|Профиль источника|Quellprofil
Kısayollar|Shortcuts|Горячие клавиши|Tastenkürzel
Liste aralığı|Playlist range|Диапазон плейлиста|Playlistbereich
Listeler|Playlists|Плейлисты|Playlists
Listeyi ayrı klasöre kaydet|Use a playlist folder|Отдельная папка плейлиста|Playlistordner verwenden
Listeyi beklemeden başlat|Start without waiting for the list|Начать без ожидания списка|Ohne Warten auf die Liste starten
Metaveri|Metadata|Метаданные|Metadaten
Netscape .txt biçimi|Netscape .txt format|Формат Netscape .txt|Netscape .txt-Format
Otomatik altyazıları da indir|Include automatic subtitles|Также автосубтитры|Automatische Untertitel einschließen
Otomatik kaydedilir|Saved automatically|Сохраняется автоматически|Automatisch gespeichert
Panodan yapıştır|Paste from clipboard|Вставить из буфера|Aus Zwischenablage einfügen
Parça yeniden denemesi|Fragment retries|Повторы фрагментов|Fragmentwiederholungen
Pencereyi kapat|Close window|Закрыть окно|Fenster schließen
Profiller|Profiles|Профили|Profile
Referer adresi|Referrer|Источник запроса|Referrer
Saniye|Seconds|Секунды|Sekunden
Script başarısız olursa|If a script fails|При ошибке скрипта|Bei einem Skriptfehler
Seçili bölümler|Selected segments|Выбранные сегменты|Ausgewählte Abschnitte
Son işleme|Post-processing|Обработка|Nachbearbeitung
Sonraki videoya geç|Continue to the next video|К следующему видео|Zum nächsten Video
Süre sınırı|Time limit|Ограничение времени|Zeitlimit
Tarih - Başlık|Date - Title|Дата - Название|Datum - Titel
Tarih + başlık|Date + title|Дата + название|Datum + Titel
Ters sırayla indir|Reverse playlist|Обратный порядок|Umgekehrte Reihenfolge
Varsayılan|Default|По умолчанию|Standard
Video kırp|Trim video|Обрезать видео|Video zuschneiden
Videodan çıkar|Remove from video|Удалить из видео|Aus Video entfernen
YENİ İNDİRME|NEW DOWNLOAD|НОВАЯ ЗАГРУЗКА|NEUER DOWNLOAD
Yalnızca bildir|Warn only|Только предупредить|Nur warnen
Yavaş bağlantı eşiği|Slow connection threshold|Порог медленного соединения|Schwelle für langsame Verbindung
Yerel motor|Local engine|Локальный движок|Lokale Engine
Özel User Agent|User agent preset|Профиль User-Agent|User-Agent-Profil
İndirilen parçaları sakla|Keep downloaded fragments|Сохранить фрагменты|Geladene Fragmente behalten
İndirme tercihleri|Download preferences|Параметры загрузки|Downloadoptionen
İndirme öncesi bekleme|Delay before download|Задержка перед загрузкой|Pause vor dem Download
İndirmeden önce|Before downloading|Перед загрузкой|Vor dem Download
İndirmeden önce dosyası|Before-download script|Скрипт перед загрузкой|Skript vor dem Download
İndirmeye devam et|Continue download|Продолжить загрузку|Download fortsetzen
İndirmeyi durdur|Stop download|Остановить загрузку|Download stoppen
İstekler arası bekleme|Delay between requests|Задержка между запросами|Pause zwischen Anfragen
İçe / dışa aktar|Import / export|Импорт / экспорт|Import / Export
İçe aktar|Import|Импорт|Importieren
İşlemi durdur / uyar|Stop / warn|Остановить / предупредить|Stoppen / warnen
.ps1 seç|Choose .ps1|Выбрать .ps1|.ps1 auswählen
.description dosyası|.description file|Файл .description|.description-Datei
.info.json dosyası bağlantı ayrıntılarını içerebilir.|The info file can contain source links.|Файл информации может содержать ссылки.|Die Infodatei kann Quelllinks enthalten.
Dönüştürme öncesindeki dosyaları da kaydeder.|Also saves files before conversion.|Также сохраняет файлы до конвертации.|Behält auch Dateien vor der Konvertierung.
En az bekleme değerinden küçük olamaz.|Must be at least the minimum delay.|Не меньше минимальной задержки.|Mindestens so lang wie die minimale Pause.
JPG olarak ayrı kaydedilir.|Saved separately as JPG.|Сохраняется отдельно как JPG.|Separat als JPG gespeichert.
Kesim sınırında yeniden kodlama yapar; daha uzun sürebilir|Re-encodes at cut points; takes longer.|Перекодирует на границах обрезки; дольше.|Kodiert an Schnittpunkten neu; dauert länger.
Liste içindeki orijinal sıra numarası.|The original position in the playlist.|Исходный номер в плейлисте.|Ursprüngliche Position in der Playlist.
Liste öğelerini geldikçe indirir. Ters ve karışık sırayla kullanılamaz.|Downloads as entries arrive. Use normal order.|Скачивает по мере получения. Обычный порядок.|Lädt Einträge beim Eintreffen. Normale Reihenfolge verwenden.
Oturumlar, cookie dosyaları ve özel bağlantı bilgileri dışa aktarılmaz.|Sessions, cookies and private connection details stay on this device.|Сессии, cookie и приватные соединения остаются на устройстве.|Sitzungen, Cookies und private Verbindungen bleiben auf diesem Gerät.
Playlist adına göre bir alt klasör oluşturur.|Creates a folder named after the playlist.|Создаёт папку с названием плейлиста.|Erstellt einen Ordner mit dem Playlistnamen.
Seçtiğin PowerShell dosyaları kendi kullanıcı yetkilerinle çalışır. Yalnızca güvendiğin dosyaları etkinleştir.|Selected PowerShell files run with your permissions. Enable files you trust.|Выбранные PowerShell-файлы работают с вашими правами. Используйте доверенные файлы.|Ausgewählte PowerShell-Dateien laufen mit Ihren Rechten. Nur vertraute Dateien aktivieren.
Script ortamı: ZENITHW_EVENT, ZENITHW_URL, ZENITHW_OUTPUT_DIR ve ZENITHW_FILES_JSON. Sonuncusu kaydedilen dosyaların JSON listesidir.|Script environment: ZENITHW_EVENT, ZENITHW_URL, ZENITHW_OUTPUT_DIR, ZENITHW_FILES_JSON (saved files).|Переменные скрипта: ZENITHW_EVENT, ZENITHW_URL, ZENITHW_OUTPUT_DIR, ZENITHW_FILES_JSON (сохранённые файлы).|Skriptvariablen: ZENITHW_EVENT, ZENITHW_URL, ZENITHW_OUTPUT_DIR, ZENITHW_FILES_JSON (gespeicherte Dateien).
URL çubuğunda ve ayarlarda daha fazla seçenek|More choices in the link bar and settings|Больше вариантов в строке ссылки и настройках|Mehr Optionen in Linkleiste und Einstellungen
Yerel uygulama verileri / fragments klasöründe|In the local application fragments folder|В локальной папке fragments|Im lokalen fragments-Ordner
İndirme klasörünü ve günlük tercihlerini seç.|Choose your folder and everyday preferences.|Выберите папку и повседневные настройки.|Ordner und tägliche Einstellungen auswählen.
Hazır liste aralığı seç|Choose a playlist range|Выберите диапазон|Playlistbereich auswählen
Hazır dil grubu seç|Choose subtitle languages|Выберите языки|Untertitelsprachen auswählen
Hazır kategori grubu seç|Choose a category group|Выберите категории|Kategorien auswählen
Kaynak için hazır profil|Choose a source preset|Выберите профиль источника|Quellprofil auswählen
Hazır hız sınırı seç|Choose a speed limit|Выберите ограничение скорости|Geschwindigkeitslimit auswählen
Yavaş bağlantı algılama eşiği|Slow connection threshold|Порог медленного соединения|Schwelle für langsame Verbindung
Bilgisayarında çalışan proxy için hazır bağlantı|Presets for a proxy running on this computer|Для прокси на этом компьютере|Profile für einen Proxy auf diesem Computer
0: kapalı · saniye|0: off · seconds|0: выкл. · секунды|0: aus · Sekunden
Türkçe + İngilizce|Turkish + English|Турецкий + английский|Türkisch + Englisch
Tüm diller|All languages|Все языки|Alle Sprachen
Sponsor + tanıtım|Sponsors + promotions|Спонсоры + реклама|Sponsoren + Werbung
Tüm bölümler|All categories|Все категории|Alle Kategorien
Doğrudan|Direct connection|Прямое соединение|Direkte Verbindung
Yerel HTTP · 7890|Local HTTP · 7890|Локальный HTTP · 7890|Lokales HTTP · 7890
Yerel SOCKS · 1080|Local SOCKS · 1080|Локальный SOCKS · 1080|Lokales SOCKS · 1080
Tümü|All|Все|Alle
İlk 5|First 5|Первые 5|Erste 5
İlk 10|First 10|Первые 10|Erste 10
İlk 25|First 25|Первые 25|Erste 25
İlk 50|First 50|Первые 50|Erste 50
İlk 100|First 100|Первые 100|Erste 100
Günlük|Everyday|На каждый день|Alltag
Müzik|Music|Музыка|Musik
Hızlı|Fast|Быстро|Schnell
Yüksek kalite|High quality|Высокое качество|Hohe Qualität
Yalnızca ses indir|Download audio only|Только аудио|Nur Audio herunterladen
Videodan ses çıkar; tercihlerin korunur.|Extract audio; your preferences are kept.|Извлечь аудио; настройки сохраняются.|Audio extrahieren; Einstellungen bleiben erhalten.
Ses dosyası|Audio file|Аудиофайл|Audiodatei
İndirme kalitesi|Download quality|Качество загрузки|Downloadqualität
En yüksek kalite|Highest quality|Высшее качество|Höchste Qualität
Dosya türü|File type|Тип файла|Dateityp
Altyazıları indir|Download subtitles|Скачать субтитры|Untertitel herunterladen
Kapalı olduğunda altyazı tercihlerin korunur.|Subtitle preferences are kept when disabled.|Настройки сохраняются при отключении.|Einstellungen bleiben beim Deaktivieren erhalten.
Otomatik altyazıları da ekle|Include automatic subtitles|Также автосубтитры|Automatische Untertitel einschließen
Dosyaya göm|Embed in the file|Встроить в файл|In Datei einbetten
Cookie kaynağı|Cookie source|Источник cookie|Cookie-Quelle
Yerel oturum / dosya|Local session / file|Локальная сессия / файл|Lokale Sitzung / Datei
Oturum açma ve cookie dosyası için ayrıntılı ayarlara geç.|Open full settings to sign in or choose a cookie file.|Откройте все настройки для входа или файла cookie.|Alle Einstellungen für Anmeldung oder Cookie-Datei öffnen.
Playlist indir|Download playlist|Скачать плейлист|Playlist herunterladen
Bağlantı bir liste içeriyorsa seçili videoları indirir.|Downloads selected entries if the link includes a playlist.|Скачивает выбранные видео из плейлиста.|Lädt ausgewählte Videos aus einer Playlist.
Ayrı klasöre kaydet|Save to a separate folder|Сохранить в отдельную папку|In separatem Ordner speichern
Sıra numarası ekle|Add position numbers|Добавить порядковые номера|Positionsnummern hinzufügen
İndirmeden önce çalıştır|Run before download|Запустить перед загрузкой|Vor dem Download ausführen
Kaydedildikten sonra çalıştır|Run after saving|Запустить после сохранения|Nach dem Speichern ausführen
Seçili yerel .ps1 dosyası|Selected local .ps1 file|Выбранный локальный .ps1|Ausgewählte lokale .ps1-Datei
Önce ayrıntılı ayarlardan dosya seç.|Choose a file in full settings first.|Сначала выберите файл в настройках.|Zuerst eine Datei in den Einstellungen auswählen.
Videoyu hazırla, başlangıç ve bitişi sürükleyerek seç.|Prepare the video, then drag the start and end.|Подготовьте видео, затем выберите границы ползунками.|Video vorbereiten, dann Anfang und Ende ziehen.
Videoyu hazırla|Prepare video|Подготовить видео|Video vorbereiten
En yüksek|Highest|Максимум|Maximum
Bu işlem masaüstü uygulamasında kullanılabilir.|Available in the desktop app.|Доступно в приложении для ПК.|In der Desktop-App verfügbar.
Bir bağlantı gir.|Enter a link.|Введите ссылку.|Link eingeben.
Bir bağlantı yapıştır…|Paste a link…|Вставьте ссылку…|Link einfügen…
Geçerli bir bağlantı gir.|Enter a valid link.|Введите корректную ссылку.|Gültigen Link eingeben.
Enter ile hazırla|Press Enter to prepare|Enter — подготовить|Enter zum Vorbereiten
Yerel motor hazır|Local engine ready|Локальный движок готов|Lokale Engine bereit
Motor eksik|Engine missing|Движок отсутствует|Engine fehlt
Arayüz önizlemesi|Interface preview|Предпросмотр интерфейса|Oberflächenvorschau
Yerel cookie dosyası hazır|Local cookie file ready|Локальный файл cookie готов|Lokale Cookie-Datei bereit
Bağlantı hazırlanıyor…|Preparing link…|Подготовка ссылки…|Link wird vorbereitet…
Bağlantı değişti. Tekrar hazırla.|Link changed. Prepare it again.|Ссылка изменилась. Подготовьте снова.|Link geändert. Erneut vorbereiten.
Kaynak kalitesi|Source quality|Качество источника|Quellqualität
Bitiş başlangıçtan sonra ve video süresi içinde olmalı.|End must be after start and within the video duration.|Конец должен быть после начала и в пределах видео.|Ende muss nach dem Anfang und innerhalb des Videos liegen.
Dakika:saniye veya saat:dakika:saniye|Minutes:seconds or hours:minutes:seconds|Минуты:секунды или часы:минуты:секунды|Minuten:Sekunden oder Stunden:Minuten:Sekunden
Uygulama kapatıldığında durdu|Stopped when the app closed|Остановлено при закрытии|Beim Schließen der App gestoppt
Sonuç yok|No results|Нет результатов|Keine Ergebnisse
Geçmişin burada|Your history lives here|Здесь ваша история|Hier ist Ihr Verlauf
Henüz indirme yok|No downloads yet|Пока нет загрузок|Noch keine Downloads
Bağlantını yukarıya yapıştır.|Paste a link above.|Вставьте ссылку выше.|Oben einen Link einfügen.
Tamamlanan dosyalar burada görünür.|Completed files appear here.|Здесь появятся готовые файлы.|Abgeschlossene Dateien erscheinen hier.
İsteğe bağlı işlem tamamlanamadı|Optional processing incomplete|Дополнительная обработка не завершена|Optionale Verarbeitung unvollständig
Hazırlanıyor|Preparing|Подготовка|Vorbereitung
İndiriliyor|Downloading|Загрузка|Wird heruntergeladen
Profil seçildi|Profile selected|Профиль выбран|Profil ausgewählt
Kullan|Use|Применить|Verwenden
Kendi alanın.|Your space.|Ваше пространство.|Ihr Bereich.
Sana göre çalışsın.|Make it yours.|Настройте под себя.|Ganz nach Ihren Wünschen.
İndirmeye hazırsın.|Ready to download.|Всё готово к загрузке.|Bereit zum Herunterladen.
Dosyaların nereye kaydedilsin?|Where should your files go?|Куда сохранять файлы?|Wo sollen Dateien gespeichert werden?
Günlük kullanım için sade. İstediğinde daha fazlası.|Simple for everyday use. More when you need it.|Просто каждый день. Больше при необходимости.|Einfach im Alltag. Mehr bei Bedarf.
Araçlar bilgisayarında, işlemler yerel.|Your tools and downloads stay on your computer.|Инструменты и загрузки остаются на компьютере.|Tools und Downloads bleiben auf Ihrem Computer.
Açılışta yt-dlp güncelle|Update yt-dlp on startup|Обновлять yt-dlp при запуске|yt-dlp beim Start aktualisieren
Uygulamayı aç|Open workspace|Открыть приложение|App öffnen
Bulunamadı|Missing|Не найдено|Nicht gefunden
Güncel|Up to date|Актуально|Aktuell
Ayarlar dışa aktarıldı|Settings exported|Настройки экспортированы|Einstellungen exportiert
Ayarlar içe aktarıldı|Settings imported|Настройки импортированы|Einstellungen importiert
Cookie dosyası hazır|Cookie file ready|Файл cookie готов|Cookie-Datei bereit
İptal ediliyor…|Cancelling…|Отмена…|Wird abgebrochen…
İptal|Cancel|Отмена|Abbrechen
Aç|Open|Открыть|Öffnen
Klasör|Folder|Папка|Ordner
Tam video|Full video|Полное видео|Ganzes Video
Yeni indirme|New download|Новая загрузка|Neuer Download
Hazır|Ready|Готово|Bereit
Video kırpma|Video trimming|Обрезка видео|Videozuschnitt
Yalnızca ses|Audio only|Только аудио|Nur Audio
Oturum seçenekleri|Session options|Параметры сессии|Sitzungsoptionen
Altyazı seçenekleri|Subtitle options|Параметры субтитров|Untertiteloptionen
Playlist seçenekleri|Playlist options|Параметры плейлиста|Playlistoptionen
Oturum|Session|Сессия|Sitzung
Ayarlarda ara|Search settings|Поиск настроек|Einstellungen suchen
Video veya ses bağlantısı|Video or audio link|Ссылка на видео или аудио|Video- oder Audiolink
Daha önce indirildiği için tekrar atlandı.|Skipped because it was downloaded before.|Пропущено: уже скачано.|Bereits heruntergeladen, übersprungen.
Dosya kaydedildi; son script tamamlanamadı.|File saved; the final script did not finish.|Файл сохранён; последний скрипт не завершён.|Datei gespeichert; letztes Skript unvollständig.
Medya kaydedildi; isteğe bağlı son işlem tamamlanamadı.|Media saved; optional processing did not finish.|Медиа сохранено; дополнительная обработка не завершена.|Medium gespeichert; optionale Verarbeitung unvollständig.
En fazla 3 eşzamanlı indirme.|Up to 3 simultaneous downloads.|До 3 одновременных загрузок.|Bis zu 3 gleichzeitige Downloads.
Script dosyası seçilmedi veya bulunamadı.|Script file is not selected or missing.|Скрипт не выбран или не найден.|Skript nicht ausgewählt oder nicht gefunden.
Bir .ps1 dosyası seçin.|Choose a .ps1 file.|Выберите .ps1-файл.|Eine .ps1-Datei auswählen.
İndirme öncesi script tamamlanamadı; dosyayı ve PowerShell izinlerini kontrol edin.|The script failed; check the file and PowerShell permissions.|Скрипт не завершён; проверьте файл и разрешения PowerShell.|Skript fehlgeschlagen; Datei und PowerShell-Rechte prüfen.
Ön script tamamlanamadı; indirmeye devam ediliyor.|Script incomplete; continuing download.|Скрипт не завершён; загрузка продолжается.|Skript unvollständig; Download wird fortgesetzt.
Ayar dosyası çok büyük.|Settings file is too large.|Файл настроек слишком большой.|Einstellungsdatei zu groß.
Cookie dosyası çok büyük.|Cookie file is too large.|Файл cookie слишком большой.|Cookie-Datei zu groß.
Geçersiz cookie dosyası.|Invalid cookie file.|Некорректный файл cookie.|Ungültige Cookie-Datei.
Netscape cookie dosyası seçin.|Choose a Netscape cookie file.|Выберите файл cookie Netscape.|Netscape-Cookie-Datei auswählen.
Profil bulunamadı.|Profile not found.|Профиль не найден.|Profil nicht gefunden.
Geçerli bir başlangıç ve bitiş seçin.|Choose valid start and end points.|Выберите допустимые начало и конец.|Gültige Anfangs- und Endpunkte wählen.
İptal edildi.|Cancelled.|Отменено.|Abgebrochen.
İşlem zaman aşımına uğradı.|The operation timed out.|Превышено время ожидания.|Zeitüberschreitung.
İndirmeler ve geçmiş|Downloads and history|Загрузки и история|Downloads und Verlauf
İndirme türü|Download type|Тип загрузки|Downloadtyp
Format ve kalite seçenekleri|Format and quality options|Формат и качество|Format und Qualität
Script seçenekleri|Script options|Параметры скриптов|Skriptoptionen
İndirmelerde ara|Search downloads|Поиск загрузок|Downloads durchsuchen
Ara…|Search…|Поиск…|Suchen…
Bir ayar ara…|Search settings…|Поиск настроек…|Einstellungen suchen…
Liste görünümü|List view|Список|Listenansicht
Kart görünümü|Grid view|Плитки|Kachelansicht
Görünüm|View|Вид|Ansicht
İndirme klasörünü aç|Open download folder|Открыть папку загрузок|Downloadordner öffnen
Video bağlantısı|Video link|Ссылка на видео|Videolink
Kapat|Close|Закрыть|Schließen
Kaydedildi|Saved|Сохранено|Gespeichert
Ters ve karışık sıra birlikte seçilemez.|Choose either reverse or shuffle.|Выберите обратный или случайный порядок.|Umgekehrte oder zufällige Reihenfolge auswählen.
Listeyi beklemeden başlatmak için normal sıra seçin.|Choose normal order for immediate start.|Выберите обычный порядок для немедленного начала.|Normale Reihenfolge für sofortigen Start wählen.
En fazla bekleme değeri daha küçük olamaz.|Maximum delay must be at least the minimum.|Максимальная задержка не меньше минимальной.|Maximale Pause muss mindestens der minimalen entsprechen.
Dosya bulunamadı.|File not found.|Файл не найден.|Datei nicht gefunden.
İptal edildi|Cancelled|Отменено|Abgebrochen
İndiriliyor…|Downloading…|Загрузка…|Wird heruntergeladen…
`;
const uiCopy = new Map(copyRows.trim().split('\n').map(row=>{const a=row.split('|');return [a[0],a];}));
for(const a of Object.values(words)) if(!uiCopy.has(a[0]))uiCopy.set(a[0],a);
const originalText=new WeakMap(),originalAttrs=new WeakMap();
function localText(source,language='tr',fallback=source){const a=uiCopy.get(source);return a?.[Math.max(0,['tr','en','ru','de'].indexOf(language))]||fallback;}
function localizeUi(root,language='tr'){
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let node;node=walk.nextNode();){
  if(node.parentElement?.closest('[data-i18n],#job-list,#media-heading,#uploader,#thumb,#toast,#profiles-list,#folder-label,#folder-value,#media-folder,#status-version,script,style'))continue;
  const source=originalText.get(node)||node.textContent.trim();if(!uiCopy.has(source))continue;
  originalText.set(node,source);node.textContent=node.textContent.replace(node.textContent.trim(),localText(source,language));
 }
 root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(n=>{
  let attrs=originalAttrs.get(n);if(!attrs){attrs={};for(const k of ['aria-label','title','placeholder'])if(n.hasAttribute(k))attrs[k]=n.getAttribute(k);originalAttrs.set(n,attrs);}
  for(const [key,value]of Object.entries(attrs))if(uiCopy.has(value))n.setAttribute(key,localText(value,language));
 });
}
