// Product guides are edited here and rendered as HTML by build-seo.mjs.
// Keep each claim aligned with the current UI and the web/app access policy.
export const GUIDE_DATE = '2026-10-07';
export const guides = [
  {
    slug: 'tiktok-video-download',
    tr: {
      title: 'TikTok Video İndirme Rehberi | ZenithW',
      heading: 'TikTok videosu nasıl indirilir?',
      description: 'TikTok paylaşım bağlantısını ZenithW ile indir: bağlantı kopyalama, video veya ses seçimi ve açılmayan bağlantılar için çözüm adımları.',
      lead: 'Herkese açık bir TikTok paylaşımını kaydetmek için videonun paylaşım bağlantısıyla başla. ZenithW, erişebildiği kaynakta bulunan video ve ses seçeneklerini kullanır.',
      sections: [
        { heading: 'Bağlantıdan dosyaya, adım adım', steps: ['TikTok’ta videonun paylaşım menüsünü aç ve bağlantıyı kopyala. Profil sayfası yerine doğrudan video bağlantısını kullan.', 'ZenithW web indiricisini aç, bağlantıyı alana yapıştır ve devam et. Kısa paylaşım bağlantıları da kaynak erişilebildiğinde çözümlenir.', 'Görüntü ve ses için otomatik modu, yalnızca ses için ses modunu seç. Kalite tercihini değiştirmek istersen Ayarlar’a bak.', 'İndir düğmesine bas ve hazırlama işlemini bekle. Dosyayı tarayıcının indirmeler bölümünden aç; telefonda paylaşım veya kaydetme seçenekleri tarayıcıya göre değişebilir.'] },
        { heading: 'Video kalitesi ve filigran hakkında', paragraphs: ['Çıktı kalitesi, paylaşımın erişilebilir akışlarına bağlıdır. Daha yüksek bir kalite seçmek kaynakta olmayan ayrıntıları oluşturmaz.', 'Filigransız bir kaynak erişilebiliyorsa o kaynak kullanılabilir. Videonun görüntüsüne zaten işlenmiş bir filigran için kaldırma garantisi verilmez. Aynı bağlantıdan her zaman aynı akışın bulunacağını da varsayma.'] },
        { heading: 'Bağlantı açılmıyorsa', paragraphs: ['Önce paylaşımı normal tarayıcıda kontrol et. Silinmiş, özel, bölge kısıtlı veya giriş gerektiren bir video web sunucusundan erişilemeyebilir. Kendi tarayıcında hesabın açık olması, bu oturumu ZenithW’ye taşımaz.', 'Kısa bağlantı başarısız olursa videonun açık sayfasından doğrudan paylaşım adresini kopyala. Geçici bağlantı hatalarında hemen arka arkaya denemek yerine biraz bekle.'], links: [['/status', 'Hizmet durumunu kontrol et'], ['/support', 'Sorunu bildir']] },
        { heading: 'Web, Android veya Windows?', paragraphs: ['Tek bir paylaşım için web sürümü kurulumsuz bir başlangıçtır. Android ve Windows uygulamaları ise indirme isteğini cihazının internet bağlantısından yapar. Bu, erişim yolunu değiştirir; özel veya kısıtlı içerik için garanti oluşturmaz.'], links: [['/', 'TikTok bağlantısını webde indir'], ['/app', 'Android uygulamasına bak'], ['/pc-app', 'Windows uygulamasına bak']] },
        { heading: 'Dosyayı başka formatta kullanmak', paragraphs: ['Kaydettiğin dosya oynatıcında açılmıyorsa önce dosyanın tamamen indiğini kontrol et. Sonra dönüştürme ile remux arasındaki farkı öğrenerek uygun aracı seç. Dosya uzantısını elle değiştirmek video veya ses codec’ini değiştirmez.'], links: [['/guides/convert-vs-remux', 'Dönüştürme ve remux farkı']] },
      ],
    },
    en: {
      title: 'How to Download TikTok Videos | ZenithW',
      heading: 'How to download a TikTok video',
      description: 'Save a public TikTok video with ZenithW. Learn how to copy the share link, choose video or audio, and troubleshoot unavailable downloads.',
      lead: 'Start with the share link for a public TikTok post. ZenithW uses the video and audio streams it can access from that source.',
      sections: [
        { heading: 'From a share link to a file', steps: ['Open the video’s share menu in TikTok and copy its link. Use the individual post rather than a profile page.', 'Open the ZenithW web downloader, paste the link, and continue. Short share links can also be resolved when the source is accessible.', 'Choose automatic mode for video with audio, or audio mode for an audio file. Visit Settings if you want to change the preferred quality.', 'Press Download and wait for preparation to finish. Open the file from your browser’s downloads. On a phone, the available share and save actions depend on the browser.'] },
        { heading: 'Video quality and watermarks', paragraphs: ['The available quality depends on the streams exposed by the post. Selecting a higher quality does not create detail missing from the source.', 'A source without a watermark may be used when one is accessible. ZenithW does not guarantee removal of a watermark already embedded in the picture. The streams available for a particular link can also change.'] },
        { heading: 'If the link will not open', paragraphs: ['Check the post in a normal browser first. A deleted, private, region restricted, or login dependent video may be unavailable to the web server. Being signed in on your own browser does not transfer that session to ZenithW.', 'If a short link fails, copy the direct share address from the open video page. For temporary connection errors, allow some time before retrying rather than repeatedly starting the same download.'], links: [['/status', 'Check service status'], ['/support', 'Report a problem']] },
        { heading: 'Web, Android, or Windows?', paragraphs: ['The web version is a convenient starting point for a single post without installing anything. The Android and Windows apps make download requests through your device’s internet connection. That changes the access path; it does not guarantee access to private or restricted content.'], links: [['/', 'Download a TikTok link on the web'], ['/app', 'Explore the Android app'], ['/pc-app', 'Explore the Windows app']] },
        { heading: 'Using the file in another format', paragraphs: ['If a saved file does not play, first check that its download completed. Then choose between conversion and remuxing based on the container and codecs you need. Renaming the extension does not change the video or audio codec.'], links: [['/en/guides/convert-vs-remux', 'Conversion and remuxing explained']] },
      ],
    },
  },
  {
    slug: 'instagram-reels-download',
    tr: {
      title: 'Instagram Reels ve Video İndirme Rehberi | ZenithW',
      heading: 'Instagram Reels ve video nasıl indirilir?',
      description: 'Instagram Reels veya video paylaşım bağlantısını ZenithW ile kaydet. Doğru bağlantı, kalite seçimi, özel hesap sınırları ve kaydetme adımları.',
      lead: 'ZenithW ile erişilebilir bir Instagram videosunu veya Reels paylaşımını kaydetmek için doğrudan gönderinin bağlantısını kullan. Sonuç, Instagram’ın o paylaşım için izin verdiği erişime bağlıdır.',
      sections: [
        { heading: 'Doğru Instagram bağlantısını kopyala', paragraphs: ['Reels veya video gönderisini aç ve paylaşım menüsünden bağlantısını kopyala. Bir profil adresi, arama sayfası veya ekran görüntüsü video bağlantısının yerine geçmez.', 'Bağlantıyı normal tarayıcıda açarak doğru gönderiye gittiğini kontrol et. Bu, indirme hatasını yanlış bağlantıdan ayırmana yardımcı olur.'] },
        { heading: 'Videoyu ZenithW ile kaydet', steps: ['Web indiricisini aç ve gönderinin bağlantısını yapıştır.', 'Devam et ile bağlantıyı analiz et. Video ve ses için otomatik modu kullan; yalnızca ses istiyorsan ses modunu seç.', 'İndirme planını kontrol et. Kalite tercihini Ayarlar’dan değiştirebilirsin; kaynakta olmayan bir çözünürlük üretilemez.', 'İndir düğmesine bas. İşlem tamamlandığında dosyayı tarayıcının indirmelerinden kaydet veya cihazının sunduğu paylaşım seçeneğini kullan.'] },
        { heading: 'Özel hesaplar ve giriş gerektiren paylaşımlar', paragraphs: ['Özel hesap içeriği, yalnızca takipçilere açık gönderiler, silinmiş paylaşımlar veya bölge kısıtları web sunucusundan erişimi engelleyebilir. Kendi Instagram hesabında görebildiğin her gönderinin web indiricisinde açılması beklenmemelidir.', 'ZenithW web arayüzüne Instagram şifreni girmen gerekmez. Tarayıcıdaki oturumun otomatik olarak sunucuya aktarılmaz. Kullanılabilirlik kaynak platformdaki değişikliklerden de etkilenebilir.'] },
        { heading: 'İndirme tamamlandı ama dosya açılmıyor', paragraphs: ['İndirme tamamlanmadan dosyayı açmadığından emin ol ve dosyanın boyutunu kontrol et. Video oynatıcın kullanılan codec’i desteklemiyorsa farklı bir oynatıcı veya uygun dönüştürme yolu gerekebilir.', 'Remux, uyumlu akışları yeniden kodlamadan taşır. Codec değişmesi gerekiyorsa dönüştürme kullanılır. Sadece dosyanın adını .mp4 olarak değiştirmek bu işlemleri yapmaz.'], links: [['/guides/convert-vs-remux', 'Hangi medya aracı uygun?']] },
        { heading: 'Cihazına uygun devam et', paragraphs: ['Web sürümü kurulumsuz çalışır. Android ve Windows uygulamaları cihaz bağlantısını kullanır; uygulama seçimi kaynak kısıtlarını ortadan kaldırma garantisi değildir. Hata sürüyorsa hizmet durumuna bak ve destek kanalına kullandığın paylaşım bağlantısıyla birlikte hata mesajını ilet.'], links: [['/', 'Instagram bağlantısını webde indir'], ['/app', 'Android uygulaması'], ['/pc-app', 'Windows uygulaması'], ['/status', 'Hizmet durumu']] },
      ],
    },
    en: {
      title: 'How to Download Instagram Reels and Videos | ZenithW',
      heading: 'How to download Instagram Reels and videos',
      description: 'Save an accessible Instagram Reel or video with ZenithW. Copy the correct post link, choose a format, and understand private account limitations.',
      lead: 'Use the direct link to an accessible Instagram video or Reel. A successful download depends on the access Instagram makes available for that post.',
      sections: [
        { heading: 'Copy the correct Instagram link', paragraphs: ['Open the Reel or video post and copy its link from the share menu. A profile address, search page, or screenshot is not a replacement for a video link.', 'Open the copied address in a regular browser to check that it leads to the intended post. This helps distinguish an incorrect link from a download failure.'] },
        { heading: 'Save the video with ZenithW', steps: ['Open the web downloader and paste the post link.', 'Continue to analyze the source. Use automatic mode for video with sound, or audio mode if you only need audio.', 'Review the download plan. You can change the preferred quality in Settings, but a resolution absent from the source cannot be created.', 'Press Download. Once preparation finishes, save the file through your browser’s downloads or the share action available on your device.'] },
        { heading: 'Private accounts and posts that require login', paragraphs: ['Private accounts, follower only posts, deleted content, and regional restrictions can prevent access from the web server. A post visible to your own Instagram account is not necessarily accessible to a web downloader.', 'The ZenithW web interface does not require you to enter your Instagram password. Your browser session is not automatically transferred to the server. Source platform changes can also affect availability.'] },
        { heading: 'The download finishes but the file will not play', paragraphs: ['Check that the download completed before opening the file, and check its size. If your player does not support the source codec, you may need a different player or a suitable conversion.', 'Remuxing copies compatible streams without encoding them again. Conversion is needed when a codec must change. Simply renaming a file to .mp4 does neither.'], links: [['/en/guides/convert-vs-remux', 'Choose the appropriate media tool']] },
        { heading: 'Continue on your device', paragraphs: ['The web version works without installation. Android and Windows apps use your device connection; choosing an app does not guarantee that source restrictions disappear. If an error persists, check service status and send the post link and error message through the support channel.'], links: [['/', 'Download an Instagram link on the web'], ['/app', 'Android app'], ['/pc-app', 'Windows app'], ['/status', 'Service status']] },
      ],
    },
  },
  {
    slug: 'convert-vs-remux',
    tr: {
      title: 'Video Dönüştürme ve Remux Farkı: MP4, MP3 | ZenithW',
      heading: 'Dönüştürme mi, remux mu?',
      description: 'MP4, WebM ve ses dosyaları için doğru aracı seç. ZenithW ile codec, konteyner, kayıpsız remux ve MP3 dönüştürme arasındaki farkı öğren.',
      lead: 'Bir dosyanın uzantısı, içindeki video ve sesin nasıl kodlandığını tek başına söylemez. Doğru işlem, yalnızca dosya adını değil, konteyneri ve codec’leri birlikte dikkate alır.',
      sections: [
        { heading: 'Konteyner ile codec aynı şey değil', paragraphs: ['MP4, WebM ve MKV gibi konteynerler, video ve ses akışlarını bir dosyada taşır. H.264, VP9 veya AAC gibi codec’ler ise bu akışların kodlanma biçimini belirtir.', 'Bir oynatıcı konteyneri tanıyabilir ama içindeki codec’i desteklemeyebilir. Bu nedenle her .mp4 dosyasının her cihazda oynayacağını varsayma.'] },
        { heading: 'Remux ne zaman doğru seçim?', paragraphs: ['Video ve ses zaten hedef konteynerle uyumluysa remux, akışları yeniden kodlamadan kopyalar. Görüntü ve ses verisinin yeniden sıkıştırılmaması, yeniden kodlamadan kaynaklanan kalite kaybını önler.', 'Remux bir codec’i başka bir codec’e dönüştürmez. Desteklenmeyen veya bozuk bir akışın her durumda onarılacağı garanti değildir. ZenithW’nin remux aracı uyumlu paketleme yolu için kullanılmalıdır.'], links: [['/remux', 'Remux aracını aç']] },
        { heading: 'Dönüştürme ne zaman gerekir?', paragraphs: ['Bir oynatıcı için farklı bir codec gerektiğinde veya video içinden MP3 gibi farklı kodlamada bir ses dosyası istendiğinde dönüştürme gerekebilir. Yeniden kodlama işlem süresi ve çıktı kalitesi üzerinde etkilidir.', 'Düşük kaliteli veya kayıplı bir sesi FLAC’a çevirmek kaybolan ayrıntıları geri getirmez. Yalnızca dosya boyutunu büyütebilir. ZenithW uygun akışlarda kopyalama yolunu, gerektiğinde desteklenen yeniden kodlama yolunu kullanır.'], links: [['/convert', 'Video ve ses dönüştürücüsünü aç']] },
        { heading: 'ZenithW’de yerel dosyayla başla', steps: ['Dönüştürme veya remux sayfasını açıp cihazındaki dosyayı seç.', 'Aracın gösterdiği format, boyut ve uyumluluk bilgisini kontrol et. Geçerli sınırları sayfadaki açıklamadan oku.', 'Dönüştürmede hedef formatı seç ve işlem özetine bak. Remux kullanıyorsan akışların yeniden kodlanmadan taşınabileceğinden emin ol.', 'İşlemi başlat, tamamlanan dosyayı kaydet ve hedef oynatıcıda aç. Orijinal dosyanı sonucu kontrol edene kadar sakla.'] },
        { heading: 'Tarayıcı ve sunucu işleme yolları', paragraphs: ['Desteklenen yerel medya işlemleri tarayıcıda çalışabilir. Her dosya ve format bu yola uygun değildir; ekrandaki işlem planı ve hata mesajı hangi seçeneklerin kullanılabileceğini gösterir.', 'Büyük dosyalar veya desteklenmeyen codec’ler cihaz belleğini ve işlem süresini zorlayabilir. Dosyayı tekrar tekrar seçmek yerine daha küçük bir örnekle başla veya mevcut uygulama seçeneklerini değerlendir.'], links: [['/guides', 'Diğer kullanım rehberleri'], ['/about/privacy', 'Veri işleme ve gizlilik bilgileri']] },
      ],
    },
    en: {
      title: 'Video Conversion vs Remuxing: MP4 and MP3 | ZenithW',
      heading: 'Should you convert or remux?',
      description: 'Choose the right tool for MP4, WebM, and audio files. Learn about containers, codecs, lossless remuxing, and MP3 conversion in ZenithW.',
      lead: 'A file extension alone does not tell you how its video and audio are encoded. The right operation depends on both the container and the codecs inside it.',
      sections: [
        { heading: 'A container is not a codec', paragraphs: ['Containers such as MP4, WebM, and MKV hold video and audio streams in a file. Codecs such as H.264, VP9, and AAC describe how those streams are encoded.', 'A player may understand the container without supporting the codec inside. That is why an .mp4 extension alone does not guarantee playback on every device.'] },
        { heading: 'When remuxing is the right choice', paragraphs: ['If the video and audio already work in the target container, remuxing copies the streams without encoding them again. Avoiding another compression pass prevents quality loss caused by re-encoding.', 'Remuxing does not turn one codec into another. It also cannot guarantee repair of every unsupported or damaged stream. Use the ZenithW remux tool when the streams have a compatible packaging path.'], links: [['/remux', 'Open the remux tool']] },
        { heading: 'When conversion is needed', paragraphs: ['Conversion may be needed when a player requires a different codec, or when you want audio in a different encoding such as MP3. Re-encoding affects processing time and output quality.', 'Converting low quality or lossy audio to FLAC does not recover missing detail. It may simply make the file larger. ZenithW uses copying when streams are suitable and supported re-encoding when required.'], links: [['/convert', 'Open the video and audio converter']] },
        { heading: 'Start with a local file in ZenithW', steps: ['Open the converter or remux page and choose a file from your device.', 'Check the format, size, and compatibility information shown by the tool. Read the current limits on that page.', 'For conversion, select a target format and review the operation summary. For remuxing, make sure the streams can be copied without re-encoding.', 'Start the operation, save the completed file, and try it in the intended player. Keep the original until you have checked the result.'] },
        { heading: 'Browser and server processing paths', paragraphs: ['Supported local media operations can run in the browser. Not every file or output format is suitable for that path; the operation summary and any error message explain the options available.', 'Large files or unsupported codecs can strain device memory and processing time. Rather than repeatedly loading the same file, start with a smaller example or consider the available app options.'], links: [['/en/guides', 'More usage guides'], ['/about/privacy', 'Data processing and privacy']] },
      ],
    },
  },
  {
    slug: 'youtube-web-and-apps',
    tr: {
      title: 'YouTube Web İndirmeleri ve ZenithW Uygulamaları',
      heading: 'YouTube bağlantısı neden uygulamaya yönlendiriliyor?',
      description: 'ZenithW web sürümündeki YouTube erişim sınırını öğren. Android ve Windows uygulamalarının cihaz bağlantısıyla nasıl farklı çalıştığını incele.',
      lead: 'ZenithW’nin web sürümünde YouTube indirmeleri şu anda kapalı. YouTube bağlantısı girdiğinde Android veya Windows uygulamasına devam etmen önerilir.',
      sections: [
        { heading: 'Web sürümünün mevcut sınırı', paragraphs: ['Kaynak platformların sunucu IP’lerine uyguladığı erişim kısıtları, bir bağlantının cihazında açılmasıyla web sunucusunda işlenmesini farklı hale getirebilir. ZenithW web arayüzü bu nedenle YouTube bağlantılarını indirme kuyruğuna almadan uygulama seçeneğini gösterir.', 'Bu durum, bütün web indiricisinin kapalı olduğu anlamına gelmez. Erişilebilen diğer desteklenen kaynakları webde kullanmaya devam edebilirsin.'] },
        { heading: 'Android ve Windows uygulamaları nasıl farklı çalışır?', paragraphs: ['Uygulama, kaynak bağlantısına cihazının internet bağlantısı üzerinden erişir. Web sürümünün sunucu bağlantısından farklı bir erişim yolu kullanır.', 'Bu fark her YouTube videosu için başarı garantisi değildir. Video erişimi, kaynak tarafından sunulan formatlar, bölge ve bağlantı koşulları yine sonucu etkiler. Bir uygulama kaynakta bulunmayan kaliteyi veya yetkiyi oluşturmaz.'], links: [['/app', 'Android uygulamasını incele'], ['/pc-app', 'Windows uygulamasını incele']] },
        { heading: 'Uygulamada devam etme adımları', steps: ['Cihazına uygun resmi ZenithW uygulama sayfasını aç ve oradaki mevcut indirme bağlantısını kullan.', 'YouTube video veya desteklenen paylaşım bağlantısını kopyala.', 'Bağlantıyı uygulamaya yapıştır ve kaynağın sunduğu kullanılabilir video veya ses seçeneklerini incele.', 'İstediğin çıktıyı seçip indirmeyi başlat. Hata olursa gördüğün hata mesajını ve bağlantının normal tarayıcıda açılıp açılmadığını kontrol et.'] },
        { heading: 'Hangi dosya ve kaliteyi seçmeliyim?', paragraphs: ['Video ve ses birlikte, yalnızca ses veya cihazında daha uyumlu bir format ihtiyacına göre seçim yap. Kullanılabilir çözünürlük kaynağa bağlıdır; her bağlantıda 4K veya belirli bir ses kalitesi bulunması beklenmez.', 'Dosya bir oynatıcıda açılmıyorsa codec ve konteyner farkını dikkate al. Akışlar uyumlu olduğunda remux, codec değişmesi gerektiğinde dönüştürme uygun olabilir.'], links: [['/guides/convert-vs-remux', 'Format ve uyumluluk rehberi']] },
        { heading: 'Sorun bildirmek için gerekli bilgi', paragraphs: ['Uygulama sürümünü, cihaz türünü ve gördüğün hata mesajını not et. Şifre, oturum çerezi veya kişisel erişim anahtarı paylaşmadan destek kanalından ulaş. Servis durumu ve güncelleme notları mevcut sınırları anlamana yardımcı olur.'], links: [['/support', 'ZenithW destek kanalları'], ['/updates', 'Güncelleme notları'], ['/status', 'Hizmet durumu']] },
      ],
    },
    en: {
      title: 'YouTube Web Downloads and ZenithW Apps',
      heading: 'Why does a YouTube link point you to an app?',
      description: 'Understand the current YouTube limitation on ZenithW web and how the Android and Windows apps use your device connection instead.',
      lead: 'YouTube downloads are currently disabled in the ZenithW web version. Entering a YouTube link offers a way to continue in the Android or Windows app.',
      sections: [
        { heading: 'The current web limitation', paragraphs: ['Restrictions applied by source platforms to server IP addresses can make access from your device different from access through a web server. For that reason, ZenithW web offers the app options instead of adding a YouTube link to the download queue.', 'This does not mean the entire web downloader is unavailable. You can still use other supported sources that are accessible through the web service.'] },
        { heading: 'How Android and Windows apps differ', paragraphs: ['The app accesses the source through your device’s internet connection. This is a different path from the server connection used by the web version.', 'That difference is not a guarantee of success for every YouTube video. Video access, available formats, region, and connection conditions still affect the result. An app cannot create a quality option or permission absent from the source.'], links: [['/app', 'Explore the Android app'], ['/pc-app', 'Explore the Windows app']] },
        { heading: 'Continue in the app', steps: ['Open the official ZenithW app page for your device and use the current download link listed there.', 'Copy the YouTube video or supported share link.', 'Paste it into the app and review the video or audio options available from the source.', 'Choose the output and start the download. If an error occurs, check the error message and whether the link opens in a normal browser.'] },
        { heading: 'Choosing a file and quality', paragraphs: ['Choose video with audio, audio only, or a format suitable for your player. Available resolution depends on the source; do not expect every link to offer 4K or a particular audio quality.', 'If a file will not play, consider its container and codecs. Remuxing may work when the streams are compatible, while conversion may be needed to change a codec.'], links: [['/en/guides/convert-vs-remux', 'Formats and compatibility guide']] },
        { heading: 'Information to include in a problem report', paragraphs: ['Note the app version, device type, and error message. Contact support without sharing passwords, session cookies, or personal access keys. Service status and release notes can help explain the current limitations.'], links: [['/support', 'ZenithW support channels'], ['/updates', 'Release notes'], ['/status', 'Service status']] },
      ],
    },
  },
];
