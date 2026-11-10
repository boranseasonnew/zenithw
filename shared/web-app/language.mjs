// ZenithW language; built into the existing classic-script entry point.
import {renderToolError} from './errors.mjs';
import {renderHomeActivity} from './history.mjs';
import {_updateConvBtn, renderConvPreflight, renderRemuxSignal} from './media-tools.mjs';
import {renderDownloadPlan} from './progress.mjs';
import {checkQueueResume} from './queue.mjs';
import {state} from './state.mjs';

export const TX={
  tr:{
    desktopPromoCloseLabel:'Kapat',
    youtubeAppCloseLabel:'Kapat',
    placeholder:'video bağlantısını buraya bırak',bulkPlaceholder:'linkleri her satıra bir tane olacak şekilde yapıştır... (Enter ile indir, Shift+Enter ile yeni satır)',modeAutoTxt:'otomatik',modeAudioTxt:'ses',modeMuteTxt:'sessiz',bulkToggleTxt:'çoklu indirme',paste:'yapıştır',continueBtn:'devam et',homeStatusTxt:'hizmet aktif',homeActivityTitle:'son aktiviteler',homeActivityAllTxt:'tümünü gör',homeActivityEmpty:'henüz bu tarayıcıda bir indirme yok',
    vcDl:'indir',dlBtn:'indir',dlCancel:'iptal',dlAnalysisKicker:'hazır',dlAnalysisTitle:'İndirmeye hazır',dlAnalysisDesc:'Bağlantı analiz edildi. Kalite ve ses tercihlerini Ayarlar’dan değiştirebilirsin.',dlThumbActionTxt:'kapak görseli',dlSettingsTxt:'ayarlar',dlPlanLabel:'indirme planı',dlPlanVideo:'video planı',dlPlanAudio:'ses planı',dlPlanFallback:'Kaynakta yoksa en yakın güvenli seçenek kullanılır.',dlPlanAdaptive:'YouTube: boşken 1080p, yoğunlukta 720p.',dlQualityVerified:'Kalite doğrulandı',dlProgressTitle:'İndirmen hazırlanıyor',
    stLblProfiles:'hızlı kalite profilleri',profileMinimal:'minimal',profileMinimalDesc:'küçük dosya · daha az veri',profileStandard:'standart',profileStandardDesc:'uyumluluk ve kalite dengesi',profileQuality:'kalite',profileQualityDesc:'uygunsa en verimli yüksek kalite',stProfileHint:'Profil video ve ses tercihlerini birlikte ayarlar. Sonra tek bir ayarı değiştirirsen özel ayara geçer.',profileCustom:'özel ayar',profileActive:'aktif profil: {name}',profileApplied:'{name} profili uygulandı',
    bbSave:'kaydet',bbHistory:'geçmiş',bbRemux:'remux',bbConvert:'dönüştür',bbSettings:'ayarlar',bbUpdates:'güncel',bbAbout:'hakkında',bbMore:'diğer',bbDonate:'destek ol',
    accDefault:'klasik',accDefaultDesc:'buz mavisi · dengeli',accPurple:'neon mor',accPurpleDesc:'elektrik moru · derin uzay',accGray:'grafit',accGrayDesc:'nötr gri · sade',accPink:'neon pembe',accPinkDesc:'canlı pembe · sıcak',accCobalt:'cobalt mavisi',accCobaltDesc:'derin mavi · odaklı',
    saveRetryDownload:'Bu yöntem burada çalışmadı. Dosyayı kaydetmek için indir düğmesine dokun.',saveCopied:'dosya kopyalandı',saveTitleTxt:'nasıl kaydetmek istersin?',saveDlTxt:'indir',saveShareTxt:'paylaş',saveCopyTxt:'kopyala',
    saveNoteTxt:'tarayıcı pop-up\'ları engelliyorsa "indir" butonunu kullanın.',saveDoneTxt:'tamam',
    stModalTitle:'ayarlar',stModalSubtitle:'indirme deneyimini özelleştir',stNavVideo:'video',stNavAudio:'ses',stNavAppearance:'görünüm',stNavAccessibility:'erişilebilirlik',stNavMeta:'metadata',stNavFilename:'dosya adı',stNavAdvanced:'gelişmiş',stNavClose:'kapat',
    stLblVisual:'görsel rahatlık',stReduceMotionName:'hareketleri azalt',stReduceMotionDesc:'animasyon ve geçişleri mümkün olduğunca kapatır.',stReduceTransparencyName:'şeffaflığı azalt',stReduceTransparencyDesc:'bulanıklık efektlerini kapatıp yüzeyleri daha belirgin yapar.',stLblBehavior:'davranış',stQueueName:'kuyruğu otomatik açma',stQueueDesc:'playlist indirmesi başlarken kuyruk arka planda çalışır.',
    stSubtitleLangName:'tercih edilen altyazı dili',stSubtitleLangDesc:'seçilen dil yoksa İngilizce altyazı denenir.',stLblFilenameStyle:'dosya adı stili',stLblSaving:'kaydetme yöntemi',stSaveAsk:'sor',stSaveDownload:'indir',stSaveShare:'paylaş',stSaveCopy:'kopyala',stNoteSaving:'desteklenmeyen yöntemlerde güvenli indirme seçeneğine dönülür.',stLblSettingsData:'ayar verileri',stImportBtn:'içe aktar',stExportBtn:'dışa aktar',stResetBtn:'sıfırla',stLblLocalData:'yerel veriler',stClearLocalBtn:'geçmişi ve kuyruğu temizle',stNoteLocalData:'ayarların ve dil tercihin korunur; yalnızca ZenithW geçmişi ile yarım kalan kuyruk silinir.',
    stLblQuality:'video kalitesi',stNoteQuality:'tercih edilen kalite seçilir; bulunamazsa en yakın kullanılır.',
    stLblCodec:'youtube codec',stNoteCodec:'h264: max uyumluluk · av1: en iyi kalite, 8k & hdr · vp9: av1 kalitesi',
    stLblVFmt:'video formatı',stNoteVFmt:'mp4: en yüksek uyumluluk · webm: daha iyi kalite/verim, daha az uyumluluk · mkv: gelişmiş altyazı ve ses parçaları · mov: apple ve kurgu uygulamaları · avi: eski cihazlar',stYoutubeAdaptiveName:'YouTube uyarlanabilir kalite',stYoutubeAdaptiveDesc:'Sunucu boşsa en fazla 1080p, yoğun veya kuyrukluysa en fazla 720p seçer. Yalnızca YouTube videolarına uygulanır.',stLblAFmt:'ses formatı',stNoteAFmt:'flac, wav: kayıpsız · mp3, ogg, opus, m4a: kayıplı',
    stLblBitrate:'ses bit hızı',stNoteBitrate:'* Yüksek bitrate seçmek, kaynağın sesini veya kalitesini olağanüstü biçimde artırmaz; düşük kaliteli bir sesi kaliteli hâle getirmez. Yalnızca kayıplı dönüştürmede daha fazla ayrıntıyı koruyabilir ve dosya boyutunu büyütür.',
    stLblTheme:'tema',themeAuto:'otomatik',themeLight:'açık',themeDark:'koyu',
    stNoteTheme:'otomatik tema cihaz ekran modunu takip eder.',
    stLblLang:'dil',stNoteLang:'arayüz dili. tarayıcıdan otomatik algılanır.',
    stLblAccent:'renk teması',stNoteAccent:'tema; arka planı, panelleri, parlamaları ve etkileşim renklerini birlikte değiştirir.',
    stLblMeta:'dosya metadatası',stMetaName:'metadata göm',stMetaDesc:'dosyaya başlık, sanatçı ve platform bilgisi gömülür.',
    stSbName:'SponsorBlock',stSbDesc:'sponsor/reklam bölümlerini videodan otomatik keser (YouTube).',
    stSubName:'altyazı göm',stSubDesc:'mevcutsa altyazıyı videoya gömer (varsayılan dil: tr, yoksa en).',
    stLblFnf:'dosya adı formatı',stNoteFnf:'İndirme başlamadan önce dosya adı bu formata göre oluşturulur.',
    stLblFnfEx:'örnek formatlar',
    connecting:'bağlanıyor...',downloading:'indiriliyor...',merging:'birleştiriliyor...',queued:'sırada bekleniyor...',done:'tamamlandı!',
    found:'video bulundu ✓',downloaded:'indirildi ✓',thumbnailDownloaded:'kapak görseli indirildi',cancelled:'iptal edildi',error:'hata',
    convTitleTxt:'yeni dönüştürme',convModalSub:'dosya, format, dönüştür — hepsi bu',convDropTitle:'dosyanı buraya bırak',convDropSub:'veya bilgisayarından seç · en fazla 95 MB',
    convFmtLabel:'ÇIKIŞ FORMATINI SEÇ',convFmtHint:'hedef dosya türünü belirle',convBtnSel:'önce bir dosya seç',convBtnReady:'{fmt} olarak dönüştür',convBtnHint:'dönüştürme seçiminin ardından başlar',
    convHeroKicker:'MEDYA ATÖLYESİ',convertPageTitle:'Dosyanı dönüştür.<br><span>Kalitesini koru.</span>',convHeroLead:'Video ve ses dosyalarını, sade bir akışla ihtiyacın olan formata çevir.',convTrustSize:'95 MB\'a kadar',convTrustFormats:'19 çıkış formatı',convTrustEngine:'FFmpeg motoru',convChooseFile:'dosya seç',convStepFile:'dosya',convStepFormat:'format',convStepConvert:'dönüştür',convVideoFormats:'VİDEO',convAudioFormats:'SES',convAdviceTitle:'akıllı ve yerel dönüşüm',convAdviceText:'Önce akışlar seçtiğin konteynerle uyumluysa kayıpsız taşınır; uygun değilse FFmpeg güvenli yeniden kodlamaya geçer.',convPreflightLabel:'DÖNÜŞTÜRME ÖZETİ',convPreflightText:'Akışlar uyumluysa önce kayıpsız yol denenir; gerekirse seçili formata güvenli yeniden kodlama yapılır.',
    toolErrorLabel:'NE YAPILABİLİR?',toolErrorConversionTitle:'Dönüştürme tamamlanamadı',toolErrorConversionText:'Video için MP4 veya MKV; ses için MP3 ya da M4A ile tekrar dene. Kaynak dosya bozuk veya desteklenmeyen bir akış içerebilir.',toolErrorRemuxTitle:'Konteyner akışlarla uyumlu değil',toolErrorRemuxText:'Remux yeniden kodlama yapmaz. Farklı bir konteyner gerekiyorsa Dönüştür aracında MP4 veya MKV seç.',toolErrorProbeTitle:'Dosya okunamadı',toolErrorProbeText:'Dosyayı başka bir oynatıcıda açmayı dene veya sağlam bir kopyayla tekrar dene.',toolErrorSizeTitle:'Dosya sınırı aşıldı',toolErrorSizeText:'Bu araç en fazla 95 MB dosyayı işler. Daha küçük bir kesit veya dosya kullan.',toolErrorTimeoutTitle:'İşlem zaman aşımına uğradı',toolErrorTimeoutText:'Kısa süre sonra tekrar dene. Uzun veya ağır dosyalarda daha küçük bir çıktı seçmek yardımcı olabilir.',
    remuxTitleTxt:'remux',remuxModalSub:'konteyneri kayıpsız onar',remuxDropTitle:'dosya sürükle veya seç',remuxDropSub:'video ve ses formatları · en fazla 95 MB',remuxSignalLabel:'KAYIPSIZ YOL',remuxSourceDefault:'DOSYA',remuxTargetDefault:'AYNI KONTEYNER',remuxSignalText:'Akışlar yalnızca seçili konteynere yeniden paketlenir; yeniden kodlama yapılmaz.',
    updTitle:'güncellemeler',
    servicesChipTxt:'desteklenen servisler',servicesTitleTxt:'desteklenen platformlar',servicesModalSub:'500+ platform · tek bağlantı',
    servicesNoteTxt:'bir platformu desteklemek, teknik uyumluluk dışında ilişki anlamına gelmez. tüm sorumluluk kullanıcıdadır.',
    clipHintTxt:'panonda bir link var, yapıştırmak ister misin?',
    ytWarn:'YouTube bağlantıları web sürümünde kapalı. Masaüstü veya mobil uygulamayı deneyin.',
    ytErrTitle:'youtube videosu bulunamadı',ytErrTxt:'youtube bot engelleme aktif olabilir. birkaç dakika bekleyip tekrar deneyin.',
    enterLink:'önce link gir',connErr:'bağlantı hatası',igBusy:'instagram yoğun, 2-3 dk bekle',
    errYoutubeRestricted:'youtube bu indirmeye şu anda izin vermedi. birkaç dakika sonra tekrar deneyin.',errFormatUnavailable:'seçilen format kullanılamıyor. farklı bir format veya kalite deneyin.',
    errRateLimited:'çok fazla istek gönderildi. biraz bekleyip tekrar deneyin.',errServerBusy:'sunucu şu anda yoğun. kısa süre sonra tekrar deneyin.',errTimeout:'işlem beklenenden uzun sürdü. tekrar deneyin.',errFileTooLarge:'dosya izin verilen boyut sınırını aşıyor.',
    errPrivate:'bu video gizli ve indirilemiyor.',errUnavailable:'bu video şu anda kullanılamıyor.',errLive:'canlı yayınlar şu anda desteklenmiyor.',errUnsupported:'Bu bağlantıdan video okunamadı veya site desteklenmiyor. Tek bir videonun sayfa bağlantısını kullan.',errInvalidUrl:'Geçerli bir video sayfası bağlantısı gir. Bağlantı https:// veya http:// ile başlamalı.',
    errPlatformRestricted:'platform bu indirmeye izin vermedi. daha sonra tekrar deneyin.',errNetwork:'bağlantı sorunu oluştu. tekrar deneyin.',errGeneric:'işlem tamamlanamadı. lütfen tekrar deneyin.',errConversion:'dönüştürme tamamlanamadı. dosya formatını kontrol edin.',
    remuxDone:'remux tamamlandı',convDone:'dönüştürüldü ✓',
    uploading:'gönderiliyor...',converting:'dönüştürülüyor...',convDoneLabel:'tamamlandı!',
    historyTitle:'indirme geçmişi',clearHistoryTxt:'geçmişi temizle',historyEmpty:'geçmiş boş',historyLoading:'yükleniyor...',
    donTitle:'destek ol',donSub:'geri bildirimlerin ZenithW\'nin gelişmesine yardımcı olur.',
    donPaparaSub:'türkiye — anlık transfer',donCopyBtn:'kopyala',donFollowBtn:'takip et',donThanks:'her geri bildirim için teşekkür ederiz 🙏',
    donContactName:'iletişim',donContactBtn:'e-posta gönder',
    aboutWhatTitle: 'ZenithW nedir?',
    aboutWhatText: 'ZenithW, desteklenen bağlantılardan video, ses ve oynatma listesi indirmek için bağımsız ve reklamsız bir araçtır. Web sürümünde YouTube bağlantıları şu anda işlenmiyor; masaüstü ve mobil uygulamaların erişimi ayrı çalışır. Diğer desteklenen kaynaklarda bağlantıyı yapıştırıp formatı seçebilirsin.',
    aboutTrustTitle: 'Neden güvenebilirsin?',
    aboutTrustText: 'Klasik "indirme" sitelerinin aksine burada seni takip eden reklam ağı, sahte indirme butonu, yönlendirme ya da pop-up yok. İndirme geçmişin sunucuda asla tutulmaz — sadece kendi tarayıcının belleğinde (localStorage) senin cihazında saklanır ve istediğin an tek tıkla silinebilir. Kod tarafı sürekli güvenlik açısından gözden geçiriliyor: yol geçişi (path traversal) engelleri, istek sınırlama (rate limiting) ve sahte IP koruması gibi önlemler baştan itibaren var.',
    aboutOpenTitle: 'açık kaynak',
    aboutOpenText: 'ZenithW\'nin tüm kaynak kodu <a href="https://github.com/boranseasonnew/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> üzerinde herkese açık ve AGPL-3.0-only lisansıyla paylaşılıyor. Arka planda ne olduğunu merak ediyorsan kod satır satır önünde — gizli bir şey yok. İsteyen inceleyebilir, katkıda bulunabilir ya da kendi sunucusunda çalıştırabilir.',
    queueResumeTpl:'yarım kalan bir indirme kuyruğun var ({done}/{total} tamamlandı) — devam etmek ister misin?',
    aboutDevLabel:'geliştirici',aboutContactLabel:'iletişim',aboutStackLabel:'teknoloji',aboutHostLabel:'hosting',aboutLicLabel:'lisans',
    aboutPrivacyLink:'gizlilik',aboutTermsLink:'kullanım koşulları',aboutDmcaLink:'telif bildirimi',aboutStatusLink:'durum',
    qrTitle:'TELEFONA AKTAR',qrHint:'QR kodu telefonunuzla tarayın',
    remuxInfo1:'<strong>remux ne yapar?</strong> dosya konteynerindeki sorunları düzeltir.',
    remuxInfo2:'<strong>kayıpsız:</strong> codec verisini yeni konteynere kopyalar.',
    plQueueTitle:'playlist indiriliyor',
    plQueueQueued:'sırada',plQueueDownloadingItem:'indiriliyor...',plQueueItemDone:'tamamlandı',plQueueItemErr:'hata',
    plQueueCompletedWord:'tamamlandı',plQueueStopBtn:'durdur',plQueueCloseBtn:'kapat',
    plQueueStoppedMsg:'playlist indirme durduruldu',plQueueDoneMsg:'playlist indirme tamamlandı',plQueueStoppingMsg:'durduruluyor, mevcut indirme tamamlanacak',
    historyRedownload:'tekrar indir',historyCopyLink:'link kopyala',historyClearedMsg:'geçmiş temizlendi',
    bulkNeedLink:'en az bir link gir',bulkMaxLinks:'en fazla 10 link aynı anda',bulkSuccessWord:'başarılı',bulkFailWord:'başarısız',
    langComingSoon:'bu dil yakında geliyor 🚧',
    updBadge:'GÜNCEL',
  },
  en:{
    desktopPromoCloseLabel:'Close',
    youtubeAppCloseLabel:'Close',
    placeholder:'drop a media link here',bulkPlaceholder:'paste links, one per line... (Enter to download, Shift+Enter for a new line)',modeAutoTxt:'automatic',modeAudioTxt:'audio',modeMuteTxt:'mute',bulkToggleTxt:'bulk',paste:'paste',continueBtn:'continue',homeStatusTxt:'service active',homeActivityTitle:'recent activity',homeActivityAllTxt:'view all',homeActivityEmpty:'no downloads in this browser yet',
    vcDl:'download',dlBtn:'download',dlCancel:'cancel',dlAnalysisKicker:'ready',dlAnalysisTitle:'Ready to download',dlAnalysisDesc:'The link has been analyzed. You can adjust quality and audio preferences in Settings.',dlThumbActionTxt:'cover image',dlSettingsTxt:'settings',dlPlanLabel:'download plan',dlPlanVideo:'video plan',dlPlanAudio:'audio plan',dlPlanFallback:'If the source does not offer it, the nearest safe option is used.',dlPlanAdaptive:'YouTube: up to 1080p when idle, 720p when busy.',dlQualityVerified:'Quality verified',dlProgressTitle:'Preparing your download',
    stLblProfiles:'quick quality profiles',profileMinimal:'minimal',profileMinimalDesc:'smaller files · less data',profileStandard:'standard',profileStandardDesc:'balanced quality and compatibility',profileQuality:'quality',profileQualityDesc:'efficient high quality when available',stProfileHint:'A profile sets video and audio preferences together. Changing one setting afterwards switches to custom.',profileCustom:'custom settings',profileActive:'active profile: {name}',profileApplied:'{name} profile applied',
    bbSave:'save',bbHistory:'history',bbRemux:'remux',bbConvert:'convert',bbSettings:'settings',bbUpdates:'updates',bbAbout:'about',bbMore:'more',bbDonate:'support us',
    accDefault:'classic',accDefaultDesc:'ice blue · balanced',accPurple:'neon purple',accPurpleDesc:'electric violet · deep space',accGray:'graphite',accGrayDesc:'neutral gray · minimal',accPink:'neon pink',accPinkDesc:'vivid pink · warm',accCobalt:'cobalt blue',accCobaltDesc:'deep blue · focused',
    saveRetryDownload:'This method did not work here. Tap Download to save the file.',saveCopied:'file copied',saveTitleTxt:'choose how to save',saveDlTxt:'download',saveShareTxt:'share',saveCopyTxt:'copy',
    saveNoteTxt:'if your browser blocked the popup, use the download button.',saveDoneTxt:'done',
    stModalTitle:'settings',stModalSubtitle:'customize your download experience',stNavVideo:'video',stNavAudio:'audio',stNavAppearance:'appearance',stNavAccessibility:'accessibility',stNavMeta:'metadata',stNavFilename:'filename',stNavAdvanced:'advanced',stNavClose:'close',
    stLblVisual:'visual comfort',stReduceMotionName:'reduce motion',stReduceMotionDesc:'disables animations and transitions whenever possible.',stReduceTransparencyName:'reduce transparency',stReduceTransparencyDesc:'disables blur and makes surfaces more solid.',stLblBehavior:'behavior',stQueueName:"don't open the queue automatically",stQueueDesc:'playlist downloads can continue in the background.',
    stSubtitleLangName:'preferred subtitle language',stSubtitleLangDesc:'English subtitles are tried if the selected language is unavailable.',stLblFilenameStyle:'filename style',stLblSaving:'saving method',stSaveAsk:'ask',stSaveDownload:'download',stSaveShare:'share',stSaveCopy:'copy',stNoteSaving:'unsupported methods safely fall back to downloading.',stLblSettingsData:'settings data',stImportBtn:'import',stExportBtn:'export',stResetBtn:'reset',stLblLocalData:'local data',stClearLocalBtn:'clear history and queue',stNoteLocalData:'settings and language stay intact; only ZenithW history and unfinished queue are removed.',
    stLblQuality:'video quality',stNoteQuality:'preferred quality is selected; closest available used if not found.',
    stLblCodec:'youtube codec',stNoteCodec:'h264: max compatibility · av1: best quality, 8k & hdr · vp9: av1 quality',
    stLblVFmt:'video format',stNoteVFmt:'mp4: widest compatibility · webm: better quality/efficiency, lower compatibility · mkv: advanced subtitle and audio tracks · mov: apple and editing apps · avi: legacy devices',stYoutubeAdaptiveName:'YouTube adaptive quality',stYoutubeAdaptiveDesc:'Uses up to 1080p while the server is idle, then up to 720p when work is active or queued. Applies to YouTube video only.',stLblAFmt:'audio format',stNoteAFmt:'flac, wav: lossless · mp3, ogg, opus, m4a: lossy',
    stLblBitrate:'audio bitrate',stNoteBitrate:'* A higher bitrate cannot dramatically improve the source audio or turn poor audio into high quality. It can only preserve more detail during lossy conversion, while increasing file size.',
    stLblTheme:'theme',themeAuto:'auto',themeLight:'light',themeDark:'dark',
    stNoteTheme:'auto theme follows your device display mode.',
    stLblLang:'language',stNoteLang:'interface language. auto-detected from browser.',
    stLblAccent:'color theme',stNoteAccent:'the theme changes the background, panels, glow, and interaction colors together.',
    stLblMeta:'file metadata',stMetaName:'embed metadata',stMetaDesc:'title, artist, and platform info is embedded into the file.',
    stSbName:'SponsorBlock',stSbDesc:'automatically cuts sponsor/ad segments from the video (YouTube).',
    stSubName:'embed subtitles',stSubDesc:'embeds subtitles into the video if available (tries Turkish first, falls back to English).',
    stLblFnf:'filename format',stNoteFnf:'File will be named using this template before download.',
    stLblFnfEx:'example formats',
    connecting:'connecting...',downloading:'downloading...',merging:'merging...',queued:'waiting in queue...',done:'done!',
    found:'video found ✓',downloaded:'downloaded ✓',thumbnailDownloaded:'thumbnail downloaded',cancelled:'cancelled',error:'error',
    convTitleTxt:'new conversion',convModalSub:'file, format, convert — that simple',convDropTitle:'drop your file here',convDropSub:'or choose from your computer · up to 95 MB',
    convFmtLabel:'SELECT OUTPUT FORMAT',convFmtHint:'choose the target file type',convBtnSel:'choose a file first',convBtnReady:'convert to {fmt}',convBtnHint:'conversion starts after your selection',
    convHeroKicker:'MEDIA STUDIO',convertPageTitle:'Convert your file.<br><span>Keep the quality.</span>',convHeroLead:'Turn video and audio files into the format you need with a clean, focused workflow.',convTrustSize:'up to 95 MB',convTrustFormats:'19 output formats',convTrustEngine:'FFmpeg engine',convChooseFile:'choose file',convStepFile:'file',convStepFormat:'format',convStepConvert:'convert',convVideoFormats:'VIDEO',convAudioFormats:'AUDIO',convAdviceTitle:'smart, local conversion',convAdviceText:'If the selected container accepts the streams, ZenithW copies them losslessly first. Otherwise, FFmpeg falls back to a safe re-encode.',convPreflightLabel:'CONVERSION SUMMARY',convPreflightText:'If streams are compatible, ZenithW tries the lossless path first; otherwise it safely re-encodes to the selected format.',
    toolErrorLabel:'WHAT TO TRY',toolErrorConversionTitle:'Conversion could not finish',toolErrorConversionText:'Try MP4 or MKV for video, or MP3/M4A for audio. The source may be damaged or use an unsupported stream.',toolErrorRemuxTitle:'The container cannot hold these streams',toolErrorRemuxText:'Remux does not re-encode. If you need a different container, use Convert and choose MP4 or MKV.',toolErrorProbeTitle:'The file could not be read',toolErrorProbeText:'Try opening it in another player, then retry with an intact copy.',toolErrorSizeTitle:'The file is above the limit',toolErrorSizeText:'This tool handles files up to 95 MB. Use a shorter clip or smaller source file.',toolErrorTimeoutTitle:'The operation timed out',toolErrorTimeoutText:'Try again shortly. For long or demanding files, choosing a smaller output can help.',
    remuxTitleTxt:'remux',remuxModalSub:'repair the container without re-encoding',remuxDropTitle:'drag & drop or select file',remuxDropSub:'video and audio formats · up to 95 MB',remuxSignalLabel:'LOSSLESS PATH',remuxSourceDefault:'FILE',remuxTargetDefault:'SAME CONTAINER',remuxSignalText:'Streams are only repackaged into the selected container; nothing is re-encoded.',
    updTitle:'updates',
    servicesChipTxt:'supported services',servicesTitleTxt:'supported platforms',servicesModalSub:'500+ platforms · one link',
    servicesNoteTxt:'supporting a service does not imply affiliation beyond technical compatibility.',
    clipHintTxt:'found a link in your clipboard — want to paste it?',
    ytWarn:'YouTube links are disabled on the web. Try the Desktop or mobile app.',
    ytErrTitle:'youtube video not found',ytErrTxt:"youtube's bot detection may be active. please wait a few minutes and try again.",
    enterLink:'enter a link first',connErr:'connection error',igBusy:'instagram is busy, wait 2-3 min',
    errYoutubeRestricted:'youtube did not allow this download. wait a few minutes and try again.',errFormatUnavailable:'the selected format is unavailable. try another format or quality.',
    errRateLimited:'too many requests were sent. wait a moment and try again.',errServerBusy:'the server is busy right now. try again shortly.',errTimeout:'the operation took too long. please try again.',errFileTooLarge:'the file exceeds the allowed size limit.',
    errPrivate:'this video is private and cannot be downloaded.',errUnavailable:'this video is currently unavailable.',errLive:'live streams are not currently supported.',errUnsupported:'This link does not contain a supported video, or the site is not supported. Use the page link for a single video.',errInvalidUrl:'Enter a valid video page link starting with https:// or http://.',
    errPlatformRestricted:'the platform did not allow this download. try again later.',errNetwork:'a connection problem occurred. please try again.',errGeneric:'the operation could not be completed. please try again.',errConversion:'conversion could not be completed. check the file format.',
    remuxDone:'remux done',convDone:'converted ✓',
    uploading:'uploading...',converting:'converting...',convDoneLabel:'done!',
    historyTitle:'download history',clearHistoryTxt:'clear history',historyEmpty:'history empty',historyLoading:'loading...',
    donTitle:'support us',donSub:'your feedback helps ZenithW keep improving.',
    donPaparaSub:'turkey — instant transfer',donCopyBtn:'copy',donFollowBtn:'follow',donThanks:'thank you for every piece of feedback 🙏',
    donContactName:'contact',donContactBtn:'send email',
    aboutWhatTitle: 'What is ZenithW & yt-dlp?',
    aboutWhatText: 'ZenithW is an independent media tool focused on clean, modern design. In the background, it runs <strong>yt-dlp</strong>, the world\'s most advanced open-source download engine. This allows it to fetch high-quality audio and video streams directly from the source servers.',
    aboutTrustTitle: 'Why should you trust us?',
    aboutTrustText: 'Unlike traditional downloader sites, ZenithW has no tracking ad networks, redirects, or pop-ups. Your download history is never stored on the server; it remains strictly inside your browser\'s memory (localStorage).',
    aboutOpenTitle: 'open source',
    aboutOpenText: 'ZenithW\'s entire source code is public on <a href="https://github.com/boranseasonnew/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> under the AGPL-3.0-only license. If you\'re curious what\'s happening behind the scenes, it\'s all right there, line by line — nothing hidden. Anyone can review it, contribute, or even run their own instance.',
    queueResumeTpl:'you have an unfinished download queue ({done}/{total} completed) — want to continue?',
    aboutHowTitle: 'How does it work?',
    aboutHowText: 'Paste the link → ZenithW analyzes the video and shows you the available quality and format options → pick one and download it. Video, audio (mp3/m4a), mute mode, and bulk/playlist downloads are all supported, plus the built-in convert and remux tools for files you already have. The whole process finishes in seconds, without ever leaving the tab.',
    aboutDevLabel:'developer',aboutContactLabel:'contact',aboutStackLabel:'stack',aboutHostLabel:'hosting',aboutLicLabel:'license',
    aboutPrivacyLink:'privacy',aboutTermsLink:'terms of service',aboutDmcaLink:'copyright notice',aboutStatusLink:'status',
    qrTitle:'SEND TO PHONE',qrHint:'Scan QR code with your phone',
    remuxInfo1:'<strong>what does remux do?</strong> fixes issues in the file container.',
    remuxInfo2:'<strong>lossless:</strong> copies the codec data into a new container without re-encoding.',
    plQueueTitle:'downloading playlist',
    plQueueQueued:'queued',plQueueDownloadingItem:'downloading...',plQueueItemDone:'done',plQueueItemErr:'error',
    plQueueCompletedWord:'completed',plQueueStopBtn:'stop',plQueueCloseBtn:'close',
    plQueueStoppedMsg:'playlist download stopped',plQueueDoneMsg:'playlist download completed',plQueueStoppingMsg:'stopping — current download will finish',
    historyRedownload:'redownload',historyCopyLink:'copy link',historyClearedMsg:'history cleared',
    bulkNeedLink:'enter at least one link',bulkMaxLinks:'max 10 links at once',bulkSuccessWord:'successful',bulkFailWord:'failed',
    langComingSoon:'this language is coming soon 🚧',
    updBadge:'LATEST',
  },
  fr:{
    desktopPromoCloseLabel:'Fermer',
    youtubeAppCloseLabel:'Fermer',
    placeholder:'déposez un lien média ici',bulkPlaceholder:'collez les liens, un par ligne... (Entrée pour télécharger, Maj+Entrée pour une nouvelle ligne)',modeAutoTxt:'automatique',modeAudioTxt:'audio',modeMuteTxt:'muet',bulkToggleTxt:'lot',paste:'coller',continueBtn:'continuer',homeStatusTxt:'service actif',homeActivityTitle:'activité récente',homeActivityAllTxt:'tout voir',homeActivityEmpty:'aucun téléchargement dans ce navigateur pour le moment',
    vcDl:'télécharger',dlBtn:'télécharger',dlCancel:'annuler',dlAnalysisKicker:'prêt',dlAnalysisTitle:'Prêt à télécharger',dlAnalysisDesc:'Le lien a été analysé. Vous pouvez modifier la qualité et le son dans les paramètres.',dlThumbActionTxt:'image de couverture',dlSettingsTxt:'paramètres',dlPlanLabel:'plan de téléchargement',dlPlanVideo:'plan vidéo',dlPlanAudio:'plan audio',dlPlanFallback:'Si la source ne le propose pas, l’option sûre la plus proche est utilisée.',dlPlanAdaptive:'YouTube : jusqu’à 1080p au repos, 720p en charge.',dlQualityVerified:'Qualité vérifiée',dlProgressTitle:'Préparation du téléchargement',
    stLblProfiles:'profils de qualité rapides',profileMinimal:'minimal',profileMinimalDesc:'fichiers plus légers · moins de données',profileStandard:'standard',profileStandardDesc:'équilibre entre qualité et compatibilité',profileQuality:'qualité',profileQualityDesc:'haute qualité efficace si disponible',stProfileHint:'Un profil définit ensemble les préférences vidéo et audio. Modifier un réglage passe en mode personnalisé.',profileCustom:'réglages personnalisés',profileActive:'profil actif : {name}',profileApplied:'profil {name} appliqué',
    bbSave:'enregistrer',bbHistory:'historique',bbRemux:'remux',bbConvert:'convertir',bbSettings:'paramètres',bbUpdates:'nouveautés',bbAbout:'à propos',bbMore:'plus',bbDonate:'soutenir',
    accDefault:'classique',accDefaultDesc:'bleu glacier · équilibré',accPurple:'violet néon',accPurpleDesc:'violet électrique · espace',accGray:'graphite',accGrayDesc:'gris neutre · minimal',accPink:'rose néon',accPinkDesc:'rose vif · chaleureux',accCobalt:'bleu cobalt',accCobaltDesc:'bleu profond · précis',
    saveTitleTxt:'comment voulez-vous enregistrer ?',saveDlTxt:'télécharger',saveShareTxt:'partager',saveCopyTxt:'copier',
    saveNoteTxt:'si votre navigateur bloque la fenêtre pop-up, utilisez le bouton "télécharger".',saveDoneTxt:'terminé',
    stModalTitle:'paramètres',stModalSubtitle:'personnalisez votre expérience',stNavVideo:'vidéo',stNavAudio:'audio',stNavAppearance:'apparence',stNavAccessibility:'accessibilité',stNavMeta:'métadonnées',stNavFilename:'nom de fichier',stNavAdvanced:'avancé',stNavClose:'fermer',
    stLblVisual:'confort visuel',stReduceMotionName:'réduire les animations',stReduceMotionDesc:'désactive les animations et transitions si possible.',stReduceTransparencyName:'réduire la transparence',stReduceTransparencyDesc:'désactive le flou et renforce les surfaces.',stLblBehavior:'comportement',stQueueName:"ne pas ouvrir la file automatiquement",stQueueDesc:'les téléchargements continuent en arrière-plan.',
    stSubtitleLangName:'langue de sous-titres préférée',stSubtitleLangDesc:"l'anglais est essayé si la langue choisie manque.",stLblFilenameStyle:'style du nom',stLblSaving:'méthode d’enregistrement',stSaveAsk:'demander',stSaveDownload:'télécharger',stSaveShare:'partager',stSaveCopy:'copier',stNoteSaving:'une méthode non prise en charge revient au téléchargement.',stLblSettingsData:'données des paramètres',stImportBtn:'importer',stExportBtn:'exporter',stResetBtn:'réinitialiser',stLblLocalData:'données locales',stClearLocalBtn:'effacer historique et file',stNoteLocalData:'les paramètres et la langue sont conservés.',
    stLblQuality:'qualité vidéo',stNoteQuality:'la qualité préférée est sélectionnée ; la plus proche disponible est utilisée si introuvable.',
    stLblCodec:'codec youtube',stNoteCodec:'h264 : compatibilité maximale · av1 : meilleure qualité, 8k & hdr · vp9 : qualité proche de av1',
    stLblVFmt:'format vidéo',stNoteVFmt:'mp4 : compatibilité maximale · webm : meilleure qualité/efficacité, compatibilité réduite · mkv : pistes audio et sous-titres avancées · mov : apple et montage · avi : anciens appareils',stYoutubeAdaptiveName:'qualité YouTube adaptative',stYoutubeAdaptiveDesc:'Utilise jusqu’à 1080p lorsque le serveur est libre, puis jusqu’à 720p en cas d’activité ou de file d’attente. Uniquement pour les vidéos YouTube.',stLblAFmt:'format audio',stNoteAFmt:'flac, wav : sans perte · mp3, ogg, opus, m4a : avec perte',
    stLblBitrate:'débit audio',stNoteBitrate:'* Un débit plus élevé ne peut pas améliorer radicalement la source ni transformer un son médiocre en haute qualité. Il peut seulement préserver davantage de détails lors d’une conversion avec perte, au prix d’un fichier plus lourd.',
    stLblTheme:'thème',themeAuto:'auto',themeLight:'clair',themeDark:'sombre',
    stNoteTheme:'le thème auto suit le mode d\'affichage de votre appareil.',
    stLblLang:'langue',stNoteLang:'langue de l\'interface. détectée automatiquement depuis le navigateur.',
    stLblAccent:'thème de couleur',stNoteAccent:'le thème modifie ensemble le fond, les panneaux, les lueurs et les interactions.',
    stLblMeta:'métadonnées du fichier',stMetaName:'intégrer les métadonnées',stMetaDesc:'le titre, l\'artiste et la plateforme sont intégrés au fichier.',
    stSbName:'SponsorBlock',stSbDesc:'coupe automatiquement les segments sponsorisés/publicitaires de la vidéo (YouTube).',
    stSubName:'intégrer les sous-titres',stSubDesc:'intègre les sous-titres à la vidéo si disponibles (essaie le turc en premier, puis l\'anglais).',
    stLblFnf:'format du nom de fichier',stNoteFnf:'le nom du fichier sera généré selon ce modèle avant le téléchargement.',
    stLblFnfEx:'exemples de formats',
    connecting:'connexion...',downloading:'téléchargement...',merging:'fusion...',done:'terminé !',
    found:'vidéo trouvée ✓',downloaded:'téléchargé ✓',thumbnailDownloaded:'miniature téléchargée',cancelled:'annulé',error:'erreur',
    convTitleTxt:'nouvelle conversion',convModalSub:'fichier, format, convertir — simplement',convDropTitle:'déposez votre fichier ici',convDropSub:'ou choisissez-le sur votre ordinateur · 95 Mo max.',
    convFmtLabel:'CHOISIR LE FORMAT DE SORTIE',convFmtHint:'choisissez le type de fichier cible',convBtnSel:'choisissez d’abord un fichier',convBtnReady:'convertir en {fmt}',convBtnHint:'la conversion démarre après votre sélection',
    convHeroKicker:'STUDIO MÉDIA',convertPageTitle:'Convertissez votre fichier.<br><span>Préservez sa qualité.</span>',convHeroLead:'Transformez vos fichiers vidéo et audio dans le format voulu avec un flux simple.',convTrustSize:'jusqu’à 95 Mo',convTrustFormats:'19 formats de sortie',convTrustEngine:'moteur FFmpeg',convChooseFile:'choisir un fichier',convStepFile:'fichier',convStepFormat:'format',convStepConvert:'convertir',convVideoFormats:'VIDÉO',convAudioFormats:'AUDIO',convAdviceTitle:'conversion locale intelligente',convAdviceText:'Si le conteneur choisi accepte les flux, ZenithW les copie d’abord sans perte. Sinon, FFmpeg passe à un réencodage sûr.',convPreflightLabel:'RÉSUMÉ DE CONVERSION',convPreflightText:'Si les flux sont compatibles, ZenithW essaie d’abord le chemin sans perte ; sinon, il réencode sûrement vers le format choisi.',
    toolErrorLabel:'À ESSAYER',toolErrorConversionTitle:'La conversion n’a pas pu se terminer',toolErrorConversionText:'Essayez MP4 ou MKV pour la vidéo, MP3 ou M4A pour l’audio. Le fichier peut être endommagé ou contenir un flux non pris en charge.',toolErrorRemuxTitle:'Le conteneur ne peut pas contenir ces flux',toolErrorRemuxText:'Le remux ne réencode pas. Pour un autre conteneur, utilisez Convertir avec MP4 ou MKV.',toolErrorProbeTitle:'Le fichier n’a pas pu être lu',toolErrorProbeText:'Essayez de l’ouvrir dans un autre lecteur puis réessayez avec une copie intacte.',toolErrorSizeTitle:'Le fichier dépasse la limite',toolErrorSizeText:'Cet outil traite les fichiers jusqu’à 95 Mo. Utilisez un extrait plus court ou un fichier plus léger.',toolErrorTimeoutTitle:'L’opération a expiré',toolErrorTimeoutText:'Réessayez dans un instant. Pour les fichiers longs ou exigeants, une sortie plus légère peut aider.',
    remuxTitleTxt:'remux',remuxModalSub:'réparez le conteneur sans réencodage',remuxDropTitle:'glissez ou choisissez un fichier',remuxDropSub:'formats vidéo et audio · 95 Mo maximum',remuxSignalLabel:'PARCOURS SANS PERTE',remuxSourceDefault:'FICHIER',remuxTargetDefault:'MÊME CONTENEUR',remuxSignalText:'Les flux sont seulement réemballés dans le conteneur choisi ; rien n’est réencodé.',
    updTitle:'nouveautés',
    servicesChipTxt:'services pris en charge',servicesTitleTxt:'plateformes prises en charge',servicesModalSub:'500+ plateformes · un seul lien',
    servicesNoteTxt:'la prise en charge d\'une plateforme n\'implique aucune affiliation au-delà de la compatibilité technique.',
    clipHintTxt:'un lien a été trouvé dans votre presse-papiers — voulez-vous le coller ?',
    ytWarn:'Les liens YouTube sont désactivés sur le web. Essayez l’application de bureau ou mobile.',
    ytErrTitle:'vidéo youtube introuvable',ytErrTxt:'la détection anti-bot de youtube est peut-être active. réessayez dans quelques minutes.',
    enterLink:'entrez d\'abord un lien',connErr:'erreur de connexion',igBusy:'instagram est occupé, attendez 2-3 min',
    errYoutubeRestricted:'youtube n\'a pas autorisé ce téléchargement. réessayez dans quelques minutes.',errFormatUnavailable:'le format sélectionné est indisponible. essayez un autre format ou une autre qualité.',
    errRateLimited:'trop de requêtes ont été envoyées. patientez puis réessayez.',errServerBusy:'le serveur est occupé. réessayez dans quelques instants.',errTimeout:'l\'opération a pris trop de temps. veuillez réessayer.',errFileTooLarge:'le fichier dépasse la taille autorisée.',
    errPrivate:'cette vidéo est privée et ne peut pas être téléchargée.',errUnavailable:'cette vidéo est actuellement indisponible.',errLive:'les diffusions en direct ne sont pas prises en charge.',errUnsupported:'Ce lien ne contient pas de vidéo prise en charge, ou le site n’est pas pris en charge. Utilise le lien de la page d’une seule vidéo.',errInvalidUrl:'Saisis un lien valide vers une page vidéo, commençant par https:// ou http://.',
    errPlatformRestricted:'la plateforme n\'a pas autorisé ce téléchargement. réessayez plus tard.',errNetwork:'un problème de connexion est survenu. réessayez.',errGeneric:'l\'opération n\'a pas pu être terminée. veuillez réessayer.',errConversion:'la conversion a échoué. vérifiez le format du fichier.',
    remuxDone:'remux terminé',convDone:'converti ✓',
    uploading:'envoi...',converting:'conversion...',convDoneLabel:'terminé !',
    historyTitle:'historique des téléchargements',clearHistoryTxt:'effacer l\'historique',historyEmpty:'historique vide',historyLoading:'chargement...',
    donTitle:'soutenir zenithw',donSub:'vos retours aident ZenithW à progresser.',
    donPaparaSub:'turquie — virement instantané',donCopyBtn:'copier',donFollowBtn:'suivre',donThanks:'merci pour chaque retour 🙏',
    donContactName:'contact',donContactBtn:'envoyer un e-mail',
    aboutWhatTitle: 'qu\'est-ce que zenithw ?',
    aboutWhatText: 'ZenithW est un outil indépendant et sans publicité pour télécharger des vidéos, de l\'audio et des playlists depuis les sources prises en charge. Les liens YouTube ne sont actuellement pas traités sur le web ; les applications de bureau et mobile utilisent une connexion distincte. Pour les autres sources, collez le lien et choisissez le format.',
    aboutTrustTitle: 'pourquoi nous faire confiance ?',
    aboutTrustText: 'Contrairement aux sites de téléchargement classiques, il n\'y a ici aucun réseau publicitaire qui vous suit, aucun faux bouton de téléchargement, aucune redirection ni pop-up. Votre historique de téléchargement n\'est jamais stocké sur le serveur — il reste uniquement dans la mémoire de votre propre navigateur (localStorage) et peut être supprimé en un clic à tout moment. Le code est régulièrement revu pour la sécurité : protection contre le path traversal, limitation du débit de requêtes et protection anti-usurpation d\'ip sont en place dès le départ.',
    aboutOpenTitle: 'code source ouvert',
    aboutOpenText: 'Tout le code source de ZenithW est public sur <a href="https://github.com/boranseasonnew/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> sous licence AGPL-3.0-only. Si vous êtes curieux de savoir ce qui se passe en coulisses, tout est là, ligne par ligne — rien n\'est caché. N\'importe qui peut le consulter, contribuer ou même faire tourner sa propre instance.',
    queueResumeTpl:'il vous reste une file de téléchargement inachevée ({done}/{total} terminés) — voulez-vous continuer ?',
    aboutHowTitle: 'comment ça marche ?',
    aboutHowText: 'Vous collez le lien → ZenithW analyse la vidéo et affiche les options de qualité et de format disponibles → vous choisissez et téléchargez. Vidéo, audio (mp3/m4a), mode muet et téléchargement groupé (playlist) sont pris en charge ; vous pouvez aussi convertir ou remuxer vos propres fichiers avec les outils intégrés. Tout le processus se termine en quelques secondes, sans jamais quitter l\'onglet.',
    aboutDevLabel:'développeur',aboutContactLabel:'contact',aboutStackLabel:'technologies',aboutHostLabel:'hébergement',aboutLicLabel:'licence',
    aboutPrivacyLink:'confidentialité',aboutTermsLink:'conditions d\'utilisation',aboutDmcaLink:'avis de droit d\'auteur',aboutStatusLink:'statut',
    qrTitle:'ENVOYER SUR TÉLÉPHONE',qrHint:'scannez le code qr avec votre téléphone',
    remuxInfo1:'<strong>que fait le remux ?</strong> corrige les problèmes du conteneur du fichier.',
    remuxInfo2:'<strong>sans perte :</strong> copie les données du codec dans un nouveau conteneur sans réencodage.',
    plQueueTitle:'téléchargement de la playlist',
    plQueueQueued:'en attente',plQueueDownloadingItem:'téléchargement...',plQueueItemDone:'terminé',plQueueItemErr:'erreur',
    plQueueCompletedWord:'terminé',plQueueStopBtn:'arrêter',plQueueCloseBtn:'fermer',
    plQueueStoppedMsg:'téléchargement de la playlist arrêté',plQueueDoneMsg:'téléchargement de la playlist terminé',plQueueStoppingMsg:'arrêt en cours — le téléchargement actuel va se terminer',
    historyRedownload:'retélécharger',historyCopyLink:'copier le lien',historyClearedMsg:'historique effacé',
    bulkNeedLink:'entrez au moins un lien',bulkMaxLinks:'10 liens maximum à la fois',bulkSuccessWord:'réussi',bulkFailWord:'échoué',
    langComingSoon:'cette langue arrive bientôt 🚧',
    updBadge:'RÉCENT',
  },
  de:{
    desktopPromoCloseLabel:'Schließen',
    youtubeAppCloseLabel:'Schließen',
    placeholder:'medienlink hier ablegen',bulkPlaceholder:'links einfügen, einen pro Zeile... (Enter zum Herunterladen, Umschalt+Enter für neue Zeile)',modeAutoTxt:'automatisch',modeAudioTxt:'audio',modeMuteTxt:'stumm',bulkToggleTxt:'stapel',paste:'einfügen',continueBtn:'weiter',homeStatusTxt:'dienst aktiv',homeActivityTitle:'letzte aktivitäten',homeActivityAllTxt:'alle ansehen',homeActivityEmpty:'noch keine downloads in diesem browser',
    vcDl:'herunterladen',dlBtn:'herunterladen',dlCancel:'abbrechen',dlAnalysisKicker:'bereit',dlAnalysisTitle:'Bereit zum Herunterladen',dlAnalysisDesc:'Der Link wurde analysiert. Qualität und Audio lassen sich in den Einstellungen anpassen.',dlThumbActionTxt:'Vorschaubild',dlSettingsTxt:'Einstellungen',dlPlanLabel:'download-plan',dlPlanVideo:'video-plan',dlPlanAudio:'audio-plan',dlPlanFallback:'Wenn die Quelle es nicht anbietet, wird die nächstbeste sichere Option verwendet.',dlPlanAdaptive:'YouTube: bis 1080p bei Leerlauf, 720p bei Auslastung.',dlQualityVerified:'Qualität bestätigt',dlProgressTitle:'Download wird vorbereitet',
    stLblProfiles:'schnelle qualitätsprofile',profileMinimal:'minimal',profileMinimalDesc:'kleinere dateien · weniger daten',profileStandard:'standard',profileStandardDesc:'ausgewogene qualität und kompatibilität',profileQuality:'qualität',profileQualityDesc:'effiziente hohe qualität, wenn verfügbar',stProfileHint:'Ein Profil setzt Video- und Audioeinstellungen zusammen. Eine spätere Einzeländerung wechselt zu Benutzerdefiniert.',profileCustom:'benutzerdefinierte einstellungen',profileActive:'aktives profil: {name}',profileApplied:'Profil {name} angewendet',
    bbSave:'speichern',bbHistory:'verlauf',bbRemux:'remux',bbConvert:'konvertieren',bbSettings:'einstellungen',bbUpdates:'neuigkeiten',bbAbout:'über',bbMore:'mehr',bbDonate:'unterstützen',
    accDefault:'klassisch',accDefaultDesc:'eisblau · ausgewogen',accPurple:'neon-lila',accPurpleDesc:'elektrisches lila · weltraum',accGray:'graphit',accGrayDesc:'neutrales grau · minimal',accPink:'neon-pink',accPinkDesc:'lebendiges pink · warm',accCobalt:'kobaltblau',accCobaltDesc:'tiefblau · fokussiert',
    saveTitleTxt:'wie möchtest du speichern?',saveDlTxt:'herunterladen',saveShareTxt:'teilen',saveCopyTxt:'kopieren',
    saveNoteTxt:'wenn dein browser das pop-up blockiert, nutze den "herunterladen"-button.',saveDoneTxt:'fertig',
    stModalTitle:'einstellungen',stModalSubtitle:'download-erlebnis anpassen',stNavVideo:'video',stNavAudio:'audio',stNavAppearance:'erscheinungsbild',stNavAccessibility:'barrierefreiheit',stNavMeta:'metadaten',stNavFilename:'dateiname',stNavAdvanced:'erweitert',stNavClose:'schließen',
    stLblVisual:'visueller komfort',stReduceMotionName:'bewegung reduzieren',stReduceMotionDesc:'deaktiviert animationen und übergänge soweit möglich.',stReduceTransparencyName:'transparenz reduzieren',stReduceTransparencyDesc:'deaktiviert weichzeichnung und verstärkt flächen.',stLblBehavior:'verhalten',stQueueName:'warteschlange nicht automatisch öffnen',stQueueDesc:'playlist-downloads laufen im hintergrund weiter.',
    stSubtitleLangName:'bevorzugte untertitelsprache',stSubtitleLangDesc:'Englisch wird versucht, wenn die Sprache fehlt.',stLblFilenameStyle:'dateinamenstil',stLblSaving:'speichermethode',stSaveAsk:'fragen',stSaveDownload:'download',stSaveShare:'teilen',stSaveCopy:'kopieren',stNoteSaving:'nicht unterstützte methoden wechseln sicher zum download.',stLblSettingsData:'einstellungsdaten',stImportBtn:'importieren',stExportBtn:'exportieren',stResetBtn:'zurücksetzen',stLblLocalData:'lokale daten',stClearLocalBtn:'verlauf und warteschlange löschen',stNoteLocalData:'einstellungen und sprache bleiben erhalten.',
    stLblQuality:'videoqualität',stNoteQuality:'die bevorzugte qualität wird gewählt; falls nicht verfügbar, wird die nächstliegende genutzt.',
    stLblCodec:'youtube-codec',stNoteCodec:'h264: maximale kompatibilität · av1: beste qualität, 8k & hdr · vp9: qualität nahe an av1',
    stLblVFmt:'videoformat',stNoteVFmt:'mp4: höchste kompatibilität · webm: bessere qualität/effizienz, geringere kompatibilität · mkv: erweiterte untertitel- und audiospuren · mov: apple und schnittprogramme · avi: ältere geräte',stYoutubeAdaptiveName:'adaptive YouTube-Qualität',stYoutubeAdaptiveDesc:'Verwendet bis zu 1080p bei freiem Server und bis zu 720p bei aktiver oder wartender Arbeit. Gilt nur für YouTube-Videos.',stLblAFmt:'audioformat',stNoteAFmt:'flac, wav: verlustfrei · mp3, ogg, opus, m4a: verlustbehaftet',
    stLblBitrate:'audio-bitrate',stNoteBitrate:'* Eine höhere Bitrate kann die Qualität der Quelle nicht drastisch verbessern und macht schlechten Ton nicht hochwertig. Sie kann bei verlustbehafteter Konvertierung nur mehr Details erhalten und vergrößert die Datei.',
    stLblTheme:'design',themeAuto:'auto',themeLight:'hell',themeDark:'dunkel',
    stNoteTheme:'das auto-design folgt dem anzeigemodus deines geräts.',
    stLblLang:'sprache',stNoteLang:'sprache der oberfläche. wird automatisch vom browser erkannt.',
    stLblAccent:'farbthema',stNoteAccent:'das thema ändert hintergrund, flächen, leuchten und interaktionsfarben gemeinsam.',
    stLblMeta:'datei-metadaten',stMetaName:'metadaten einbetten',stMetaDesc:'titel, künstler und plattform werden in die datei eingebettet.',
    stSbName:'SponsorBlock',stSbDesc:'schneidet sponsor-/werbeabschnitte automatisch aus dem video (YouTube).',
    stSubName:'untertitel einbetten',stSubDesc:'bettet Untertitel ins Video ein, falls verfügbar (zuerst Türkisch, sonst Englisch).',
    stLblFnf:'dateinamenformat',stNoteFnf:'der dateiname wird vor dem download nach diesem muster erstellt.',
    stLblFnfEx:'beispielformate',
    connecting:'verbinde...',downloading:'lädt herunter...',merging:'wird zusammengeführt...',done:'fertig!',
    found:'video gefunden ✓',downloaded:'heruntergeladen ✓',thumbnailDownloaded:'vorschaubild heruntergeladen',cancelled:'abgebrochen',error:'fehler',
    convTitleTxt:'neue konvertierung',convModalSub:'datei, format, konvertieren — ganz einfach',convDropTitle:'datei hier ablegen',convDropSub:'oder vom computer auswählen · maximal 95 MB',
    convFmtLabel:'AUSGABEFORMAT WÄHLEN',convFmtHint:'zieldateityp festlegen',convBtnSel:'zuerst eine datei auswählen',convBtnReady:'in {fmt} konvertieren',convBtnHint:'die konvertierung startet nach der auswahl',
    convHeroKicker:'MEDIA STUDIO',convertPageTitle:'Datei konvertieren.<br><span>Qualität behalten.</span>',convHeroLead:'Video- und Audiodateien in einem klaren Ablauf in das gewünschte Format umwandeln.',convTrustSize:'bis zu 95 MB',convTrustFormats:'19 ausgabeformate',convTrustEngine:'FFmpeg-engine',convChooseFile:'datei auswählen',convStepFile:'datei',convStepFormat:'format',convStepConvert:'konvertieren',convVideoFormats:'VIDEO',convAudioFormats:'AUDIO',convAdviceTitle:'intelligente lokale konvertierung',convAdviceText:'Akzeptiert der gewählte Container die Streams, kopiert ZenithW sie zuerst verlustfrei. Andernfalls folgt ein sicheres FFmpeg-Neu-Encoding.',convPreflightLabel:'KONVERTIERUNGSÜBERSICHT',convPreflightText:'Sind die Streams kompatibel, versucht ZenithW zuerst den verlustfreien Weg; andernfalls wird sicher in das gewählte Format neu kodiert.',
    toolErrorLabel:'DAS KANNST DU TUN',toolErrorConversionTitle:'Die Konvertierung konnte nicht abgeschlossen werden',toolErrorConversionText:'Versuche MP4 oder MKV für Video sowie MP3 oder M4A für Audio. Die Quelldatei kann beschädigt sein oder einen nicht unterstützten Stream enthalten.',toolErrorRemuxTitle:'Der Container kann diese Streams nicht aufnehmen',toolErrorRemuxText:'Remux kodiert nicht neu. Verwende für einen anderen Container Konvertieren mit MP4 oder MKV.',toolErrorProbeTitle:'Die Datei konnte nicht gelesen werden',toolErrorProbeText:'Öffne sie testweise in einem anderen Player und versuche es dann mit einer intakten Kopie erneut.',toolErrorSizeTitle:'Die Dateigröße überschreitet das Limit',toolErrorSizeText:'Dieses Werkzeug verarbeitet Dateien bis 95 MB. Verwende einen kürzeren Ausschnitt oder eine kleinere Quelldatei.',toolErrorTimeoutTitle:'Der Vorgang ist abgelaufen',toolErrorTimeoutText:'Versuche es gleich noch einmal. Bei langen oder anspruchsvollen Dateien kann eine kleinere Ausgabe helfen.',
    remuxTitleTxt:'remux',remuxModalSub:'container ohne neu-encoding reparieren',remuxDropTitle:'datei per drag & drop oder auswählen',remuxDropSub:'video- und audioformate · maximal 95 MB',remuxSignalLabel:'VERLUSTFREIER PFAD',remuxSourceDefault:'DATEI',remuxTargetDefault:'GLEICHER CONTAINER',remuxSignalText:'Streams werden nur in den gewählten Container umgepackt; nichts wird neu kodiert.',
    updTitle:'neuigkeiten',
    servicesChipTxt:'unterstützte dienste',servicesTitleTxt:'unterstützte plattformen',servicesModalSub:'500+ plattformen · ein link',
    servicesNoteTxt:'die unterstützung einer plattform bedeutet keine zusammenarbeit über die technische kompatibilität hinaus.',
    clipHintTxt:'ein link wurde in deiner zwischenablage gefunden — möchtest du ihn einfügen?',
    ytWarn:'YouTube-Links sind im Web deaktiviert. Versuche die Desktop- oder Mobil-App.',
    ytErrTitle:'youtube-video nicht gefunden',ytErrTxt:'youtubes bot-erkennung ist möglicherweise aktiv. bitte warte ein paar minuten und versuche es erneut.',
    enterLink:'zuerst einen link eingeben',connErr:'verbindungsfehler',igBusy:'instagram ist ausgelastet, 2-3 min warten',
    errYoutubeRestricted:'youtube hat diesen download nicht zugelassen. warte einige minuten und versuche es erneut.',errFormatUnavailable:'das gewählte format ist nicht verfügbar. versuche ein anderes format oder eine andere qualität.',
    errRateLimited:'zu viele anfragen wurden gesendet. warte kurz und versuche es erneut.',errServerBusy:'der server ist derzeit ausgelastet. versuche es gleich erneut.',errTimeout:'der vorgang hat zu lange gedauert. bitte versuche es erneut.',errFileTooLarge:'die datei überschreitet die erlaubte größe.',
    errPrivate:'dieses video ist privat und kann nicht heruntergeladen werden.',errUnavailable:'dieses video ist derzeit nicht verfügbar.',errLive:'livestreams werden derzeit nicht unterstützt.',errUnsupported:'Dieser Link enthält kein unterstütztes Video oder die Website wird nicht unterstützt. Verwende den Seitenlink eines einzelnen Videos.',errInvalidUrl:'Gib einen gültigen Link zu einer Videoseite ein, der mit https:// oder http:// beginnt.',
    errPlatformRestricted:'die plattform hat diesen download nicht zugelassen. versuche es später erneut.',errNetwork:'ein verbindungsproblem ist aufgetreten. versuche es erneut.',errGeneric:'der vorgang konnte nicht abgeschlossen werden. bitte versuche es erneut.',errConversion:'die konvertierung konnte nicht abgeschlossen werden. prüfe das dateiformat.',
    remuxDone:'remux abgeschlossen',convDone:'konvertiert ✓',
    uploading:'wird hochgeladen...',converting:'wird konvertiert...',convDoneLabel:'fertig!',
    historyTitle:'downloadverlauf',clearHistoryTxt:'verlauf löschen',historyEmpty:'verlauf leer',historyLoading:'wird geladen...',
    donTitle:'zenithw unterstützen',donSub:'dein feedback hilft ZenithW, besser zu werden.',
    donPaparaSub:'türkei — sofortüberweisung',donCopyBtn:'kopieren',donFollowBtn:'folgen',donThanks:'danke für jedes feedback 🙏',
    donContactName:'kontakt',donContactBtn:'e-mail senden',
    aboutWhatTitle: 'was ist zenithw?',
    aboutWhatText: 'ZenithW ist ein unabhängiges, werbefreies Tool für Videos, Audio und Playlists aus unterstützten Quellen. YouTube-Links werden derzeit im Web nicht verarbeitet; Desktop- und Mobil-App nutzen jeweils eine eigene Verbindung. Bei anderen unterstützten Quellen fügst du den Link ein und wählst das Format.',
    aboutTrustTitle: 'warum kannst du uns vertrauen?',
    aboutTrustText: 'Anders als bei klassischen Download-Seiten gibt es hier kein Werbenetzwerk, das dich verfolgt, keine gefälschten Download-Buttons, keine Weiterleitungen oder Pop-ups. Dein Downloadverlauf wird niemals auf dem Server gespeichert — er bleibt ausschließlich im Speicher deines eigenen Browsers (localStorage) und kann jederzeit mit einem Klick gelöscht werden. Der Code wird laufend auf Sicherheit überprüft: Schutz vor Path Traversal, Rate Limiting und Schutz vor gefälschten IP-Adressen sind von Anfang an vorhanden.',
    aboutOpenTitle: 'offener quellcode',
    aboutOpenText: 'Der gesamte Quellcode von ZenithW ist auf <a href="https://github.com/boranseasonnew/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> öffentlich einsehbar und steht unter der AGPL-3.0-only-Lizenz. Wenn du neugierig bist, was im Hintergrund passiert, ist alles Zeile für Zeile einsehbar — nichts wird versteckt. Jeder kann ihn prüfen, dazu beitragen oder sogar eine eigene Instanz betreiben.',
    queueResumeTpl:'du hast eine unvollständige Download-Warteschlange ({done}/{total} abgeschlossen) — möchtest du fortfahren?',
    aboutHowTitle: 'wie funktioniert es?',
    aboutHowText: 'Du fügst den Link ein → ZenithW analysiert das Video und zeigt dir die verfügbaren Qualitäts- und Formatoptionen → du wählst aus und lädst herunter. Video, Audio (mp3/m4a), Stumm-Modus und Massen-/Playlist-Downloads werden unterstützt; außerdem kannst du mit den integrierten Convert- und Remux-Tools bereits vorhandene Dateien bearbeiten. Der gesamte Vorgang dauert nur wenige Sekunden, ohne den Tab je zu verlassen.',
    aboutDevLabel:'entwickler',aboutContactLabel:'kontakt',aboutStackLabel:'technologie',aboutHostLabel:'hosting',aboutLicLabel:'lizenz',
    aboutPrivacyLink:'datenschutz',aboutTermsLink:'nutzungsbedingungen',aboutDmcaLink:'urheberrechtshinweis',aboutStatusLink:'status',
    qrTitle:'AUFS TELEFON SENDEN',qrHint:'qr-code mit deinem telefon scannen',
    remuxInfo1:'<strong>was macht remux?</strong> behebt probleme im dateicontainer.',
    remuxInfo2:'<strong>verlustfrei:</strong> kopiert die codec-daten in einen neuen container, ohne neu zu kodieren.',
    plQueueTitle:'playlist wird heruntergeladen',
    plQueueQueued:'wartet',plQueueDownloadingItem:'wird heruntergeladen...',plQueueItemDone:'fertig',plQueueItemErr:'fehler',
    plQueueCompletedWord:'abgeschlossen',plQueueStopBtn:'stoppen',plQueueCloseBtn:'schließen',
    plQueueStoppedMsg:'playlist-download gestoppt',plQueueDoneMsg:'playlist-download abgeschlossen',plQueueStoppingMsg:'wird gestoppt — aktueller download wird noch fertiggestellt',
    historyRedownload:'erneut herunterladen',historyCopyLink:'link kopieren',historyClearedMsg:'verlauf gelöscht',
    bulkNeedLink:'mindestens einen link eingeben',bulkMaxLinks:'maximal 10 links gleichzeitig',bulkSuccessWord:'erfolgreich',bulkFailWord:'fehlgeschlagen',
    langComingSoon:'diese sprache kommt bald 🚧',
    updBadge:'NEU',
  }
};


export function t(k){return(TX[state.LANG]||TX.tr)[k]||(TX.tr[k]||k);}


export function detectLang(){if(window.ZWLanguage)return ZWLanguage.current;const l=(navigator.language||'tr').slice(0,2).toLowerCase();return['en','fr','de'].includes(l)?l:'tr';}


export function applyLang(){
  document.documentElement.lang=state.LANG;
  // All elements with matching IDs
  const ids=Object.keys(TX.tr);
  ids.forEach(k=>{const el=document.getElementById(k);if(el){if(el.tagName==='INPUT')el.placeholder=t(k);else el.innerHTML=t(k);}});
  // Any input/textarea explicitly tagged for placeholder translation (key may differ from element id)
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.getAttribute('data-i18n-ph'));});
  // "diğer" (more) popup menu items — not covered by the id-matching loop above
  const miR=document.getElementById('moreItemRemux');if(miR)miR.textContent=t('bbRemux');
  const miS=document.getElementById('moreItemSettings');if(miS)miS.textContent=t('bbSettings');
  const miA=document.getElementById('moreItemAbout');if(miA)miA.textContent=t('bbAbout');
  const miD=document.getElementById('moreItemDonate');if(miD)miD.textContent=t('bbDonate');
  // Theme buttons
  const ta=document.getElementById('themeAuto');if(ta)ta.textContent=t('themeAuto');
  const tl=document.getElementById('themeLight');if(tl)tl.textContent=t('themeLight');
  const td=document.getElementById('themeDark');if(td)td.textContent=t('themeDark');
  const mobileTitle=document.getElementById('mobileSettingsTitle');
  if(mobileTitle)mobileTitle.textContent=document.body.classList.contains('mobile-settings-index')?t('stModalTitle'):(document.querySelector('.st-nav-btn.active span')?.textContent||t('stModalTitle'));
  // lang select
  const ls=document.getElementById('langSelect');if(ls)ls.value=state.LANG;
  const desktopPromoClose=document.querySelector('.desktop-promo-close');if(desktopPromoClose)desktopPromoClose.setAttribute('aria-label',t('desktopPromoCloseLabel'));
  // version — tek kaynaktan (version.js) otomatik, elle güncellemeye gerek yok
  const av=document.getElementById('aboutVer');
  const settingsVersion=document.getElementById('appVersion');
  if(typeof ZW_VERSION!=='undefined'){
    const dateMap={tr:ZW_VERSION.dateTr,en:ZW_VERSION.dateEn,fr:ZW_VERSION.dateFr,de:ZW_VERSION.dateDe};
    const localizedDate=dateMap[state.LANG]||new Intl.DateTimeFormat(window.ZWLanguage?.locales[state.LANG]||'en-US',{day:'numeric',month:'long',year:'numeric'}).format(new Date(ZW_VERSION.dateEn));
    const versionText=ZW_VERSION.ver+' — '+localizedDate;
    if(av)av.textContent=versionText;
    if(settingsVersion)settingsVersion.textContent=versionText;
  }
  // conv btn
  _updateConvBtn();
  renderRemuxSignal();
  renderConvPreflight();
  renderDownloadPlan();
  if(state.toolErrorCode)renderToolError(state.toolErrorCode);
  // yarım kalan indirme kuyruğu varsa banner metnini güncelle
  if(typeof checkQueueResume==='function')checkQueueResume();
}


export function setLang(lang){
  if(window.ZWLanguage){ZWLanguage.use(lang);return;}
  state.LANG=lang;
  try{localStorage.setItem('zw_lang',lang);}catch(e){}
  applyLang();
  renderHomeActivity();
}


export function bindLanguageChanges(){
if(window.ZWLanguage){ZWLanguage.onChange(lang=>{TX[lang]=ZWLanguage.copy(TX,lang);state.LANG=lang;applyLang();renderHomeActivity();});}
}
