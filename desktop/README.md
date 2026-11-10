# ZenithW Desktop 5.0.0

[![Windows](https://img.shields.io/badge/Windows-10%2F11_x64-222222)](https://zenithw.space/downloads#windows) [![License](https://img.shields.io/badge/License-AGPL--3.0-555555)](LICENSE)

ZenithW’nin Windows için yerel medya uygulaması. Video ve ses indirme, playlist seçimi, format/kalite tercihleri ve kalıcı geçmiş tek çalışma alanında toplanır. İndirmeler bilgisayarının bağlantısını kullanır; kaynak sitelerin erişim, oturum ve codec kısıtlamaları geçerlidir.

Web 17.0 ve Windows 5.0.0 ayrı yayın sürümleridir.

[Windows yayınları](https://github.com/boranseasonnew/zenithw/releases) · [Ana proje](../README.tr.md) · [Hata bildir](https://github.com/boranseasonnew/zenithw/issues)

## Özellikler

- Video/ses, çözünürlük, kapsayıcı ve codec tercihleri; MP4, MKV, WebM ve desteklenen ses biçimleri.
- Playlist seçim aralığı, sıralama ve klasör seçenekleri; eşzamanlı indirme kuyruğu.
- Kırpma, altyazı, metadata, kapak ve SponsorBlock seçenekleri; kaynağın desteklediği ölçüde.
- Cookie dosyası, desteklenen tarayıcı oturumu, proxy ve yt-dlp motor kanalı ayarları.
- Kategorili ve aranabilir ayarlar, açık/koyu/sistem teması, vurgu renkleri, bildirimler ve sistem tepsisi.
- Yerel profiller ve hassas alanları dışarıda bırakan ayar aktarımı; Türkçe, İngilizce, Almanca ve Rusça arayüz.
- Yeniden açılışta korunan, en fazla 300 kayıtlık geçmiş. Tamamlanmamış işler kesilmiş gösterilir; otomatik devam garanti değildir.

Remux uyumlu akışları yeniden kodlamadan taşır; dönüştürme ayrı bir işlemdir. Her site bütün seçenekleri desteklemez. Gömülemeyen kapaklar uygun durumda ayrı dosya olarak saklanır.

## Geliştirme ve paketleme

Windows x64, Rust MSVC araç zinciri, Windows SDK ve Microsoft Edge WebView2 gerekir. Yerel uygulama Rust/Tauri kullanır. HTML, CSS ve JavaScript arayüzü WebView2 içinde açılır. İndirme, pencere ve dosya işlemleri Rust tarafından yürütülür.

```powershell
pwsh -File desktop/scripts/prepare-rust.ps1
cargo test --locked --manifest-path desktop/rust-core/Cargo.toml
cargo test --locked --manifest-path desktop/native/Cargo.toml
cargo build --release --locked --manifest-path desktop/native/Cargo.toml
pwsh -File desktop/scripts/package-rust.ps1 -ExePath desktop/native/target/release/zenithw-desktop.exe
```

Hazırlama betiği yt-dlp, FFmpeg, FFprobe, aria2 ve Deno dosyalarını paketleme dizinine kopyalar. Yerel araç kaynağını `ZENITHW_TOOL_SOURCE` ile belirleyebilirsin. Portable ZIP'i çalıştırmadan önce tamamını çıkar. Microsoft Store paketi için [Store rehberine](store/README.md) bak.

Gerçek WebView2, Rust komutları ve paketli medya araçlarıyla uçtan uca test için `node desktop/tests/native-smoke.mjs <Zenith.exe> <bin klasörü>` komutunu kullan. Test, kendi geçici profilini ve yerel örnek videoyu oluşturur.

## Veriler ve isteğe bağlı scriptler

Stable kimliği `space.zenithw.desktop.stable`, veri klasörü `%APPDATA%/Zenith Stable`’dır. Yükseltme mevcut ayarları, profilleri, geçmişi ve dışa aktarılmış oturum çerezlerini bu klasörden okur. Oturum penceresi WebView2 profiline geçtiği için yeniden giriş gerekebilir.

PowerShell scriptleri varsayılan olarak kapalıdır. Kullanıcının seçtiği `.ps1` kendi yetkileriyle çalışır; yürütme politikası değiştirilmez. Olay bilgileri komut metnine eklenmez; `ZENITHW_EVENT`, `ZENITHW_URL`, `ZENITHW_OUTPUT_DIR`, `ZENITHW_FILES_JSON` ortam değişkenlerinden verilir. Ön işlem hatası indirmeyi durdurabilir; son işlem hatası indirilen dosyayı silmez.

## Kaynak ve lisans

İlk kaynak kurtarması ZenithW’nin kendi `resources/app.asar` dosyasından yapılmıştır; tarihsel SHA-256: `1745f5a2bb387bb4ca6737d12fd4bf2d228e006207fd5830b568819d0541d079`. Stacher’ın düzeni incelenmiş, kodu ve görsel varlıkları kullanılmamıştır.

[AGPL-3.0-only](LICENSE). Bileşenlerin lisansları [üçüncü taraf bildirimlerinde](THIRD_PARTY_NOTICES.md) korunur. Yalnızca indirmeye yetkili olduğun içerikleri kullan.
