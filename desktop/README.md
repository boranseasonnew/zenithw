# Zenith Desktop 4.0

ZenithW'nin kurulu 0.3.4 sürümündeki kendi Electron kaynakları kurtarılarak oluşturulan Windows uygulaması. Stacher'ın düzeni ve erişilebilir seçenekleri incelendi; Stacher kodu, ikonları veya görselleri kullanılmadı.

## Arayüz ve ayarlar

- Üstte geniş bağlantı alanı; altında indirmeler ve kalıcı geçmiş, liste/kart görünümü.
- Mat koyu görünüm, kısa geçişler, hareketi azaltma ve açıklamaları gizleme seçenekleri.
- Sol kategori menüsü, sağda kaydırılabilir seçenekler ve ayar araması.
- Video/ses, kalite, kapsayıcı, codec tercihi ve sürüklenen zaman aralığı ile kırpma.
- Hazır seçimli ayarlar; TR, EN, RU ve DE arayüz metinleri.
- MP4, MKV, WebM, MOV, AVI, FLV; MP3, M4A, Opus, FLAC, WAV, AAC, OGG ve ALAC.
- Siyah zeminde kısa ceylan açılışı ve uygulama içindeki ilk kullanım ekranı.
- EXE, kurulum ve görev çubuğu için aynı Z! marka simgesi.
- Bağlantı, hız sınırı, fragment sayısı, tekrar denemeler, aria2 ve IPv4/IPv6.
- Metaveri, kapak, bölümler, manuel/otomatik altyazılar ve son işleme.
- SponsorBlock işaretleme/kaldırma; liste sırası, seçim aralığı ve indirme arşivi.
- Kaynak analizi, istekler arasında bekleme, yt-dlp kanalı ve açılışta güncelleme.
- Netscape cookie dosyası, desteklenen tarayıcı oturumu veya uygulama içi giriş.
- En fazla 12 yerel profil; hassas alanlar hariç ayar içe/dışa aktarımı.
- Playlist seçim aralığı, ters/karışık sıra, ayrı klasör ve sıra numaraları.
- URL çubuğundan açılan format, kırpma, altyazı, oturum ve playlist panelleri.
- Scripts: açıkça seçilen yerel PowerShell dosyasını indirmeden önce veya dosyalar kaydedildikten sonra çalıştırma; süre sınırı ve hata davranışı.
- Üç adımlı ilk açılış ekranı ve gerçek araç durumu.

Bu seçenekler yalnızca görsel kontrol değildir; doğrulanan değerler indirme motoruna aktarılır. Her site veya format her seçeneği desteklemeyebilir. WAV/WebM için gömülemeyen kapak ayrı dosya olarak korunur. aria2 yalnızca HTTP/FTP indirmelerine atanır; DASH/HLS yerel indirici kullanır.

Scripts varsayılan olarak kapalıdır. Yalnızca dosya seçiciden seçilen `.ps1` dosyaları kullanılır; PowerShell güvenlik politikası değiştirilmez. Script kendi kullanıcı yetkileriyle çalışır. Bağlantı ve dosya isimleri komut metnine eklenmez; `ZENITHW_EVENT`, `ZENITHW_URL`, `ZENITHW_OUTPUT_DIR`, `ZENITHW_FILES_JSON` ortam değişkenleri ile aktarılır. Dosyalar ayar aktarımına dahil edilmez. Ön script başarısızlığında durdurma seçeneği indirmeyi başlatmaz; son script başarısızlığı indirilmiş dosyayı koruyarak uyarı verir. Hook tüm indirme işi için bir kere çalışır; playlist'in her videosu için ayrı tetiklenmez.

## Sürüm ve uygulama verileri

Bu sürüm `space.zenithw.desktop.stable` kimliği ve `%APPDATA%/Zenith Stable` veri klasörü kullanır. Önceki kurulumun ve önizlemenin verilerini ayrı tutar. Tamamlanmamış indirmeler yeniden açılışta kesilmiş olarak gösterilir; otomatik devam garantisi yoktur.

Windows paketi oluşturuldu ve uygulamanın açılışı incelendi. Gerçek indirme, farklı cihazlar, oturum ve bütün format kombinasyonları bu çalışma sırasında denenmedi. GitHub yayını ayrıca yapılmalıdır; kod imza sertifikası sağlanmadı.

Doğrudan açılan Zenith-4.0.0-Windows.exe klasik kurulum sihirbazı göstermez. İlk açılışta paketini geçici klasöre çıkarır; ardından ceylan animasyonu ve uygulama içindeki başlangıç tercihleri gelir. Tercihler %APPDATA%/Zenith Stable içinde saklanır. İsteğe bağlı Windows-Setup.exe normal Windows kısayollarını kurar.

## Windows'ta derleme

Node.js ve npm gerekir. Paket sürümleri `package-lock.json` içinde sabitlenmiştir.

```powershell
cd desktop
npm ci
npm run pack   # EXE ve gerekli dosyaların bulunduğu win-unpacked klasörü
npm run dist   # Zenith 4.0 kurulum ve doğrudan açılan EXE
npm run portable # yalnızca doğrudan açılan EXE
```

`stage-tools` varsayılan olarak mevcut `%LOCALAPPDATA%/Programs/ZenithW/resources/bin` klasöründen yt-dlp, FFmpeg, FFprobe ve aria2 dosyalarını kopyalar. Başka bir araç klasörü için `ZENITHW_TOOL_SOURCE` ortam değişkenini belirtin. Kaynak klasör değiştirilmez. Yalnızca EXE'yi taşımak yeterli değildir; unpacked çıktısının bütün dosyaları gerekir.

Araçlar mevcut kurulumdan alındığından paketleme işlemi bunların sürümünü kendiliğinden değiştirmez. Uygulamanın motor ayarlarından yt-dlp güncellemesi yapılabilir. Dağıtım lisans bilgileri `LICENSE` ve `THIRD_PARTY_NOTICES.md` dosyalarındadır.

## Kurtarma kaydı

Kaynak: kurulu ZenithW'nin `resources/app.asar` dosyası.

SHA-256: `1745f5a2bb387bb4ca6737d12fd4bf2d228e006207fd5830b568819d0541d079`.

Orijinal kurtarma kopyası, Git dışında `ZenithW-Builds/Desktop-source-recovered` klasöründe saklanır. Özel ayarlar, oturum dosyaları, indirme geçmişi ve kurulu uygulama verileri kaynak paketine dahil edilmez.
