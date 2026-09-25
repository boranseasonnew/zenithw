const LATEST_UPDATE=
{ver:ZW_VERSION.ver,latest:true,dateTr:ZW_VERSION.dateTr,dateEn:ZW_VERSION.dateEn,cover:null,
titleTr:'YouTube daha akıllı, ilerleme daha net',
titleEn:'smarter YouTube handling, clearer progress',
introTr:[
'v14.4, YouTube işlerini sunucunun gerçek yüküne göre planlıyor ve gereksiz tekrarların aynı AWS adresinden platforma istek yağdırmasını engelliyor. Kalite sınırı artık yalnızca arayüzde görünen bir tercih değil; format seçiminde uygulanıyor ve seçilen görüntü akışının gerçek çözünürlüğü kontrol ediliyor.',
'İndirme penceresi de daha küçük ve sakin bir çalışma alanına dönüştü. Yüzde, hız, kalan süre, aktarılan boyut ve doğrulanan çözünürlük aynı kompakt ilerleme düzeninde gösteriliyor.'
],
introEn:[
'v14.4 plans YouTube work around the server’s actual load and prevents repeated actions from flooding the platform through the same AWS address. The quality ceiling is no longer just a visible preference: it is enforced during format selection and checked against the dimensions of the selected video stream.',
'The download dialog is now a smaller, calmer workspace. Percentage, speed, remaining time, transferred size, and verified resolution share one compact progress layout.'
],
sections:[
{hTr:'720p gerçekten 720p sınırında',hEn:'720p now means a real 720p ceiling',pTr:'Sunucu yoğunken YouTube görüntüsü en fazla 720p, boşken en fazla 1080p seçiliyor. Filtresiz “best” kaçışı kaldırıldı; kaynak istenen kaliteyi sunmuyorsa daha düşük güvenli akış seçiliyor, daha yüksek bir akışa sessizce çıkılmıyor.',pEn:'YouTube video is capped at 720p while the server is busy and at 1080p while idle. The unfiltered “best” escape path is gone: if the source does not offer the target, ZenithW may choose a lower safe stream but will not silently exceed the ceiling.'},
{hTr:'Gerçek akış çözünürlüğü doğrulanıyor',hEn:'the selected stream is verified',pTr:'İndirme sırasında seçilen görüntü akışının genişlik ve yüksekliği yt-dlp sonucundan okunuyor. Sonuç sunucu sınırını aşarsa dosya başarı sayılmıyor; doğrulanan ölçüler ilerleme penceresinde kullanıcıya gösteriliyor.',pEn:'During download, ZenithW reads the selected video stream’s width and height from the yt-dlp result. A result above the server ceiling is not accepted as success, and verified dimensions are shown in the progress dialog.'},
{hTr:'Tekrarlanan istekler AWS adresini yormuyor',hEn:'repeat requests no longer hammer the AWS address',pTr:'Aynı bağlantının eşzamanlı metadata sorguları tek upstream işinde birleşiyor; yakın zamanda alınan başarılı sonuç kısa süreli önbellekten geliyor. YouTube için ziyaretçi ve sunucu geneli ayrı kotalar, aynı indirme için kısa tekrar beklemesi ve gerçek 429 yanıtından sonra beş dakikalık ortak soğuma süresi eklendi.',pEn:'Simultaneous metadata lookups for the same link share one upstream job, while recent successful results come from a short-lived cache. YouTube now has separate visitor and host-wide budgets, a short duplicate-download delay, and a five-minute host cooldown after a real HTTP 429 response.'},
{hTr:'Daha küçük, daha bilgi dolu ilerleme',hEn:'smaller progress, better information',pTr:'İndirme penceresi masaüstünde 468 piksele çekildi. İnce mor ilerleme çizgisi; yüzdeyi, hızı, kalan süreyi, indirilen/toplam boyutu ve kalite rozetini gösteriyor. Mobilde önizleme küçülüyor ve içerik taşmadan aynı bilgiyi koruyor.',pEn:'The desktop download dialog is now 468 pixels wide. Its thin violet progress line accompanies percentage, speed, remaining time, transferred and total size, and a quality badge. On mobile, the preview becomes compact while preserving the same information without overflow.'},
{hTr:'Ağ ve medya sınırları güçlendirildi',hEn:'network and media boundaries are tighter',pTr:'yt-dlp is Python socket güvenlik sınırlarını atlayabilen yerel libcurl işleyicilerini artık seçmiyor. Özel ve global olmayan hedef adresler daha sıkı reddediliyor, FFmpeg yerel protokol listesi korunuyor ve hatalı JSON gövdeleri güvenli biçimde sonlandırılıyor.',pEn:'yt-dlp no longer selects native libcurl handlers that could bypass the guarded Python socket path. Private and non-global target addresses are rejected more strictly, FFmpeg keeps its local protocol allowlist, and malformed JSON bodies fail safely.'}
],
outroTr:'v14.4, YouTube engellerini sihirli biçimde kaldırdığını iddia etmiyor. Yaptığı şey daha dürüst ve kullanışlı: daha az gereksiz istek, uygulanabilir kalite sınırı, doğrulanabilir sonuç ve ne olduğunu açıkça gösteren bir indirme akışı.',
outroEn:'v14.4 does not pretend it can magically remove YouTube’s upstream restrictions. It does something more useful: fewer unnecessary requests, an enforceable quality ceiling, verifiable output, and a download flow that clearly shows what is happening.'
};

const UPDATE_V14_3=
{ver:'v14.3',latest:false,dateTr:'7 eylül 2026',dateEn:'September 7, 2026',cover:null,
titleTr:'Yerelde dönüştür, biçimi bilinçli seç',
titleEn:'convert locally, choose formats with confidence',
introTr:[
'v14.3, yerel FFmpeg dönüştürücüsünü daha geniş bir dosya kataloğuyla güncelliyor. Yeni seçenekler yalnızca eklenmiş isimler değil: her biri açık bir codec yolu, dosya sınırı ve hazırlanan dosyanın güvenli teslim akışıyla çalışıyor.',
'Remux aracı da ne yaptığını daha görünür anlatıyor. Kaynak konteyner, kayıpsız akış ve çıktı arasındaki fark artık işlem başlamadan okunabiliyor; uyumsuz bir konteynerde sessizce kalite düşürmek yerine açıkça hata veriyor.'
],
introEn:[
'v14.3 expands the local FFmpeg converter with a broader media catalogue. These are not decorative labels: every option has an explicit codec path, existing size guardrails, and the same secure prepared-file delivery flow.',
'The remux tool now makes its work easier to read. The source container, lossless stream path, and output state are visible before processing; an incompatible container reports that limitation instead of silently reducing quality.'
],
sections:[
{hTr:'19 yerel çıkış formatı',hEn:'19 local output formats',pTr:'Video için MP4, WebM, MKV, MOV, AVI, M4V, 3GP, TS ve WMV; ses için MP3, M4A, AAC, Opus, OGG, FLAC, WAV, AIFF ve WMA artık tek dönüştürücüde. Tüm dönüşümler aynı sunucudaki FFmpeg ile yapılıyor; dosya harici bir dönüştürme servisine gönderilmiyor.',pEn:'MP4, WebM, MKV, MOV, AVI, M4V, 3GP, TS, and WMV are available for video; MP3, M4A, AAC, Opus, OGG, FLAC, WAV, AIFF, and WMA are available for audio. Every conversion stays on the same FFmpeg host—files are not sent to a third-party conversion service.'},
{hTr:'Kayıpsız olan önce denenir',hEn:'lossless comes first',pTr:'Otomatik dönüşüm, seçilen konteyner mevcut görüntü ve ses akışlarını kabul ediyorsa önce yeniden kodlamadan taşımayı dener. Bu mümkün değilse güvenli bir codec profiliyle dönüştürür. Böylece uyumlu dosyalar gereksiz kalite kaybetmez; uyumsuz dosyalar ise çalışır bir hedef format alır.',pEn:'Automatic conversion first tries to copy existing video and audio streams when the selected container accepts them. If that is not possible, it uses a safe codec profile. Compatible files avoid needless quality loss; incompatible ones still receive a playable target format.'},
{hTr:'Remux artık kendini açıklıyor',hEn:'remux now explains itself',pTr:'Remux alanı, dosyanın kendi konteynerine kayıpsız işlem yapılacağını ilk bakışta gösteriyor. Bu mod yalnızca akışları yeniden paketler; codec değişmez. Seçilen konteyner akışları kabul etmiyorsa işlem açık bir uyumluluk hatasıyla durur.',pEn:'The remux workspace now shows at a glance that the file will be processed losslessly in its own container. This mode only repackages streams; codecs do not change. If the container cannot accept the streams, processing stops with a clear compatibility error.'},
{hTr:'Güvenlik sınırları daha sıkı',hEn:'tighter security boundaries',pTr:'Origin doğrulaması secret tanımlı değilse artık sessizce açık kalmıyor; üretimde eksik yapılandırma istekleri reddediyor. Hazırlanan dosyalar, Socket.IO ilerlemesi ve IP temelli sınırlar da ilgili ziyaretçiyle daha sıkı bağlandı.',pEn:'Origin verification no longer silently stays open when its secret is missing; production requests are rejected on incomplete configuration. Prepared files, Socket.IO progress, and IP-based limits are also bound more tightly to the originating visitor.'},
{hTr:'Aynı sınırlar, daha net seçenekler',hEn:'the same guardrails, clearer choices',pTr:'95 MB yükleme sınırı, süre denetimleri, çıktı boyutu sınırı ve geçici dosya temizliği korunuyor. v14.3’ün amacı daha çok düğme eklemek değil; desteklenen her seçeneğin ne yaptığı belli olan, yerel ve öngörülebilir bir medya aracı sunmak.',pEn:'The 95 MB upload cap, duration checks, output-size limit, and temporary-file cleanup remain in place. v14.3 is not about adding buttons for their own sake; it is a local, predictable media tool where every supported option has a clear purpose.'}
],
outroTr:'v14.3’ün hedefi basit: dosyanın nereye gittiğini, hangi biçime dönüştüğünü ve kaliteye ne olduğunu gizlemeden anlatmak. Sihir değil; görünür, yerel ve ölçülü bir medya akışı.',
outroEn:'The goal of v14.3 is simple: make it clear where a file goes, what it becomes, and what happens to its quality. No magic—just a visible, local, measured media workflow.'
};

const UPDATE_V14_2=
{ver:'v14.2',latest:false,dateTr:'5 eylül 2026',dateEn:'September 5, 2026',cover:null,
titleTr:'Daha sakin, daha net, daha ZenithW',
titleEn:'calmer, clearer, unmistakably ZenithW',
introTr:[
'v14.2, ZenithW’nin arayüzünü yalnızca boyamadı; ana ekranı, bilgi sayfalarını ve sürüm notlarını aynı görsel dilde yeniden düzenledi. Daha az gürültü, daha belirgin eylemler ve ihtiyaç duyulan bilginin doğru yerde görünmesi bu sürümün ana fikri.',
'Değişiklikler masaüstü ve mobil navigasyonu korurken arayüzü hafifletti. Gösterişli ama işlevsiz parçalar yerine gerçek durumu, geçmiş işlemleri ve anlaşılır seçimleri öne çıkardık.'
],
introEn:[
'v14.2 did more than repaint ZenithW. It brought the home screen, information pages, and release notes into one visual system. Less noise, clearer actions, and useful information in the right place define this release.',
'The update keeps desktop and mobile navigation familiar while making the interface lighter. Decorative clutter gives way to real service state, local activity, and choices that explain themselves.'
],
sections:[
{hTr:'Ana ekran artık bir komuta merkezi',hEn:'the home screen is now a command center',pTr:'Bağlantı alanı daha güçlü bir odak noktası oldu; yapıştırma ve devam etme eylemleri netleşti. Otomatik, ses, sessiz ve çoklu indirme seçenekleri tek bir kompakt kontrol grubunda toplandı. Gereksiz video seçeneği kaldırıldı; otomatik mod zaten video için doğru varsayılanı kullanıyor.',pEn:'The URL field is now a stronger focal point with clearer paste and continue actions. Automatic, audio, muted, and multiple-download modes live in one compact control group. The redundant video mode is gone because automatic mode already provides the right video default.'},
{hTr:'Hafif atmosfer, ağır efekt yok',hEn:'atmosphere without heavy effects',pTr:'Koyu zemin; ince ızgara, ölçülü mor ışık ve düşük maliyetli hareketlerle derinlik kazandı. Animasyonlar yalnızca dönüşüm ve saydamlık üzerinden çalışıyor, azaltılmış hareket tercihini izliyor ve düşük güçlü cihazlarda gereksiz yük oluşturmuyor.',pEn:'The dark canvas gains depth through a fine grid, restrained violet light, and inexpensive motion. Animations use only transforms and opacity, respect reduced-motion preferences, and avoid unnecessary work on lower-powered devices.'},
{hTr:'Hakkında bölümü gerçekten bir bütün',hEn:'About is now a complete suite',pTr:'ZenithW, topluluk, gizlilik, kullanım koşulları ve emeği geçenler sayfaları /about altında ortak bir yapıya taşındı. Seçili durumda kaybolmayan özgün SVG ikonlar, daha sakin tipografi, okunabilir metin genişliği ve masaüstü ile mobilde kalıcı gezinme eklendi.',pEn:'The project, community, privacy, terms, and credits pages now share one structure under /about. Custom SVG icons stay legible when selected, while calmer typography, readable line lengths, and persistent desktop and mobile navigation make the suite coherent.'},
{hTr:'Gizlilik ve koşullar yeniden görünür',hEn:'privacy and terms are visible again',pTr:'İç içe /about rotalarında sayfa metnini yükleyen dosyanın yanlış adresten istenmesine yol açan yol çözümleme hatası giderildi. Böylece başlık görünüp içeriğin boş kaldığı durum düzeltildi ve önbellek anahtarları yenilendi.',pEn:'A path-resolution bug that requested the content script from the wrong location on nested /about routes has been fixed. Privacy and terms no longer show a heading with an empty body, and their cache keys have been refreshed.'},
{hTr:'Ayarlar artık seçimlerin sonucunu söylüyor',hEn:'settings now explain the trade-offs',pTr:'Bitrate alanı, yüksek bir değerin düşük kaliteli kaynağı sihirli biçimde iyileştirmediğini açıkça belirtiyor. MP4 ve WebM seçenekleri de kalite ve uyumluluk farkını kısa açıklamalarla anlatıyor.',pEn:'The bitrate control now makes it clear that a higher number cannot magically improve a low-quality source. MP4 and WebM choices also explain their quality and compatibility trade-offs in plain language.'},
{hTr:'Sürüm notları baştan düzenlendi',hEn:'release notes, rebuilt',pTr:'Updates sayfası büyük manşetler ve uzun dekoratif çizgiler yerine kompakt bir sürüm başlığı, okunabilir özet ve taranabilir değişiklik kartları kullanıyor. Eski sürümler erişilebilir kalıyor; v14.1’in AWS geçiş notları aynen korunuyor.',pEn:'The Updates page replaces oversized headlines and long decorative rails with a compact release header, readable summary, and scannable change cards. Older releases remain available, including the complete v14.1 AWS migration notes.'}
],
outroTr:'v14.2’nin hedefi basit: kullanıcı arayüzü fark etmeden ne yapacağını anlasın; fark ettiğinde de “bu özenli yapılmış” desin.',
outroEn:'The goal of v14.2 is simple: make the interface obvious when it needs to disappear—and polished enough to reward a closer look.'
};

const UPDATE_V14_1=
{ver:'v14.1',latest:false,dateTr:'2 eylül 2026',dateEn:'September 2, 2026',cover:'zenithw.png',coverAltTr:'ZenithW v14.1 kapak görseli',coverAltEn:'ZenithW v14.1 cover image',
titleTr:'Railway’den AWS’ye: ZenithW artık kendi sunucusunda',
titleEn:'from Railway to AWS: ZenithW now runs on its own server',
introTr:[
'v14.1 ile ZenithW’nin backend’i Railway’den Amazon Web Services üzerindeki kendi EC2 sunucusuna taşındı. Alan adı ve arayüz yine Cloudflare’ın hızlı uç ağından geliyor; indirme, dönüştürme ve canlı ilerleme işlemleri ise artık bize ayrılmış Ubuntu sunucusunda çalışıyor.',
'Bu yalnızca “sunucunun adını değiştirdik” güncellemesi değil. Çalışma biçimi, ağ sınırı, servis yönetimi ve sorunları gözlemleme araçları yeniden kuruldu. Railway’in kolaylığını geride bırakırken AWS’nin kontrolünü kazandık; bunun getirdiği sorumlulukları da saklamıyoruz.'
],
introEn:[
'With v14.1, the ZenithW backend moved from Railway to its own EC2 server on Amazon Web Services. The domain and interface still arrive through Cloudflare’s fast edge, while downloads, conversions, and live progress now run on a dedicated Ubuntu host.',
'This is more than changing the name of the hosting provider. The runtime, network boundary, service supervision, and observability layer were rebuilt. We gained the control of AWS while leaving behind some of Railway’s convenience—and we are honest about the new responsibilities that come with it.'
],
sections:[
{hTr:'Railway’de eskiden nasıldı?',hEn:'what was Railway like before?',pTr:'Railway, uygulamayı GitHub’dan alıp çalıştırma, servis sürecini yönetme ve altyapının büyük bölümünü gizleme konusunda çok rahattı. Küçük bir ekip için hızlı başlangıç ve az bakım büyük artıydı. Buna karşılık sunucu işletim sistemi, ağ katmanı, kalıcı servisler ve kaynak kullanımı üzerinde daha az doğrudan kontrolümüz vardı; sorun araştırırken çoğunlukla platformun sunduğu görünümle sınırlıydık.',pEn:'Railway made it very convenient to deploy from GitHub, supervise the app process, and hide most infrastructure work. Fast setup and low maintenance were real advantages for a small team. The trade-off was less direct control over the operating system, networking, persistent services, and resource usage; investigations were largely limited to the view exposed by the platform.'},
{hTr:'AWS’de şimdi ne çalışıyor?',hEn:'what runs on AWS now?',pTr:'Backend artık Amazon EC2 üzerindeki t3.small Ubuntu sunucusunda çalışıyor. Gunicorn ve gevent tek çalışanlı güvenli mimariyi koruyor; systemd servisi uygulamayı gözetiyor, Nginx HTTPS ve WebSocket trafiğini uygulamaya aktarıyor. FFmpeg ve diğer yardımcı servisler aynı makinede, açıkça sınırlandırılmış kaynak ayarlarıyla çalışıyor.',pEn:'The backend now runs on a t3.small Ubuntu server in Amazon EC2. Gunicorn and gevent preserve the safe single-worker architecture, systemd supervises the app, and Nginx forwards HTTPS and WebSocket traffic. FFmpeg and supporting services run on the same host with explicit resource limits.'},
{hTr:'Cloudflare kapıda, AWS motor odasında',hEn:'Cloudflare at the door, AWS in the engine room',pTr:'Cloudflare Pages arayüzü sunmaya devam ediyor; DNS, proxy ve dış HTTPS bağlantısı da Cloudflare üzerinden geçiyor. Cloudflare ile EC2 arasındaki bağlantı Full (strict) TLS ile doğrulanıyor. Nginx yalnızca güvenilen proxy zincirinden gelen gerçek ziyaretçi IP’sini kabul ediyor; hız sınırları başlık taklidi yapan bir istemciye göre değil gerçek kullanıcıya göre uygulanıyor.',pEn:'Cloudflare Pages continues to serve the interface, while DNS, proxying, and public HTTPS stay at the Cloudflare edge. The connection from Cloudflare to EC2 is verified with Full (strict) TLS. Nginx accepts the real visitor IP only through the trusted proxy chain, so rate limits follow the actual user rather than spoofable headers.'},
{hTr:'AWS’nin bize kazandırdıkları',hEn:'what AWS gives us',pTr:'Sunucu süreçleri, disk, bellek, ağ ve servis günlükları artık doğrudan görülebiliyor. Nginx, systemd, güvenlik duvarı, yardımcı servisler ve çalışma sınırları ihtiyaca göre ayarlanabiliyor. Ayrılmış sanal makine, platformun soyut container yaşam döngüsüne daha az bağımlı; hata ayıklama ve performans ayarı daha ölçülebilir.',pEn:'Server processes, disk, memory, networking, and service logs are now directly visible. Nginx, systemd, firewall rules, supporting services, and runtime limits can be tuned for the workload. A dedicated virtual machine is less dependent on an abstract container lifecycle, making diagnostics and performance tuning more measurable.'},
{hTr:'dürüst tarafı: AWS’nin eksileri',hEn:'the honest part: AWS drawbacks',pTr:'Bu kontrol bedelsiz değil. İşletim sistemi güncellemeleri, güvenlik yamaları, disk takibi, servislerin yeniden başlatılması, sertifika ve ağ yapılandırması artık bizim sorumluluğumuzda. Tek EC2 örneği yüksek erişilebilirlik sağlamıyor; makine veya bölge sorunu yaşanırsa otomatik ikinci sunucu henüz yok. Ayrıca trafik az olsa bile sunucu açık kaldığı sürece sabit maliyet oluşuyor ve kapasite artırımı Railway’e göre daha fazla planlama istiyor.',pEn:'That control is not free. Operating-system updates, security patches, disk monitoring, service restarts, certificates, and network configuration are now our responsibility. A single EC2 instance is not high availability; there is no automatic second server yet if the host or region has a problem. The server also has a fixed running cost even during quiet periods, and scaling requires more planning than it did on Railway.'},
{hTr:'neden yine de geçtik?',hEn:'why move anyway?',pTr:'ZenithW’nin medya işleme yapısı uzun süren bağlantılar, FFmpeg, WebSocket ve kontrollü geçici depolama kullanıyor. Bu iş yükünde kendi Linux sunucumuzu görmek ve sınırlarını doğrudan yönetmek bizim için daha değerli hale geldi. Railway kötü olduğu için değil; ZenithW artık daha fazla altyapı kontrolüne ihtiyaç duyduğu için AWS’yi seçtik.',pEn:'ZenithW’s media workload relies on long-lived connections, FFmpeg, WebSockets, and controlled temporary storage. For this workload, seeing our Linux host and managing its limits directly became more valuable. We did not move because Railway is bad; we moved because ZenithW now benefits from deeper infrastructure control.'}
],
outroTr:'Kısacası v14.1, yönetilen bir platformun rahatlığından kendi sunucumuzun kontrolüne geçiş sürümü. Daha fazla görünürlük ve özgürlük kazandık; karşılığında bakım, maliyet ve erişilebilirlik sorumluluğunu da üstlendik.',
outroEn:'In short, v14.1 moves ZenithW from the convenience of a managed platform to the control of its own server. We gained visibility and freedom while taking on maintenance, cost, and availability responsibilities.'
};
const UPDATE_VERSIONS=['v14.4', 'v14.3', 'v14.2', 'v14.1', 'v14.0', 'v13.8', 'v13.7', 'v13.6', 'v13.5', 'v13.4', 'v13.3', 'v13.2', 'v13.1', 'v13.0', 'v12.9', 'v12.8', 'v12.7', 'v12.6', 'v12.5', 'v12.4', 'v12.3', 'v12.2', 'v12.1', 'v12.0', 'v11.7', 'v11.6', 'v11.5', 'v11.4', 'v11.3', 'v11.2', 'v11.1', 'v11.0', 'v10.9', 'v10.8', 'v10.7', 'v10.6', 'v10.5', 'v10.4', 'v10.3', 'v10.2', 'v10.1', 'v10.0', 'v9.0', 'v8.1', 'v8.0', 'v7.3', 'v7.2', 'v7.1', 'v7.0', 'v6.1', 'v6.0', 'v5.6', 'v5.5', 'v5.4', 'v5.3', 'v5.2', 'v5.1', 'v5.0', 'v4.0'];
const CURRENT_RELEASES=[LATEST_UPDATE,UPDATE_V14_3,UPDATE_V14_2,UPDATE_V14_1];
let UPDATES=[...CURRENT_RELEASES];
let archivePromise=null;
let archiveLoaded=false;

function loadUpdateArchive(){
  if(archiveLoaded)return Promise.resolve(UPDATES);
  if(Array.isArray(window.ZW_UPDATE_ARCHIVE)){UPDATES=[...CURRENT_RELEASES,...window.ZW_UPDATE_ARCHIVE];archiveLoaded=true;return Promise.resolve(UPDATES);}
  if(archivePromise)return archivePromise;
  archivePromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='updates-archive.07c744021db2.js?v=14.3';
    s.async=true;
    s.onload=()=>{
      if(Array.isArray(window.ZW_UPDATE_ARCHIVE)){UPDATES=[...CURRENT_RELEASES,...window.ZW_UPDATE_ARCHIVE];archiveLoaded=true;resolve(UPDATES);}
      else reject(new Error('update archive payload missing'));
    };
    s.onerror=()=>reject(new Error('update archive failed to load'));
    document.head.appendChild(s);
  }).catch(err=>{archivePromise=null;throw err;});
  return archivePromise;
}

function findIndex(ver){return UPDATES.findIndex(u=>u.ver===ver);}
async function ensureRelease(ver){
  if(!ver||ver===LATEST_UPDATE.ver||findIndex(ver)!==-1)return;
  if(UPDATE_VERSIONS.includes(ver))await loadUpdateArchive();
}

const TX={
  tr:{title:'Güncellemeler — ZenithW',desc:'ZenithW sürüm geçmişi ve güncelleme notları — yeni özellikler, hata düzeltmeleri ve iyileştirmeler.',
    back:'ana sayfa',latestLabel:'güncel',signoff:'ZenithW · sürüm notları',selectLabel:'sürüm seç',newer:'yeni sürüm',older:'eski sürüm',navLabel:'Sürüm gezinmesi'},
  en:{title:'Updates — ZenithW',desc:'ZenithW release history and changelog — new features, bug fixes, and improvements.',
    back:'home',latestLabel:'latest',signoff:'ZenithW · release notes',selectLabel:'choose a release',newer:'newer',older:'older',navLabel:'Release navigation'}
}

let CUR_LANG='tr';
const PAGE_COPY={
  tr:{eyebrow:'ZENITHW / SÜRÜM NOTLARI',title:'Güncellemeler',lead:'Yeni özellikler, düzeltmeler ve küçük iyileştirmeler. Her sürümde neyin değiştiğini burada açıkça anlatıyoruz.'},
  en:{eyebrow:'ZENITHW / RELEASE NOTES',title:'Updates',lead:'New features, fixes, and thoughtful improvements. A clear record of what changed in each release.'}
};

async function jumpTo(ver){
  try{await ensureRelease(ver);}catch(e){console.error('update archive load failed',e);return;}
  history.pushState(null,'','#'+ver);
  await render();
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('releaseArticle').scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});
}

async function render(){
  const t=TX[CUR_LANG];
  const hash=decodeURIComponent((location.hash||'').replace('#',''));
  if(hash&&hash!==LATEST_UPDATE.ver&&UPDATE_VERSIONS.includes(hash)&&findIndex(hash)===-1){
    try{await loadUpdateArchive();}catch(e){console.error('update archive load failed',e);}
  }
  let idx=findIndex(hash);
  if(idx===-1)idx=0;
  const u=UPDATES[idx];

  document.getElementById('updBadge').textContent=u.ver;
  document.getElementById('updBadge').classList.toggle('is-latest',!!u.latest);
  document.getElementById('updDate').textContent=CUR_LANG==='tr'?u.dateTr:u.dateEn;
  document.getElementById('updPostTitle').textContent=CUR_LANG==='tr'?u.titleTr:u.titleEn;
  const cover=document.getElementById('updCover'),coverImg=document.getElementById('updCoverImg');
  if(u.cover){cover.hidden=false;coverImg.src=u.cover;coverImg.alt=CUR_LANG==='tr'?(u.coverAltTr||'Güncelleme kapak görseli'):(u.coverAltEn||'Release cover image');}
  else{cover.hidden=true;coverImg.removeAttribute('src');coverImg.alt='';}
  document.getElementById('updAnma').innerHTML='';

  const intro=CUR_LANG==='tr'?u.introTr:u.introEn;
  document.getElementById('updIntro').innerHTML=intro.map(p=>`<p>${p}</p>`).join('');
  document.getElementById('updSections').innerHTML=u.sections.map(s=>`
    <div class="upd-section">
      <h3>${CUR_LANG==='tr'?s.hTr:s.hEn}</h3>
      <p>${CUR_LANG==='tr'?s.pTr:s.pEn}</p>
    </div>`).join('');
  document.getElementById('updOutro').textContent=CUR_LANG==='tr'?u.outroTr:u.outroEn;
  document.getElementById('updSignoff').textContent=t.signoff;

  const picker=document.getElementById('verPicker');
  picker.innerHTML=UPDATE_VERSIONS.map(ver=>`<option value="${ver}"${ver===u.ver?' selected':''}>${ver}${ver===LATEST_UPDATE.ver?' · '+t.latestLabel:''}</option>`).join('');

  const order=UPDATE_VERSIONS.indexOf(u.ver);
  const newer=order>0?UPDATE_VERSIONS[order-1]:null;
  const older=order>=0&&order<UPDATE_VERSIONS.length-1?UPDATE_VERSIONS[order+1]:null;
  let nav='';
  if(newer)nav+=`<button type="button" class="upd-nav-link" onclick="jumpTo('${newer}')"><span class="upd-nav-label">${t.newer}</span>← ${newer}</button>`;
  else nav+=`<span aria-hidden="true"></span>`;
  if(older)nav+=`<button type="button" class="upd-nav-link next" onclick="jumpTo('${older}')"><span class="upd-nav-label">${t.older}</span>${older} →</button>`;
  else nav+=`<span aria-hidden="true"></span>`;
  document.getElementById('updNavRow').innerHTML=nav;
  document.title=`${u.ver} — ${CUR_LANG==='tr'?u.titleTr:u.titleEn} — ZenithW`;
}

function setLegalLang(l){
  const t=TX[l]||TX.en;
  CUR_LANG=TX[l]?l:'en';
  document.documentElement.lang=CUR_LANG;
  document.getElementById('pgTitle').textContent=t.title;
  document.getElementById('pgDesc').setAttribute('content',t.desc);
  document.getElementById('pgBack').textContent=t.back;
  document.getElementById('updEyebrow').textContent=PAGE_COPY[CUR_LANG].eyebrow;
  document.getElementById('updPageTitle').textContent=PAGE_COPY[CUR_LANG].title;
  document.getElementById('updPageLead').textContent=PAGE_COPY[CUR_LANG].lead;
  document.getElementById('verPicker').setAttribute('aria-label',t.selectLabel);
  document.getElementById('updNavRow').setAttribute('aria-label',t.navLabel);
  document.querySelectorAll('#legalLangToggle button').forEach(b=>b.classList.toggle('active',b.dataset.lang===CUR_LANG));
  try{localStorage.setItem('zw_lang',CUR_LANG);}catch(e){}
  render();
}

window.addEventListener('popstate',render);
window.addEventListener('hashchange',render);

(function(){
  let saved='tr';
  try{saved=localStorage.getItem('zw_lang')||'tr';}catch(e){}
  if(saved!=='tr')saved='en';
  setLegalLang(saved);
})();
