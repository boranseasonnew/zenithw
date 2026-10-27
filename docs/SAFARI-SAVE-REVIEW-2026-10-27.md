# Safari dosya kaydetme kontrolü — 27 Ekim 2026

Kullanıcı, zenithw.space sitesinde iPhone 7 ile video indirmenin yalnızca dosya adını kopyaladığını ve gelişmiş kaydetme seçeneklerinin görünmediğini bildirdi. Tam iOS sürümü ve arkadaşının ekran görüntüsü bu oturumda sağlanmadı.

## Bulgular ve düzeltmeler

- Dosya paylaşımında `new File` MIME türünü kaybediyordu; genel binary/boş türlerde dosya uzantısından bilinen medya MIME türü tamamlanır. Paylaşım verisi dosyanın kendisini içerir; dosya adını taşıyan ayrı `title`/`text` eklenmez.
- Asenkron hazırlık sonrası otomatik paylaşım, geçici kullanıcı etkinliğini kaybedebilir. Paylaşma ve panoya dosya kopyalama artık yeni bir dokunmayla başlatılır. `userActivation` API'si olmayan eski tarayıcılarda indirme de açık bir bağlantıdan başlatılır.
- Paylaşım hataları daha önce sessizce yutuluyordu. Desteklenmeyen yöntem veya reddedilen işlem, dosyayı ve indir bağlantısını açık tutar. Paylaşımı iptal etmek beklenmedik bir indirme başlatmaz.
- İndir düğmesi artık DOM'a bağlı gerçek bir `download` bağlantısıdır. Küçük dosya Blob URL'si, büyük dosya sunucunun doğrulanmış attachment URL'si üzerinden sunulur. Büyük dosya belleğe alınmaz; toplu/playlist doğal indirme yolu korunur.
- Safari'nin bağlantıyı indirmeye dönüştürmesi için büyük dosya durum sorgusu kısa bir gecikmeyle başlatılır. Bu sorgu doğrulanmadan tamamlandı denmez.
- Gelişmiş ayarlardaki sor/indir/paylaş/kopyala kontrolleri gerçek `button` öğeleri ve `aria-pressed` durumuyla çalışır. Dört tercih de ayarlarda gösterilir; kaydetme penceresinde cihazın desteklemediği dosya paylaşma/kopyalama işlemleri devre dışıdır. Bozuk kaydetme tercihi güvenli `ask` değerine döner.

## Doğrulama

Tam üretim build'i, 90 Node testi, 129 Python backend testi ve cache/CSP kontrolleri başarılı.

`tests/safari-save-browser.mjs`, Playwright WebKit 26.6 ile 375×667 boyutta çalıştırıldı. Dört ayar görünür; seçim sayfa yenilemesinden sonra korunur. Türü belirlenmiş MP4 paylaşımı ve paylaşım reddi sonrası indirme doğrulandı. Hem Blob hem gerçek yerel HTTP attachment sunucusu üzerinden dosyanın `download` olayı ve dosya adı kontrol edildi. Dosya adını panoya yazma sayısı sıfır; yakalanmamış JavaScript hatası yok.

Test, yalnızca yerel önizlemeyi ve yerel dosya sunucusunu kullanır; canlı video hazırlama/indirme veya kullanıcı verisi değişikliği yapmaz. HTTP localhost için test yanıtındaki HTTPS yükseltmesi kaldırılır ve yerel dosya sunucusu connect-src listesine eklenir; üretim CSP'si gevşetilmez. Mevcut Socket.IO SRI yükleme uyarısı bu testte de görüldü; uygulamanın mevcut progress fallback'i kullanıldı ve bu kayıt uyarısız console iddiasında bulunmaz.

Bu modern WebKit kontrolü fiziksel iPhone 7 / iOS 15 Safari testi değildir. Eski cihazda seçeneklerin kaybolması güncel ortamda yeniden üretilemedi. Kullanıcının cihazda indirme bağlantısını ve gelişmiş ayarları yeniden denemesi gerekir; kesin cihaz düzeyi başarı iddiası yoktur.

## Yeniden çalıştırma

Yerel Pages önizlemesini başlat. Mevcut Playwright kurulum yolunu `PLAYWRIGHT_MODULE`, WebKit tarayıcı konumunu `PLAYWRIGHT_BROWSERS_PATH`, önizleme adresini `SAFARI_TEST_URL` olarak ayarla ve `node tests/safari-save-browser.mjs` çalıştır. Standart Node regresyonları `tests/safari-save.test.mjs` dosyasını içerir.

İlgili birincil kaynaklar: [WebKit geçici kullanıcı etkinliği](https://webkit.org/blog/13862/the-user-activation-api/), [MDN dosya paylaşma ve hata davranışları](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [Apple iPhone 7 için iOS 15 güvenlik sürümü kapsamı](https://support.apple.com/en-ca/126632).
