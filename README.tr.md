# ZenithW

> İzinli olduğunuz içerikleri indirmek, dönüştürmek ve yeniden paketlemek için odaklı, reklamsız bir medya çalışma alanı. ✨

[Canlı uygulama](https://zenithw.space) · [Durum](https://zenithw.space/status) · [Güncellemeler](https://zenithw.space/updates) · [English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Mevcut sürüm: **v14.4**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ Neden ZenithW?

ZenithW medya işini sakin ve anlaşılır tutar: bağlantıyı yapıştırın, kaynağın gerçekten sunduğu seçenekleri inceleyin, mantıklı bir çıktı seçin ve hazırlanan dosyayı kaydedin. Akışın içinde hesap sistemi, tarayıcı eklentisi, ödeme duvarı veya reklam katmanı yoktur; yalnızca pratik araçlar ve açık sınırlar vardır.

- **Tek odaklı çalışma alanı:** indirme, ses çıkarma, dönüştürme ve remux bir arada.
- **Gizlilik odaklı varsayılanlar:** geçmiş tarayıcıda kalır, hazırlanan dosyalar zamanla silinir.
- **Dürüst denetimler:** profil bir tercihtir; her kaynağın her formatı sunacağına dair sahte bir vaat değildir.
- **Self-hosted kullanıma hazır:** Docker Compose, arayüzü ve API'yi kendi bilgisayarınızda veya sunucunuzda birlikte çalıştırır. 🐳

## Ne yapar?

- YouTube, TikTok, Instagram, X, Reddit ve yt-dlp ile uyumlu diğer kaynaklardaki medyayı çözümler.
- Video, ses, sessiz video, oynatma listesi ve küçük bağlantı grupları indirir.
- FFmpeg ile dönüştürür; uyumlu akışları gereksiz yeniden kodlama olmadan yeniden paketler.
- Altyazı, metadata, kapak görseli, SponsorBlock, iptal ve canlı ilerleme desteği sunar.
- İndirme geçmişini sunucu hesabında değil, tarayıcıda tutar.
- Türkçe, İngilizce, Fransızca, Almanca ve Japonca dillerinde duyarlı, frameworksüz bir arayüz sağlar.

ZenithW kısa ve incelenebilir bir akış etrafında tasarlanmıştır: desteklenen bir bağlantıyı yapıştırın, medya ayrıntılarını ve seçenekleri gözden geçirin, ardından dosyayı doğrudan tarayıcıdan indirmek üzere hazırlayın. Hesap, tarayıcı eklentisi veya masaüstü istemcisi gerektirmez. Arayüz, bir medya işi için önemli kararları görünür tutarken kasıtlı olarak kompakt kalır.

## İndirme denetimleri

Ana ekran otomatik seçim, ses çıkarma, sessiz video, oynatma listesi işleme ve küçük bağlantı gruplarını destekler. Kaynak birden fazla biçim sunduğunda ZenithW; işi başlatmadan önce kapsayıcıyı, çözünürlüğü, codec tercihini, ses bit hızını, altyazıları, metadata bilgisini, küçük görseli, dosya adı şablonunu ve SponsorBlock davranışını seçmenizi sağlar.

Ayarlar üç pratik indirme profili içerir:

- **Minimal**, hızlı paylaşım ve sınırlı depolama için daha küçük, yaygın uyumlu dosyaları tercih eder.
- **Standart**, dengeli bir 1080p H.264/MP4 video ve 192 kbps ses deneyimini hedefler.
- **Kalite**, kaynak gerçekten sağladığında Opus sesli yüksek çözünürlüklü AV1/WebM videoyu tercih eder.

Profil bir başlangıç noktasıdır; her platform veya videoda o akışın mutlaka bulunduğu anlamına gelmez. YouTube video işleri için sunucu yoğunken 720p üst sınırı uygular, yalnızca boşta iken en fazla 1080p'ye izin verir. Biçim geri dönüşleri bu sınırı sessizce aşamaz; seçilen video akışının boyutları etkin sınırla karşılaştırılır. Ses indirmeleri ve YouTube dışındaki kaynaklar kendi seçim akışlarını korur.

## Medya araçları

ZenithW, bağlantı indirmelerinin yanında iki yerel dosya aracı içerir:

- **Dönüştür**, bir dosyayı açıkça belirtilen hedef biçime, sınırlandırılmış bir FFmpeg dönüşümü için yükler. Dosyanın farklı, cihaz dostu bir kapsayıcıya veya ses biçimine ihtiyaç duyduğu durumlarda kullanışlıdır.
- **Yeniden paketle**, uyumlu ses ve video akışlarını yeniden kodlamadan yeni bir kapsayıcıya kopyalar. Daha hızlıdır ve önlenebilir kalite kaybını engeller; ancak yalnızca kaynak akışların istenen kapsayıcıyla uyumlu olduğu yerde çalışır.

Her iki araç da işlem durumunu gösterir ve yükleme arşivi tutmak yerine kısa ömürlü hazırlanmış dosya döndürür. Tek bir dönüştürmenin hizmeti süresiz tüketememesi için yükleme boyutu, çıktı boyutu, süre, eşzamanlılık ve işlem süresi sunucuda sınırlanır.

### Cihazda işleme · Beta

Convert ve Remux, **Sunucu**, **Önce bu cihaz** ve **Yalnızca bu cihaz** seçeneklerini sunar. Beta, uyumlu ses/video akışlarını yeniden kodlamadan taşır; dosyayı yeniden paketleyebilir ve uyumlu sesi çıkarabilir. Varsayılan sunucudur. Başarısız yerel işlemden sonra yükleme için açık onay gerekir; Yalnızca bu cihaz modunda yükleme yapılmaz. Sınırlar: masaüstünde 64 MiB, mobil/düşük bellekli cihazlarda 24 MiB ve 30 dakika. Altyazılar, bölümler ve ekler korunmaz. Bağlantı indirmeleri sunucuda kalır. [Kapsam, sınırlar ve derleme rehberi](docs/LOCAL_MEDIA.md) İngilizcedir.

## YouTube erişilebilirliği

YouTube indirmeleri en iyi çaba esasına göre sunulur. YouTube, AWS gibi bulutta barınan sunucuların da dahil olduğu veri merkezi IP aralıklarından gelen isteklerde geçici olarak daha sıkı kontroller uygulayabilir veya istekleri engelleyebilir. Böyle bir durumda ZenithW uygulaması ve indirme hattı normal çalışsa bile sonuç indirme hatası gibi görünebilir.

Mevcut entegrasyonda, üst kaynak bir sunucu IP'sini kısıtlarken uygulama tarafındaki hiçbir değişiklik kesintisiz YouTube erişimini garanti edemez. Bu, ZenithW'de YouTube desteğinin kaldırıldığı veya devre dışı bırakıldığı anlamına gelmez. Anlamlı bir üst kaynak ya da ağ seviyesi iyileştirmeyi izlerken YouTube indirmeleri etkin kalacaktır.

Paylaşılan AWS adresi üzerindeki önlenebilir baskıyı azaltmak için ZenithW aynı bağlantı için eşzamanlı metadata aramalarını birleştirir, yakın zamanlı başarılı analizleri kısa ömürlü bir önbellekten sunar, ziyaretçi ve sunucu geneli için ayrı YouTube istek bütçeleri uygular, yinelenen indirme başlangıçlarını engeller ve gerçek bir HTTP 429 yanıtından sonra ek üst kaynak denemelerini duraklatır. Bu denetimler gereksiz trafiği azaltır; YouTube'un kendi erişim kararlarını geçersiz kılamaz.

Bu sınırlamayı göz önünde bulundurun: ZenithW her zaman kesintisiz bir indirme hizmeti sağlayamayabilir ve YouTube erişilebilirliği her zaman garanti değildir. Videolar gizlilik ayarları, bölgesel kısıtlamalar, silinmiş içerik, oturum gereksinimleri veya platform tarafındaki hız sınırları nedeniyle de kullanılamayabilir. Bu koşullar ZenithW'nin denetimi dışındadır.

## Kullanıcı deneyimi ve gizlilik

ZenithW, kullanıcı hesabı olmadan canlı ilerleme, iptal, tarayıcı yerelinde geçmiş, duyarlı masaüstü ve mobil gezinti ile dil desteği sunar. Sunucu dosyayı yalnızca aktarım penceresi için hazırlar; hazırlanan indirme bağlantıları kısa ömürlüdür, isteği yapan istemciye bağlıdır ve kullanım ya da süre sonrasında kaldırılır.

Hiçbir özellik, üçüncü taraf platformun belirli bir biçimi sunacağını veya her isteği kabul edeceğini garanti etmez. Platform kısıtlamaları, silinmiş medya, özel gönderiler, bölgesel kurallar, oturum gereksinimleri ve hız sınırları bir işin tamamlanmasını yine de engelleyebilir. ZenithW bu sınırları, mevcut olmayan çıktıyı tamamlanmış gibi sunmak yerine bildirir.

## Mimari

| Katman | Çalışma zamanı |
|---|---|
| Ön yüz | Cloudflare Pages üzerinde yalın HTML, CSS ve JavaScript |
| Uç katman | Cloudflare DNS, proxy, TLS ve origin doğrulaması |
| Arka uç | Amazon EC2 (AWS) üzerinde Flask, Gunicorn, gevent ve Socket.IO |
| Medya | yt-dlp, FFmpeg, Deno/EJS ve isteğe bağlı PO Token sağlayıcısı |
| Servis yönetimi | Ubuntu, Nginx ve systemd |

Arka uç kasıtlı olarak **tek worker** ile çalışır. İş durumu, Socket.IO odaları ve hazırlanmış dosya sahipliği süreç yerelindedir; worker veya replica eklemek önce paylaşılan koordinasyon ve depolama gerektirir.

## 🐳 Docker Compose ile self-hosted kurulum

Eksiksiz kurulumun en hızlı yolu Docker Compose'tur. Ön yüz, reverse proxy, API, FFmpeg ve kalıcı indirme alanını birlikte çalıştırır. Varsayılan kurulum kasıtlı olarak **tek backend worker** kullanır; ZenithW'nin süreç yerelindeki iş, ilerleme, iptal ve hazırlanmış dosya modeline bu yapı uyar.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Arayüzü `http://localhost:8080` adresinden açın. Farklı bir port veya public alan adı kullanacaksanız `.env` içindeki `ZENITHW_PORT` ve `SELF_HOSTED_ORIGIN` değerlerini birlikte değiştirin; ardından `docker compose up -d` ile yeniden başlatın.

`zenithw-downloads` Docker volume'u geçici işlem dosyalarını taşır. ZenithW'nin normal süre sonu temizliği bu dosyaları yine kaldırır; volume, container güncellemesinin etkin aktarım penceresini gereksiz yere kesmemesi içindir.

### İsteğe bağlı özel cookie kullanımı

Bazı kaynaklar oturum açılmış bir tarayıcı oturumu isteyebilir. Bu ayar isteğe bağlıdır ve gizli kalmalıdır:

```bash
mkdir -p private
# Kendi Netscape biçimindeki dışa aktarımınızı private/cookies.txt içine koyun.
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

`private/cookies.txt` ve `compose.cookies.yml` asla commit edilmemeli veya paylaşılmamalıdır. ZenithW bu ayar olmadan da çalışır; bu yöntem platform kısıtlamaları için evrensel bir geçiş yolu değildir.

Public kullanımda Docker'ın önüne HTTPS ve tercih ettiğiniz firewall ya da reverse proxy katmanını koyun. Cloudflare resmi dağıtımda yararlıdır; self-hosted kurulum için **zorunlu değildir**.

## 🛠️ Yerel geliştirme

Gereksinimler: Python 3.10+, FFmpeg ve modern bir tarayıcı.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw/backend
python -m venv .venv
```

Ortamı etkinleştirdikten sonra şunu çalıştırın:

```bash
pip install --require-hashes -r requirements.lock
python app.py
```

API `http://localhost:5000` üzerinde başlar. `frontend/` klasörünü herhangi bir statik dosya sunucusuyla servis edin. Geliştirme CORS'unu yalnızca yerel çapraz-origin çalışma için etkinleştirin; production'da asla etkinleştirmeyin.

## 🔐 Production temelleri

Production, `SECRET_KEY` ve `ORIGIN_SECRET` için güçlü özel değerler gerektirir. Çalışma zamanı sınırları, güvenilen proxy davranışı, geçici dosya bütçeleri ve tanı erişimi; varsayılanları `backend/app.py` içinde belgelenen environment değişkenleriyle yapılandırılır.

- Gizli bilgileri ve dışa aktarılmış tarayıcı verilerini Git'in dışında tutun.
- EC2 origin'ini Cloudflare arkasında tutun ve paylaşılan origin header'ını doğrulayın.
- Ziyaretçi header'larına yalnızca Cloudflare-Nginx proxy zinciri üzerinden güvenin.
- Tanı verilerini özel, herkese açık canlılık yanıtlarını ise minimal tutun.
- İş durumu, Socket.IO yönlendirmesi ve hazırlanmış dosyalar güvenle paylaşılmadan tek worker sınırını aşmayın.

## Ana endpoint'ler

| Endpoint | Amaç |
|---|---|
| `POST /info` | Metadata ve biçimleri çözümle |
| `POST /download` | İndirme veya çıkarma işini başlat |
| `POST /convert` | Yüklenen dosyayı dönüştür veya yeniden paketle |
| `POST /cancel` | Etkin işi iptal et |
| `GET /files/<token>` | Kısa ömürlü hazırlanmış dosyayı aktar |
| `GET /health` | Minimal canlılık yanıtı |
| `GET /ready` | Bağımlılık ve kapasite hazır oluşu |

## Güvenlik ve sorumlu kullanım

ZenithW uzak hedefleri doğrular, özel ve link-local hedefleri engeller, yönlendirmeleri ve medya aracı protokollerini sınırlar, eşzamanlılığı ve disk kullanımını kısıtlar; hazırlanmış dosyaları kısa ömürlü token'larla sunar. Hiçbir internet hizmeti mutlak anonimlik veya kesintisiz erişim vaat edemez; proje bunun yerine toplanan veriyi azaltır ve geçici işlemleri sınırlar.

ZenithW'yi yalnızca sahip olduğunuz, indirme izniniz bulunan veya hukuken kullanabileceğiniz içerikler için kullanın. Kaynak platformların şartları ve telif kuralları kullanıcının sorumluluğundadır. ZenithW desteklenen platformlarla bağlantılı değildir.

Tekrarlanabilir hataları [GitHub Issues](https://github.com/boranseason/zenithw/issues) üzerinden bildirin. Herkese açık raporlara asla gizli bilgi, özel bağlantı veya kişisel veri eklemeyin.

## Lisans

- ZenithW: AGPL-3.0-only
- Üçüncü taraf bağımlılıklar: kendi lisansları
- Ayrıntılar: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
