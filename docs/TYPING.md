# Zenith Type

## Çalışan parçalar

- Giriş sayfası: `frontend/typing.html`; bütün istemci kaynakları yanındaki `typing-*.js` ve `typing-focus.css` dosyalarıdır.
- Yerel test, Türkçe/İngilizce metinler, üç zorluk, 15/30/60/120 saniye ve özel süre; süre sınırı olmayan antrenman.
- Her yeni normal testte rastgele kelimeler. Özel metin antrenmanı kullanıcının metnini korur. Düelloda iki oyuncu aynı yeni metni alır.
- Yazarken arayüz gizlenir. ESC arayüzü geri getirir; Tab+Enter testi yeniler.
- Akıcı imleç, harf efektinden bağımsızdır ve varsayılan açıktır. 95 ms transform animasyonu kullanır; harf efektleri kapalıyken de çalışır. Ayrı ayardan kapatılabilir. Ekrana bir defada yaklaşık 1000 karakter çizilir; kalan metin gerektiğinde eklenir.
- Dark, Purple, Light, Kitty, Pumpkin, Witcher, Ocean, Rose; özgün SVG eşlikçiler. Replikler hazır metinlerdir. Yazarken konuşma gizlenir, eşlikçi hareketleri duraklar, gözler imleci takip eder.
- Supabase hesap kodu/şifre ile giriş; gerçek e-posta ve telefon istenmez. Aynı görünen adı birden fazla hesap kullanabilir. Her hesabın benzersiz, kalıcı, 12 karakterlik `account_tag` kodu vardır. Yeni hesaplar bu kodla giriş yapar; eski hesapların eski kullanıcı adıyla girişi de korunur. Auth için sistemin ürettiği bir teknik adres kullanılır. Görünen ad ve profil fotoğrafı değiştirilebilir. Fotoğraf istemcide kırpılıp küçültülerek EXIF bilgileri kaldırılır.
- Şifre değişikliği mevcut şifreyi gerektirir, diğer oturumlar kapatılır. Kurtarma kodu bir kez gösterilir; kurtarmada döndürülür ve eski kod geçersiz olur. Şifreler/kurtarma kodları uygulamanın localStorage verilerine yazılmaz.
- Dünya sıralamasında her oyuncunun seçilen süre/dil/zorluktaki en iyi doğrulanmış sonucu; ilk üç için rozet. Antrenman ve eski yerel sonuçlar dünya sıralamasına gönderilmez.
- Giriş yapan hesaplarda gönderme varsayılan açıktır. Kullanıcının kapatma tercihi korunur. Desteklenmeyen özel süreler yerel kalır.
- Sıralamada isim ve hesap kodu birlikte gösterilir. İsim/kod üzerinden oyuncu araması, `#profile=ACCOUNT_TAG` bağlantısıyla herkese açık profil, en iyi/ortalama WPM ve doğruluk, 20 sonuçluk sayfalarla doğrulanmış test geçmişi bulunur. Özel oda sonuçları profil istatistiklerine dahil edilmez.
- Özel oda oluşturma, kod/davet bağlantısı, iki oyuncu hazır olunca ortak 5 saniye geri sayımı, canlı rakip hızı. Özel odalarda WPM, doğruluk, kazanan ve maç puanı gösterilir; genel Elo etkilenmez. Dereceli eşleştirme Elo K=24 kullanır. Elo tavanı 50.000; ligler Bronz <5.000, Gümüş 5.000, Altın 10.000, Ametist 20.000 ve Zirve 50.000. Rozet renkleri sırasıyla bronz, gümüş, sarı, gri-mor ve turuncu-mordur. İlk tamamlanan dereceli maçtan önce derecesiz görünür.

## Arayüz ve metin dili

`typing-i18n.js` tarayıcının öncelikli dili Türkçeyse Türkçe, diğer dillerde İngilizce arayüz seçer. Tam arayüz desteği TR/EN ile sınırlıdır. Yazılacak metnin dili ayrı ayardır; İngilizce metin seçmek Türkçe arayüzü değiştirmez. Genel sitenin kayıtlı dil tercihi Zenith Type'a uygulanmaz; `build-locales.py` bu sayfaya genel dil betiğini eklemez.

Hesap/oyuncu adları, hesap ve kurtarma kodları, yazılacak metin çeviriden dışlanır. Dinamik durumlar, ayarlar, hesap, profil, düello ve eşlikçi replikleri çevrilir. Çeviri gözlemcisi kelime alanındaki değişiklikleri işlerken çeviri ağacını dolaşmaz. Klavye kısayolları IME kompozisyonu sırasında devreye girmez.

## Özel oda admin yardımı

Yetki sunucunun yönettiği `typing_private.roles` tablosundan gelir; isim, istemci ayarı veya kullanıcı metadata'sı yetki vermez. Admin doğru tuş yardımını özel odada maç öncesinde veya oyun ekranındaki düğmeden fare/dokunmayla açıp kapatabilir. Her yazılabilir tuş sıradaki doğru karakteri üretir; hız gerçek vuruş zamanlarına dayanır. Her oyuncu yalnızca kendisinin `assisted` durumunu alır. Maç sırasında yardım bir kez açıldığında `assist_used` ve challenge'ın `assisted` alanları kalıcı işaretlenir; sonradan kapatmak bu maça özel Elo kazandırmaz. Dereceli odada yardım kapalıdır.

Bütün düello testleri `board_eligible=false` olur. Yardımlı skorlar ayrıca `assisted=true` taşır. Skor kayıt fonksiyonu ve `typing_scores_assistance_unranked` constraint'i yardımlı skorların dünya sıralamasına girmesini engeller. Özel maçlar yalnızca ayrı, kalıcı özel oda Elo puanını etkiler; yardımlı maçlar bu puandan da dışlanır. Yardım dereceli eşleştirmede kullanılamaz.

## Canlı backend

Ayrı Supabase projesi: `zenith-type` / `woxxdgekdgapcsruicci` (Frankfurt).
Edge Function: `typing-api`. İstemcide yalnızca publishable anahtar bulunur. Service role anahtarı yalnızca Supabase ortamındadır.

Uygulanan şema kaynakları, sırayla: `supabase/typing-schema.sql`, `supabase/typing-duels-schema.sql`, `supabase/typing-profiles-schema.sql`. Mevcut projede üçü de uygulanmıştır; idempotent olmayan DDL içerdiğinden tekrar çalıştırılmaz. Yeni değişiklik öncesi canlı şema ve migration geçmişi incelenir.
İşlev kaynakları: `supabase/functions/typing-api/`.
`verify_jwt=false`, kayıt/giriş/kurtarma gibi açık uçları destekler; tüm hesap/test/oda işlemleri işlevin içinde JWT ve aktif session_id ile doğrulanır. Yetki kararı user_metadata'ya dayanmaz.

Hesap kimlikleri, kurtarma özeti, vuruş kayıtları, odalar ve kuyruk tablolarına anon/authenticated erişimi kapalıdır. İstemci skor ekleyemez veya Elo değiştiremez. Herkese açık profil, puan ve lig bilgileri salt okunurdur. Avatar yükleme/silme yetkili işlevden geçer. Uygulama tablolarının hepsinde RLS açıktır. İç tablolarda policy olmaması kasıtlı olarak tarayıcı erişimini reddeder.

## Sıralama doğrulaması ve sınırları

Sunucu her teste yeni kimlik/metin verir, başlangıç ve bitişi kontrol eder, kısa aralıklarla gelen sıralı vuruş paketlerinden WPM ve doğruluğu yeniden hesaplar. Süresi dolmuş, çok erken, gelecekte zamanlanmış, sırası bozuk, yüksek hızda toplu veya tekrar kullanılmış kayıtlar kabul edilmez. Aynı sonucu tekrar göndermek yeni skor/puan üretmez. Skorlar en az 10 vuruş, en az %50 doğruluk, en fazla 400 WPM ile sınırlandırılmıştır. Çevrimdışı kalma veya sekme değiştirme, sonucu yerel teste çevirebilir.

Bu kontroller botları yüzde yüz engellemez: tarayıcı kullanıcının kontrolündedir, gerçekçi zamanlamalı otomasyon hâlâ mümkündür. Rastgele kelime üretmek tek başına hile önleme değildir. Aynı ikili arasındaki günde ilk üç dereceli maç puan verir. Daha yüksek riskli rekabet için moderasyon ve ek davranış analizi gerekir.

Uygulama kendi hız sınırlama tablosunda ham IP yerine anahtarlanmış özet tutar. Supabase'in platform/Auth günlükleri kendi veri saklama kurallarına tabidir; e-posta istememek tam anonimlik iddiası değildir. Supabase'in sızmış şifre kontrolü etkin değil. 27 Ekim 2026 kontrolünde organizasyon Free plandadır; [bu koruma Pro ve üstü plan gerektirir](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Ücretli plan değişikliği yapılmamıştır.

## Yayın

Yerel dosyadan da online özellikler çalışır; davette dosya yolu paylaşılmaz, oda kodu kopyalanır. İnternetten açılan davet URL'si için hedef `https://zenithw.space/typing`.

`/typing` için gereken CSP, `shared/typing-security.mjs` ve `functions/_middleware.js` içinde yalnızca bu rotaya uygulanır; diğer sayfaların CSP'si korunur. Cloudflare Pages, `frontend/typing.html` dosyasını `/typing` olarak sunar.

Tüm depo için `pnpm install --frozen-lockfile` ardından `pnpm run build` çalıştırılır. Build; yerel medya, dil sayfaları, CSP ve cache çıktılarını üretir. Testler build tamamlandıktan sonra çalıştırılır. Eski `scripts/publish-typing.ps1` yalnızca typing kapsamındadır; tüm bekleyen depo değişikliklerini göndermek için kullanılmaz.

Bu v16.1 tesliminde kullanıcının açık isteğiyle commit'in ana yazarı Codex'tir; kullanıcı author veya co-author olarak eklenmez. Mevcut dala normal push yapılır; eski commitler yeniden yazılmaz. GitHub kaynak commit'inin başarılı olması Cloudflare yayınının başarılı olduğunu tek başına doğrulamaz. 27 Ekim 2026'da kullanıcı yayın onayından sonra rekabetçi migration canlıya uygulandı ve dört güncel dosyayla Edge Function v7 ACTIVE oldu. Canlıda 50.000 Elo constraint'i, yalnızca sahip hesabının iki rozeti, mevcut admin rolü ve RPC/kolon yetkileri doğrulandı.

## Doğrulama

```powershell
node --test tests/*.test.mjs tests/*.test.cjs
pnpm run check:cache
python scripts/update_csp.py --check
pnpm run check:release-content
```

Önceki çalışma kaydında iki geçici hesapla kayıt/giriş/kurtarma/şifre/avatar, iki oyunculu Elo ve tekrar gönderim kontrollerinin geçtiği belirtilmiştir. Bunlar son kontrolde yeniden yapılmış gibi raporlanmaz. Son oturumda canlı profil ve arama salt okunur olarak, sıralamalı test ve admin yardım arayüzü ise bütün Supabase isteklerini yakalayan yerel test verileriyle doğrulandı. Yeni canlı QA hesabı açılması otomatik güvenlik incelemesince reddedildi; hesap açılmadı. Son kapsam ve sınırlamalar için `docs/SECURITY-REVIEW-2026-10-27.md` dosyasına bak.

## Rekabetçi eşleştirme, rematch ve geçmiş

Eşleştirme aynı süre/dil/zorlukta en yakın Elo farkını tercih eder. Aralık her oyuncu için ilk anda ±100, her 15 saniyede +100 ve en fazla ±1.000 olur. İki tarafın aralığı da karşılaşmayı kabul etmelidir. On saniyeden eski heartbeat, iptal edilen arama veya değişen ayarlar bekleme süresini sıfırlar. Mevcut hesap puanları yeniden ölçeklenmez; başlangıç 1.000 ve Elo K=24 korunur. Dolayısıyla 50.000 rozetine ulaşmak uzun vadeli bir hedeftir.

Biten maçta iki oyuncu da tekrar oynamayı kabul ederse aynı ayarlarla yeni oda açılır. İki oyuncu yeniden hazır olur; özel odadaki yardım otomatik taşınmaz. Dereceli rematch Elo'yu etkiler, ancak aynı ikilinin son 24 saatte ilk üç puanlı maç sınırı korunur. Tavan/taban sınırında arayüze hesaplanan teorik puan yerine gerçekten eklenen/çıkarılan puan gönderilir.

Maç geçmişim yalnızca giriş yapan oyuncunun tamamlanmış maçlarını listeler. Oda içinde karşılıklı galibiyet/mağlubiyet/beraberlik özeti ve sayfalı karşılaşma geçmişi bulunur. Geçmiş yanıtlarında yardım durumu veya ham vuruş kayıtları yoktur.

## Hesap rozetleri ve yayın sırası

`is_verified` ve `is_developer` sunucunun yönettiği profil alanlarıdır; anonim veya oturum açmış tarayıcı rolü bunları değiştiremez. Yeni migration, iki rozeti yalnızca değiştirilemeyen eski `boranseason` girişine bağlı hesaba verir. Admin yetkisiyle aynı şey değildir; admin rolü değişmez. İsim/kod benzerliği rozet sağlamaz. Mavi doğrulama ve Zenith logolu geliştirici rozeti hesap, herkese açık profil, sıralama, arama ve oda ekranlarında kullanılır. Geliştirici açıklaması hover, klavye odağı ve mobil dokunmayla açılır.

Mevcut şemalardan sonra `supabase/migrations/20261027172907_typing_ranked_matchmaking_and_badges.sql` uygulanır, ardından güncel `typing-api` deploy edilir ve frontend yayımlanır. API veya migration uygulanmadan yalnızca yeni frontend'i yayımlamak eksik uçlar oluşturur. İlk canlı preflight otomatik güvenlik incelemesince reddedildi; kullanıcı sonraki mesajında yayını onayladı. Migration ve API deploy'u bu onaydan sonra tamamlandı. Canlı migration kaydı `20261027180111_typing_ranked_matchmaking_and_badges` sürümündedir; yerel dosyanın CLI tarafından oluşturulmuş zaman damgası farklıdır.

`supabase/tests/typing-ranked.sql` geçici tablo kopyaları ve rollback kullanarak eşleştirme, 50.000 sınırı, rematch, tekrar puanı sınırı, geçmiş gizliliği ve sayfalamayı doğrular. Ayrı yerel PostgreSQL/PGlite ortamında üç temel şema ve yeni migration sonrası çalıştırılabilir. Üretim ön kontrolünün yerine yerel doğrulama yapılmıştır.

## Profil içi düello geçmişi

Hesap → profilimi görüntüle yoluyla açılan profil, tamamlanmış düelloları doğrudan gösterir: tarih, rakip, mod, sonuç, iki tarafın WPM değeri ve kendi Elo değişimin. Rakibin adına basınca o oyuncunun profili aynı profil penceresinde açılır. Başka oyuncunun profilinde yalnızca oturumdaki kullanıcıyla aralarındaki düellolar gösterilir; diğer oyuncunun tüm özel geçmişi açılmaz. Geçmiş 20 satırlık sayfalarla yüklenir; giriş yapılmadıysa giriş gerekliliği belirtilir. Bireysel doğrulanmış testler ayrı bölümde kalır.

## Rozet güncellemeleri ve tarayıcı önbelleği

Type JavaScript ve CSS dosyaları artık içerik hash'i taşıyan `/cache-assets/` URL'leriyle yüklenir. Yeni HTML eski bir saatlik JS/CSS kopyasını kullanmaz; eski sürümler için kaynak URL'ler korunur. Hesap penceresi açılınca `me` verisi yeniden alınarak uzun süre açık kalan sekmelerde sunucu tarafından değiştirilen rozetler yenilenir. Kullanıcı oturumu değişmişse bekleyen yanıt uygulanmaz. Yerel mobil kontrolde iki rozetin hesap penceresinde görünürlüğü, geliştirici açıklaması ve rozet içermeyen eski profil verisinin pencere açıldığında yenilenmesi doğrulandı.

## Profil bakış açısı ve geliştirici logosu düzeltmesi

Düello satırları ve toplam kazanma/kaybetme sayıları profil sahibinin bakış açısından gösterilir. Rakibin profiline geçince sonuç, WPM sırası ve rakip profil bağlantısı da ters oyuncuya göre güncellenir. Elo, karşı tarafın gerçekten kaydedilen `host_delta`/`guest_delta` değerinden alınır; tavan/taban yüzünden mevcut kullanıcının puanını eksiyle çarparak tahmin edilmez. API v8 bu ek değeri yalnızca oturum sahibinin kendi geçmişindeki tamamlanmış maçlar için döndürür; geçmiş erişim kapsamı korunur.

Geliştirici rozeti, ana frontend'in orijinal `/zenithw.png` siyah zeminli beyaz Z! görselini kullanır. Geliştirici açıklaması ve mavi doğrulama rozeti korunur. 84 Node testi, cache/CSP kontrolü, mobil logo yüklenmesi ve iki profil arasında sonuç/WPM/Elo dönüşümü doğrulandı.

## 30 günlük sezonlar

WPM sıralaması ve dereceli düello Elo'su aynı sunucu sezonunu kullanır. Kalıcı özel oda Elo puanı sezon dışında tutulur. İlk 30 günlük süre migration'ın uygulandığı anda başlar; mevcut sonuçlar ve Elo ilk sezon boyunca korunur. Sonraki sezonlarda WPM tablosu boş başlar, Elo 1.000'e ve sezonluk galibiyet/mağlubiyet/beraberlik sayıları sıfıra döner. Önceki Elo değerleri `typing_rating_seasons` tablosunda arşivlenir; testler ve maç geçmişi silinmez. Kişisel yerel sıralama da yeni sezonun tarih aralığını gösterir; yerel kayıtların kendisi saklanır. Geliştirici/doğrulama rozetleri sezon sıfırlamasından etkilenmez.

Sezon tam 2.592.000 saniyedir. `typing_season_config.epoch` sunucuda tutulur; tarayıcı veya kullanıcı metadata'sı bunu değiştiremez. Süresi dolan sezonun ardından ilk sezon/sıralama/Elo/eşleştirme/settle çağrısı, advisory transaction lock altında arşivleme ve sıfırlamayı atomik yapar. Açık sekmelerde sayaç sıfıra geldiğinde bu çağrı otomatik yapılır; ayrıca cron veya açık bir tarayıcı olmadan çalışan bir ajan gerekmez. Birkaç sezon boyunca istek gelmezse doğrudan güncel sezona geçilir.

Testin sezonu challenge oluşturulurken kaydedilir. Eski sezonda açılmış test yeni sezona WPM taşıyamaz; eski sezonda oluşturulmuş dereceli düello geç bitirilirse yeni sezon Elo'sunu değiştiremez. Maç sonucu yine geçmişe eklenir. Aynı ikilinin puan kazanma sınırı sezon içinde son 24 saatin ilk üç puanlı maçı olarak korunur.

Sıralama tablosunun sağ altında kalan gün/saat/dakika/saniye gösterilir. Sayaç sunucunun bildirdiği zamandan ve monotonik geçen süreden hesaplanır; cihaz takvimini ileri alarak sezon değiştirilemez. Arka plan sekmesinde interval durur, sekmeye dönünce sunucuyla eşitlenir. Her saniye ekran okuyucu duyurusu yapılmaz. Bağlantı yoksa istemci kendi başına yeni sezon uydurmaz; tekrar denemeler sınırlanır.

Migration: `supabase/migrations/20261027184503_typing_thirty_day_seasons.sql`. API ve frontend bundan sonra yayımlanır. Yerel PostgreSQL senaryoları `supabase/tests/typing-seasons.sql`, sayaç kontrolleri `tests/typing-seasons.test.mjs` içindedir. İlk rollout'ta mevcut puanlar sıfırlanmaz. Geri almada arşivler veya geçmiş silinmez; yeni sezon başladıktan sonra eski puanları körlemesine geri yüklemek yerine veri koruyan ileri düzeltme yapılır.

Sezon yayını 27 Ekim 2026'da kullanıcının açık canlı işlem onayından sonra etkinleştirildi. Önceki otomatik inceleme retleri sırasında hiçbir canlı sezon işlemi uygulanmamış, kaynak kod kapalı bayrakla main'e gönderilmişti. Onaydan sonra migration `20261027191306_typing_thirty_day_seasons` olarak kaydedildi ve API v9 ACTIVE oldu. `seasonsEnabled=true` ile sayaç açıldı.

İlk sezon başlangıcı 27 Ekim 2026 22:13:06 TSİ, bitişi 26 Kasım 2026 22:13:06 TSİ'dir. Canlı doğrulamada 2 puan kaydının toplam Elo'su 2.000, 5 skor ve 3 düello korundu; arşiv henüz boştu. Sezon ve leaderboard API'leri 200 döndürdü; eski sonuçlar ilk sezonda görünmeye devam etti. Anon rollover RPC'si, anonim yapılandırma yazımı ve authenticated arşiv okuması kapalı; service_role rollover yetkisi açıktır.

Yerel PostgreSQL/PGlite sınır ve arşivleme testleri, 95 Node testi ve mobil sezon geçişi kontrolü başarılı. Yerel SQL testi için `PGLITE_MODULE` mevcut PGlite modülüne ayarlanıp `node tests/typing-seasons-db.mjs` çalıştırılabilir; bu runner yalnızca bellekteki PostgreSQL'i kullanır. Temizlik isteğiyle isteğe bağlı yerel PGlite/WebKit kurulum önbellekleri kaldırılmıştır; tekrar çalıştırmak için bu araçların yeniden kurulması gerekebilir.

Etkinleştirme kontrolünde yerel arayüz doğrudan canlı API'den Sezon 1 bilgisini aldı; sayaç 29 gün 23:57:55 → 29 gün 23:57:53 ilerledi, sıralama yüklendi, yatay taşma ve console hatası görülmedi. Canlı v9'un dört kaynak dosyası yerel dosyalarla eşleşti. Security advisor'daki yedi [deny-all RLS INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) kaydı iç tablolara kapalı erişimle uyumludur; yeni arşiv tablosu bunlardan biridir. Önceden var olan sızmış şifre koruması WARN kaydı değişmedi.


## Özel oda ayarları ve kalıcı Elo

Oda sahibi maç başlamadan süreyi, dili ve zorluğu düzenleyebilir. Değişiklik iki oyuncunun hazır durumunu kaldırır. Konuk ayarları görür; dereceli odalar ve başlamış turlar değiştirilemez.

`typing_private_ratings` tablosundaki özel oda puanı 1.000 ile başlar, 0–50.000 aralığındadır ve K=24 kullanır. Sezon sonunda sıfırlanmaz. Toplam puan yalnızca profilde görünür; sonuç/geçmiş gerçek özel puan farkını gösterir. Aynı ikilinin son 24 saatte ilk üç temiz özel maçı puan getirir. Yardımlı turlar puansızdır; önceki maçlara geriye dönük puan verilmez. Rekabetçi Elo, eşleştirme ve WPM sıralaması ayrıdır. Detay ve doğrulama: [özel oda incelemesi](TYPING-PRIVATE-ROOMS-REVIEW-2026-10-27.md).
