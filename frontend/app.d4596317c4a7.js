const API=window.ZENITHW_API||"https://api.zenithw.space";
const YOUTUBE_WEB_ENABLED=window.ZENITHW_YOUTUBE_WEB_ENABLED===true;
async function downloadThumbnail(){
  if(!videoInfo||!videoInfo.url) return;
  const button=document.getElementById('dlThumbAction');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  try{
    const res=await fetch(API+'/thumbnail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:videoInfo.url,thumbnail_url:videoInfo.thumbnail||''})});
    if(!res.ok){
      const payload=await res.json().catch(()=>({error_code:'request_failed'}));
      showPublicError(payload,res.status,videoInfo.url,false);
      return;
    }
    const blob=await res.blob();
    if(!blob.size){throw new Error('Empty thumbnail response');}
    const a=document.createElement('a');
    const objectUrl=URL.createObjectURL(blob);
    a.href=objectUrl;
    a.download='thumbnail.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
    toast(t('thumbnailDownloaded'),'#3bba64');
  }catch(e){
    console.error('thumb dl err',e);
    showPublicError({error_code:'network_error'},0,videoInfo.url,false);
  }finally{
    if(button){button.disabled=false;button.removeAttribute('aria-busy');}
  }
}

// ── XSS güvenliği: uzak sitelerden gelen title/thumbnail/url innerHTML'e
// basılmadan önce escape edilmeli, çünkü bu değerler kullanıcının
// yapıştırdığı URL'nin ait olduğu uzak sayfanın metadata'sından geliyor.
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeThumbHtml(url,fallback){
  if(fallback===undefined)fallback='🎬';
  if(!url)return fallback;
  try{
    const u=new URL(url,location.href);
    if(u.protocol!=='http:'&&u.protocol!=='https:')return fallback;
  }catch(e){return fallback;}
  return `<img src="${escapeHtml(url)}" loading="lazy" decoding="async" width="160" height="90" referrerpolicy="no-referrer">`;
}
function createSocketClient(){
  if(typeof window.io==='function')return window.io(API,{autoConnect:false,reconnection:true,path:API.startsWith('/')?`${API}/socket.io`:'/socket.io'});
  console.warn('Socket.IO unavailable; downloads continue without live progress.');
  const noop=()=>{};
  return {connected:false,id:null,on:noop,off:noop,once:noop,connect:noop,disconnect:noop};
}
const socket=createSocketClient();
let socketId=null,videoInfo={},dlId=null,dlAbort=null,activeProgressJobId=null,activeTransferAbort=null,ytErrTimer=null,pendingBlob=null,pendingFilename=null,pendingObjectUrl=null;
let socketDisconnectTimer=null;
let infoController=null,infoSequence=0;

function ensureSocket(){
  if(socketDisconnectTimer){clearTimeout(socketDisconnectTimer);socketDisconnectTimer=null;}
  if(socket.connected){socketId=socket.id;return Promise.resolve(socketId);}
  return new Promise(resolve=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      socket.off('connect',finish);
      socketId=socket.connected?socket.id:null;
      resolve(socketId);
    };
    socket.once('connect',finish);
    socket.connect();
    setTimeout(finish,1500);
  });
}
function scheduleSocketDisconnect(delay){
  if(socketDisconnectTimer)clearTimeout(socketDisconnectTimer);
  socketDisconnectTimer=setTimeout(()=>{
    if(!plQueueRunning&&!dlAbort&&socket.connected)socket.disconnect();
    socketDisconnectTimer=null;
  },delay||5000);
}

// ── i18n — defined FIRST so t() is available everywhere ──
let LANG='tr';
const TX={
  tr:{
    desktopPromoKicker:'ZENITHW UYGULAMALARI',desktopPromoTitle:'Daha iyi bir indirme deneyimi.',desktopPromoBody:'Siteden indirme aktif. Daha akıcı ve yerel bir deneyim için ZenithW uygulamalarını dene.',desktopPromoDesktop:'ZenithW Masaüstü <b>↗</b>',desktopPromoMobile:'ZenithW Mobil <b>↗</b>',desktopPromoNeverTxt:'Bir daha gösterme',desktopPromoCloseLabel:'Kapat',
    youtubeAppKicker:'YOUTUBE · WEB',youtubeAppTitle:'Bu bağlantıya uygulamada devam et',youtubeAppBody:'YouTube indirmeleri, web sunucularına uygulanan erişim kısıtlamaları nedeniyle geçici olarak kullanılamıyor. İndirmeyi kendi internet bağlantın üzerinden uygulamada deneyebilirsin.',youtubeAppDesktop:'Windows uygulaması <b>↗</b>',youtubeAppMobile:'Android uygulaması <b>↗</b>',youtubeAppNote:'Uygulamalar cihazındaki bağlantıyı kullanır; YouTube erişimi yine videoya ve bölgeye göre değişebilir.',youtubeAppCloseLabel:'Kapat',
    placeholder:'video bağlantısını buraya bırak',bulkPlaceholder:'linkleri her satıra bir tane olacak şekilde yapıştır... (Enter ile indir, Shift+Enter ile yeni satır)',modeAutoTxt:'otomatik',modeAudioTxt:'ses',modeMuteTxt:'sessiz',bulkToggleTxt:'çoklu indirme',paste:'yapıştır',continueBtn:'devam et',homeStatusTxt:'hizmet aktif',homeActivityTitle:'son aktiviteler',homeActivityAllTxt:'tümünü gör',homeActivityEmpty:'henüz bu tarayıcıda bir indirme yok',
    vcDl:'indir',dlBtn:'indir',dlCancel:'iptal',dlAnalysisKicker:'hazır',dlAnalysisTitle:'İndirmeye hazır',dlAnalysisDesc:'Bağlantı analiz edildi. Kalite ve ses tercihlerini Ayarlar’dan değiştirebilirsin.',dlThumbActionTxt:'kapak görseli',dlSettingsTxt:'ayarlar',dlPlanLabel:'indirme planı',dlPlanVideo:'video planı',dlPlanAudio:'ses planı',dlPlanFallback:'Kaynakta yoksa en yakın güvenli seçenek kullanılır.',dlPlanAdaptive:'YouTube: boşken 1080p, yoğunlukta 720p.',dlQualityVerified:'Kalite doğrulandı',dlProgressTitle:'İndirmen hazırlanıyor',
    stLblProfiles:'hızlı kalite profilleri',profileMinimal:'minimal',profileMinimalDesc:'küçük dosya · daha az veri',profileStandard:'standart',profileStandardDesc:'uyumluluk ve kalite dengesi',profileQuality:'kalite',profileQualityDesc:'uygunsa en verimli yüksek kalite',stProfileHint:'Profil video ve ses tercihlerini birlikte ayarlar. Sonra tek bir ayarı değiştirirsen özel ayara geçer.',profileCustom:'özel ayar',profileActive:'aktif profil: {name}',profileApplied:'{name} profili uygulandı',
    bbSave:'kaydet',bbHistory:'geçmiş',bbRemux:'remux',bbConvert:'dönüştür',bbSettings:'ayarlar',bbUpdates:'güncel',bbAbout:'hakkında',bbMore:'diğer',bbDonate:'destek ol',
    accDefault:'klasik',accDefaultDesc:'buz mavisi · dengeli',accPurple:'neon mor',accPurpleDesc:'elektrik moru · derin uzay',accGray:'grafit',accGrayDesc:'nötr gri · sade',accPink:'neon pembe',accPinkDesc:'canlı pembe · sıcak',accCobalt:'cobalt mavisi',accCobaltDesc:'derin mavi · odaklı',
    saveTitleTxt:'nasıl kaydetmek istersin?',saveDlTxt:'indir',saveShareTxt:'paylaş',saveCopyTxt:'kopyala',
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
    ytWarn:'youtube desteği aktif — bazı videolar youtube erişim kısıtlamalarından etkilenebilir.',
    ytErrTitle:'youtube videosu bulunamadı',ytErrTxt:'youtube bot engelleme aktif olabilir. birkaç dakika bekleyip tekrar deneyin.',
    enterLink:'önce link gir',connErr:'bağlantı hatası',igBusy:'instagram yoğun, 2-3 dk bekle',
    errYoutubeRestricted:'youtube bu indirmeye şu anda izin vermedi. birkaç dakika sonra tekrar deneyin.',errFormatUnavailable:'seçilen format kullanılamıyor. farklı bir format veya kalite deneyin.',
    errRateLimited:'çok fazla istek gönderildi. biraz bekleyip tekrar deneyin.',errServerBusy:'sunucu şu anda yoğun. kısa süre sonra tekrar deneyin.',errTimeout:'işlem beklenenden uzun sürdü. tekrar deneyin.',errFileTooLarge:'dosya izin verilen boyut sınırını aşıyor.',
    errPrivate:'bu video gizli ve indirilemiyor.',errUnavailable:'bu video şu anda kullanılamıyor.',errLive:'canlı yayınlar şu anda desteklenmiyor.',errUnsupported:'bu bağlantı veya platform desteklenmiyor.',
    errPlatformRestricted:'platform bu indirmeye izin vermedi. daha sonra tekrar deneyin.',errNetwork:'bağlantı sorunu oluştu. tekrar deneyin.',errGeneric:'işlem tamamlanamadı. lütfen tekrar deneyin.',errConversion:'dönüştürme tamamlanamadı. dosya formatını kontrol edin.',
    remuxDone:'remux tamamlandı',convDone:'dönüştürüldü ✓',
    uploading:'gönderiliyor...',converting:'dönüştürülüyor...',convDoneLabel:'tamamlandı!',
    historyTitle:'indirme geçmişi',clearHistoryTxt:'geçmişi temizle',historyEmpty:'geçmiş boş',historyLoading:'yükleniyor...',
    donTitle:'destek ol',donSub:'geri bildirimlerin ZenithW\'nin gelişmesine yardımcı olur.',
    donPaparaSub:'türkiye — anlık transfer',donCopyBtn:'kopyala',donFollowBtn:'takip et',donThanks:'her geri bildirim için teşekkür ederiz 🙏',
    donContactName:'iletişim',donContactBtn:'e-posta gönder',
    aboutWhatTitle: 'ZenithW nedir?',
    aboutWhatText: 'ZenithW; YouTube, TikTok, Instagram, X/Twitter, Reddit ve daha onlarca platformdan video, ses ve playlist indirmeni sağlayan bağımsız, reklamsız bir araçtır. Sunucu tarafında dünyanın en gelişmiş açık kaynak indirme motoru olan <strong>yt-dlp</strong>\'yi kullanır; bu sayede videoyu her zaman kaynağın kendisinden, en yüksek kalitede ve ekstra dönüştürme kaybı olmadan yakalar. Tek yapman gereken linki yapıştırmak — format ve kaliteyi sen seçersin, gerisini ZenithW halleder.',
    aboutTrustTitle: 'Neden güvenebilirsin?',
    aboutTrustText: 'Klasik "indirme" sitelerinin aksine burada seni takip eden reklam ağı, sahte indirme butonu, yönlendirme ya da pop-up yok. İndirme geçmişin sunucuda asla tutulmaz — sadece kendi tarayıcının belleğinde (localStorage) senin cihazında saklanır ve istediğin an tek tıkla silinebilir. Kod tarafı sürekli güvenlik açısından gözden geçiriliyor: yol geçişi (path traversal) engelleri, istek sınırlama (rate limiting) ve sahte IP koruması gibi önlemler baştan itibaren var.',
    aboutOpenTitle: 'açık kaynak',
    aboutOpenText: 'ZenithW\'nin tüm kaynak kodu <a href="https://github.com/kakangeldi82-netizen/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> üzerinde herkese açık ve AGPL-3.0-only lisansıyla paylaşılıyor. Arka planda ne olduğunu merak ediyorsan kod satır satır önünde — gizli bir şey yok. İsteyen inceleyebilir, katkıda bulunabilir ya da kendi sunucusunda çalıştırabilir.',
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
    desktopPromoKicker:'ZENITHW APPS',desktopPromoTitle:'A better download experience.',desktopPromoBody:'Downloads on the website are still available. Try ZenithW apps for a smoother, local experience.',desktopPromoDesktop:'ZenithW Desktop <b>↗</b>',desktopPromoMobile:'ZenithW Mobile <b>↗</b>',desktopPromoNeverTxt:'Don\'t show again',desktopPromoCloseLabel:'Close',
    youtubeAppKicker:'YOUTUBE · WEB',youtubeAppTitle:'Continue with this link in the app',youtubeAppBody:'YouTube downloads are temporarily unavailable because of access restrictions applied to web servers. You can try the download in the app using your own internet connection.',youtubeAppDesktop:'Windows app <b>↗</b>',youtubeAppMobile:'Android app <b>↗</b>',youtubeAppNote:'The apps use your device connection; YouTube availability can still vary by video and region.',youtubeAppCloseLabel:'Close',
    placeholder:'drop a media link here',bulkPlaceholder:'paste links, one per line... (Enter to download, Shift+Enter for a new line)',modeAutoTxt:'automatic',modeAudioTxt:'audio',modeMuteTxt:'mute',bulkToggleTxt:'bulk',paste:'paste',continueBtn:'continue',homeStatusTxt:'service active',homeActivityTitle:'recent activity',homeActivityAllTxt:'view all',homeActivityEmpty:'no downloads in this browser yet',
    vcDl:'download',dlBtn:'download',dlCancel:'cancel',dlAnalysisKicker:'ready',dlAnalysisTitle:'Ready to download',dlAnalysisDesc:'The link has been analyzed. You can adjust quality and audio preferences in Settings.',dlThumbActionTxt:'cover image',dlSettingsTxt:'settings',dlPlanLabel:'download plan',dlPlanVideo:'video plan',dlPlanAudio:'audio plan',dlPlanFallback:'If the source does not offer it, the nearest safe option is used.',dlPlanAdaptive:'YouTube: up to 1080p when idle, 720p when busy.',dlQualityVerified:'Quality verified',dlProgressTitle:'Preparing your download',
    stLblProfiles:'quick quality profiles',profileMinimal:'minimal',profileMinimalDesc:'smaller files · less data',profileStandard:'standard',profileStandardDesc:'balanced quality and compatibility',profileQuality:'quality',profileQualityDesc:'efficient high quality when available',stProfileHint:'A profile sets video and audio preferences together. Changing one setting afterwards switches to custom.',profileCustom:'custom settings',profileActive:'active profile: {name}',profileApplied:'{name} profile applied',
    bbSave:'save',bbHistory:'history',bbRemux:'remux',bbConvert:'convert',bbSettings:'settings',bbUpdates:'updates',bbAbout:'about',bbMore:'more',bbDonate:'support us',
    accDefault:'classic',accDefaultDesc:'ice blue · balanced',accPurple:'neon purple',accPurpleDesc:'electric violet · deep space',accGray:'graphite',accGrayDesc:'neutral gray · minimal',accPink:'neon pink',accPinkDesc:'vivid pink · warm',accCobalt:'cobalt blue',accCobaltDesc:'deep blue · focused',
    saveTitleTxt:'choose how to save',saveDlTxt:'download',saveShareTxt:'share',saveCopyTxt:'copy',
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
    ytWarn:'youtube support is active — some videos may be affected by youtube access restrictions.',
    ytErrTitle:'youtube video not found',ytErrTxt:"youtube's bot detection may be active. please wait a few minutes and try again.",
    enterLink:'enter a link first',connErr:'connection error',igBusy:'instagram is busy, wait 2-3 min',
    errYoutubeRestricted:'youtube did not allow this download. wait a few minutes and try again.',errFormatUnavailable:'the selected format is unavailable. try another format or quality.',
    errRateLimited:'too many requests were sent. wait a moment and try again.',errServerBusy:'the server is busy right now. try again shortly.',errTimeout:'the operation took too long. please try again.',errFileTooLarge:'the file exceeds the allowed size limit.',
    errPrivate:'this video is private and cannot be downloaded.',errUnavailable:'this video is currently unavailable.',errLive:'live streams are not currently supported.',errUnsupported:'this link or platform is not supported.',
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
    aboutOpenText: 'ZenithW\'s entire source code is public on <a href="https://github.com/kakangeldi82-netizen/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> under the AGPL-3.0-only license. If you\'re curious what\'s happening behind the scenes, it\'s all right there, line by line — nothing hidden. Anyone can review it, contribute, or even run their own instance.',
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
    desktopPromoKicker:'APPLICATIONS ZENITHW',desktopPromoTitle:'Une meilleure expérience de téléchargement.',desktopPromoBody:'Les téléchargements sur le site restent disponibles. Essayez les applications ZenithW pour une expérience locale plus fluide.',desktopPromoDesktop:'ZenithW Bureau <b>↗</b>',desktopPromoMobile:'ZenithW Mobile <b>↗</b>',desktopPromoNeverTxt:'Ne plus afficher',desktopPromoCloseLabel:'Fermer',
    youtubeAppKicker:'YOUTUBE · WEB',youtubeAppTitle:'Continuez avec ce lien dans l’application',youtubeAppBody:'Les téléchargements YouTube sont temporairement indisponibles en raison des restrictions appliquées aux serveurs web. Vous pouvez essayer dans l’application avec votre propre connexion Internet.',youtubeAppDesktop:'Application Windows <b>↗</b>',youtubeAppMobile:'Application Android <b>↗</b>',youtubeAppNote:'Les applications utilisent la connexion de votre appareil ; la disponibilité peut encore varier selon la vidéo et la région.',youtubeAppCloseLabel:'Fermer',
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
    ytWarn:'le support youtube est actif — certaines vidéos peuvent être affectées par les restrictions d’accès de youtube.',
    ytErrTitle:'vidéo youtube introuvable',ytErrTxt:'la détection anti-bot de youtube est peut-être active. réessayez dans quelques minutes.',
    enterLink:'entrez d\'abord un lien',connErr:'erreur de connexion',igBusy:'instagram est occupé, attendez 2-3 min',
    errYoutubeRestricted:'youtube n\'a pas autorisé ce téléchargement. réessayez dans quelques minutes.',errFormatUnavailable:'le format sélectionné est indisponible. essayez un autre format ou une autre qualité.',
    errRateLimited:'trop de requêtes ont été envoyées. patientez puis réessayez.',errServerBusy:'le serveur est occupé. réessayez dans quelques instants.',errTimeout:'l\'opération a pris trop de temps. veuillez réessayer.',errFileTooLarge:'le fichier dépasse la taille autorisée.',
    errPrivate:'cette vidéo est privée et ne peut pas être téléchargée.',errUnavailable:'cette vidéo est actuellement indisponible.',errLive:'les diffusions en direct ne sont pas prises en charge.',errUnsupported:'ce lien ou cette plateforme n\'est pas pris en charge.',
    errPlatformRestricted:'la plateforme n\'a pas autorisé ce téléchargement. réessayez plus tard.',errNetwork:'un problème de connexion est survenu. réessayez.',errGeneric:'l\'opération n\'a pas pu être terminée. veuillez réessayer.',errConversion:'la conversion a échoué. vérifiez le format du fichier.',
    remuxDone:'remux terminé',convDone:'converti ✓',
    uploading:'envoi...',converting:'conversion...',convDoneLabel:'terminé !',
    historyTitle:'historique des téléchargements',clearHistoryTxt:'effacer l\'historique',historyEmpty:'historique vide',historyLoading:'chargement...',
    donTitle:'soutenir zenithw',donSub:'vos retours aident ZenithW à progresser.',
    donPaparaSub:'turquie — virement instantané',donCopyBtn:'copier',donFollowBtn:'suivre',donThanks:'merci pour chaque retour 🙏',
    donContactName:'contact',donContactBtn:'envoyer un e-mail',
    aboutWhatTitle: 'qu\'est-ce que zenithw ?',
    aboutWhatText: 'ZenithW est un outil indépendant et sans publicité qui permet de télécharger des vidéos, de l\'audio et des playlists depuis YouTube, TikTok, Instagram, X/Twitter, Reddit et bien d\'autres plateformes. Côté serveur, il utilise <strong>yt-dlp</strong>, le moteur de téléchargement open-source le plus avancé au monde, ce qui lui permet de récupérer la vidéo directement depuis la source, dans la meilleure qualité, sans perte de conversion supplémentaire. Il vous suffit de coller le lien — vous choisissez le format et la qualité, ZenithW s\'occupe du reste.',
    aboutTrustTitle: 'pourquoi nous faire confiance ?',
    aboutTrustText: 'Contrairement aux sites de téléchargement classiques, il n\'y a ici aucun réseau publicitaire qui vous suit, aucun faux bouton de téléchargement, aucune redirection ni pop-up. Votre historique de téléchargement n\'est jamais stocké sur le serveur — il reste uniquement dans la mémoire de votre propre navigateur (localStorage) et peut être supprimé en un clic à tout moment. Le code est régulièrement revu pour la sécurité : protection contre le path traversal, limitation du débit de requêtes et protection anti-usurpation d\'ip sont en place dès le départ.',
    aboutOpenTitle: 'code source ouvert',
    aboutOpenText: 'Tout le code source de ZenithW est public sur <a href="https://github.com/kakangeldi82-netizen/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> sous licence AGPL-3.0-only. Si vous êtes curieux de savoir ce qui se passe en coulisses, tout est là, ligne par ligne — rien n\'est caché. N\'importe qui peut le consulter, contribuer ou même faire tourner sa propre instance.',
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
    desktopPromoKicker:'ZENITHW APPS',desktopPromoTitle:'Ein besseres Download-Erlebnis.',desktopPromoBody:'Downloads auf der Website bleiben verfügbar. Probiere ZenithW Apps für ein flüssigeres lokales Erlebnis.',desktopPromoDesktop:'ZenithW Desktop <b>↗</b>',desktopPromoMobile:'ZenithW Mobil <b>↗</b>',desktopPromoNeverTxt:'Nicht mehr anzeigen',desktopPromoCloseLabel:'Schließen',
    youtubeAppKicker:'YOUTUBE · WEB',youtubeAppTitle:'Mit diesem Link in der App fortfahren',youtubeAppBody:'YouTube-Downloads sind wegen Zugriffsbeschränkungen für Webserver vorübergehend nicht verfügbar. Du kannst den Download in der App über deine eigene Internetverbindung versuchen.',youtubeAppDesktop:'Windows-App <b>↗</b>',youtubeAppMobile:'Android-App <b>↗</b>',youtubeAppNote:'Die Apps verwenden die Verbindung deines Geräts; die Verfügbarkeit kann je nach Video und Region variieren.',youtubeAppCloseLabel:'Schließen',
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
    ytWarn:'youtube-unterstützung ist aktiv — einige videos können von youtube-zugriffsbeschränkungen betroffen sein.',
    ytErrTitle:'youtube-video nicht gefunden',ytErrTxt:'youtubes bot-erkennung ist möglicherweise aktiv. bitte warte ein paar minuten und versuche es erneut.',
    enterLink:'zuerst einen link eingeben',connErr:'verbindungsfehler',igBusy:'instagram ist ausgelastet, 2-3 min warten',
    errYoutubeRestricted:'youtube hat diesen download nicht zugelassen. warte einige minuten und versuche es erneut.',errFormatUnavailable:'das gewählte format ist nicht verfügbar. versuche ein anderes format oder eine andere qualität.',
    errRateLimited:'zu viele anfragen wurden gesendet. warte kurz und versuche es erneut.',errServerBusy:'der server ist derzeit ausgelastet. versuche es gleich erneut.',errTimeout:'der vorgang hat zu lange gedauert. bitte versuche es erneut.',errFileTooLarge:'die datei überschreitet die erlaubte größe.',
    errPrivate:'dieses video ist privat und kann nicht heruntergeladen werden.',errUnavailable:'dieses video ist derzeit nicht verfügbar.',errLive:'livestreams werden derzeit nicht unterstützt.',errUnsupported:'dieser link oder diese plattform wird nicht unterstützt.',
    errPlatformRestricted:'die plattform hat diesen download nicht zugelassen. versuche es später erneut.',errNetwork:'ein verbindungsproblem ist aufgetreten. versuche es erneut.',errGeneric:'der vorgang konnte nicht abgeschlossen werden. bitte versuche es erneut.',errConversion:'die konvertierung konnte nicht abgeschlossen werden. prüfe das dateiformat.',
    remuxDone:'remux abgeschlossen',convDone:'konvertiert ✓',
    uploading:'wird hochgeladen...',converting:'wird konvertiert...',convDoneLabel:'fertig!',
    historyTitle:'downloadverlauf',clearHistoryTxt:'verlauf löschen',historyEmpty:'verlauf leer',historyLoading:'wird geladen...',
    donTitle:'zenithw unterstützen',donSub:'dein feedback hilft ZenithW, besser zu werden.',
    donPaparaSub:'türkei — sofortüberweisung',donCopyBtn:'kopieren',donFollowBtn:'folgen',donThanks:'danke für jedes feedback 🙏',
    donContactName:'kontakt',donContactBtn:'e-mail senden',
    aboutWhatTitle: 'was ist zenithw?',
    aboutWhatText: 'ZenithW ist ein unabhängiges, werbefreies Tool, mit dem du Videos, Audio und Playlists von YouTube, TikTok, Instagram, X/Twitter, Reddit und vielen weiteren Plattformen herunterladen kannst. Serverseitig nutzt es <strong>yt-dlp</strong>, die weltweit fortschrittlichste Open-Source-Download-Engine — dadurch wird das Video immer direkt von der Quelle, in bestmöglicher Qualität und ohne zusätzlichen Konvertierungsverlust erfasst. Du musst nur den Link einfügen — Format und Qualität wählst du, den Rest erledigt ZenithW.',
    aboutTrustTitle: 'warum kannst du uns vertrauen?',
    aboutTrustText: 'Anders als bei klassischen Download-Seiten gibt es hier kein Werbenetzwerk, das dich verfolgt, keine gefälschten Download-Buttons, keine Weiterleitungen oder Pop-ups. Dein Downloadverlauf wird niemals auf dem Server gespeichert — er bleibt ausschließlich im Speicher deines eigenen Browsers (localStorage) und kann jederzeit mit einem Klick gelöscht werden. Der Code wird laufend auf Sicherheit überprüft: Schutz vor Path Traversal, Rate Limiting und Schutz vor gefälschten IP-Adressen sind von Anfang an vorhanden.',
    aboutOpenTitle: 'offener quellcode',
    aboutOpenText: 'Der gesamte Quellcode von ZenithW ist auf <a href="https://github.com/kakangeldi82-netizen/zenithw" target="_blank" style="color:var(--accent);">GitHub</a> öffentlich einsehbar und steht unter der AGPL-3.0-only-Lizenz. Wenn du neugierig bist, was im Hintergrund passiert, ist alles Zeile für Zeile einsehbar — nichts wird versteckt. Jeder kann ihn prüfen, dazu beitragen oder sogar eine eigene Instanz betreiben.',
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
function t(k){return(TX[LANG]||TX.tr)[k]||(TX.tr[k]||k);}
function detectLang(){const l=(navigator.language||'tr').slice(0,2).toLowerCase();return['en','fr','de'].includes(l)?l:'tr';}


function applyLang(){
  document.documentElement.lang=LANG;
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
  const mobileTitle=document.getElementById('mobileSettingsTitle');if(mobileTitle&&document.body.classList.contains('mobile-settings-index'))mobileTitle.textContent=t('stModalTitle');
  // lang select
  const ls=document.getElementById('langSelect');if(ls)ls.value=LANG;
  const desktopPromoClose=document.querySelector('.desktop-promo-close');if(desktopPromoClose)desktopPromoClose.setAttribute('aria-label',t('desktopPromoCloseLabel'));
  // version — tek kaynaktan (version.js) otomatik, elle güncellemeye gerek yok
  const av=document.getElementById('aboutVer');
  const settingsVersion=document.getElementById('appVersion');
  if(typeof ZW_VERSION!=='undefined'){
    const dateMap={tr:ZW_VERSION.dateTr,en:ZW_VERSION.dateEn,fr:ZW_VERSION.dateFr,de:ZW_VERSION.dateDe};
    const versionText=ZW_VERSION.ver+' — '+(dateMap[LANG]||ZW_VERSION.dateEn);
    if(av)av.textContent=versionText;
    if(settingsVersion)settingsVersion.textContent=versionText;
  }
  // conv btn
  _updateConvBtn();
  renderRemuxSignal();
  renderConvPreflight();
  renderDownloadPlan();
  if(toolErrorCode)renderToolError(toolErrorCode);
  // yarım kalan indirme kuyruğu varsa banner metnini güncelle
  if(typeof checkQueueResume==='function')checkQueueResume();
}

function setLang(lang){
  LANG=lang;
  try{localStorage.setItem('zw_lang',lang);}catch(e){}
  applyLang();
  renderHomeActivity();
}

// ── SETTINGS ─────────────────────────────────────────
const DEFAULT_SETTINGS={quality:'1080',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'256',downloadProfile:'custom',youtubeAdaptiveQuality:true,metadata:true,sponsorblock:false,subtitles:false,theme:'dark',fnfTemplate:'{title}.{ext}',filenameStyle:'basic',accent:'default',reduceMotion:false,reduceTransparency:false,keepQueueClosed:false,subtitleLang:'tr',saveMethod:'ask'};
const S={...DEFAULT_SETTINGS};
const DOWNLOAD_PROFILES={
  minimal:{quality:'480',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'128'},
  standard:{quality:'1080',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'192'},
  quality:{quality:'2160',codec:'av1',vfmt:'webm',afmt:'opus',audioQ:'192'}
};
const PROFILE_FIELDS=['quality','codec','vfmt','afmt','audioQ'];
function profileNameKey(name){return 'profile'+name.charAt(0).toUpperCase()+name.slice(1);}
function activeDownloadProfile(){return Object.keys(DOWNLOAD_PROFILES).find(name=>PROFILE_FIELDS.every(key=>S[key]===DOWNLOAD_PROFILES[name][key]))||'custom';}
function renderDownloadProfileUI(){
  const active=activeDownloadProfile();
  S.downloadProfile=active;
  document.querySelectorAll('[data-profile]').forEach(card=>{const selected=card.dataset.profile===active;card.classList.toggle('active',selected);card.setAttribute('aria-pressed',String(selected));});
  const status=document.getElementById('downloadProfileStatus');
  if(status)status.textContent=active==='custom'?t('profileCustom'):t('profileActive').replace('{name}',t(profileNameKey(active)));
}
function applyDownloadProfile(name){
  const profile=DOWNLOAD_PROFILES[name];
  if(!profile)return;
  Object.assign(S,profile,{downloadProfile:name});
  saveSt();applyStUI();
  toast(t('profileApplied').replace('{name}',t(profileNameKey(name))),'#5b8def');
}
function saveSt(){try{localStorage.setItem('zw_s',JSON.stringify(S));}catch(e){}}
function cleanSettings(raw){
  const clean={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return clean;
  Object.keys(DEFAULT_SETTINGS).forEach(key=>{const value=raw[key],sample=DEFAULT_SETTINGS[key];if(typeof value===typeof sample)clean[key]=value;});
  if(clean.fnfTemplate)clean.fnfTemplate=clean.fnfTemplate.slice(0,180);
  return clean;
}
function loadSt(){try{const r=localStorage.getItem('zw_s');if(r)Object.assign(S,cleanSettings(JSON.parse(r)));}catch(e){}}
function applyAccessibilityPrefs(){
  document.documentElement.classList.toggle('zw-reduce-motion',!!S.reduceMotion);
  document.documentElement.classList.toggle('zw-reduce-transparency',!!S.reduceTransparency);
}
function applyStUI(){
  document.querySelectorAll('#stQChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.quality));
  document.querySelectorAll('#stCodecChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.codec));
  document.querySelectorAll('#stVFmtChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.vfmt));
  document.querySelectorAll('#stAFmtChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.afmt));
  document.querySelectorAll('#stAQChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.audioQ));
  document.querySelectorAll('#stAccentChips .accent-option').forEach(option=>{
    const selected=option.dataset.v===(S.accent||'default');
    option.classList.toggle('active',selected);
    option.setAttribute('aria-pressed',String(selected));
  });
  const tm=document.getElementById('togMetadata');if(tm){tm.classList.toggle('on',!!S.metadata);tm.setAttribute('aria-checked',String(!!S.metadata));}
  const tsb=document.getElementById('togSponsorblock');if(tsb){tsb.classList.toggle('on',!!S.sponsorblock);tsb.setAttribute('aria-checked',String(!!S.sponsorblock));}
  const tsu=document.getElementById('togSubtitles');if(tsu){tsu.classList.toggle('on',!!S.subtitles);tsu.setAttribute('aria-checked',String(!!S.subtitles));}
  ['ReduceMotion','ReduceTransparency','KeepQueueClosed','YoutubeAdaptiveQuality'].forEach(name=>{const key=name.charAt(0).toLowerCase()+name.slice(1),el=document.getElementById('tog'+name);if(el){el.classList.toggle('on',!!S[key]);el.setAttribute('aria-checked',String(!!S[key]));}});
  const subLang=document.getElementById('subtitleLangSelect');if(subLang)subLang.value=S.subtitleLang||'tr';
  document.querySelectorAll('#saveMethodChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===(S.saveMethod||'ask')));
  document.querySelectorAll('#filenameStyleChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===(S.filenameStyle||'basic')));
  ['Auto','Light','Dark'].forEach(n=>{const b=document.getElementById('theme'+n);if(b)b.classList.toggle('active',S.theme===n.toLowerCase());});
  const fi=document.getElementById('fnfInput');if(fi){fi.value=S.fnfTemplate||'{title}.{ext}';updateFnfPreview();}
  renderDownloadProfileUI();
  renderDownloadPlan();
  applyAccessibilityPrefs();
}

// ── THEME ─────────────────────────────────────────────
function setTheme(th){
  if(!['auto','light','dark'].includes(th))th='dark';
  S.theme=th;saveSt();
  ['Auto','Light','Dark'].forEach(n=>{const b=document.getElementById('theme'+n);if(b)b.classList.toggle('active',th===n.toLowerCase());});
  let isLight;
  if(th==='auto'){isLight=!window.matchMedia('(prefers-color-scheme:dark)').matches;}
  else{isLight=(th==='light');}
  document.body.classList.toggle('light',isLight);
  // html arkaplanini da senkron tut: iOS rubber-band sirasinda
  // html'in arkaplani gorunur oluyor, body.light'taki --bg'yi
  // miras alamadigi icin ayrica isaretliyoruz.
  document.documentElement.classList.toggle('light',isLight);
  syncBrowserThemeColor(isLight);
}
function setAccent(acc){
  const themes=['default','purple'];
  if(!themes.includes(acc))acc='default';
  S.accent=acc;saveSt();
  document.querySelectorAll('#stAccentChips .accent-option').forEach(option=>{
    const selected=option.dataset.v===acc;
    option.classList.toggle('active',selected);
    option.setAttribute('aria-pressed',String(selected));
  });
  document.body.classList.remove('theme-default','theme-purple','theme-gray','theme-pink','theme-cobalt');
  document.body.classList.add('theme-'+acc);
  syncBrowserThemeColor(document.body.classList.contains('light'));
}
function syncBrowserThemeColor(isLight){
  const dark={default:'#07090d',purple:'#0b0410',gray:'#080808',pink:'#0f0509',cobalt:'#040a16'};
  const light={default:'#eef6fb',purple:'#f7f1fb',gray:'#f3f3f3',pink:'#fff2f7',cobalt:'#eef4ff'};
  const palette=isLight?light:dark;
  const color=palette[S.accent]||palette.default;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',color);
}

// ── MOBILE URL EDITING PERFORMANCE ──
// visualViewport'un resize/scroll olaylarında alt menüyü her karede taşımak,
// Android tarayıcının klavye ve adres çubuğu animasyonuyla yarışıyordu. URL
// alanı düzenlenirken sabit menüyü geçici olarak kompozisyondan çıkarıyoruz;
// klavye kapanınca tek bir durum değişikliğiyle geri geliyor.
(function(){
  const touchDevice=window.matchMedia('(hover:none) and (pointer:coarse)');
  const isUrlEditor=el=>el?.id==='urlInput'||el?.id==='urlTextarea';
  function syncUrlEditingState(){
    document.body.classList.toggle('url-editing',touchDevice.matches&&isUrlEditor(document.activeElement));
  }
  document.addEventListener('focusin',syncUrlEditingState);
  document.addEventListener('focusout',()=>setTimeout(syncUrlEditingState,0));
})();

socket.on('connect',()=>{socketId=socket.id;});
socket.on('disconnect',()=>{socketId=null;});
socket.on('progress',d=>{
  if(!d||!d.download_id||d.download_id!==activeProgressJobId)return;
  if(d.status==='downloading')setProgress(d.percent,t('downloading'),d.speed,false,d);
  else if(d.status==='merging')setProgress(88,t('merging'),'',false);
  else if(d.status==='queued')setProgress(3,d.message||t('queued'),'',false);
  // Backend processing is ready, but a small file may still be transferring
  // into the save modal. Keep 100% for the actual client handoff completion.
  else if(d.status==='done')setProgress(90,t('downloading'),'',false);
  else if(d.status==='error')toast(publicErrorMessage(d,0,videoInfo.url||document.getElementById('urlInput')?.value||''),'#ed4245');
});

// ── MODE ──────────────────────────────────────────────
let DL_MODE='auto';
let BULK_MODE=false;
function setMode(m){DL_MODE=m;['Auto','Audio','Mute'].forEach(n=>{const b=document.getElementById('mode'+n);if(b)b.classList.toggle('active',n.toLowerCase()===m);});if(videoInfo.url)openDlModal();}
function toggleBulkMode(){
  BULK_MODE=!BULK_MODE;
  const form=document.querySelector('.url-form');
  const toggle=document.getElementById('bulkToggle');
  const goBtn=document.querySelector('.url-go-btn');
  form.classList.toggle('bulk-mode',BULK_MODE);
  toggle.classList.toggle('active',BULK_MODE);
  if(BULK_MODE){
    goBtn.onclick=fetchBulkVideos;
    goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }else{
    goBtn.onclick=fetchVideo;
    goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>';
  }
}

// ── SERVICES ──────────────────────────────────────────
function toggleServices(){
  const o=document.getElementById('servicesOverlay');
  const isOpen=o.classList.contains('open');
  const c=document.getElementById('servicesChip');
  if(isOpen){closeOverlay('servicesOverlay');c.classList.remove('open');c.setAttribute('aria-expanded','false');}
  else{openOverlay('servicesOverlay',c);c.classList.add('open');c.setAttribute('aria-expanded','true');}
}

// ── MORE MENU ─────────────────────────────────────────
function toggleMoreMenu(){const b=document.getElementById('moreBtn'),p=document.getElementById('morePopup'),o=p.classList.contains('open');p.classList.toggle('open',!o);b.classList.toggle('active',!o);}
document.addEventListener('click',e=>{const b=document.getElementById('moreBtn'),p=document.getElementById('morePopup');if(b&&p&&!b.contains(e.target)&&!p.contains(e.target)){p.classList.remove('open');b.classList.remove('active');}});

// ── RADAR PULSE — fires once each time a fresh, valid link is detected ──
let lastRadarUrl='';
function fireRadar(){
  const ring=document.getElementById('radarRing');
  if(!ring)return;
  ring.classList.remove('fire');
  void ring.offsetWidth; // restart animation
  ring.classList.add('fire');
}

// ── URL ───────────────────────────────────────────────
function isYT(u){try{const h=new URL(u).hostname.toLowerCase();return h==='youtube.com'||h.endsWith('.youtube.com')||h==='youtu.be'||h.endsWith('.youtu.be');}catch(e){return false;}}
function shouldRouteYoutubeToApps(url){return !YOUTUBE_WEB_ENABLED&&isYT(url);}
function showYoutubeAppRequired(){
  const close=document.getElementById('youtubeAppClose');
  if(close)close.setAttribute('aria-label',t('youtubeAppCloseLabel'));
  openOverlay('youtubeAppOverlay');
}
function handleYoutubeAppRequired(payload){
  if(payload&&payload.error_code==='youtube_app_required'){showYoutubeAppRequired();return true;}
  return false;
}
function isValidUrl(u){try{const p=new URL(u);return p.protocol==='http:'||p.protocol==='https:';}catch(e){return false;}}
function onInput(){
  if(infoController){infoController.abort();infoController=null;}
  infoSequence++;
  const v=document.getElementById('urlInput').value;
  document.getElementById('urlClear').classList.toggle('vis',v.length>0);
  document.getElementById('errorWrap').classList.remove('show');
  document.getElementById('playlistCard').classList.remove('show');
  hideQR();videoInfo={};
  document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  const trimmed=v.trim();
  if(trimmed&&isValidUrl(trimmed)&&trimmed!==lastRadarUrl){lastRadarUrl=trimmed;fireRadar();}
  if(!trimmed)lastRadarUrl='';
}
function clearUrl(){document.getElementById('urlInput').value='';document.getElementById('urlTextarea').value='';onInput();document.getElementById('urlInput').focus();}

async function cancelBackendJob(job){
  if(!job)return false;
  if(job.controller)job.controller.abort();
  if(!job.downloadId)return true;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  try{
    const res=await fetch(API+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({download_id:job.downloadId,sid:socketId}),signal:controller.signal});
    return res.ok;
  }catch(e){return false;}
  finally{clearTimeout(timeout);}
}

// ── BULK DOWNLOAD ───────────────────────────────────
let bulkRunning=false,bulkStopRequested=false,activeBulkJob=null;
async function fetchBulkVideos(){
  if(bulkRunning){await cancelBulkDownloads();return;}
  const textarea=document.getElementById('urlTextarea');
  const requestedUrls=textarea.value.split('\n').map(u=>u.trim()).filter(u=>u&&u.startsWith('http'));
  if(requestedUrls.length===0){toast(t('bulkNeedLink'),'#ed4245');return;}
  if(requestedUrls.length>10){toast(t('bulkMaxLinks'),'#f59e0b');return;}
  const blockedYoutube=requestedUrls.filter(shouldRouteYoutubeToApps);
  const urls=requestedUrls.filter(url=>!shouldRouteYoutubeToApps(url));
  if(blockedYoutube.length)showYoutubeAppRequired();
  if(urls.length===0)return;
  
  const successCount=[];
  const failCount=[];
  const goBtn=document.querySelector('.url-go-btn');
  bulkRunning=true;bulkStopRequested=false;
  if(goBtn){goBtn.onclick=cancelBulkDownloads;goBtn.setAttribute('aria-label',t('dlCancel'));goBtn.innerHTML='✕';}
  
  for(let i=0;i<urls.length;i++){
    if(bulkStopRequested)break;
    const url=urls[i];
    document.getElementById('urlSpinWrap').innerHTML=`<div style="font-size:10px;color:var(--text2)">${i+1}/${urls.length}</div>`;
    try{
      // Bulk deliberately skips /info: /download already extracts the title and
      // prepares the file, so each item costs one backend/upstream job.
      const result=await startDownload({bulk:true,url,onJobStart:job=>{activeBulkJob=job;}});
      activeBulkJob=null;
      if(result.ok)successCount.push(url);
      else failCount.push(url);
    }catch(e){
      failCount.push(url);
    }
    await new Promise(r=>setTimeout(r,1000));
  }
  activeBulkJob=null;bulkRunning=false;
  document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  toast(`${successCount.length} ${t('bulkSuccessWord')}, ${failCount.length} ${t('bulkFailWord')}`,successCount.length>0?'#3bba64':'#ed4245');
  if(!bulkStopRequested){textarea.value='';toggleBulkMode();}
  else if(goBtn){goBtn.onclick=fetchBulkVideos;goBtn.setAttribute('aria-label',t('dlBtn'));goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
}
async function cancelBulkDownloads(){
  if(!bulkRunning)return;
  bulkStopRequested=true;
  await cancelBackendJob(activeBulkJob);
  toast(t('cancelled'),'#f59e0b');
}
function showErr(icon,msg){document.getElementById('errIcon').textContent=icon;document.getElementById('errTxt').textContent=msg;document.getElementById('errorWrap').classList.add('show');}
const PUBLIC_ERROR_TX={
  youtube_restricted:'errYoutubeRestricted',format_unavailable:'errFormatUnavailable',
  private_video:'errPrivate',copyright_restricted:'errPlatformRestricted',age_restricted:'errUnavailable',video_unavailable:'errUnavailable',live_not_supported:'errLive',
  instagram_ratelimit:'igBusy',platform_restricted:'errPlatformRestricted',unsupported_url:'errUnsupported',playlist_not_supported:'errUnsupported',video_too_long:'errUnavailable',
  network_error:'errNetwork',request_timeout:'errTimeout',file_too_large:'errFileTooLarge',server_busy:'errServerBusy',media_probe_failed:'errConversion',conversion_too_long:'errConversion',conversion_failed:'errConversion',remux_incompatible:'errConversion',request_failed:'errGeneric'
};
function publicErrorMessage(payload,status,url){
  const code=payload&&payload.error_code;
  if(code&&PUBLIC_ERROR_TX[code])return t(PUBLIC_ERROR_TX[code]);
  if(status===429)return t('errRateLimited');
  if(status===503)return t('errServerBusy');
  if(status===504)return t('errTimeout');
  if(isYT(url||''))return t('errYoutubeRestricted');
  return t('errGeneric');
}
let toolErrorCode='';
function renderToolError(code){
  const card=document.getElementById('toolError');
  if(!card)return false;
  const copy={
    remux_incompatible:['toolErrorRemuxTitle','toolErrorRemuxText'],
    media_probe_failed:['toolErrorProbeTitle','toolErrorProbeText'],
    file_too_large:['toolErrorSizeTitle','toolErrorSizeText'],
    request_timeout:['toolErrorTimeoutTitle','toolErrorTimeoutText'],
    conversion_too_long:['toolErrorTimeoutTitle','toolErrorTimeoutText'],
    conversion_failed:['toolErrorConversionTitle','toolErrorConversionText']
  }[code]||['toolErrorConversionTitle','toolErrorConversionText'];
  toolErrorCode=code;
  const title=document.getElementById('toolErrorTitle'),text=document.getElementById('toolErrorText');
  if(title)title.textContent=t(copy[0]);
  if(text)text.textContent=t(copy[1]);
  card.hidden=false;
  return true;
}
function clearToolError(){const card=document.getElementById('toolError');if(card)card.hidden=true;toolErrorCode='';}
function showPublicError(payload,status,url,inline){
  const msg=publicErrorMessage(payload,status,url);
  if(!inline&&renderToolError((payload&&payload.error_code)||''))return;
  if(inline)showErr('!',msg);else toast(msg,'#ed4245');
}
async function pasteAndFetch(){try{const tx=await navigator.clipboard.readText();if(tx){document.getElementById('urlInput').value=tx;onInput();if(tx.startsWith('http'))fetchVideo();}}catch(e){document.getElementById('urlInput').focus();}}

// ── panoyu otomatik algılama ──
// Sekme yeniden odaklanınca panoda video linkine benzer bir şey var mı diye sessizce bakar.
// Varsa küçük, kapatılabilir bir öneri çubuğu gösterir; hiçbir şeyi otomatik doldurmaz/indirmez,
// karar her zaman kullanıcıya ait. Aynı link bir kere kapatılırsa bu oturumda bir daha sorulmaz.
let _clipHintUrl='';
function _looksLikeVideoLink(s){
  if(!s||s.length>600)return false;
  s=s.trim();
  if(!/^https?:\/\//i.test(s))return false;
  if(/\s/.test(s))return false; // toplu link listesi değil, tek link olsun
  return true;
}
async function checkClipboardForLink(){
  try{
    if(document.getElementById('bulkToggle').classList.contains('active'))return;
    const ai=document.activeElement;
    if(ai&&(ai.id==='urlInput'||ai.id==='urlTextarea'))return; // kullanıcı zaten yazıyor
    if(document.getElementById('urlInput').value.trim())return; // kutuda zaten bir şey var
    if(!navigator.clipboard||!navigator.clipboard.readText)return;
    const perm=navigator.permissions&&navigator.permissions.query?await navigator.permissions.query({name:'clipboard-read'}).catch(()=>null):null;
    if(perm&&perm.state==='denied')return;
    const tx=await navigator.clipboard.readText();
    if(!_looksLikeVideoLink(tx))return;
    let dismissed=[];try{dismissed=JSON.parse(sessionStorage.getItem('zw_clip_dismissed')||'[]');}catch(e){}
    if(dismissed.includes(tx))return;
    _clipHintUrl=tx;
    let host='';try{host=new URL(tx).hostname.replace(/^www\./,'');}catch(e){}
    document.getElementById('clipHintTxt').textContent=t('clipHintTxt').replace('{host}',host||'link');
    document.getElementById('clipHint').classList.add('show');
  }catch(e){/* izin yok ya da okunamadı — sessizce vazgeç */}
}
function useClipboardHint(){
  if(!_clipHintUrl)return;
  document.getElementById('urlInput').value=_clipHintUrl;
  onInput();
  document.getElementById('clipHint').classList.remove('show');
  fetchVideo();
}
function dismissClipboardHint(){
  document.getElementById('clipHint').classList.remove('show');
  if(_clipHintUrl){
    try{
      const d=JSON.parse(sessionStorage.getItem('zw_clip_dismissed')||'[]');
      d.push(_clipHintUrl);
      sessionStorage.setItem('zw_clip_dismissed',JSON.stringify(d.slice(-10)));
    }catch(e){}
  }
  _clipHintUrl='';
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkClipboardForLink();});
window.addEventListener('focus',checkClipboardForLink);

async function fetchVideo(opts){
  opts=opts||{};
  const url=document.getElementById('urlInput').value.trim();
  // Her denemede eski sonucu temizle — bulk'ta fail olan link bir önceki
  // videoyu tekrar indirmesin / başarı sayılmasın.
  videoInfo={};
  if(!url){if(!opts.silent)toast(t('enterLink'),'#ed4245');return false;}
  if(shouldRouteYoutubeToApps(url)){showYoutubeAppRequired();return false;}
  if(infoController)infoController.abort();
  const controller=new AbortController();
  const sequence=++infoSequence;
  infoController=controller;
  document.getElementById('urlSpinWrap').innerHTML='<div class="spinner"></div>';
  document.getElementById('playlistCard').classList.remove('show');
  document.getElementById('errorWrap').classList.remove('show');
  hideQR();
  try{
    const res=await fetch(API+'/info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal});
    const d=await res.json();
    if(sequence!==infoSequence||document.getElementById('urlInput').value.trim()!==url)return false;
    if(d.error){if(handleYoutubeAppRequired(d))return false;if(!opts.silent)showPublicError(d,res.status,url,true);return false;}

    if(d.is_playlist){
      // Toplu indirme tek video bekler; playlist bulursa bu URL fail sayılır.
      if(opts.forBulk)return false;
      renderPlaylist(d,url);
      toast((d.playlist_count||0)+' video bulundu','#3bba64');
      return true;
    }

    videoInfo={url,title:d.title,thumbnail:d.thumbnail,uploader:d.uploader,duration:d.duration};
    // Analiz sonucu küçük bir kartta kaybolmak yerine doğrudan karar modalında
    // gösterilir; kullanıcı indirmenin hangi medya için başlayacağını doğrular.
    openDlModal();
    if(!opts.silent){toast(t('found'),'#3bba64');showQR(url);}
    return true;
  }catch(e){
    if(e.name!=='AbortError'&&sequence===infoSequence&&!opts.silent)showPublicError({error_code:'network_error'},0,url,true);
    return false;
  }
  finally{
    if(infoController===controller)infoController=null;
    if(sequence===infoSequence)document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  }
}

// ── PLAYLIST ──────────────────────────────────────────
let playlistItems=[],playlistSelected=new Set(),playlistTitle='';
function renderPlaylist(d,sourceUrl){
  playlistItems=d.items||[];
  playlistTitle=d.playlist_title||'Playlist';
  playlistSelected=new Set(playlistItems.map((_,i)=>i)); // varsayılan: hepsi seçili

  document.getElementById('plTitle').textContent=playlistTitle;
  document.getElementById('plMeta').textContent=playlistItems.length+' video';

  const list=document.getElementById('plList');
  list.innerHTML=playlistItems.map((it,i)=>{
    const m=Math.floor((it.duration||0)/60),s=String((it.duration||0)%60).padStart(2,'0');
    const dur=it.duration?m+':'+s:'';
    return `<div class="pl-item sel" data-idx="${i}" onclick="togglePlaylistItem(${i})">
      <div class="pl-item-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="pl-item-thumb">${safeThumbHtml(it.thumbnail)}</div>
      <div class="pl-item-info"><div class="pl-item-title">${(i+1)+'. '+escapeHtml(it.title||'video')}</div>${dur?`<div class="pl-item-dur">${dur}</div>`:''}</div>
    </div>`;
  }).join('');

  updatePlaylistSelCount();
  document.getElementById('playlistCard').classList.add('show');
}
function togglePlaylistItem(i){
  const el=document.querySelector(`.pl-item[data-idx="${i}"]`);
  if(playlistSelected.has(i)){playlistSelected.delete(i);el.classList.remove('sel');}
  else{playlistSelected.add(i);el.classList.add('sel');}
  updatePlaylistSelCount();
}
function toggleSelectAllPlaylist(){
  const allSelected=playlistSelected.size===playlistItems.length;
  if(allSelected){playlistSelected.clear();}
  else{playlistSelected=new Set(playlistItems.map((_,i)=>i));}
  document.querySelectorAll('.pl-item').forEach((el,i)=>el.classList.toggle('sel',playlistSelected.has(i)));
  updatePlaylistSelCount();
}
function updatePlaylistSelCount(){
  const n=playlistSelected.size;
  document.getElementById('plDlBtnTxt').textContent=`seçilenleri indir (${n})`;
  document.getElementById('plDlBtn').disabled=(n===0);
  document.getElementById('plSelAllBtn').textContent=(n===playlistItems.length&&n>0)?'seçimi kaldır':'tümünü seç';
}
function openPlaylistDlModal(){
  if(playlistSelected.size===0)return;
  // Playlist indirmeleri tek tek video indirme modalını kullanarak,
  // mevcut format/kalite ayarlarıyla sırayla kuyruğa alınır.
  openPlaylistQueueModal();
}

// ── PLAYLIST QUEUE (sıralı toplu indirme) ──────────────
let plQueueRunning=false,plQueueStopRequested=false,plQueueActiveJob=null;

// Kuyruk durumu localStorage'a yazılır ki sekme kapanır/yenilenirse
// (ya da "durdur"a basılırsa) kaldığın yerden devam edebilesin.
const QUEUE_STATE_KEY='zw_queue_state';
function saveQueueState(selectedIdx,doneIdx,errIdx,fmt,mode,title,items){
  try{
    localStorage.setItem(QUEUE_STATE_KEY,JSON.stringify({
      playlistTitle:title,items,selectedIdx,doneIdx,errIdx,fmt,mode,savedAt:Date.now()
    }));
  }catch(e){}
}
function clearQueueState(){try{localStorage.removeItem(QUEUE_STATE_KEY);}catch(e){}}
function loadQueueState(){
  try{
    const raw=localStorage.getItem(QUEUE_STATE_KEY);
    if(!raw)return null;
    const st=JSON.parse(raw);
    // 24 saatten eski kayıtlara güvenme — linkler bu sürede süresi dolmuş olabilir
    if(!st.savedAt||Date.now()-st.savedAt>24*60*60*1000){clearQueueState();return null;}
    if(!st.items||!st.items.length||!st.selectedIdx||!st.selectedIdx.length)return null;
    if((st.doneIdx||[]).length>=st.selectedIdx.length)return null; // zaten tamamlanmış
    return st;
  }catch(e){return null;}
}
function hideQueueResumeHint(){
  const el=document.getElementById('queueResumeHint');
  if(el)el.classList.remove('show');
}
function checkQueueResume(){
  const st=loadQueueState();
  const el=document.getElementById('queueResumeHint');
  if(!el)return;
  if(!st||plQueueRunning){el.classList.remove('show');return;}
  const done=(st.doneIdx||[]).length,total=st.selectedIdx.length;
  document.getElementById('queueResumeTxt').textContent=t('queueResumeTpl').replace('{done}',done).replace('{total}',total);
  el.classList.add('show');
}
function discardQueue(){
  clearQueueState();
  hideQueueResumeHint();
}
function resumeQueue(){
  const st=loadQueueState();
  if(!st){hideQueueResumeHint();return;}
  playlistItems=st.items;
  playlistTitle=st.playlistTitle||playlistTitle;
  const fullIdx=st.selectedIdx;
  const doneArr=st.doneIdx||[],errArr=st.errIdx||[];

  const list=document.getElementById('plQueueList');
  list.innerHTML=fullIdx.map(i=>{
    const it=playlistItems[i]||{};
    const isDone=doneArr.includes(i),isErr=errArr.includes(i);
    const statusTxt=isDone?t('plQueueItemDone'):(isErr?t('plQueueItemErr'):t('plQueueQueued'));
    const statusCls=isDone?'done':(isErr?'err':'');
    return `<div class="pl-queue-item" id="plq-${i}">
      <div class="pl-queue-title">${escapeHtml(it.title||'video')}</div>
      <div class="pl-queue-status ${statusCls}" id="plq-status-${i}">${statusTxt}</div>
    </div>`;
  }).join('');

  document.getElementById('plQueueProgress').textContent=`${doneArr.length} / ${fullIdx.length} ${t('plQueueCompletedWord')}`;
  if(!S.keepQueueClosed)openOverlay('plQueueOverlay');

  plQueueStopRequested=false;
  hideQueueResumeHint();
  runPlaylistQueue(fullIdx,doneArr,st.fmt);
}
function openPlaylistQueueModal(){
  const selectedIdx=[...playlistSelected].sort((a,b)=>a-b);
  if(selectedIdx.length===0)return;

  const list=document.getElementById('plQueueList');
  list.innerHTML=selectedIdx.map(i=>{
    const it=playlistItems[i];
    return `<div class="pl-queue-item" id="plq-${i}">
      <div class="pl-queue-title">${escapeHtml(it.title||'video')}</div>
      <div class="pl-queue-status" id="plq-status-${i}">${t('plQueueQueued')}</div>
    </div>`;
  }).join('');

  document.getElementById('plQueueProgress').textContent=`0 / ${selectedIdx.length} ${t('plQueueCompletedWord')}`;
  if(!S.keepQueueClosed)openOverlay('plQueueOverlay');

  plQueueStopRequested=false;
  hideQueueResumeHint();
  runPlaylistQueue(selectedIdx,[]);
}
async function runPlaylistQueue(fullSelectedIdx,alreadyDone,fmtOverride){
  if(plQueueRunning)return;
  plQueueRunning=true;
  await ensureSocket();
  alreadyDone=alreadyDone||[];
  const doneSet=new Set(alreadyDone);
  const errSet=new Set();
  const total=fullSelectedIdx.length;
  const isAudio=fmtOverride?fmtOverride.mode==='audio':(DL_MODE==='audio');
  const isMute=fmtOverride?fmtOverride.mode==='mute':(DL_MODE==='mute');
  const f=fmtOverride||{quality:S.quality,codec:S.codec,vfmt:S.vfmt,afmt:S.afmt,audioQ:S.audioQ,metadata:S.metadata,mode:DL_MODE};
  const fmt=isAudio?f.afmt:f.vfmt;

  saveQueueState(fullSelectedIdx,[...doneSet],[...errSet],f,f.mode,playlistTitle,playlistItems);

  for(const i of fullSelectedIdx){
    if(doneSet.has(i))continue; // resume'de zaten tamamlanmışsa tekrar indirme
    if(plQueueStopRequested)break;
    const it=playlistItems[i];
    const statusEl=document.getElementById(`plq-status-${i}`);
    if(statusEl){statusEl.classList.remove('err');statusEl.textContent=t('plQueueDownloadingItem');}
    let dId=null;
    try{
      dId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
      const controller=new AbortController();
      plQueueActiveJob={downloadId:dId,controller};
      activeProgressJobId=dId;
      const filename=buildFilename(S.fnfTemplate||'{title}.{ext}',{title:it.title,uploader:'',url:it.url},fmt);
      const preferredSub=S.subtitleLang&&S.subtitleLang!=='auto'?S.subtitleLang:'tr';
      const res=await fetch(API+'/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:it.url,quality:f.quality,format:fmt,codec:f.codec,audioQ:f.audioQ,metadata:f.metadata,sid:socketId,download_id:dId,download_name:filename,audio_only:isAudio,mute:isMute,sponsorblock:!!S.sponsorblock,subtitles:!!S.subtitles,sub_langs:[preferredSub,'en']}),signal:controller.signal});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok){
        errSet.add(i);
        if(statusEl){statusEl.textContent=t('plQueueItemErr');statusEl.classList.add('err');}
      }else{
        if(!payload.download_url)throw new Error('Download file was not prepared');
        await handoffPreparedDownload(payload,false,(pct,received,total)=>{
          if(statusEl&&total>0)statusEl.textContent=`${Math.min(100,pct)}%`;
        },controller.signal);
        addToLocalHistory({url:it.url,title:it.title||'video',platform:getPlatformName(it.url||''),format:fmt});
        doneSet.add(i);errSet.delete(i);
        if(statusEl){statusEl.textContent=t('plQueueItemDone');statusEl.classList.remove('err');statusEl.classList.add('done');}
      }
    }catch(e){
      if(!plQueueStopRequested){
        errSet.add(i);
        if(statusEl){statusEl.textContent=t('plQueueItemErr');statusEl.classList.add('err');}
      }
    }finally{
      plQueueActiveJob=null;
      if(activeProgressJobId&&activeProgressJobId===dId)activeProgressJobId=null;
    }
    document.getElementById('plQueueProgress').textContent=`${doneSet.size} / ${total} ${t('plQueueCompletedWord')}`;
    saveQueueState(fullSelectedIdx,[...doneSet],[...errSet],f,f.mode,playlistTitle,playlistItems);
  }

  plQueueRunning=false;
  if(plQueueStopRequested){
    // Kasıtlı durdurma — kayıt silinmiyor, kullanıcı istediğinde "devam et" ile kaldığı yerden sürdürebilir.
    toast(t('plQueueStoppedMsg'),'#f59e0b');
  }else{
    toast(t('plQueueDoneMsg'),'#3bba64');
    clearQueueState();
  }
  const plqct=document.getElementById('plQueueCancelTxt');if(plqct)plqct.textContent=t('plQueueCloseBtn');
  checkQueueResume();
  scheduleSocketDisconnect();
}
const NATIVE_HANDOFF_START_TIMEOUT_MS=15000;
const NATIVE_TRANSFER_TIMEOUT_MS=45*60*1000;
async function waitForNativeTransfer(statusPath,onProgress,signal){
  if(!statusPath)throw new Error('Transfer status unavailable');
  const startedAt=Date.now();
  let transferStarted=false;
  while(Date.now()-startedAt<NATIVE_TRANSFER_TIMEOUT_MS){
    if(signal&&signal.aborted)throw new DOMException('Transfer cancelled','AbortError');
    const res=await fetch(statusPath.startsWith('http')?statusPath:API+statusPath,{cache:'no-store',signal});
    if(!res.ok)throw new Error('Transfer status unavailable');
    const status=await res.json();
    if(status.state==='transferring')transferStarted=true;
    if(onProgress&&status.expected_bytes>0){
      const pct=90+Math.floor(Math.min(1,status.transferred_bytes/status.expected_bytes)*10);
      onProgress(pct,status.transferred_bytes,status.expected_bytes);
    }
    if(status.state==='completed')return 'transfer-confirmed';
    if(['interrupted','failed','expired'].includes(status.state))throw new Error('Prepared transfer failed');
    if(!transferStarted&&Date.now()-startedAt>NATIVE_HANDOFF_START_TIMEOUT_MS)throw new Error('Browser did not start the download');
    await new Promise(r=>setTimeout(r,750));
  }
  throw new DOMException('Prepared transfer timed out','TimeoutError');
}
async function triggerNativeDownload(path,statusPath,onProgress,signal){
  if(!path)throw new Error('Download path unavailable');
  const a=document.createElement('a');
  a.href=path.startsWith('http')?path:API+path;document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  return waitForNativeTransfer(statusPath,onProgress,signal);
}
const BLOB_SAVE_LIMIT=32*1024*1024;
const MAX_TOOL_FILE_BYTES=95*1024*1024;
const MEDIA_JOB_TIMEOUT_MS=15*60*1000;
const PREPARED_TRANSFER_TIMEOUT_MS=5*60*1000;
const PREPARED_TRANSFER_IDLE_MS=30000;
async function fetchMediaJob(formData){
  if(window.ZenithLocalMedia){
    const localMedia=await window.ZenithLocalMedia.run(formData);
    if(localMedia)return {localMedia};
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),MEDIA_JOB_TIMEOUT_MS);
  try{return await fetch(API+'/convert',{method:'POST',body:formData,signal:controller.signal});}
  finally{clearTimeout(timeout);}
}
async function handoffPreparedDownload(payload,allowSaveModal,onProgress,signal){
  if(!payload||!payload.download_url)throw new Error('Download file was not prepared');
  if(allowSaveModal&&Number(payload.size)>0&&Number(payload.size)<=BLOB_SAVE_LIMIT){
    const controller=new AbortController();
    activeTransferAbort=controller;
    const totalTimeout=setTimeout(()=>controller.abort(),PREPARED_TRANSFER_TIMEOUT_MS);
    let idleTimeout=null,reader=null;
    const resetIdle=()=>{if(idleTimeout)clearTimeout(idleTimeout);idleTimeout=setTimeout(()=>controller.abort(),PREPARED_TRANSFER_IDLE_MS);};
    try{
      resetIdle();
      const transfer=await fetch(payload.download_url.startsWith('http')?payload.download_url:API+payload.download_url,{signal:controller.signal,cache:'no-store'});
      if(!transfer.ok)throw new Error('Prepared download expired');
      const total=Number(transfer.headers.get('Content-Length'))||Number(payload.size)||0;
      let blob;
      if(transfer.body&&transfer.body.getReader){
        reader=transfer.body.getReader();
        const chunks=[];
        let received=0;
        while(true){
          const part=await reader.read();
          if(part.done)break;
          resetIdle();
          chunks.push(part.value);received+=part.value.byteLength;
          if(onProgress&&total>0)onProgress(Math.min(99,90+Math.floor(received/total*9)),received,total);
        }
        blob=new Blob(chunks,{type:transfer.headers.get('Content-Type')||'application/octet-stream'});
      }else{
        blob=await transfer.blob();
      }
      if(!blob.size)throw new Error('Prepared download is empty');
      openSaveModal(blob,payload.filename||'download');
      return 'save-modal';
    }catch(e){
      if(reader)try{await reader.cancel();}catch(_e){}
      throw e;
    }finally{
      clearTimeout(totalTimeout);if(idleTimeout)clearTimeout(idleTimeout);
      if(activeTransferAbort===controller)activeTransferAbort=null;
    }
  }
  return triggerNativeDownload(payload.download_url,payload.transfer_status_url,onProgress,signal);
}
async function cancelPlaylistQueue(){
  if(plQueueRunning){
    plQueueStopRequested=true;
    toast(t('plQueueStoppingMsg'),'#f59e0b');
    await cancelBackendJob(plQueueActiveJob);
  }else{
    closePlaylistQueue();
  }
}
function closePlaylistQueue(){
  if(plQueueRunning){
    plQueueStopRequested=true;
    cancelBackendJob(plQueueActiveJob);
  }
  closeOverlay('plQueueOverlay');
  const plqct2=document.getElementById('plQueueCancelTxt');if(plqct2)plqct2.textContent=t('plQueueStopBtn');
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('urlInput').addEventListener('keydown',e=>{if(e.key==='Enter')fetchVideo();});
  document.getElementById('urlInput').addEventListener('paste',()=>setTimeout(()=>{const v=document.getElementById('urlInput').value;onInput();if(v.startsWith('http'))fetchVideo();},80));
  document.getElementById('urlTextarea').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fetchBulkVideos();}
  });
  const youtubeAppOverlay=document.getElementById('youtubeAppOverlay');
  document.getElementById('youtubeAppClose')?.addEventListener('click',()=>closeOverlay('youtubeAppOverlay'));
  youtubeAppOverlay?.addEventListener('click',e=>{if(e.target===youtubeAppOverlay)closeOverlay('youtubeAppOverlay');});
  checkQueueResume();
});

function showYtErr(){const p=document.getElementById('ytPopup');p.classList.add('show');if(ytErrTimer)clearTimeout(ytErrTimer);ytErrTimer=setTimeout(()=>p.classList.remove('show'),4500);}

// ── QR ────────────────────────────────────────────────
// URL'leri üçüncü taraf bir QR servisine göndermemek için otomatik QR üretimi
// kapalıdır. Yerel bir QR üretici eklendiğinde bu fonksiyon yeniden açılabilir.
function showQR(){hideQR();}
function hideQR(){document.getElementById('qrWrap').classList.remove('show');}

// ── DL MODAL ─────────────────────────────────────────
function openDlModal(){
  if(!videoInfo.url)return;
  const th=document.getElementById('dlThumb');th.innerHTML=safeThumbHtml(videoInfo.thumbnail);
  document.getElementById('dlVTitle').textContent=videoInfo.title||'video';
  const m=Math.floor((videoInfo.duration||0)/60),s=String((videoInfo.duration||0)%60).padStart(2,'0');
  document.getElementById('dlVMeta').textContent=(videoInfo.uploader||'')+(videoInfo.duration?' · '+m+':'+s:'');
  const durationBadge=document.getElementById('dlDurationBadge');
  if(durationBadge){durationBadge.textContent=videoInfo.duration?m+':'+s:'';durationBadge.hidden=!videoInfo.duration;}
  const progressTitle=document.getElementById('dlProgressTitle');
  if(progressTitle)progressTitle.textContent=t('dlProgressTitle');
  document.getElementById('dlAnalysisTitle').textContent=t('dlAnalysisTitle');
  document.getElementById('dlAnalysisDesc').textContent=t('dlAnalysisDesc');
  document.getElementById('dlThumbActionTxt').textContent=t('dlThumbActionTxt');
  document.getElementById('dlSettingsTxt').textContent=t('dlSettingsTxt');
  renderDownloadPlan();
  resetProgress();openOverlay('dlOverlay');
}
function progressMediaMeta(metrics={}){
  const platform=getPlatformName(videoInfo.url||'')||'Media';
  const format=(DL_MODE==='audio'?(S.afmt||'mp3'):(S.vfmt||'mp4')).toUpperCase();
  let quality='';
  if(DL_MODE==='audio')quality=(S.audioQ||'192')+' kbps';
  else if(metrics.actual_height)quality=metrics.actual_height+'p';
  else quality=(S.quality==='9999'?'MAX':(S.quality||'1080')+'p');
  return [platform,quality,format].filter(Boolean).join(' · ');
}
function renderDownloadPlan(){
  const card=document.getElementById('dlPlanCard');
  if(!card)return;
  const isAudio=DL_MODE==='audio';
  const label=document.getElementById('dlPlanLabel'),title=document.getElementById('dlPlanTitle'),text=document.getElementById('dlPlanText');
  if(label)label.textContent=t(isAudio?'dlPlanAudio':'dlPlanVideo');
  if(isAudio){
    if(title)title.textContent=(S.afmt||'mp3').toUpperCase()+' · '+(S.audioQ||'192')+' kbps';
    if(text)text.textContent=t('dlPlanFallback');
    return;
  }
  const profile=activeDownloadProfile();
  if(title)title.textContent=profile==='custom'?t('profileCustom'):t(profileNameKey(profile));
  const quality=S.quality==='9999'?'MAX':(S.quality||'1080')+'p';
  const adaptive=S.youtubeAdaptiveQuality&&typeof isYT==='function'&&isYT(videoInfo.url||'');
  if(text)text.textContent=quality+' · '+(S.codec||'h264').toUpperCase()+' · '+(S.vfmt||'mp4').toUpperCase()+' — '+(adaptive?t('dlPlanAdaptive'):t('dlPlanFallback'));
}
function formatProgressBytes(bytes){
  const value=Number(bytes||0);
  if(!Number.isFinite(value)||value<=0)return '';
  return (value/1024/1024).toFixed(value<10*1024*1024?1:0)+' MB';
}
function setProgress(pct,label,speed,done,metrics={}){
  pct=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  document.querySelector('.dl-modal-sheet')?.classList.add('progress-active');
  document.getElementById('dlProgWrap').classList.add('show');
  document.getElementById('dlBarFill').style.width=pct+'%';
  document.getElementById('dlProgPct').textContent=pct+'%';
  document.getElementById('dlProgLabel').textContent=label;
  const progressMeta=document.getElementById('dlProgressMeta');
  if(progressMeta)progressMeta.textContent=progressMediaMeta(metrics);
  const eta=String(metrics.eta||'').trim();
  document.getElementById('dlProgSpeed').textContent=[speed,eta].filter(Boolean).join(' · ');
  const current=document.getElementById('dlProgCurrent'),total=document.getElementById('dlProgTotal');
  if(current)current.textContent=formatProgressBytes(metrics.downloaded_bytes)||'0 MB';
  if(total)total.textContent=formatProgressBytes(metrics.total_bytes)||'';
  const badge=document.getElementById('dlQualityBadge');
  if(badge&&metrics.actual_height){
    const dimensions=(metrics.actual_width?metrics.actual_width+' × ':'')+metrics.actual_height;
    badge.textContent=(metrics.quality_verified?t('dlQualityVerified'):'Selected quality')+': '+dimensions;
    badge.hidden=false;
    badge.classList.toggle('unverified',metrics.quality_verified===false);
  }
  if(done){document.getElementById('dlProgIcon').classList.add('done');document.getElementById('dlProgIcon').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';document.getElementById('dlCancel').classList.remove('vis');}
}
function resetProgress(){
  document.querySelector('.dl-modal-sheet')?.classList.remove('progress-active');
  document.getElementById('dlProgWrap').classList.remove('show');
  document.getElementById('dlBarFill').style.width='0%';
  document.getElementById('dlProgPct').textContent='0%';
  document.getElementById('dlProgLabel').textContent='';
  const progressMeta=document.getElementById('dlProgressMeta');
  if(progressMeta)progressMeta.textContent=progressMediaMeta();
  document.getElementById('dlProgSpeed').textContent='';
  const current=document.getElementById('dlProgCurrent'),total=document.getElementById('dlProgTotal'),badge=document.getElementById('dlQualityBadge');
  if(current)current.textContent='0 MB';
  if(total)total.textContent='';
  if(badge){badge.hidden=true;badge.textContent='';badge.classList.remove('unverified');}
  document.getElementById('dlProgIcon').classList.remove('done');
  document.getElementById('dlProgIcon').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.getElementById('dlBtn').disabled=false;
  const dbt=document.getElementById('dlBtnTxt');if(dbt)dbt.textContent=t('dlBtn');
  document.getElementById('dlCancel').classList.remove('vis');
  document.getElementById('dlCancel').disabled=false;
}

async function startDownload(options={}){
  const bulk=!!options.bulk;
  const sourceInfo=bulk?{url:String(options.url||'').trim(),title:''}:videoInfo;
  if(!sourceInfo.url)return {ok:false,error_code:'invalid_url'};
  if(shouldRouteYoutubeToApps(sourceInfo.url)){showYoutubeAppRequired();return {ok:false,error_code:'youtube_app_required'};}
  const isAudio=(DL_MODE==='audio'),isMute=(DL_MODE==='mute'),fmt=isAudio?S.afmt:S.vfmt;
  if(!bulk)await ensureSocket();
  const btn=document.getElementById('dlBtn');
  const btnTxt=document.getElementById('dlBtnTxt');
  const cancelBtn=document.getElementById('dlCancel');
  if(!bulk){
    if(btn)btn.disabled=true;
    if(btnTxt)btnTxt.innerHTML='<div class="spinner"></div>';
    if(cancelBtn)cancelBtn.classList.add('vis');
    setProgress(5,t('connecting'),'',false);
  }
  const requestId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
  const controller=new AbortController();
  const activeJob={downloadId:requestId,controller};
  if(typeof options.onJobStart==='function')options.onJobStart(activeJob);
  if(!bulk){dlId=requestId;dlAbort=controller;activeProgressJobId=requestId;}
  try{
    const preferredSub=S.subtitleLang&&S.subtitleLang!=='auto'?S.subtitleLang:'tr';
    const body={url:sourceInfo.url,quality:S.quality,format:fmt,codec:S.codec,audioQ:S.audioQ,youtube_adaptive_quality:!!S.youtubeAdaptiveQuality,metadata:S.metadata,sid:bulk?'':socketId,download_id:requestId,audio_only:isAudio,mute:isMute,sponsorblock:!!S.sponsorblock,subtitles:!!S.subtitles,sub_langs:[preferredSub,'en']};
    if(!bulk)body.download_name=buildFilename(S.fnfTemplate||'{title}.{ext}',sourceInfo,fmt);
    const res=await fetch(API+'/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    if(!bulk)dlId=null;
    if(res.status===409)return {ok:false,error_code:'cancelled'};
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){
      if(handleYoutubeAppRequired(payload))return {ok:false,error_code:'youtube_app_required',status:res.status};
      if(!bulk){resetProgress();showPublicError(payload,res.status,sourceInfo.url,false);}
      return {ok:false,error_code:payload.error_code||'request_failed',status:res.status};
    }
    // Batch items always use native handoff; a later item cannot replace a
    // small-file Blob waiting in the save modal.
    const handoff=await handoffPreparedDownload(payload,!bulk,bulk?null:(pct,received,total)=>{
      setProgress(pct,t('downloading'),'',false,{downloaded_bytes:received,total_bytes:total});
    },controller.signal);
    addToLocalHistory({url:sourceInfo.url,title:sourceInfo.title||payload.filename||'video',platform:getPlatformName(sourceInfo.url||''),format:fmt});
    if(!bulk){
      resetProgress();closeOverlay('dlOverlay');
      if(handoff==='save-modal')lockPageScroll();
      else{toast(t('downloaded'),'#3bba64');fireConfetti();}
    }
    return {ok:true,payload,handoff};
  }catch(e){
    if(!bulk){
      dlAbort=null;resetProgress();
      if(e.name!=='AbortError')showPublicError({error_code:'network_error'},0,sourceInfo.url,false);
    }
    return {ok:false,error_code:e.name==='AbortError'?'cancelled':'network_error'};
  }
  finally{
    if(activeProgressJobId===requestId)activeProgressJobId=null;
    if(!bulk){dlAbort=null;dlId=null;scheduleSocketDisconnect();}
  }
}
async function cancelDownload(){
  const job=(dlId||dlAbort)?{downloadId:dlId,controller:dlAbort}:null;
  const cancelBtn=document.getElementById('dlCancel');
  if(cancelBtn)cancelBtn.disabled=true;
  if(activeTransferAbort)activeTransferAbort.abort();
  await cancelBackendJob(job);
  dlAbort=null;dlId=null;activeProgressJobId=null;
  resetProgress();toast(t('cancelled'),'#f59e0b');scheduleSocketDisconnect();
}

// ── SAVE MODAL ────────────────────────────────────────
// Small celebratory confetti burst — no deps, plain DOM + CSS
const CONFETTI_COLORS=['#3bba64','#ff4a97','#f59e0b','#5b8def','#ffffff'];
function fireConfetti(){
  const host=document.createElement('div');
  host.className='confetti-host';
  document.body.appendChild(host);
  const n=22;
  for(let i=0;i<n;i++){
    const p=document.createElement('span');
    p.className='confetti-piece';
    const angle=(Math.random()*140-70)*(Math.PI/180); // upward-ish spread
    const dist=80+Math.random()*120;
    const dx=Math.sin(angle)*dist;
    const dy=-Math.abs(Math.cos(angle)*dist)-40;
    p.style.setProperty('--dx',dx+'px');
    p.style.setProperty('--dy',dy+'px');
    p.style.setProperty('--rot',(Math.random()*720-360)+'deg');
    p.style.background=CONFETTI_COLORS[i%CONFETTI_COLORS.length];
    p.style.left='calc(50% + '+(Math.random()*40-20)+'px)';
    p.style.animationDelay=(Math.random()*0.12)+'s';
    host.appendChild(p);
  }
  setTimeout(()=>host.remove(),1400);
}
function releasePendingBlob(){if(pendingObjectUrl)URL.revokeObjectURL(pendingObjectUrl);pendingObjectUrl=null;pendingBlob=null;pendingFilename=null;}
function openSaveModal(blob,filename){
  releasePendingBlob();pendingBlob=blob;pendingFilename=filename;
  const method=S.saveMethod||'ask';
  if(method==='ask')openOverlay('saveOverlay');
  else saveAction(method);
}
function saveAction(type){
  if(!pendingBlob)return;
  const url=URL.createObjectURL(pendingBlob);
  pendingObjectUrl=url;
  setTimeout(()=>{URL.revokeObjectURL(url);if(pendingObjectUrl===url){pendingObjectUrl=null;pendingBlob=null;pendingFilename=null;}},60000);
  if(type==='download'){const a=document.createElement('a');a.href=url;a.download=pendingFilename;a.click();toast(t('downloaded'),'#3bba64');fireConfetti();closeOverlay('saveOverlay',true);}
  else if(type==='share'){if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([pendingBlob],pendingFilename)]})){navigator.share({files:[new File([pendingBlob],pendingFilename)],title:pendingFilename}).catch(()=>{});fireConfetti();}else{const a=document.createElement('a');a.href=url;a.download=pendingFilename;a.click();toast(t('downloaded'),'#3bba64');fireConfetti();closeOverlay('saveOverlay',true);}}
  else if(type==='copy'){
    const fallback=()=>{const a=document.createElement('a');a.href=url;a.download=pendingFilename;a.click();toast(LANG==='en'?'Copy not supported here, downloaded instead':'Bu tarayıcıda kopyalama desteklenmiyor, indirildi','#f59e0b');closeOverlay('saveOverlay',true);};
    if(navigator.clipboard&&window.ClipboardItem){
      navigator.clipboard.write([new ClipboardItem({[pendingBlob.type]:pendingBlob})])
        .then(()=>toast(LANG==='en'?'copied!':'kopyalandı!','#3bba64'))
        .catch(fallback);
    } else { fallback(); }
  }
}

// ── FILENAME ──────────────────────────────────────────
function buildFilename(tpl,info,fmt){const now=new Date(),date=now.getFullYear()+'-'+(now.getMonth()+1).toString().padStart(2,'0')+'-'+now.getDate().toString().padStart(2,'0');return tpl.replace(/{title}/g,(info.title||'video').replace(/[<>:"/\\|?*]/g,'_')).replace(/{artist}/g,(info.uploader||'unknown').replace(/[<>:"/\\|?*]/g,'_')).replace(/{date}/g,date).replace(/{platform}/g,getPlatformName(info.url||'')).replace(/{ext}/g,fmt||'mp4');}
function getPlatformName(url){if(url.includes('youtube')||url.includes('youtu.be'))return'youtube';if(url.includes('tiktok'))return'tiktok';if(url.includes('instagram'))return'instagram';if(url.includes('twitter')||url.includes('x.com'))return'twitter';if(url.includes('soundcloud'))return'soundcloud';return'video';}
function updateFnfPreview(){const tpl=document.getElementById('fnfInput').value||'{title}.{ext}';S.fnfTemplate=tpl;saveSt();const el=document.getElementById('fnfPreview');if(el)el.textContent='Örnek: '+buildFilename(tpl,{title:'video_başlığı',uploader:'sanatçı',url:''},S.afmt||'mp3');}
function insertFnfTag(tag){const inp=document.getElementById('fnfInput');const pos=inp.selectionStart||inp.value.length;inp.value=inp.value.slice(0,pos)+tag+inp.value.slice(inp.selectionEnd||pos);inp.focus();updateFnfPreview();}
function setFnfTemplate(tpl){document.getElementById('fnfInput').value=tpl;updateFnfPreview();}
const FILENAME_STYLES={classic:'{title}.{ext}',basic:'{artist} - {title}.{ext}',pretty:'{title} · {artist}.{ext}',nerdy:'[{platform}] {date} - {title}.{ext}'};
function setFilenameStyle(el){
  const style=el.dataset.v||'basic';
  S.filenameStyle=style;saveSt();
  setFnfTemplate(FILENAME_STYLES[style]||FILENAME_STYLES.basic);
  document.querySelectorAll('#filenameStyleChips .chip').forEach(c=>c.classList.toggle('active',c===el));
}

// ── SETTINGS UI ───────────────────────────────────────
function openSettings(){openOverlay('stOverlay');}
function stTab(el){
  document.querySelectorAll('.st-nav-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});document.querySelectorAll('.st-page').forEach(p=>p.classList.remove('active'));el.classList.add('active');el.setAttribute('aria-selected','true');const pg=document.getElementById('stPage'+el.dataset.page.charAt(0).toUpperCase()+el.dataset.page.slice(1));if(pg)pg.classList.add('active');const content=document.querySelector('.st-content');if(content)content.scrollTop=0;
  if(window.matchMedia('(max-width:900px)').matches&&document.body.classList.contains('settings-page')){document.body.classList.remove('mobile-settings-index');const title=document.getElementById('mobileSettingsTitle'),label=el.querySelector('span');if(title&&label)title.textContent=label.textContent;window.scrollTo({top:0,behavior:'auto'});}
}
function showMobileSettingsHome(){if(!document.body.classList.contains('settings-page'))return;document.body.classList.add('mobile-settings-index');const title=document.getElementById('mobileSettingsTitle');if(title)title.textContent=t('stModalTitle');window.scrollTo({top:0,behavior:'auto'});}
function stChip(el,key){el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');S[key]=el.dataset.v;if(PROFILE_FIELDS.includes(key))S.downloadProfile='custom';saveSt();applyStUI();}
function stToggle(key){S[key]=!S[key];const tog=document.getElementById('tog'+key.charAt(0).toUpperCase()+key.slice(1));if(tog){tog.classList.toggle('on',S[key]);tog.setAttribute('aria-checked',String(!!S[key]));}saveSt();applyAccessibilityPrefs();}
function setSettingValue(key,value){if(Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS,key)){S[key]=value;saveSt();}}
function setChoice(el,key){setSettingValue(key,el.dataset.v);el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c===el));}
function exportSettings(){
  const blob=new Blob([JSON.stringify({app:'ZenithW',version:1,settings:S},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zenithw-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(LANG==='tr'?'ayarlar dışa aktarıldı':'settings exported','#3bba64');
}
async function importSettings(file){
  if(!file||file.size>100000){toast(LANG==='tr'?'geçersiz ayar dosyası':'invalid settings file','#ed4245');return;}
  try{const parsed=JSON.parse(await file.text()),incoming=parsed&&parsed.settings?parsed.settings:parsed;Object.assign(S,DEFAULT_SETTINGS,cleanSettings(incoming));saveSt();applyStUI();setTheme(S.theme);setAccent(S.accent);toast(LANG==='tr'?'ayarlar içe aktarıldı':'settings imported','#3bba64');}catch(e){toast(LANG==='tr'?'ayar dosyası okunamadı':'could not read settings file','#ed4245');}
}
function resetSettings(){Object.assign(S,DEFAULT_SETTINGS);saveSt();applyStUI();setTheme(S.theme);setAccent(S.accent);toast(LANG==='tr'?'ayarlar sıfırlandı':'settings reset','#f59e0b');}
function clearZenithLocalData(){try{localStorage.removeItem(HISTORY_KEY);localStorage.removeItem(QUEUE_STATE_KEY);}catch(e){}hideQueueResumeHint();toast(LANG==='tr'?'geçmiş ve kuyruk temizlendi':'history and queue cleared','#3bba64');}

// ── REMUX ─────────────────────────────────────────────
function openRemux(){openOverlay('remuxOverlay');}
function formatLocalFileSize(bytes){if(bytes<=0)return'0 bayt';if(bytes<1024)return bytes+' bayt';if(bytes<1024*1024)return(bytes/1024).toFixed(1)+' KB';return(bytes/1024/1024).toFixed(2)+' MB';}
function validateToolFile(f){
  if(!f||f.size<=0){toast(t('errConversion'),'#ed4245');return false;}
  if(f.size>MAX_TOOL_FILE_BYTES){toast(t('errFileTooLarge'),'#ed4245');return false;}
  return true;
}
function showSelectedToolFile(dropId,f){const drop=document.getElementById(dropId);if(!drop)return;const icon=drop.querySelector('.tool-drop-icon'),title=drop.querySelector('.drop-title'),sub=drop.querySelector('.drop-sub');if(icon){icon.classList.add('selected');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4L19 6"/></svg>';}if(title)title.textContent=f.name;if(sub)sub.textContent=formatLocalFileSize(f.size);}
function resetRemuxDrop(){const drop=document.getElementById('remuxDrop');if(!drop)return;const icon=drop.querySelector('.tool-drop-icon'),title=drop.querySelector('.drop-title'),sub=drop.querySelector('.drop-sub');if(icon){icon.classList.remove('selected');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/></svg>';}if(title)title.textContent=t('remuxDropTitle');if(sub)sub.textContent=t('remuxDropSub');const input=document.getElementById('remuxFileInput');if(input)input.value='';remuxSourceFormat='';renderRemuxSignal();}
let remuxBusy=false,remuxSourceFormat='';
function renderRemuxSignal(){const source=document.getElementById('remuxSourceType'),target=document.getElementById('remuxTargetType'),text=document.getElementById('remuxSignalText');if(source)source.textContent=remuxSourceFormat?remuxSourceFormat.toUpperCase():t('remuxSourceDefault');if(target)target.textContent=remuxSourceFormat?remuxSourceFormat.toUpperCase():t('remuxTargetDefault');if(text)text.textContent=t('remuxSignalText');}
async function handleRemuxFile(inp){
  const f=inp.files[0];if(remuxBusy||!validateToolFile(f))return;
  const dot=f.name.lastIndexOf('.');
  const target=dot>=0?f.name.slice(dot+1).toLowerCase():'';
  const allowed=new Set(['mp4','webm','mkv','mov','avi','m4v','3gp','ts','wmv','mp3','m4a','aac','opus','ogg','flac','wav','aiff','wma']);
  if(!allowed.has(target)){toast(t('errConversion'),'#ed4245');resetRemuxDrop();return;}
  clearToolError();remuxBusy=true;remuxSourceFormat=target;renderRemuxSignal();showSelectedToolFile('remuxDrop',f);if(!window.ZenithLocalMedia?.isLocal())toast(t('uploading'),'#5b8def');
  try{
    const base=dot>0?f.name.slice(0,dot):f.name;
    const fd=new FormData();
    fd.append('file',f);fd.append('target_format',target);fd.append('mode','remux');
    fd.append('download_name',`remuxed_${base}.${target}`);
    const res=await fetchMediaJob(fd);
    if(res.localMedia){openSaveModal(res.localMedia.blob,res.localMedia.filename);toast(t('remuxDone'),'#3bba64');return;}
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){showPublicError(payload.error_code?payload:{error_code:'conversion_failed'},res.status,'',false);return;}
    if(!payload.download_url)throw new Error('Remuxed file was not prepared');
    await handoffPreparedDownload(payload,true);toast(t('remuxDone'),'#3bba64');
  }catch(e){if(!e.localMedia)showPublicError({error_code:e.name==='AbortError'?'request_timeout':'conversion_failed'},0,'',false);}
  finally{remuxBusy=false;setTimeout(resetRemuxDrop,1200);}
}
function handleRemuxDrop(e){e.preventDefault();document.getElementById('remuxDrop').classList.remove('drag');const f=e.dataTransfer.files[0];if(!f)return;handleRemuxFile({files:[f]});}

// ── CONVERT ───────────────────────────────────────────
let convFile=null,convTargetFmt='mp3',convBusy=false;
function openConvert(){openOverlay('convOverlay');}
function renderConvPreflight(){const card=document.getElementById('convPreflight');if(!card)return;if(!convFile){card.hidden=true;return;}const dot=convFile.name.lastIndexOf('.'),source=dot>=0?convFile.name.slice(dot+1).toUpperCase():t('convStepFile'),file=document.getElementById('convPreflightFile'),target=document.getElementById('convPreflightTarget'),text=document.getElementById('convPreflightText');if(file)file.textContent=source+' · '+formatLocalFileSize(convFile.size);if(target)target.textContent=convTargetFmt.toUpperCase();if(text)text.textContent=t('convPreflightText');card.hidden=false;}
function setConvFmt(el){document.querySelectorAll('.conv-modal .chip').forEach(c=>{c.classList.remove('active');c.setAttribute('aria-pressed','false');});el.classList.add('active');el.setAttribute('aria-pressed','true');convTargetFmt=el.dataset.v;const preview=document.getElementById('convTargetPreview');if(preview)preview.textContent=convTargetFmt.toUpperCase();renderConvPreflight();_updateConvBtn();}
function selectConvFile(f){if(!validateToolFile(f)){convFile=null;renderConvPreflight();_updateConvBtn();return;}clearToolError();convFile=f;showSelectedToolFile('convDrop',f);renderConvPreflight();_updateConvBtn();}
function handleConvFile(inp){selectConvFile(inp.files[0]);}
function handleConvDrop(e){e.preventDefault();document.getElementById('convDrop').classList.remove('drag');selectConvFile(e.dataTransfer.files[0]);}
function _updateConvBtn(){const btn=document.getElementById('convBtn'),txt=document.getElementById('convBtnTxt');if(!btn||!txt)return;if(convFile){btn.disabled=false;txt.textContent=t('convBtnReady').replace('{fmt}',convTargetFmt.toUpperCase());}else{btn.disabled=true;txt.textContent=t('convBtnSel');}}
function updateConvBtn(){_updateConvBtn();}// alias for legacy calls
async function startConvert(){
  if(!convFile||convBusy)return;
  clearToolError();convBusy=true;
  const prog=document.getElementById('convProgress'),btn=document.getElementById('convBtn'),lbl=document.getElementById('convProgLabel'),pct=document.getElementById('convProgPct'),sub=document.getElementById('convProgSub');
  prog.classList.add('show');btn.disabled=true;lbl.textContent=t('uploading');pct.textContent='—';if(sub)sub.textContent='';
  try{
    const dot=convFile.name.lastIndexOf('.');
    const outputName=(dot>0?convFile.name.slice(0,dot):convFile.name)+'.'+convTargetFmt;
    const fd=new FormData();fd.append('file',convFile);fd.append('target_format',convTargetFmt);fd.append('mode','auto');fd.append('download_name',outputName);
    lbl.textContent=t('converting');
    const res=await fetchMediaJob(fd);
    if(res.localMedia){
      openSaveModal(res.localMedia.blob,res.localMedia.filename);
      lbl.textContent=t('convDoneLabel');pct.textContent='✓';btn.disabled=false;
      toast(t('convDone'),'#3bba64');return;
    }
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){lbl.textContent=t('errConversion');btn.disabled=false;showPublicError(payload.error_code?payload:{error_code:'conversion_failed'},res.status,'',false);return;}
    if(!payload.download_url)throw new Error('Converted file was not prepared');
    lbl.textContent=t('downloading');pct.textContent='90%';
    await handoffPreparedDownload(payload,true,(value,received,total)=>{pct.textContent=value+'%';if(sub)sub.textContent=formatLocalFileSize(received)+' / '+formatLocalFileSize(total);});
    lbl.textContent=t('convDoneLabel');pct.textContent='✓';
    toast(t('convDone'),'#3bba64');
    setTimeout(()=>{prog.classList.remove('show');btn.disabled=false;_updateConvBtn();},1500);
  }catch(e){btn.disabled=false;if(e.localMedia){prog.classList.remove('show');}else{lbl.textContent=e.name==='AbortError'?t('errTimeout'):t('errConversion');showPublicError({error_code:e.name==='AbortError'?'request_timeout':'conversion_failed'},0,'',false);}}
  finally{convBusy=false;}
}
// ── OVERLAYS ─────────────────────────────────────────
let pageScrollLockY=0;
const overlayReturnFocus=new Map();
const OVERLAY_FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function syncModalBackground(){
  document.querySelectorAll('[data-modal-background]').forEach(child=>{
    child.inert=false;
    const previous=child.getAttribute('data-modal-previous-aria');
    if(previous==='__none__')child.removeAttribute('aria-hidden');
    else child.setAttribute('aria-hidden',previous);
    child.removeAttribute('data-modal-previous-aria');
    child.removeAttribute('data-modal-background');
  });
  const overlays=[...document.querySelectorAll('.overlay')];
  const openOverlays=overlays.filter(overlay=>overlay.classList.contains('open'));
  const activeOverlay=openOverlays[openOverlays.length-1]||null;
  overlays.forEach(overlay=>{overlay.inert=overlay!==activeOverlay;});
  if(!activeOverlay)return;
  let current=activeOverlay;
  while(current&&current!==document.body){
    const parent=current.parentElement;if(!parent)break;
    [...parent.children].forEach(sibling=>{
      if(sibling!==current&&!sibling.matches('script')){
        sibling.inert=true;
        sibling.setAttribute('data-modal-previous-aria',sibling.getAttribute('aria-hidden')??'__none__');
        sibling.setAttribute('aria-hidden','true');sibling.setAttribute('data-modal-background','');
      }
    });
    current=parent;
  }
}
function lockPageScroll(){
  if(document.documentElement.classList.contains('modal-open'))return;
  pageScrollLockY=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${pageScrollLockY}px`;
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
}
function unlockPageScrollIfIdle(){
  if(document.querySelector('.overlay.open'))return;
  const restoreY=pageScrollLockY;
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  document.body.style.top='';
  window.scrollTo(0,restoreY);
}
function openOverlay(id,trigger){
  const overlay=document.getElementById(id);if(!overlay)return;
  const active=trigger||document.activeElement;
  if(active&&active!==document.body)overlayReturnFocus.set(id,active);
  overlay.inert=false;overlay.setAttribute('aria-hidden','false');overlay.classList.add('open');syncModalBackground();lockPageScroll();
  requestAnimationFrame(()=>{
    const target=overlay.querySelector('[autofocus],'+OVERLAY_FOCUSABLE);
    if(target)target.focus({preventScroll:true});
  });
}
function handleOverlay(e,id){if(e.target===document.getElementById(id)){if(id==='plQueueOverlay'){closePlaylistQueue();}else{closeOverlay(id);}}}
function closeOverlay(id,preservePending){
  const overlay=document.getElementById(id);if(!overlay)return;
  const wasOpen=overlay.classList.contains('open');
  overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');overlay.inert=true;syncModalBackground();
  unlockPageScrollIfIdle();
  if(id==='servicesOverlay'){const chip=document.getElementById('servicesChip');if(chip){chip.classList.remove('open');chip.setAttribute('aria-expanded','false');}}
  if(id==='saveOverlay'&&!preservePending)releasePendingBlob();
  const previous=overlayReturnFocus.get(id);overlayReturnFocus.delete(id);
  if(wasOpen&&previous&&document.contains(previous)&&!document.querySelector('.overlay.open'))requestAnimationFrame(()=>previous.focus({preventScroll:true}));
}
function openDonate(){openOverlay('donOverlay');}
function openHistory(){openOverlay('historyOverlay');loadHistory();}
document.addEventListener('keydown',e=>{
  const overlays=[...document.querySelectorAll('.overlay.open')];
  const activeOverlay=overlays[overlays.length-1];
  if(e.key==='Escape'&&activeOverlay){e.preventDefault();if(activeOverlay.id==='plQueueOverlay')closePlaylistQueue();else closeOverlay(activeOverlay.id);return;}
  if(e.key==='Tab'&&activeOverlay){
    const focusable=[...activeOverlay.querySelectorAll(OVERLAY_FOCUSABLE)].filter(el=>el.offsetParent!==null);
    if(!focusable.length){e.preventDefault();return;}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
document.addEventListener('DOMContentLoaded',()=>{
  const overlays=[...document.querySelectorAll('.overlay')];
  overlays.forEach(overlay=>{
    overlay.setAttribute('aria-hidden','true');overlay.inert=true;
    const dialog=overlay.firstElementChild;
    if(dialog&&!dialog.hasAttribute('role'))dialog.setAttribute('role','dialog');
    if(dialog&&!dialog.hasAttribute('aria-modal'))dialog.setAttribute('aria-modal','true');
  });
  syncModalBackground();
});

// ── UTILS ─────────────────────────────────────────────
function toast(msg,color){const el=document.getElementById('toast');document.getElementById('toastTxt').textContent=msg;document.getElementById('toastDot').style.background=color||'#e8e8e8';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}
function copyText(txt,btn){navigator.clipboard.writeText(txt).then(()=>{const o=btn.textContent;btn.textContent='✓';setTimeout(()=>btn.textContent=o,2000);});}
function scrollToTop(){
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  document.body.classList.remove('url-editing','modal-open');
  document.documentElement.classList.remove('modal-open');
  window.scrollTo({top:0,behavior:'smooth'});
}
function toggleAccordion(el){el.classList.toggle('open');}

// ── HISTORY (localStorage — kullanıcıya özel, sunucuda tutulmaz) ──
const HISTORY_KEY='zw_history';
const HISTORY_LIMIT=100;
function getLocalHistory(){try{const r=localStorage.getItem(HISTORY_KEY);return r?JSON.parse(r):[];}catch(e){return [];}}
function saveLocalHistory(h){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,HISTORY_LIMIT)));}catch(e){}}
function addToLocalHistory(entry){
  const h=getLocalHistory();
  h.unshift({id:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)),timestamp:new Date().toISOString(),...entry});
  saveLocalHistory(h);
  renderHomeActivity();
}
function renderHomeActivity(){
  const list=document.getElementById('homeActivityList');
  if(!list)return;
  const history=getLocalHistory().slice(0,2);
  if(!history.length){
    list.innerHTML=`<div class="home-activity-empty">${escapeHtml(t('homeActivityEmpty'))}</div>`;
    return;
  }
  list.innerHTML=history.map((item,hi)=>{
    const when=new Date(item.timestamp);
    const time=Number.isNaN(when.getTime())?'':when.toLocaleDateString(LANG==='tr'?'tr-TR':undefined,{day:'numeric',month:'short'});
    return `<button class="home-activity-item" type="button" onclick="reDownload(getLocalHistory()[${hi}]?.url)">
      <span class="home-activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v13M6.5 11.5 12 17l5.5-5.5"/><path d="M5 20h14"/></svg></span>
      <span class="home-activity-copy"><strong>${escapeHtml(item.title||'video')}</strong><small>${escapeHtml(String(item.format||'mp4').toUpperCase())}${item.platform?` · ${escapeHtml(item.platform)}`:''}${time?` · ${escapeHtml(time)}`:''}</small></span>
      <span class="home-activity-ready" aria-label="tamamlandı">✓</span>
    </button>`;
  }).join('');
}
function loadHistory(){
  const list=document.getElementById('historyList');
  if(!list)return;
  const history=getLocalHistory();
  if(!history||history.length===0){
    list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:12px;">'+t('historyEmpty')+'</div>';
    return;
  }
  list.innerHTML=history.map((h,hi)=>`
    <div style="background:var(--chip-bg);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:10px;background:var(--border);padding:3px 6px;border-radius:4px;color:var(--text2);text-transform:uppercase;">${escapeHtml(h.platform||'')}</span>
        <span style="font-size:10px;background:var(--border);padding:3px 6px;border-radius:4px;color:var(--text2);">${escapeHtml(h.format||'')}</span>
        <span style="font-size:10px;color:var(--text3);margin-left:auto;">${new Date(h.timestamp).toLocaleDateString()}</span>
      </div>
      <div style="font-size:12px;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.title||'')}</div>
      <div style="display:flex;gap:8px;">
        <button data-hidx="${hi}" onclick="reDownload(getLocalHistory()[this.dataset.hidx]?.url)" style="background:var(--btn-bg);border:none;border-radius:6px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--btn-color);cursor:pointer;">${t('historyRedownload')}</button>
        <button data-hidx="${hi}" onclick="copyText(getLocalHistory()[this.dataset.hidx]?.url,this)" style="background:var(--chip-bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text2);cursor:pointer;">${t('historyCopyLink')}</button>
      </div>
    </div>
  `).join('');
}
function clearHistory(){
  saveLocalHistory([]);
  loadHistory();
  renderHomeActivity();
  toast(t('historyClearedMsg'),'#3bba64');
}
async function reDownload(url){
  closeOverlay('historyOverlay');
  document.getElementById('urlInput').value=url;
  onInput();
  fetchVideo();
}

// ── MICRO-INTERACTION: click ripple (runs only on interaction) ──
(function(){
  const RIPPLE_SEL='.action-btn,.vc-dl,.pl-dl-btn,.url-go-btn,.dl-btn,.save-btn,.bar-btn,.mode-btn,.btn-paste,.chip,.theme-btn';
  document.addEventListener('click',e=>{
    const el=e.target.closest(RIPPLE_SEL);
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const d=Math.max(rect.width,rect.height);
    const r=document.createElement('span');
    r.className='ripple';
    r.style.width=r.style.height=d+'px';
    r.style.left=(e.clientX-rect.left-d/2)+'px';
    r.style.top=(e.clientY-rect.top-d/2)+'px';
    if(getComputedStyle(el).position==='static')el.style.position='relative';
    el.style.overflow=el.style.overflow||'hidden';
    el.appendChild(r);
    setTimeout(()=>r.remove(),650);
  });
})();

// ── INIT ──────────────────────────────────────────────
(function init(){
  loadSt();
  try{const sl=localStorage.getItem('zw_lang');if(sl)LANG=sl;else LANG=detectLang();}catch(e){LANG=detectLang();}
  applyStUI();
  setTheme(S.theme||'dark');
  setAccent(S.accent||'default');
  applyLang(); // LAST — after all functions are defined
  renderHomeActivity();
  if(document.body.classList.contains('settings-page')&&window.matchMedia('(max-width:900px)').matches)showMobileSettingsHome();
  if(typeof resetCatTimer==='function')resetCatTimer();
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(S.theme==='auto')setTheme('auto');});
  // Bazı mobil tarayıcılar (özellikle iOS Safari) sayfayı geri/ileri
  // gezinmede bfcache'den eski DOM durumuyla geri getirebiliyor. Bu durumda
  // ayarlar sayfası en son açık kalan alt sekmeyle (ör. görünüm) geri gelip
  // kategori menüsünü atlıyordu. Sayfa bfcache'den geri geldiğinde mobilde
  // menüyü yeniden göster.
  window.addEventListener('pageshow',function(e){
    if(e.persisted&&document.body.classList.contains('settings-page')&&window.matchMedia('(max-width:900px)').matches){
      showMobileSettingsHome();
    }
  });
})();

// ── DESKTOP APP REMINDER ─────────────────────────────
// Same browser session: at most once. The checkbox stores a permanent opt-out.
const DESKTOP_PROMO_SESSION_KEY='zw_desktop_promo_seen';
const DESKTOP_PROMO_DISMISS_KEY='zw_desktop_promo_dismissed';
function closeDesktopPromo(){
  const promo=document.getElementById('desktopPromo');
  const never=document.getElementById('desktopPromoNever');
  try{
    sessionStorage.setItem(DESKTOP_PROMO_SESSION_KEY,'1');
    if(never&&never.checked)localStorage.setItem(DESKTOP_PROMO_DISMISS_KEY,'1');
  }catch(e){}
  if(!promo)return;
  promo.classList.remove('is-visible');
  setTimeout(()=>{promo.hidden=true;},340);
}
function initDesktopPromo(){
  const promo=document.getElementById('desktopPromo');
  if(!promo)return;
  try{
    if(localStorage.getItem(DESKTOP_PROMO_DISMISS_KEY)==='1'||sessionStorage.getItem(DESKTOP_PROMO_SESSION_KEY)==='1')return;
  }catch(e){}
  setTimeout(()=>{
    promo.hidden=false;
    requestAnimationFrame(()=>promo.classList.add('is-visible'));
  },5000);
}
document.addEventListener('DOMContentLoaded',initDesktopPromo);
