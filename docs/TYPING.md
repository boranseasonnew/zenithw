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
- Özel oda oluşturma, kod/davet bağlantısı, iki oyuncu hazır olunca ortak 5 saniye geri sayımı, canlı rakip hızı. Özel odalarda WPM, doğruluk, kazanan ve maç puanı gösterilir; genel Elo etkilenmez. Dereceli eşleştirme Elo K=24 kullanır. Ligler: Bronz <1000, Gümüş 1000, Altın 1200, Platin 1400, Elmas 1600, Usta 1800. İlk tamamlanan dereceli maçtan önce derecesiz görünür.

## Arayüz ve metin dili

`typing-i18n.js` tarayıcının öncelikli dili Türkçeyse Türkçe, diğer dillerde İngilizce arayüz seçer. Tam arayüz desteği TR/EN ile sınırlıdır. Yazılacak metnin dili ayrı ayardır; İngilizce metin seçmek Türkçe arayüzü değiştirmez. Genel sitenin kayıtlı dil tercihi Zenith Type'a uygulanmaz; `build-locales.py` bu sayfaya genel dil betiğini eklemez.

Hesap/oyuncu adları, hesap ve kurtarma kodları, yazılacak metin çeviriden dışlanır. Dinamik durumlar, ayarlar, hesap, profil, düello ve eşlikçi replikleri çevrilir. Çeviri gözlemcisi kelime alanındaki değişiklikleri işlerken çeviri ağacını dolaşmaz. Klavye kısayolları IME kompozisyonu sırasında devreye girmez.

## Özel oda admin yardımı

Yetki sunucunun yönettiği `typing_private.roles` tablosundan gelir; isim, istemci ayarı veya kullanıcı metadata'sı yetki vermez. Admin doğru tuş yardımını yalnızca başlamamış özel odada açabilir. Her yazılabilir tuş sıradaki doğru karakteri üretir; hız gerçek vuruş zamanlarına dayanır. Rakip yanıtına iç yardım alanları gönderilmez; her oyuncu yalnızca kendisinin `assisted` durumunu alır.

Bütün düello testleri `board_eligible=false` olur. Yardımlı skorlar ayrıca `assisted=true` taşır. Skor kayıt fonksiyonu ve `typing_scores_assistance_unranked` constraint'i yardımlı skorların dünya sıralamasına girmesini engeller. Özel oda Elo değiştirmez; yardım dereceli eşleştirmede kullanılamaz. Maç başladıktan sonra yardım değiştirilemez.

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

Bu v16.1 tesliminde kullanıcının açık isteğiyle commit'in ana yazarı Codex'tir; kullanıcı author veya co-author olarak eklenmez. Mevcut dala normal push yapılır; eski commitler yeniden yazılmaz. GitHub kaynak commit'inin başarılı olması Cloudflare yayınının başarılı olduğunu tek başına doğrulamaz. 27 Ekim 2026 kontrolünde canlı Edge Function v6'nın dört dosyası yerel kaynaklarla eşleşmiştir; yeniden deploy gerekmez.

## Doğrulama

```powershell
node --test tests/*.test.mjs tests/*.test.cjs
pnpm run check:cache
python scripts/update_csp.py --check
pnpm run check:release-content
```

Önceki çalışma kaydında iki geçici hesapla kayıt/giriş/kurtarma/şifre/avatar, iki oyunculu Elo ve tekrar gönderim kontrollerinin geçtiği belirtilmiştir. Bunlar son kontrolde yeniden yapılmış gibi raporlanmaz. Son oturumda canlı profil ve arama salt okunur olarak, sıralamalı test ve admin yardım arayüzü ise bütün Supabase isteklerini yakalayan yerel test verileriyle doğrulandı. Yeni canlı QA hesabı açılması otomatik güvenlik incelemesince reddedildi; hesap açılmadı. Son kapsam ve sınırlamalar için `docs/SECURITY-REVIEW-2026-10-27.md` dosyasına bak.
