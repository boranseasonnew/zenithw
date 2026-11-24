<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Medyayı kaydet. Sade tut.<br>
  <a href="https://zenithw.space">Web uygulaması</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ ZenithW neden var? Hikâyemizi oku</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

[Zenith Type](https://zenithw.space/typing), yazma pratiği ve düellolar sunar. Dereceli oyunda 50.000 Elo sınırı, karşılıklı onayla tekrar maç ve ikili galibiyet kayıtlarını içeren maç geçmişi bulunur. Çevrimiçi oyun için hesap gerekir. Kurallar ve yayın durumu için [Zenith Type belgesine](docs/TYPING.md) bak. WPM sıralaması ve dereceli düello Elo’su 30 günde bir yenilenir; sezonun kalan süresi canlı sayaçta gösterilir. Özel oda sahibi maç öncesinde ayarları değiştirebilir; sana özel doğru tuş yardımı oyun sırasında açılıp kapatılabilir. Özel odalarda yalnızca profilde görünen, sezonla sıfırlanmayan ayrı bir Elo vardır; sıralamayı etkilemez.

ZenithW; video ve ses indirme, ses ayıklama, dönüştürme ve remux için açık kaynaklı bir medya aracıdır. Reklam, abonelik veya zorunlu hesap yok.

Desteklenen bağlantıyı yapıştır, formatı seç ve dosyayı indir. Kullanılabilir formatlar kaynağa bağlıdır.

## ZenithW neden var?

Zorunlu hesap, abonelik veya reklam olmadan medya indirmek ve işlemek için açık kaynaklı bir medya çalışma alanı.

## Özellikler

- Desteklenen kaynaklardan basit bağlantı akışıyla medya indir.
- Medyalardan ses ayıkla ve sesi işle.
- Medya biçimlerini dönüştür; uyumlu MKV/MP4 akışlarını yeniden kodlamadan remux et.
- Görselleri tarayıcında yerel olarak dönüştür ve boyutlandır.
- Ses Ayırıcı ile vokalleri ve enstrümantalleri ayır.

## Hızlı başlangıç

Depoyu klonla ve proje klasörüne gir:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

`.env.example` dosyasını `.env` olarak kopyala ve `SECRET_KEY` değerini güçlü, rastgele bir değerle değiştir.

```bash
docker compose up -d --build
```

Tarayıcında `http://localhost:8080` adresini aç:

## Web 17.2 ile neler değişti?

- **Vimeo web sürümünden kaldırıldı:** Bazı Vimeo bağlantılarının çerez gerektirmesi ve yt-dlp uyumluluğunun tutarsız olması nedeniyle herkese açık web uygulamasında Vimeo desteği devre dışı bırakıldı.
- **Çeviri düzeltmeleri:** AVI gibi biçim adları ve Rumble gibi platform isimleri artık yanlış çevrilmiyor.
- **Ayarlar kısayolu düzeltildi:** İndirme panelindeki bağlantı artık Görünüm yerine ilgili Video ayarlarını açıyor.
- **Yerelleştirilmiş SEO metaverileri:** Sayfa başlıkları ve sosyal önizlemeler her dil için doğru dili kullanıyor.
- **Uygulama tanıtım penceresi kaldırıldı:** Kullanıcı bağlantı girerken artık araya girmiyor.

Windows ve Android kendi bağımsız sürüm numaralarını korur; bu sürüm etiketi web sürümünü belirtir.
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
