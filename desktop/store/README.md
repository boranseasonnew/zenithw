# ZenithW Microsoft Store hazırlığı

[Mağaza sayfası](https://apps.microsoft.com/store/detail/9NVWM7S7MJP7) · [Windows kaynak rehberi](../README.md)

ZenithW Desktop **5.0.0** için Windows x64 APPX paketi üretilir. Microsoft Store paketi sertifikasyon sonrasında imzalar. Store sürümünün güncellemeleri mevcut uygulama kaydı üzerinden dağıtılır.

## Hesaba bağlama

1. Partner Center'da **MSIX or PWA app** türünde **ZenithW Desktop** kaydı oluşturuldu. Store ID: **9NVWM7S7MJP7**. Önceki **ZenithW** kaydı EXE/MSI türündedir ve bu paketi kabul etmez.
2. Partner Center → uygulama → **Product identity / Ürün kimliği** sayfasını aç.
3. `identity.example.json` dosyasını `identity.json` olarak kopyala. Alanları şöyle doldur:

| Yerel alan | Microsoft alanı |
|---|---|
| identityName | Package/Identity/Name |
| publisher | Package/Identity/Publisher |
| publisherDisplayName | Package/Properties/PublisherDisplayName |

Bu değerler parola değildir. Publisher alanındaki **CN=** önekini aynen koru. Hesaba özel dosya Git'e eklenmez.

## Paket üretme

Windows’ta depo kökünden çalıştır.

```powershell
pwsh -File desktop/scripts/stage-release-tools.ps1
pwsh -File desktop/scripts/prepare-rust.ps1 -UiOnly
cargo test --locked --manifest-path desktop/native/Cargo.toml
cargo build --locked --release --manifest-path desktop/native/Cargo.toml
pwsh -File desktop/scripts/package-store.ps1 -ExePath desktop/native/target/release/zenithw-desktop.exe
```

Paket `ZenithW-Builds/Microsoft-Store-Preparation/5.0.0/ZenithW-5.0.0-Store-x64.appx` yoluna yazılır. Aynı klasörde `SHA256SUMS.txt` bulunur.

Hesap kimliği olmadan paketleme denemesi için `-Draft` kullan.

```powershell
pwsh -File desktop/scripts/package-store.ps1 -ExePath desktop/native/target/release/zenithw-desktop.exe -Draft
```

Paketleyici Windows SDK’daki MakeAppx aracını kullanır. **DRAFT** dosyası yerel hazırlık kimliği taşır. Store gönderiminde Partner Center kimliğiyle üretilen APPX dosyasını kullan.

## Başvuru içeriği

- `listing.json`: Türkçe, İngilizce, Almanca, Rusça açıklamalar, özellikler ve kısa sürüm notları.
- `privacy.md`: Windows uygulamasına özel gizlilik metni. Web sunucusunun gizlilik metniyle karıştırılmamalı.
- `certification-notes.md`: Microsoft incelemesi için kullanım ve izin açıklaması.
- `assets/StoreLogo-300.png`, `assets/StoreLogo-150.png`: mağaza logoları.
- `build/appx/`: uygulama kutucukları ve paket logoları.

Fiyatı **Free / Ücretsiz**, cihazı **PC**, dilleri **tr-TR, en-US, de-DE, ru-RU** seç. Açıklamada mevcut özellikleri kullan; tüm kaynaklarda sürekli indirme garantisi verme. Gizlilik URL'si: https://github.com/boranseasonnew/zenithw/blob/main/desktop/store/privacy.md . Destek: https://github.com/boranseasonnew/zenithw/issues . Web sitesi: https://zenithw.space/pc-app .

Paket, yerel yt-dlp, FFmpeg, FFprobe, aria2 ve Deno araçlarını çalıştırmak için `runFullTrust` iznini bildirir. Masaüstü arayüzü Windows WebView2 Runtime’ı kullanır. yt-dlp’nin güncellenebilir kopyası kullanıcı verisi klasöründedir. İsteğe bağlı motor güncellemesi resmî yt-dlp GitHub yayınlarından gelir. Uygulamanın güncelleme düğmesi Microsoft Store’un indirmeler ve güncellemeler sayfasını açar. Son 300 indirme kaydı cihazda saklanır.

Göndermeden önce gerçek kimlikli paketi test ortamına yükleyerek Windows App Certification Kit ve indirme/güncelleme kontrollerini tamamla. Masaüstü ekran görüntüleri **PNG, en az 1366×768** olmalı; kişisel URL, kullanıcı adı veya dosya yolunu göstermemeli. Her mağaza dilinde uygun görüntüyü yükle. Adın ayrılabilmesi, kimlik onayı, yaş derecelendirme cevapları ve Microsoft inceleme sonucu hesaptaki başvuru sırasında kesinleşir; hazırlık paketi mağaza onayı anlamına gelmez.

## Resmi kaynaklar

- Ücretsiz kayıt: https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer
- Paket ve ücretsiz Store imzası: https://learn.microsoft.com/en-us/windows/apps/publish/get-started
- Görseller: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/screenshots-and-images
- İnceleme: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process
