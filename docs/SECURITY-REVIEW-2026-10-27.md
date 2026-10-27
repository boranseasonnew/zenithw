# Güvenlik ve teslim kontrolü — 27 Ekim 2026

## Kapsam

`codex/remove-adaptive-quality-setting` dalındaki mevcut, commit edilmemiş depo çalışması devralındı. Zenith Type yanında site/dil/SEO/indirme değişiklikleri ve önceden yapılmış `desktop/`, `promo-video/` silinmeleri korunur. Gerçek hesap, avatar, skor veya yetki değiştirilmedi; canlı DDL çalıştırılmadı.

## Düzeltilen ve doğrulanan noktalar

- HTTP kaynak açıcı yalnızca HTTP(S) handler'ları kurar. `file:`, `ftp:` ve `data:` URL'leri I/O öncesinde reddedilir. Mevcut SSRF korumaları korunur.
- Beszel hub portu loopback'e bağlıdır; dış erişim gerektiğinde ayrıca güvenli proxy yapılandırması gerekir.
- Brotli lock dosyasında 1.2.1 iken `requirements.txt` 1.2.0 kalmıştı; ikisi de 1.2.1 yapıldı. Bu sürüm [CVE-2026-111497](https://github.com/pypa/advisory-database/blob/main/vulns/brotli/PYSEC-2026-4322.yaml) düzeltmesini içerir.
- Zenith Type genel sitenin kayıtlı dil runtime'ından ayrıldı. Build artık sayfaya ikinci bir dil betiği veya onun bütün belgeyi izleyen navigation observer'ını eklemez.
- Birleşik sonuç mesajları, dinamik etiketler ve erişilebilirlik metinlerindeki çeviri eksikleri giderildi. Hesap başlığı ve yerel sıralama adları çeviriden korunur. IME kompozisyonu sırasında Enter kısayolları devreye girmez.

## Son otomatik kontroller

| Kontrol | Sonuç |
| --- | --- |
| `pnpm install --frozen-lockfile` | Başarılı; mevcut lock korundu, eksik mediabunny/esbuild kuruldu |
| `pnpm run build` | Başarılı; 84 rota × 8 dil, 685 sitemap URL'si, cache/CSP üretildi |
| `node --test tests/*.test.mjs tests/*.test.cjs` | 40 başarılı, 0 başarısız, 1 skip |
| Python backend unittest | 122 başarılı |
| Bandit medium/high (`-ll --skip B104`) | Bulgu yok; B104 mevcut CI istisnasıdır |
| `pip_audit -r backend/requirements.lock --disable-pip` | 39 paket, bilinen açık yok |
| `pnpm audit --json` | 30 bağımlılık kaydı, bilinen açık yok |
| Cache, CSP, release content, proje lint | Başarılı |
| Secret/artifact taraması | 994 metin dosyasında token/özel anahtar bulgusu yok; 20 MiB üstü dosya veya üretilmiş medya yok |
| `git diff --check` / staged karşılığı | Takip edilen kaynaklarda başarılı; staged kontrolde üç eski immutable cache dosyasında whitespace uyarıları var (aşağıda) |

Desktop testi kaynak checkout'u mevcut olmadığı için skip olur. Test kapatılarak başarısızlık gizlenmedi. İlk Node denemesi build sürerken iki SEO kontrolünde başarısızdı; build tamamlandıktan sonra tam tur geçti. Önceki eksik mediabunny hatası frozen install sonrasında tekrar oluşmadı. Secret taraması desen tabanlıdır; sıfır bulgu mutlak güvence değildir.

İndekse ilk kez eklenen eski fingerprint dosyalarında staged whitespace kontrolü başarısız olur: `frontend/cache-assets/app.fe3468d19117.js` içindeki iki boş satırın boşlukları ve `github.788ecd868a39.svg`, `windows.8a1145b921a4.svg` dosyalarındaki orijinal CRLF baytları. Bu dosyalar önbellekte kalmış sayfalarla uyumluluk için devralınmıştır. İçerikleri değiştirilirse dosya adındaki SHA-256 artık geçerli olmayacağından orijinal baytlar korunmuştur. Yeni yerelleştirilmiş HTML'deki boş satır boşlukları düzeltilmiştir. Kontrol kapatılmamış ve kalan biçimlendirme hatası başarılı diye gösterilmemiştir; içerik-hash/cache bütünlük testleri geçer.

## Canlı Supabase — salt okunur kontroller

Proje `woxxdgekdgapcsruicci`, işlev `typing-api`, v6 ACTIVE. Canlı `index.ts`, `core.mjs`, `words.mjs`, `duels.mjs` içerikleri yerel kaynaklarla satır sonları normalize edilerek birebir karşılaştırıldı; yeniden deploy yapılmadı.

Dokuz uygulama tablosunda RLS açık. Hesaplar, challenge/vuruşlar, düellolar, kuyruk, rate limit ve özel roller anonim okumaya kapalı; tüm uygulama tablolarında authenticated INSERT grant'i kapalı. Herkese açık profil/skor/rating tabloları yalnızca beklenen okuma erişimine sahip. Yardımlı skorun `board_eligible` olmasını engelleyen constraint canlıda mevcut. Dahili score/admin/session/room RPC'lerinin anon EXECUTE izni yok; public leaderboard RPC'si okunabilir. İncelenen RPC'ler security invoker ve boş `search_path` kullanır.

Security advisor'daki altı `RLS Enabled No Policy` INFO kaydı bilinçli deny-all tablolara aittir; bunlara erişim açılmaz. [Advisor açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Kalan WARN: sızmış şifre koruması kapalı. Organizasyon Free planda; [resmî belgeye göre özellik Pro ve üstünde kullanılabilir](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Plan, ödeme veya hesap güvenlik ayarı değiştirilmedi.

## Tarayıcı doğrulaması ve sınırlar

- Türkçe ve İngilizce arayüz, mobil 390×844 görünüm, sekiz tema ve SVG eşlikçileri kontrol edildi.
- İngilizce yazma metni seçildiğinde Türkçe arayüzün korunduğu doğrulandı. Genel sitenin kayıtlı Almanca tercihi, bağımsız İngilizce Type arayüzünü değiştirmedi.
- Canlı `boranseason` profil bağlantısı, gerçek istatistikler ve isim araması okuma istekleriyle doğrulandı. Mobil profilde yatay sayfa taşması yok.
- Bütün Supabase çağrılarını yerel cevaplarla yakalayan tarayıcı senaryosunda sıralamalı test challenge/start/events/finish akışı tamamlandı. Harf efekti kapalıyken akıcı caret ve yazarken gizlenen header doğrulandı.
- Aynı yerel senaryoda admin özel oda yardım ayarı açıldı; `x`, `z`, `q` tarayıcı klavye girdileri `bir` üretti ve %100 doğruluk gösterdi. `ayarlar` ve `sıralama` oyuncu adları İngilizce arayüzde korunur. Sunucu unit testleri normal kullanıcının ve ranked odanın yardımı açmasını reddeder, rakip payload'ındaki iç yardım alanlarını kontrol eder.
- Yeni canlı QA hesapları açma isteği otomatik güvenlik incelemesince reddedildi ve uygulanmadı. Bu nedenle kayıt/giriş/kurtarma/avatar, iki gerçek oturumlu ranked/özel maç ve Elo sonuçları bu oturumda uçtan uca yeniden doğrulanmadı. Önceki devir notundaki başarılı canlı testler yeni test sonucu sayılmaz. Gerçek hesap kullanılarak bu sınır aşılmadı.

Tarayıcı gerçek bir insanın tuşa bastığını kesin olarak kanıtlayamaz. Gerçekçi zamanlamalı otomasyon bütünüyle engellenmiş değildir. Kaynak commit'inin push edilmesi Cloudflare canlı dağıtımının başarılı olduğu anlamına gelmez.

## Yerel araç ortamı uyarısı

Bu makinede testleri çalıştıran sistem Node sürümü `v24.19.0`. [21 Ekim 2026 Node güvenlik duyurusu](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), 24.x hattı için v24.22.1 güvenlik sürümünü içerir. Sistem Node kurulumu bu depo değişikliği kapsamında güncellenmedi. Paket audit'inin temiz çıkması Node runtime'ının güncel olduğu anlamına gelmez; yerel/CI runtime'ları da ilgili güvenlik sürümüne güncellenmelidir.

## Geri alma

Teslim commit'i gerektiğinde normal bir `git revert` ile geri alınabilir; geçmiş yeniden yazılmaz. Canlı şema ve işlev değiştirilmediğinden bu teslim için veritabanı geri alma adımı yoktur.
