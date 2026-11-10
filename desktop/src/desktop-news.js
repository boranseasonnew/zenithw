'use strict';

const desktopNews = {
  tr: {
    about: {
      label: 'Hakkında',
      intro: 'ZenithW Desktop, Boran’ın Windows için geliştirdiği açık kaynaklı ve reklamsız bir medya uygulaması. İndirme hakkına sahip olduğun video ve sesleri tek bir çalışma alanında kaydetmek, düzenlemek ve arşivlemek için tasarlandı.',
      sections: [
        {
          title: 'Bağlantıdan dosyaya',
          paragraphs: [
            'Bir bağlantıyı hazırladığında uygulama kaynağın sunduğu görüntü ve ses biçimlerini gösterir. Kaliteyi ve dosya biçimini seçebilir, videoyu kırpabilir, altyazı veya kapak ekleyebilir ve birden fazla işi sıraya alabilirsin. Kullanılabilir seçenekler kaynak siteye ve medyaya bağlıdır.'
          ]
        },
        {
          title: 'Gizlilik ve yerel veriler',
          paragraphs: [
            'Medya, kaynak siteden bilgisayarına indirilir ve burada işlenir. Ayarlar, profiller, indirme geçmişi ve kaydettiğin oturum çerezleri bu cihazda tutulur. Ayar dışa aktarma işlemi çerezleri ve özel bağlantı bilgilerini dışarıda bırakır.',
            'Uygulama bağlantıyı hazırlarken kaynak siteyle iletişim kurar ve ayarladıysan proxy’ni kullanır. Güncelleme kontrolü GitHub’a, etkinleştirdiğin SponsorBlock özelliği ise seçili SponsorBlock hizmetine bağlanır.'
          ]
        },
        {
          title: 'Nasıl çalışıyor?',
          paragraphs: [
            'Rust ve Tauri pencereyi, ayarları, indirme kuyruğunu ve yerel dosya işlemlerini yönetir. Arayüz Microsoft Edge WebView2’de açılır. yt-dlp kaynakları çözümler ve medyayı indirir. FFmpeg medyayı birleştirir, kırpar ve dönüştürür. FFprobe dosyanın içindeki akışları doğrular.'
          ]
        }
      ]
    },
    news: {
      label: 'Yenilikler',
      title: 'ZenithW Desktop 5.0’daki yenilikler',
      intro: 'Windows uygulamasının çekirdeği Rust ile yeniden yazıldı. Bağlantı alanı, düğmeler ve ayrıntılı ayarlar da bu sürümde yenilendi.',
      sections: [
        {
          title: 'Neden Rust?',
          paragraphs: [
            'Kuyruk, dosya işlemleri ve medya araçlarının başlatılması artık Rust’ta. Rust’ın derleme zamanı kontrolleri bellek ve eşzamanlılık hatalarını önlemeye yardımcı olur. İptal sırasında indirme aracıyla birlikte başlattığı alt süreçler de durdurulur.',
            'Önceki Electron sürümü kendi Chromium ve Node.js kopyalarını içeriyordu. 5.0, arayüz için sistemde kurulu WebView2’yi kullanır ve Windows paketindeki çalışma zamanı yükünü azaltır. Açılış süresi ve bellek kullanımı bilgisayarına ve açık işlere göre değişir. İndirme ve dönüştürme süreleri ise kaynak siteye, bağlantına, codec seçimine ve donanımına bağlıdır.'
          ]
        },
        {
          title: 'Temalar ve klavye kullanımı',
          paragraphs: [
            'Ayarlar’dan Beyaz, Siyah veya Mor neon temasını seçebilir ya da Windows temasını izleyebilirsin. Yenilenen bağlantı alanı ve yuvarlatılmış düğmelerde seçili durum ve klavye odağı daha belirgin. Hareketi azaltma tercihi geçişlere de uygulanır.',
            'Ayrıntılı ayarlar aranabilir. Açma ve kapatma anahtarlarını klavyeyle kullanabilir, Esc ile açık ayar penceresini kapatabilirsin.'
          ]
        },
        {
          title: 'İndirme araçları aynı çalışma alanında',
          paragraphs: [
            'Video ve ses indirme, toplu kuyruk, oynatma listeleri, kırpma, altyazı, kare kapak ve SponsorBlock kullanılabilir. Profiller ve kalıcı geçmiş Ayarlar ve Geçmiş bölümlerinden erişilebilir. Ayarlar’daki Motor bölümünde yt-dlp sürümünü görebilir ve güncelleme kanalını seçebilirsin.'
          ]
        },
        {
          title: 'Önceki sürümden geçiş',
          paragraphs: [
            '5.0 mevcut yerel ayarları, profilleri, geçmişi, indirme arşivini ve dışa aktarılmış oturum çerezlerini okur. Uygulama içindeki giriş penceresi yeni bir WebView2 profili kullandığı için kaynak sitede tekrar oturum açman gerekebilir.'
          ]
        }
      ]
    }
  },
  en: {
    about: {
      label: 'About',
      intro: 'ZenithW Desktop is an open-source, ad-free Windows media app developed by Boran. It gives you one place to save, edit, and organize video and audio you have permission to download.',
      sections: [
        {
          title: 'From link to file',
          paragraphs: [
            'Prepare a link to see the video and audio formats available from the source. You can choose a format and quality, trim a video, include subtitles or cover art, and add multiple jobs to the queue. Available options depend on the source and the media.'
          ]
        },
        {
          title: 'Privacy and local data',
          paragraphs: [
            'Media is downloaded from the source and processed on your computer. Settings, profiles, download history, and saved session cookies stay on this device. Settings exports leave out cookies and private connection details.',
            'Preparing a link contacts the source site and uses your proxy if you configured one. Update checks contact GitHub. When enabled, SponsorBlock contacts the selected SponsorBlock service.'
          ]
        },
        {
          title: 'How it works',
          paragraphs: [
            'Rust and Tauri manage the window, settings, queue, and local files. Microsoft Edge WebView2 displays the interface. yt-dlp reads media sources and downloads files. FFmpeg merges, trims, and converts media, and FFprobe verifies the streams in a file.'
          ]
        }
      ]
    },
    news: {
      label: 'What’s new',
      title: 'What’s new in ZenithW Desktop 5.0',
      intro: 'The Windows app’s core was rewritten in Rust. This release also updates the link field, buttons, and detailed settings.',
      sections: [
        {
          title: 'Why Rust?',
          paragraphs: [
            'The queue, file operations, and media tool processes now run under Rust. Rust’s compile-time checks help prevent memory and concurrency errors. Cancelling a download also stops the child processes the downloader started.',
            'The earlier Electron release bundled its own copies of Chromium and Node.js. Version 5.0 uses the installed WebView2 runtime for its interface, reducing the runtime code included in the Windows package. Startup time and memory use vary by computer and workload. Download and conversion times depend on the source, your connection, your codec choices, and your hardware.'
          ]
        },
        {
          title: 'Themes and keyboard controls',
          paragraphs: [
            'Choose White, Black, or Neon Purple in Settings, or follow the Windows theme. The revised link field and rounded buttons make the selected state and keyboard focus easier to see. Transitions respect reduced-motion preferences.',
            'Detailed settings are searchable. You can operate switches from the keyboard and press Esc to close the settings dialog.'
          ]
        },
        {
          title: 'Download tools in one workspace',
          paragraphs: [
            'Video and audio downloads, the batch queue, playlists, trimming, subtitles, square artwork, and SponsorBlock are available. Profiles and persistent download history are accessible from Settings and History. The Engine section shows your yt-dlp version and lets you select an update channel.'
          ]
        },
        {
          title: 'Upgrading from an earlier version',
          paragraphs: [
            'Version 5.0 reads existing local settings, profiles, history, the download archive, and exported session cookies. The in-app login window uses a new WebView2 profile, so a source site may ask you to sign in again.'
          ]
        }
      ]
    }
  },
  de: {
    about: {
      label: 'Über die App',
      intro: 'ZenithW Desktop ist eine quelloffene und werbefreie Medien-App für Windows, entwickelt von Boran. Damit kannst du Videos und Audiodateien, die du herunterladen darfst, an einem Ort speichern, bearbeiten und organisieren.',
      sections: [
        {
          title: 'Vom Link zur Datei',
          paragraphs: [
            'Nach der Analyse eines Links zeigt die App die verfügbaren Video- und Audioformate der Quelle. Du kannst Format und Qualität wählen, Videos zuschneiden, Untertitel oder Cover hinzufügen und mehrere Aufträge in die Warteschlange stellen. Die verfügbaren Optionen hängen von der Quelle und dem Medium ab.'
          ]
        },
        {
          title: 'Datenschutz und lokale Daten',
          paragraphs: [
            'Die App lädt Medien von der Quelle auf deinen Computer und verarbeitet sie dort. Einstellungen, Profile, Downloadverlauf und gespeicherte Sitzungscookies bleiben auf diesem Gerät. Beim Export der Einstellungen werden Cookies und private Verbindungsdaten ausgelassen.',
            'Bei der Linkanalyse verbindet sich die App mit der Quellwebsite. Dabei nutzt sie deinen Proxy, falls du einen eingerichtet hast. Die Updateprüfung fragt GitHub ab. Wenn du SponsorBlock aktivierst, stellt die App eine Verbindung zum ausgewählten SponsorBlock-Dienst her.'
          ]
        },
        {
          title: 'So funktioniert die App',
          paragraphs: [
            'Rust und Tauri verwalten das Fenster, die Einstellungen, die Warteschlange und lokale Dateien. Microsoft Edge WebView2 zeigt die Oberfläche an. yt-dlp analysiert die Quellen und lädt Dateien herunter. FFmpeg führt Medien zusammen, schneidet sie zu und konvertiert sie. FFprobe prüft die enthaltenen Datenströme.'
          ]
        }
      ]
    },
    news: {
      label: 'Neuerungen',
      title: 'Neu in ZenithW Desktop 5.0',
      intro: 'Der Kern der Windows-App wurde in Rust neu geschrieben. Auch das Linkfeld, die Schaltflächen und die erweiterten Einstellungen wurden überarbeitet.',
      sections: [
        {
          title: 'Warum Rust?',
          paragraphs: [
            'Rust verwaltet jetzt die Warteschlange, Dateioperationen und die Prozesse der Medienwerkzeuge. Prüfungen beim Kompilieren helfen, Speicherfehler und Fehler bei nebenläufigen Abläufen zu vermeiden. Beim Abbrechen eines Downloads werden auch die vom Downloadprogramm gestarteten Unterprozesse beendet.',
            'Die frühere Electron-Version lieferte eigene Kopien von Chromium und Node.js mit. Version 5.0 nutzt für die Oberfläche die installierte WebView2-Laufzeit. Dadurch enthält das Windows-Paket weniger Laufzeitkomponenten. Startzeit und Speicherbedarf hängen vom Computer und der Auslastung ab. Wie lange Downloads und Konvertierungen dauern, hängt von der Quelle, deiner Verbindung, der Codec-Auswahl und der Hardware ab.'
          ]
        },
        {
          title: 'Designs und Tastaturbedienung',
          paragraphs: [
            'In den Einstellungen kannst du Weiß, Schwarz oder Neonviolett wählen oder das Windows-Design übernehmen. Das überarbeitete Linkfeld und die abgerundeten Schaltflächen machen Auswahl und Tastaturfokus leichter erkennbar. Übergänge berücksichtigen die Einstellung für reduzierte Bewegung.',
            'Die erweiterten Einstellungen lassen sich durchsuchen. Schalter können per Tastatur bedient werden. Mit Esc schließt du den Einstellungsdialog.'
          ]
        },
        {
          title: 'Downloadwerkzeuge an einem Ort',
          paragraphs: [
            'Video- und Audio-Downloads, Stapelverarbeitung, Playlists, Zuschnitt, Untertitel, quadratische Cover und SponsorBlock stehen zur Verfügung. Profile und der dauerhaft gespeicherte Verlauf sind über die Einstellungen und den Verlauf zugänglich. Im Abschnitt für die Medienwerkzeuge siehst du die yt-dlp-Version und kannst den Updatekanal auswählen.'
          ]
        },
        {
          title: 'Wechsel von einer älteren Version',
          paragraphs: [
            'Version 5.0 liest vorhandene lokale Einstellungen, Profile, den Verlauf, das Downloadarchiv und exportierte Sitzungscookies ein. Das Anmeldefenster verwendet ein neues WebView2-Profil. Deshalb kann die Quellwebsite eine erneute Anmeldung verlangen.'
          ]
        }
      ]
    }
  },
  ru: {
    about: {
      label: 'О приложении',
      intro: 'ZenithW Desktop — приложение для Windows без рекламы, с открытым исходным кодом. Его разработал Боран, чтобы вы могли сохранять, редактировать и упорядочивать видео и аудио, которые вправе скачивать.',
      sections: [
        {
          title: 'От ссылки к файлу',
          paragraphs: [
            'После анализа ссылки приложение показывает доступные форматы видео и аудио. Можно выбрать формат и качество, обрезать видео, добавить субтитры или обложку и поставить несколько загрузок в очередь. Доступные параметры зависят от сайта и материала.'
          ]
        },
        {
          title: 'Конфиденциальность и локальные данные',
          paragraphs: [
            'Медиафайлы скачиваются с сайта и обрабатываются на вашем компьютере. Настройки, профили, история загрузок и сохранённые файлы cookie остаются на этом устройстве. При экспорте настроек файлы cookie и приватные данные подключения исключаются.',
            'При анализе ссылки приложение обращается к сайту-источнику и использует прокси, если он настроен. Приложение проверяет обновления через GitHub. Если включён SponsorBlock, приложение подключается к выбранному сервису SponsorBlock.'
          ]
        },
        {
          title: 'Как это работает',
          paragraphs: [
            'Rust и Tauri управляют окном, настройками, очередью и локальными файлами. Microsoft Edge WebView2 отображает интерфейс. yt-dlp анализирует источники и скачивает файлы. FFmpeg объединяет, обрезает и конвертирует медиа, а FFprobe проверяет потоки в файле.'
          ]
        }
      ]
    },
    news: {
      label: 'Что нового',
      title: 'Что нового в ZenithW Desktop 5.0',
      intro: 'Ядро приложения для Windows переписано на Rust. В этой версии также обновлены поле для ссылки, кнопки и расширенные настройки.',
      sections: [
        {
          title: 'Почему Rust?',
          paragraphs: [
            'Код на Rust теперь управляет очередью, файловыми операциями и процессами медиаинструментов. Проверки при компиляции помогают предотвращать ошибки работы с памятью и при параллельном выполнении. При отмене загрузки приложение останавливает и дочерние процессы, которые запустил загрузчик.',
            'В комплект прежней версии на Electron входили собственные копии Chromium и Node.js. Версия 5.0 использует установленную среду WebView2 для отображения интерфейса, поэтому пакет Windows содержит меньше компонентов среды выполнения. Время запуска и объём используемой памяти зависят от компьютера и нагрузки. Длительность загрузки и конвертации зависит от сайта, соединения, кодека и оборудования.'
          ]
        },
        {
          title: 'Темы и управление с клавиатуры',
          paragraphs: [
            'В настройках можно выбрать белую, чёрную или неоново-фиолетовую тему либо использовать тему Windows. В обновлённом поле ссылки и на скруглённых кнопках легче заметить выбранный параметр и фокус клавиатуры. Переходы учитывают настройку уменьшенного движения.',
            'По расширенным настройкам можно искать. Переключателями можно управлять с клавиатуры, а окно настроек закрывается клавишей Esc.'
          ]
        },
        {
          title: 'Инструменты загрузки в одном окне',
          paragraphs: [
            'Доступны загрузка видео и аудио, пакетная очередь, плейлисты, обрезка, субтитры, квадратные обложки и SponsorBlock. Профили и сохранённая история доступны в настройках и разделе «История». В разделе «Движок» можно проверить версию yt-dlp и выбрать канал обновлений.'
          ]
        },
        {
          title: 'Переход с предыдущей версии',
          paragraphs: [
            'Версия 5.0 считывает существующие локальные настройки, профили, историю, архив загрузок и экспортированные файлы cookie. Встроенное окно входа использует новый профиль WebView2, поэтому сайт может попросить войти снова.'
          ]
        }
      ]
    }
  }
};
