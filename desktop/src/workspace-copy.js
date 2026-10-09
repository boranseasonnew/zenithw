'use strict';
const workspaceRows=`
Tema|Theme|Тема|Design
Arayüzün renk düzeni|Interface color scheme|Цветовая схема интерфейса|Farbschema der Oberfläche
Koyu|Dark|Тёмная|Dunkel
Açık|Light|Светлая|Hell
Sistem|System|Системная|System
Vurgu rengi|Accent color|Цвет акцента|Akzentfarbe
Düğmeler ve seçili seçenekler|Buttons and selected options|Кнопки и выбранные параметры|Schaltflächen und ausgewählte Optionen
Pembe|Pink|Розовый|Rosa
Mavi|Blue|Синий|Blau
Mor|Purple|Фиолетовый|Violett
Sistem bildirimleri|System notifications|Системные уведомления|Systembenachrichtigungen
İndirme tamamlandığında veya başarısız olduğunda bildirir.|Notify when a download completes or fails.|Сообщать о завершении или ошибке загрузки.|Bei Abschluss oder Fehler benachrichtigen.
İndirme sırasında uykuyu önle|Prevent sleep while downloading|Не переходить в сон при загрузке|Ruhezustand während Downloads verhindern
Ekran kapanabilir; indirme bitince normal uyku düzenine döner.|The screen can turn off; normal sleep resumes after downloading.|Экран может выключаться; после загрузки режим сна восстанавливается.|Der Bildschirm darf ausgehen; danach gilt der normale Ruhemodus.
Sistem tepsisi|System tray|Системный трей|Infobereich
Küçültünce tepsiye gider. Pencereyi kapatmak uygulamadan çıkar.|Minimize to the tray. Closing the window quits the app.|Сворачивать в трей. Закрытие окна завершает приложение.|Minimieren in den Infobereich. Schließen beendet die App.
Geçmiş yalnızca bu oturumda tutulur. Uygulamayı yeniden açınca temizlenir; dosyaların ve ayarların korunur.|History lasts for this session. Restarting clears it; files and settings are kept.|История хранится только в этом сеансе. При перезапуске она очищается; файлы и настройки сохраняются.|Der Verlauf gilt für diese Sitzung. Ein Neustart leert ihn; Dateien und Einstellungen bleiben erhalten.
Eşzamanlı indirmeler|Concurrent downloads|Одновременные загрузки|Gleichzeitige Downloads
Aynı anda çalışan indirme sayısı|Number of downloads running at once|Количество одновременных загрузок|Anzahl gleichzeitig laufender Downloads
Mevcut dosyaların üzerine yaz|Overwrite existing files|Перезаписывать существующие файлы|Vorhandene Dateien überschreiben
Aynı adlı dosyayı değiştirir ve arşiv atlamasını devre dışı bırakır.|Replace files with the same name and bypass archive skipping.|Заменять одноимённые файлы и отключать пропуск по архиву.|Gleichnamige Dateien ersetzen und Archivüberspringen deaktivieren.
Dosya adlarını sadeleştir|Restrict filenames|Упростить имена файлов|Dateinamen vereinfachen
Dosya adlarında yalnızca ASCII karakterleri kullanır.|Use only ASCII characters in filenames.|Использовать в именах файлов только символы ASCII.|Nur ASCII-Zeichen in Dateinamen verwenden.
Konteyneri değiştir|Remux video|Сменить контейнер|Video umpacken
Görüntüyü yeniden kodlamadan dosya türünü değiştirir.|Change the container without re-encoding video.|Менять контейнер без перекодирования видео.|Dateityp ohne erneute Videocodierung ändern.
Videoyu dönüştür|Re-encode video|Перекодировать видео|Video neu codieren
Gerekirse yeniden kodlar; işlem daha uzun sürebilir.|Re-encode when needed; processing may take longer.|Перекодировать при необходимости; обработка может занять больше времени.|Bei Bedarf neu codieren; dies kann länger dauern.
Format sıralaması|Format sorting|Сортировка форматов|Formatsortierung
Otomatik format seçiminde öncelik|Priority for automatic format selection|Приоритет автоматического выбора формата|Priorität bei automatischer Formatwahl
Çözünürlük ve kare hızı|Resolution and frame rate|Разрешение и частота кадров|Auflösung und Bildrate
H.264 uyumluluğu|H.264 compatibility|Совместимость H.264|H.264-Kompatibilität
AV1 önceliği|Prefer AV1|Предпочитать AV1|AV1 bevorzugen
Daha küçük dosya|Smaller file|Меньший размер файла|Kleinere Datei
Ayrıca bölüm olarak işaretle|Also mark as chapters|Также отмечать главами|Zusätzlich als Kapitel markieren
Çıkarılmayan kategoriler bölüm işareti olarak eklenir.|Categories not removed are added as chapter markers.|Неудалённые категории добавляются как главы.|Nicht entfernte Kategorien als Kapitel markieren.
Giriş ve kapanış|Intro and outro|Вступление и завершение|Intro und Outro
SponsorBlock sunucusu|SponsorBlock server|Сервер SponsorBlock|SponsorBlock-Server
Kullanılacak HTTPS API adresi|HTTPS API address to use|Адрес HTTPS API|HTTPS-API-Adresse
İndirmeden önce listeyi seç|Select playlist items before downloading|Выбрать видео перед загрузкой|Listeneinträge vor dem Download auswählen
İndirilecek videoları işaretleyerek seç.|Tick the videos you want to download.|Отметьте видео для загрузки.|Gewünschte Videos markieren.
Listeyi tek dosyada birleştir|Concatenate playlist into one file|Объединить список в один файл|Liste zu einer Datei zusammenfügen
Videoların codec ve akış sayıları aynı olmalıdır.|Videos must have matching codecs and stream counts.|Кодеки и число потоков у видео должны совпадать.|Codecs und Anzahl der Streams müssen übereinstimmen.
Her zaman|Always|Всегда|Immer
Birleşik videolarda|For multi-part videos|Для составных видео|Bei mehrteiligen Videos
Hakkında|About|О приложении|Über
Windows için yerel medya indirici|Local media downloader for Windows|Локальный загрузчик медиа для Windows|Lokaler Medien-Downloader für Windows
İşlemler bu bilgisayarda çalışır. Üçüncü taraf araçların lisansları kurulum paketindeki bildirimlerde yer alır.|Processing runs on this computer. Third-party licenses are included in the installation notices.|Обработка выполняется на этом компьютере. Лицензии сторонних инструментов включены в уведомления установки.|Die Verarbeitung erfolgt lokal. Drittanbieter-Lizenzen stehen in den Installationshinweisen.
Ayar kategorileri|Settings categories|Категории настроек|Einstellungskategorien
Uygulama menüsü|Application menu|Меню приложения|Anwendungsmenü
Dosya|File|Файл|Datei
Araçlar|Tools|Инструменты|Werkzeuge
Listeyi seç|Select playlist|Выбрать список|Liste auswählen
Tümünü seç|Select all|Выбрать всё|Alle auswählen
Seçimi temizle|Clear selection|Снять выделение|Auswahl aufheben
Seçimi kullan|Use selection|Использовать выбор|Auswahl verwenden
Seçilecek liste öğesi bulunamadı.|No playlist entries were found.|Элементы списка не найдены.|Keine Listeneinträge gefunden.
İlk 200 öğe gösterilir.|Up to the first 200 entries are shown.|Показаны первые 200 элементов.|Bis zu 200 Einträge werden angezeigt.
video seçildi|videos selected|видео выбрано|Videos ausgewählt
Tekrar dene|Retry|Повторить|Erneut versuchen
Dur|Stop|Остановить|Stoppen
Kaydı kaldır|Remove entry|Удалить запись|Eintrag entfernen
Çıkış|Quit|Выход|Beenden
İndirme tamamlandı|Download completed|Загрузка завершена|Download abgeschlossen
İndirme başarısız|Download failed|Ошибка загрузки|Download fehlgeschlagen
Eşzamanlı indirme sınırı doldu.|The concurrent download limit was reached.|Достигнут предел одновременных загрузок.|Das Limit gleichzeitiger Downloads ist erreicht.
Tek bir dönüştürme yöntemi seçin.|Choose one conversion method.|Выберите один способ преобразования.|Eine Konvertierungsmethode auswählen.
Liste birleştirme için beklemeden başlatmayı kapatın.|Disable lazy playlist processing to concatenate the playlist.|Для объединения отключите ленивую обработку списка.|Zum Zusammenfügen die verzögerte Listenverarbeitung deaktivieren.
`;
workspaceRows.trim().split('\n').forEach(row=>{const values=row.split('|');uiCopy.set(values[0],values);});
