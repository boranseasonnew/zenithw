# ZenithW Desktop 4.2.0

[![Windows](https://img.shields.io/badge/Windows-10%2F11_x64-222222)](https://zenithw.space/downloads#windows) [![License](https://img.shields.io/badge/License-AGPL--3.0-555555)](LICENSE)

ZenithW’nin Windows için yerel medya uygulaması. Video ve ses indirme, playlist seçimi, format/kalite tercihleri ve kalıcı geçmiş tek çalışma alanında toplanır. İndirmeler bilgisayarının bağlantısını kullanır; kaynak sitelerin erişim, oturum ve codec kısıtlamaları geçerlidir.

[İndir](https://zenithw.space/downloads#windows) · [4.2.0 yayını](https://github.com/boranseasonnew/zenithw/releases/tag/v4.2.0) · [Ana proje](../README.tr.md) · [Hata bildir](https://github.com/boranseasonnew/zenithw/issues)

## Özellikler

- Video/ses, çözünürlük, kapsayıcı ve codec tercihleri; MP4, MKV, WebM ve desteklenen ses biçimleri.
- Playlist seçim aralığı, sıralama ve klasör seçenekleri; eşzamanlı indirme kuyruğu.
- Kırpma, altyazı, metadata, kapak ve SponsorBlock seçenekleri; kaynağın desteklediği ölçüde.
- Cookie dosyası, desteklenen tarayıcı oturumu, proxy ve yt-dlp motor kanalı ayarları.
- Kategorili ve aranabilir ayarlar, açık/koyu/sistem teması, vurgu renkleri, bildirimler ve sistem tepsisi.
- Yerel profiller ve hassas alanları dışarıda bırakan ayar aktarımı; Türkçe, İngilizce, Almanca ve Rusça arayüz.
- Yeniden açılışta korunan, en fazla 300 kayıtlık geçmiş. Tamamlanmamış işler kesilmiş gösterilir; otomatik devam garanti değildir.

Remux uyumlu akışları yeniden kodlamadan taşır; dönüştürme ayrı bir işlemdir. Her site bütün seçenekleri desteklemez. Gömülemeyen kapaklar uygun durumda ayrı dosya olarak saklanır.

## Web 17.0 ile kaynak güncellemeleri

Web 17.0, Windows uygulamasının sürüm numarası değildir; yayımlanmış Windows paketi **4.2.0** olarak kalır. Depodaki Electron **44.10.1**, electron-builder **26.18.0** ve geçişli bağımlılık düzeltmeleri sonraki Windows paketinin derlenmesini gerektirir. Mevcut kurulumlar yalnızca web sitesi güncellenerek bu değişiklikleri almaz.

Masaüstü kuyruk, geçmiş, dosya yayınlama ve güvenlik sınırı testleri birlikte **24/24** geçti. Bunlar izole araç süreçleriyle yapılan testlerdir; yeni Windows paketinin gerçek cihazda doğrulandığı anlamına gelmez. Kalan uyarılar ve kapsam [inceleme raporunda](../docs/full-code-audit-2026-11-02.md).

## Geliştirme ve paketleme

Node.js/npm ve Windows araç paketi gerekir. Bağımlılıklar `package-lock.json` ile sabittir.

```powershell
cd desktop
npm ci
npm test
npm run start
npm run pack
npm run dist
npm run portable
```

`stage-tools`; yt-dlp, FFmpeg, FFprobe, aria2 ve Deno dosyalarını hazırlar. Eksiksiz yerel araç paketi varsa onu kullanır; yoksa kurulu Zenith’in araç klasörüne bakar. Başka kaynak için `ZENITHW_TOOL_SOURCE` belirtilebilir. Kaynak araçlar yerinde değiştirilmez. `win-unpacked` taşınırken yalnızca EXE değil, klasörün tamamı gerekir.

Araçları kopyalamak sürümlerini otomatik güncellemez. Motor güncellemesi uygulamanın ayarlarından yapılır. Microsoft Store paketlemesi için [Store rehberine](store/README.md) bak.

## Veriler ve isteğe bağlı scriptler

Stable kimliği `space.zenithw.desktop.stable`, veri klasörü `%APPDATA%/Zenith Stable`’dır. Geçmiş, ayarlar ve oturum verileri kaynak paketine dahil edilmemelidir.

PowerShell scriptleri varsayılan olarak kapalıdır. Kullanıcının seçtiği `.ps1` kendi yetkileriyle çalışır; yürütme politikası değiştirilmez. Olay bilgileri komut metnine eklenmez; `ZENITHW_EVENT`, `ZENITHW_URL`, `ZENITHW_OUTPUT_DIR`, `ZENITHW_FILES_JSON` ortam değişkenlerinden verilir. Ön işlem hatası indirmeyi durdurabilir; son işlem hatası indirilen dosyayı silmez.

## Kaynak ve lisans

İlk kaynak kurtarması ZenithW’nin kendi `resources/app.asar` dosyasından yapılmıştır; tarihsel SHA-256: `1745f5a2bb387bb4ca6737d12fd4bf2d228e006207fd5830b568819d0541d079`. Stacher’ın düzeni incelenmiş, kodu ve görsel varlıkları kullanılmamıştır.

[AGPL-3.0-only](LICENSE). Bileşenlerin lisansları [üçüncü taraf bildirimlerinde](THIRD_PARTY_NOTICES.md) korunur. Yalnızca indirmeye yetkili olduğun içerikleri kullan.
