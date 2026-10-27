# v16.1 güvenlik ve teslim kontrolü — 27 Ekim 2026

## Kapsam

Zenith Type, `205f4c60` çalışma dalından güncel main (`097a98bc`) üzerine taşındı. Main'deki web v16.0 ses ayırıcı, Android 2.4.0, Windows 4.2.0, SEO ve güvenlik değişiklikleri korundu. Eski daldaki desktop/promo silinmeleri güncel main'e uygulanmadı. Yeni teslim commit'inin ana yazarı, kullanıcının bu teslim için açık isteğiyle Codex'tir; kullanıcı author/co-author olarak eklenmez. Eski commitler yeniden yazılmaz.

v16.1 notları sekiz dilde üretildi; `/updates` içinden `/typing` bağlantısı verilir. v16.0 ve eski arşivler erişilebilir kalır. Site sürümü ve README sürüm bilgileri v16.1 olarak güncellendi.

## Son kontroller

| Kontrol | Sonuç |
| --- | --- |
| `pnpm install --frozen-lockfile` | Başarılı; root bağımlılık sürümleri ve npm/pnpm lock dosyaları korunur |
| `pnpm run build` | Başarılı; Lilith, 71 sürüm sayfası, 85 rota × 8 dil, cache ve CSP dahil |
| Node tam test turu | 77 başarılı; başarısız veya atlanan test yok |
| Python backend unittest | 129 başarılı |
| Bandit medium/high | Bulgu yok; mevcut CI'nin B104 istisnası korunur |
| `pip_audit` | 39 kilitli paket, bilinen açık yok |
| `pnpm audit --json` | 48 bağımlılık kaydı, bilinen açık yok |
| Cache / CSP / release content / lint | Başarılı |
| `git diff --check` ve staged karşılığı | Başarılı |

İlk kontrollerde eski HTML chip'lerini, v14.4 sürümünü, eski URL'leri ve masaüstünün artık kullanılmayan ağırlıklı yüzdelerini bekleyen testler başarısız oldu. Kontroller kapatılmadı: gerçek native format select kataloğu, güncel indirme rotaları, sürüm arşivi, stream bazlı ilerleme ve belirsiz postprocess süresi kontrol edilecek şekilde uyarlandı. Masaüstü VM testlerine eksik `progressArgs` ve dosya listeleme bağımlılıkları eklendi. Ürün masaüstü kodu değiştirilmedi. WebM'in uyumsuz MP4 girdisini MKV ara dosyası üzerinden yeniden kodladığı doğrulandı.

İlk build, Pages'ın 100 header kuralı sınırını aştı. Type'ın yedi betiği `/typing-*.js` için aynı bir saatlik sınırlı cache kuralında toplandı. HTML bu desenle eşleşmez; özel middleware politikası korunur. Son çıktıda 99 header kuralı ve 80 static route exclusion vardır. [Pages header sınırları ve splat eşleşmesi](https://developers.cloudflare.com/pages/configuration/headers/).

pnpm 11, mevcut main'in `protobufjs` postinstall kararı eksik olduğu için ilk kurulumda hata verdi. Betik incelendi: yalnızca üst paketin sürüm aralığı uyumluluğunu okuyup uyarı üretir. Yalnızca protobufjs için açık build izni verildi; genel betik veya test korumaları kapatılmadı.

## Güvenlik değişiklikleri

- HTTP kaynak açıcı yalnızca HTTP(S) handler'ları kurar; `file:`, `ftp:` ve `data:` I/O öncesinde reddedilir. Main'in SSRF, JSON/multipart limitleri, kuyruk sınırları ve diğer yeni backend korumaları korunur.
- Brotli requirements ve hashli lock 1.2.1 olarak eşleşir. [CVE-2026-111497 düzeltmesi](https://github.com/pypa/advisory-database/blob/main/vulns/brotli/PYSEC-2026-4322.yaml).
- Beszel hub loopback'e bağlanır; isteğe bağlı overlay dokümante edilir.
- Typing CSP yalnızca typing rotalarına uygulanır; main'in her yanıtta ürettiği Cloudflare nonce mekanizması ve ses worker'larının ayrı CSP'si korunur.
- Typing, genel sitenin kayıtlı dil runtime'ından ayrıdır; oyuncu adları ve yazılacak metin çevrilmez. Genel dil betiği build sırasında bu sayfaya eklenmez.

## Tarayıcı ve canlı sistem sınırları

Türkçe/İngilizce v16.1 notları, `/typing` bağlantısı, önceki sürüm seçimi ve mobil 390×844 görünüm kontrol edildi. Typing sayfası gerçek Pages middleware önizlemesinde 200 yanıtıyla açıldı; yatay taşma ve JavaScript hatası görülmedi. Önceki turda test edilen Type temaları, profil/arama, smooth caret ve yerel admin yardım senaryosu aynı Type kaynaklarıyla korundu.

Supabase projesi `woxxdgekdgapcsruicci` ve `typing-api` v6 kaynakları önceki turda canlıyla karşılaştırılmıştı. Bu teslimde canlı DDL, işlev deploy'u veya gerçek hesap/avatar/skor değişikliği yapılmadı. Önceki turda güvenlik incelemesinin reddettiği yeni canlı QA hesabı açma işlemi yeniden denenmedi. Kayıt, kurtarma, iki gerçek oturumlu maç ve Elo akışlarının yeni canlı uçtan uca testi yapıldığı iddia edilmez.

Önceki salt okunur advisor kontrolünde uygulama tablolarının RLS/grant sınırları ve yardımlı skorların sıralamaya girmesini engelleyen constraint doğrulandı. Altı deny-all tablo için `RLS Enabled No Policy` INFO kaydı beklenen davranıştır. Kalan WARN: Free planda sızmış şifre koruması kapalı; [özellik Pro ve üstü plan gerektirir](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Plan veya hesap güvenlik ayarı değiştirilmedi.

Tarayıcı, gerçek insan vuruşunu kesin kanıtlayamaz; tam hile koruması iddiası yoktur. Yerel Node v24.19.0 kurulumu [v24.22.1 güvenlik sürümünün](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) gerisindedir; sistem kurulumu bu depo tesliminde değiştirilmedi. Paket audit'inin temiz olması runtime'ın güncel olduğunu kanıtlamaz.

## Geri alma

Yeni main commit'i normal `git revert` ile geri alınabilir. Canlı veritabanı veya Edge Function değiştirilmediği için ayrı DB geri alma adımı yoktur. GitHub push'u ile Cloudflare dağıtım sonucu ayrı doğrulanır.
