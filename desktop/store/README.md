# ZenithW Microsoft Store hazırlığı

Ürün: **ZenithW Desktop**, masaüstü sürümü **4.1.0**, Windows x64. Paket formatı APPX: Microsoft Store bu MSIX ailesindeki formatı kabul eder. Mağaza dağıttığı paketi imzalar; ayrıca ücretli sertifika satın almak gerekmez. Mevcut GitHub EXE'si imzasız olduğundan EXE bağlantısı yöntemiyle başvuru yapılmamalıdır.

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

Windows'ta `desktop` klasöründe:

```powershell
npm ci
npm run stage-tools
npm test
npm run store
```

Çıktı: `ZenithW-Builds/Microsoft-Store-Preparation/ZenithW-4.1.0-Store-x64.appx` ve `SHA256SUMS.txt`.

Hesap kimliği olmadan yalnızca paketleme denemesi için:

```powershell
npm run store -- --draft
```

**DRAFT** dosyası yerel hazırlık kimliği taşır; Store'a yüklenmez ve imzasız olduğu için çift tıklayarak kurulum doğrulaması yapılamaz. Gerçek hesap kimliğiyle üretilecek paket için ayrıca sertifika eklemek gerekmez. Üretici önce sistemdeki Windows SDK'yı kullanır; yoksa electron-builder'ın doğrulanmış resmi paketleme araçları kullanılır.

## Başvuru içeriği

- `listing.json`: Türkçe, İngilizce, Almanca, Rusça açıklamalar, özellikler ve kısa sürüm notları.
- `privacy.md`: Windows uygulamasına özel gizlilik metni. Web sunucusunun gizlilik metniyle karıştırılmamalı.
- `certification-notes.md`: Microsoft incelemesi için kullanım ve izin açıklaması.
- `assets/StoreLogo-300.png`, `assets/StoreLogo-150.png`: mağaza logoları.
- `build/appx/`: uygulama kutucukları ve paket logoları.

Fiyatı **Free / Ücretsiz**, cihazı **PC**, dilleri **tr-TR, en-US, de-DE, ru-RU** seç. Açıklamada mevcut özellikleri kullan; tüm kaynaklarda sürekli indirme garantisi verme. Gizlilik URL'si: https://github.com/boranseasonnew/zenithw/blob/main/desktop/store/privacy.md . Destek: https://github.com/boranseasonnew/zenithw/issues . Web sitesi: https://zenithw.space/pc-app .

Paketin yalnızca `runFullTrust` özel izni vardır: yerel yt-dlp, FFmpeg, FFprobe, aria2 ve Deno araçlarını çalıştırır. Yönetici yetkisi, sürücü veya Windows hizmeti istemez. Store'da yt-dlp'nin güncellenebilir kopyası kullanıcı verisi klasöründe tutulur; kurulum klasörüne yazılmaz. Uygulama sürümü Store üzerinden, isteğe bağlı motor güncellemesi resmi yt-dlp GitHub yayınlarından gelir.

Göndermeden önce gerçek kimlikli paketi test ortamına yükleyerek Windows App Certification Kit ve indirme/güncelleme kontrollerini tamamla. Masaüstü ekran görüntüleri **PNG, en az 1366×768** olmalı; kişisel URL, kullanıcı adı veya dosya yolunu göstermemeli. Her mağaza dilinde uygun görüntüyü yükle. Adın ayrılabilmesi, kimlik onayı, yaş derecelendirme cevapları ve Microsoft inceleme sonucu hesaptaki başvuru sırasında kesinleşir; hazırlık paketi mağaza onayı anlamına gelmez.

## Resmi kaynaklar

- Ücretsiz kayıt: https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer
- Paket ve ücretsiz Store imzası: https://learn.microsoft.com/en-us/windows/apps/publish/get-started
- Görseller: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/screenshots-and-images
- İnceleme: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process
