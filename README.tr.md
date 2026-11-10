<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Medyayı kaydet. Sade tut.<br>
  <a href="https://zenithw.space">Web uygulaması</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>İndirme rozetleri tüm GitHub yayın dosyalarının toplam indirilmesini gösterir; tekil kullanıcı veya Microsoft Store kurulum sayısı değildir.</sub></p>

<p align="center"><strong><a href="why_zenithw.md">✦ ZenithW neden var? Hikâyemizi oku</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

[Zenith Type](https://zenithw.space/typing), yazma pratiği ve düellolar sunar. Dereceli oyunda 50.000 Elo sınırı, karşılıklı onayla tekrar maç ve ikili galibiyet kayıtlarını içeren maç geçmişi bulunur. Çevrimiçi oyun için hesap gerekir. Kurallar ve yayın durumu için [Zenith Type belgesine](docs/TYPING.md) bak. WPM sıralaması ve dereceli düello Elo’su 30 günde bir yenilenir; sezonun kalan süresi canlı sayaçta gösterilir. Özel oda sahibi maç öncesinde ayarları değiştirebilir; sana özel doğru tuş yardımı oyun sırasında açılıp kapatılabilir. Özel odalarda yalnızca profilde görünen, sezonla sıfırlanmayan ayrı bir Elo vardır; sıralamayı etkilemez.

ZenithW; video ve ses indirme, ses ayıklama, dönüştürme ve remux için açık kaynaklı bir medya aracıdır. Reklam, abonelik veya zorunlu hesap yok.

Desteklenen bağlantıyı yapıştır, formatı seç ve dosyayı indir. Kullanılabilir formatlar kaynağa bağlıdır.

## Web 17.0 ile neler değişti?

- Daha akıcı [ses ayırıcı](https://zenithw.space/audio-separator): parçalara bölünmüş dalga biçimi hazırlığı, ihtiyaç anında oynatma belleği ve iptal edilebilir WAV/ZIP dışa aktarma. MP3 ve FLAC korunur.
- [Remux](https://zenithw.space/remux) başlamadan hedef biçimi seçtirir; uyumlu akışlarda MKV ↔ MP4 desteklenir. Uyumsuz codec için dönüştürme gerekir.
- Sitenin sekiz dilinde daha açıklayıcı medya rehberi ve arama bilgileri; düzeltilmiş gezinme bağlantıları.
- Bağımlılık güvenlik güncellemeleri, süre sınırı netleştirilen kapak istekleri ve eşzamanlı Type avatar değişikliklerine karşı koruma. Sunucu ve kurulu uygulama değişiklikleri ayrıca dağıtılmalıdır.

Ses ayırıcı cihazında çalışır: en fazla 96 MiB dosya ve dört dakikalık bölüm; ilk kullanımda model/işlem altyapısı indirilir. Hız cihazına bağlıdır. Web 17.0, Windows ve Android sürüm numaralarını ayrı tutar.

[Sürüm notları](https://zenithw.space/updates) · [Güvenlik ve doğrulama raporu — İngilizce](docs/full-code-audit-2026-11-02.md)

## Proje

- [Web arayüzü](frontend/) ve [API](backend/)
- [Windows uygulaması](desktop/) · [Android kaynak kodu](https://github.com/boranseasonnew/zenithw-android)

## Belgeler

- [Kullanım ve sınırlar — İngilizce](docs/USAGE.md)
- [Kendi sunucunda çalıştırma ve geliştirme — İngilizce](docs/SELF_HOSTING.md)
- [Cihaz üzerinde medya işleme — İngilizce](docs/LOCAL_MEDIA.md)
- [Servis durumu](https://zenithw.space/status) · [Güncellemeler](https://zenithw.space/updates)

Genel web servisinde YouTube indirmeleri kapalıdır. Windows, Android ve kendi sunucundaki kurulumlar kendi bağlantılarını kullanır; kaynak kısıtlamaları yine geçerlidir.

## Sorumlu kullanım

Yalnızca sana ait veya kullanma iznin olan içerikleri indir. Platform koşullarına ve telif haklarına uy. ZenithW, desteklenen platformlarla bağlantılı değildir.

Web indirme geçmişi tarayıcında tutulur; sunucudaki hazırlanmış dosyalar süreleri dolunca silinir. ZenithW kalıcı bulut depolama hizmeti değildir.

## Katkı

Hata bildirimleri, çeviriler ve kod katkıları bekliyoruz. [Katkı rehberine](CONTRIBUTING.md) bakabilir veya bir [issue açabilirsin](https://github.com/boranseasonnew/zenithw/issues).

## Teşekkürler

yt-dlp, FFmpeg, Mediabunny ve diğer açık kaynak projelerle geliştirildi. Bu araçların geliştiricilerine ve ZenithW’ye katkı veren herkese teşekkürler.

## Lisans

[AGPL-3.0-only](LICENSE). Üçüncü taraf bileşenler kendi lisanslarını korur; ayrıntılar [lisans bildirimlerinde](THIRD_PARTY_NOTICES.md).
