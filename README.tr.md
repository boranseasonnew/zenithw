# ZenithW

> Kullanma izniniz olan içerikleri indirmek, dönüştürmek ve remux yapmak için odaklı, reklamsız bir medya çalışma alanı. ✨

[Canlı uygulama](https://zenithw.space) · [Durum](https://zenithw.space/status) · [Güncellemeler](https://zenithw.space/updates) · [English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Güncel sürüm: **v14.4**

![ZenithW web arayüzü](docs/assets/zenithw-preview.png)

## ✨ Neden ZenithW?

ZenithW medya işlemlerini bilinçli olarak basit tutar: desteklenen bir bağlantıyı yapıştırın, kaynağın gerçekten sunduğu seçenekleri inceleyin, istediğiniz çıktıyı seçin ve hazırlanan dosyayı indirin.

İş akışında hesap sistemi, tarayıcı eklentisi, ücretli duvar, abonelik veya reklam katmanı yoktur.

Sadece pratik medya araçları, anlaşılır kontroller ve dürüst sınırlar.

- İndirme, ses ayıklama, dönüştürme ve remux işlemleri için **tek ve odaklı bir çalışma alanı**.
- **Gizlilik odaklı varsayılanlar:** geçmiş tarayıcıda kalır ve hazırlanan dosyalar otomatik olarak süresi dolunca silinir.
- **Dürüst kontroller:** seçilen profil bir tercihtir; her kaynağın her formatı sunduğu anlamına gelmez.
- **Reklam katmanı yok:** ZenithW indirme sürecine reklam eklemez.
- **Self-host kullanıma hazır:** Docker Compose ile tüm arayüz ve API kendi bilgisayarınızda veya sunucunuzda çalıştırılabilir. 🐳

## Ne yapar?

ZenithW, desteklenen yt-dlp uyumlu medya kaynaklarıyla çalışır.

Genel servis şu anda şu tür platformları destekler:

- TikTok
- Instagram
- X
- Reddit
- ve aktif yt-dlp entegrasyonunun desteklediği diğer uyumlu kaynaklar

ZenithW şunları yapabilir:

- Video ve ses indirebilir.
- Medyadan ses ayıklayabilir.
- Desteklenen yerlerde sessiz video indirebilir.
- Oynatma listelerini ve küçük bağlantı gruplarını işleyebilir.
- FFmpeg ile dosya dönüştürebilir.
- Uyumlu ses ve video akışlarını gereksiz yeniden kodlama yapmadan remux edebilir.
- Altyazı indirebilir.
- Desteklenen metadata bilgilerini koruyabilir.
- Küçük resimleri indirip gömebilir.
- Uygun olduğunda SponsorBlock kullanabilir.
- Aktif işleri iptal edebilir.
- Canlı işlem ilerlemesini gösterebilir.
- Sunucu tarafı hesap gerektirmek yerine indirme geçmişini tarayıcıda yerel olarak tutabilir.

> **YouTube bildirimi:** YouTube indirmeleri, barındırılan ve veri merkezi tabanlı web isteklerini etkileyen üst kaynak erişim kısıtlamaları nedeniyle şu anda genel ZenithW web sitesinde devre dışıdır. Ayrıntılar için aşağıdaki **YouTube erişilebilirliği** bölümüne bakın.

ZenithW kısa ve incelenebilir bir iş akışı üzerine kuruludur:

1. Desteklenen bir bağlantıyı yapıştırın.
2. Medya bilgilerini ve kullanılabilir formatları inceleyin.
3. Çıktıyı yapılandırın.
4. İşlemi başlatın.
5. Hazırlanan dosyayı doğrudan tarayıcıdan indirin.

Web sürümü için hesap, tarayıcı eklentisi veya masaüstü uygulaması gerekmez.

## İndirme kontrolleri

Ana indirme arayüzü şunları destekler:

- Otomatik format seçimi
- Video indirmeleri
- Ses ayıklama
- Sessiz video
- Oynatma listesi işleme
- Küçük bağlantı grupları
- Çözünürlük seçimi
- Kapsayıcı seçimi
- Codec tercihleri
- Ses bitrate seçimi
- Altyazı seçenekleri
- Metadata gömme
- Küçük resim işlemleri
- Dosya adı şablonları
- SponsorBlock kontrolleri

Kullanılabilir seçenekler, kaynak platformun gerçekten sunduğu verilere bağlıdır.

ZenithW, orijinal kaynakta bulunmayan formatları varmış gibi göstermez.

### İndirme profilleri

ZenithW üç pratik profil içerir.

#### Minimal

Daha küçük dosyalar, daha hızlı aktarım, geniş uyumluluk ve sınırlı depolama için tasarlanmıştır.

#### Standard

Yaygın olarak uyumlu video ve ses ayarlarıyla dengeli bir deneyim için tasarlanmıştır.

Tipik hedef:

- 1080p
- H.264
- MP4
- 192 kbps ses

Gerçek çıktı, mevcut kaynak akışlarına bağlıdır.

#### Quality

Mümkün olduğunda daha yüksek kaliteli akışları tercih eder.

Olası tercihler:

- Yüksek çözünürlük
- AV1
- WebM
- Opus ses

Seçilen profil yine bir tercihtir, garanti değildir.

Hangi akışların gerçekten kullanılabilir olduğuna üçüncü taraf platformlar karar verir.

## Medya araçları

ZenithW, bağlantı tabanlı indirmelerin yanında yerel dosya medya araçları da içerir.

### Convert

Convert, yerel bir dosyayı yükler ve seçilen hedef formatla FFmpeg üzerinden işler.

Şu durumlarda kullanışlıdır:

- farklı bir kapsayıcı gerektiğinde
- farklı bir ses formatı gerektiğinde
- cihaz uyumluluğunu artırmak gerektiğinde
- daha basit bir çıktı formatı gerektiğinde

### Remux

Remux, uyumlu ses ve video akışlarını yeniden kodlama yapmadan başka bir kapsayıcıya kopyalar.

Bu yöntem tam dönüştürmeden belirgin şekilde daha hızlı olabilir ve gereksiz kalite kaybını önler.

Remux yalnızca kaynak akışlar hedef kapsayıcıyla uyumluysa çalışır.

Convert ve Remux:

- işlem ilerlemesini gösterir
- geçici hazırlanmış dosyalar döndürür
- kalıcı bulut depolama olarak çalışmaz
- sunucu tarafı boyut ve işlem sınırları altında çalışır

## Cihaz üzerinde işleme · Beta

Convert ve Remux deneysel cihaz içi işleme modları içerir.

Kullanılabilir modlar:

- **Server**
- **Prefer this device**
- **Only this device**

Cihaz içi beta, uyumlu medya akışlarını yeniden kodlama yapmadan kopyalayabilir ve uygun ses akışlarını yerel olarak ayıklayabilir.

### Server

İşlem ZenithW backend üzerinde yapılır.

Varsayılan seçenek budur.

### Prefer this device

ZenithW önce işlemi mevcut cihazda gerçekleştirmeyi dener.

Yerel işlem başarısız olursa dosyanın sunucuya yüklenmesi için kullanıcıdan açık onay istenir.

### Only this device

Dosya hiçbir zaman ZenithW sunucusuna yüklenmez.

Cihaz istenen işi gerçekleştiremiyorsa işlem yerel olarak başarısız olur.

### Güncel cihaz içi sınırlar

- Masaüstü: **64 MiB**'a kadar
- Mobil / düşük bellekli cihazlar: **24 MiB**'a kadar
- Maksimum medya süresi: **30 dakika**

Mevcut beta şunları korumaz:

- altyazılar
- bölümler
- ekler

Bağlantı tabanlı indirmeler hâlâ backend kullanır.

Bkz.:

[Yerel medya işleme belgeleri](docs/LOCAL_MEDIA.md)

## YouTube erişilebilirliği

YouTube indirmeleri şu anda **genel ZenithW servisinde devre dışıdır**.

Bunun nedeni normal bir ZenithW uygulama hatası değildir.

YouTube, barındırılan web altyapısından, bulut sunucularından ve veri merkezi IP aralıklarından gelen istekleri etkileyebilen erişim kısıtlamaları uygulayabilmektedir.

ZenithW'nin genel backend'i barındırılan altyapıda çalıştığı için YouTube istekleri normal bir ev bağlantısı veya tarayıcıdan gelen isteklerden farklı değerlendirilebilir.

Bu nedenle aşağıdakiler doğru şekilde çalışıyor olsa bile YouTube isteği reddedilebilir veya sınırlandırılabilir:

- ZenithW uygulaması
- yt-dlp
- FFmpeg
- backend sağlığı
- medya işleme hattı

### Denenen yaklaşımlar

YouTube erişimini güvenilir tutabilmek için birden fazla uygulama tarafı yaklaşımı denendi.

Bunlara şunlar dahildir:

- yenilenmiş oturum açılmış cookie'ler
- otomatik cookie yenileme
- cookie yenileme servisleri
- PO Token entegrasyonu
- PO Token üretim servisleri
- yt-dlp güncellemeleri
- extractor güncellemeleri
- oturum değişiklikleri
- istek ayarları

Bu yöntemlerin bazıları belirli istekleri geçici olarak iyileştirebildi.

Ancak hiçbiri genel ZenithW servisi için yeterince güvenilir erişim sağlamadı.

### Cookie ve PO Token neden yeterli olmadı?

Cookie'ler ve PO Token'lar bazı YouTube erişim koşullarında yardımcı olabilir, ancak bir isteğin kabul edilip edilmemesini etkileyen tüm faktörleri kontrol etmez.

YouTube ayrıca şu faktörleri değerlendirebilir:

- veri merkezi veya bulut IP itibarı
- isteğin kaynağı
- hesap durumu
- oturum durumu
- kimlik doğrulama gereksinimleri
- platform tarafı hız sınırları
- kötüye kullanım önleme sistemleri
- bölgesel kısıtlamalar
- hızla değişen platform davranışı

Bu yüzden geçerli bir cookie veya PO Token, genel bulut backend'inden başarılı erişimi **garanti etmez**.

ZenithW bu mekanizmaları evrensel bir bypass yöntemi gibi sunmaz.

### Genel YouTube desteği neden kapatıldı?

Aynı barındırılan altyapı üzerinden tekrar tekrar istek göndermek güvenilir bir kullanıcı deneyimi sağlamadan gereksiz hata üretirdi.

Ayrıca temel platform tarafı kısıtlamayı çözmeden paylaşılan backend IP adresine ek yük bindirebilirdi.

Bu nedenle genel ZenithW web sitesindeki YouTube erişimi bilinçli olarak devre dışı bırakıldı.

### YouTube kalıcı olarak kaldırıldı mı?

Hayır.

YouTube desteği **ZenithW projesinden kalıcı olarak kaldırılmadı**.

Güvenilir ve sürdürülebilir bir yöntem ortaya çıkarsa genel servise geri dönebilir.

Mevcut kısıtlama özellikle barındırılan genel ZenithW dağıtımını etkiler.

### Self-host kurulumları

Self-host ZenithW kurulumları kendi:

- IP adresini
- ağ bağlantısını
- yt-dlp kurulumunu
- kimlik doğrulama durumunu
- cookie'lerini
- isteğe bağlı token yapılandırmasını

kullanır.

Bu nedenle self-host kurulumdaki YouTube davranışı genel ZenithW servisinden farklı olabilir.

Self-host kullanımı da YouTube erişimini garanti etmez.

Erişilebilirlik yine YouTube'un kendi kurallarına ve kurulumun ağ ortamına bağlıdır.

## Platform erişilebilirliği

Herhangi bir üçüncü taraf site desteği best-effort olarak değerlendirilmelidir.

Bir işlem ZenithW'nin kontrolü dışındaki şu nedenlerle başarısız olabilir:

- silinmiş medya
- gizli medya
- yaş kısıtlamaları
- giriş gereksinimleri
- bölgesel kısıtlamalar
- mevcut olmayan formatlar
- hız sınırları
- upstream API veya site değişiklikleri
- platform tarafı kötüye kullanım önleme sistemleri
- ağ kısıtlamaları
- kaldırılmış içerik

ZenithW bu durumları, mevcut olmayan bir çıktıyı başarıyla hazırlanmış gibi göstermeden raporlamaya çalışır.

## Kullanıcı deneyimi ve gizlilik

ZenithW arayüzü hafif tutar.

Uygulama şunları sağlar:

- canlı ilerleme
- iptal
- tarayıcıda yerel geçmiş
- duyarlı masaüstü navigasyonu
- duyarlı mobil navigasyon
- birden fazla arayüz dili
- zorunlu kullanıcı hesabı olmaması

Hazırlanan dosyalar yalnızca sınırlı bir aktarım penceresi boyunca bulunur.

İndirme bağlantıları:

- geçicidir
- uygun olduğunda isteği yapan istemciye bağlıdır
- kullanımdan veya sürenin dolmasından sonra otomatik olarak kaldırılır

ZenithW kalıcı çevrimiçi medya depolama hizmeti olarak tasarlanmamıştır.

### Tarayıcıda yerel geçmiş

İndirme geçmişi bir ZenithW hesabında değil, tarayıcıda saklanır.

Bu sayede kullanıcı kaydı gerektirmeden temel kullanım kolaylığı sağlanır.

Tarayıcı verilerini temizlemek bu yerel geçmişi de silebilir.

## Mimari

| Katman | Çalışma ortamı |
|---|---|
| Frontend | Cloudflare Pages üzerinde Vanilla HTML, CSS ve JavaScript |
| Edge | Cloudflare DNS, proxy, TLS ve origin doğrulaması |
| Backend | Amazon EC2 üzerinde Flask, Gunicorn, gevent ve Socket.IO |
| Medya | yt-dlp, FFmpeg, Deno/EJS ve isteğe bağlı token entegrasyonları |
| Servis yönetimi | Ubuntu, Nginx ve systemd |

Backend bilinçli olarak **tek worker** ile çalışır.

Mevcut iş durumu, Socket.IO odaları ve hazırlanmış dosya sahipliği süreç içi durumdadır.

Birden fazla worker veya replika kullanmak için önce paylaşılan koordinasyon ve depolama gerekir.

## 🐳 Docker Compose ile self-host

Tam bir ZenithW örneğini çalıştırmanın en hızlı yolu Docker Compose kullanmaktır.

Şunları birlikte çalıştırır:

- frontend
- reverse proxy
- API
- FFmpeg
- indirme çalışma alanı
- kalıcı geçici depolama

Varsayılan kurulum bilinçli olarak **tek backend worker** kullanır.

Bu, ZenithW'nin mevcut iş, ilerleme, iptal ve hazırlanmış dosya modeliyle uyumludur.

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Ardından açın:

```text
http://localhost:8080
```

Farklı bir port veya genel alan adı kullanıyorsanız `.env` içindeki şu iki değeri birlikte güncelleyin:

- `ZENITHW_PORT`
- `SELF_HOSTED_ORIGIN`

Sonra yeniden başlatın:

```bash
docker compose up -d
```

## Docker depolaması

`zenithw-downloads` Docker volume geçici işlem dosyalarını saklar.

Bu dosyalar yine ZenithW'nin normal süre dolumu temizleme sistemi tarafından silinir.

Kalıcı volume temel olarak container güncellemelerinin aktif bir aktarım penceresini hemen kesmemesi için vardır.

Kalıcı medya depolaması olarak kullanılmamalıdır.

## İsteğe bağlı özel cookie'ler

Bazı desteklenen kaynaklar giriş yapılmış bir tarayıcı oturumu gerektirebilir.

Self-host kuruluma isteğe bağlı olarak özel bir cookie dosyası sağlanabilir.

```bash
mkdir -p private
```

Kendi Netscape formatındaki cookie dışa aktarımınızı şu konuma yerleştirin:

```text
private/cookies.txt
```

Ardından:

```bash
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

Şu dosyalar:

```text
private/cookies.txt
compose.cookies.yml
```

asla Git'e commit edilmemeli veya herkese açık şekilde paylaşılmamalıdır.

Cookie kullanımı isteğe bağlıdır ve özel tutulmalıdır.

Ayrıca üçüncü taraf platform kısıtlamaları için **evrensel bir bypass değildir**.

## Genel barındırma

Genel barındırma için Docker dağıtımının önüne HTTPS ve uygun bir firewall veya reverse proxy yerleştirin.

Cloudflare resmi ZenithW altyapısında kullanılır, ancak self-host için zorunlu değildir.

Self-host dağıtımı başka güvenilir reverse proxy veya ağ yapılandırmaları kullanabilir.

## 🛠️ Yerel geliştirme

### Gereksinimler

- Python 3.10+
- FFmpeg
- Modern bir web tarayıcısı

Depoyu klonlayın:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw/backend
```

Sanal ortam oluşturun:

```bash
python -m venv .venv
```

İşletim sisteminize uygun komutla ortamı etkinleştirin.

Ardından kilitli bağımlılıkları kurun:

```bash
pip install --require-hashes -r requirements.lock
```

Backend'i başlatın:

```bash
python app.py
```

API şu adreste başlar:

```text
http://localhost:5000
```

`frontend/` klasörünü herhangi bir statik dosya sunucusuyla servis edin.

Development CORS yalnızca yerel cross-origin geliştirme için etkinleştirilmelidir.

Production ortamında development CORS ayarlarını gereksiz yere açık bırakmayın.

## 🔐 Production temel gereksinimleri

Production dağıtımları şu değerler için güçlü ve özel anahtarlar gerektirir:

```text
SECRET_KEY
ORIGIN_SECRET
```

Çalışma sınırları, geçici dosya bütçeleri, güvenilir proxy davranışı, eşzamanlılık kontrolleri ve diagnostics erişimi backend'de belgelenen environment değişkenleriyle yapılandırılır.

Önemli production kuralları:

- Gizli bilgileri Git dışında tutun.
- Dışa aktarılmış cookie'leri Git dışında tutun.
- Özel tarayıcı verilerini özel tutun.
- EC2 origin'i yapılandırılmış proxy zincirinin arkasında koruyun.
- Yapılandırıldığı yerde paylaşılan origin secret'ı doğrulayın.
- Ziyaretçi header'larına yalnızca güvenilir proxy altyapısından geliyorsa güvenin.
- Diagnostics'i özel tutun.
- Genel health yanıtlarını minimumda tutun.
- Paylaşılan iş durumu ve dosya koordinasyonu uygulanmadan backend worker sayısını artırmayın.

## Ana endpoint'ler

| Endpoint | Amaç |
|---|---|
| `POST /info` | Metadata ve mevcut formatları çözümle |
| `POST /download` | İndirme veya extraction işi başlat |
| `POST /convert` | Yüklenen dosyayı dönüştür veya remux et |
| `POST /cancel` | Aktif işi iptal et |
| `GET /files/<token>` | Geçici hazırlanmış dosyayı aktar |
| `GET /health` | Minimum liveness yanıtı |
| `GET /ready` | Bağımlılık ve kapasite readiness bilgisi |

## Güvenlik

ZenithW, rastgele internet girdilerini otomatik olarak güvenilir kabul etmek yerine uzaktaki medya işlemlerini sınırlar.

Uygulama şu tür korumalar içerir:

- uzak hedef doğrulaması
- private hedeflerin engellenmesi
- link-local hedeflerin engellenmesi
- redirect sınırlamaları
- medya protokolü sınırlamaları
- eşzamanlılık sınırları
- işlem sınırları
- disk kullanım sınırları
- geçici dosya süresi
- kısa ömürlü dosya token'ları
- sınırlı hazırlanmış dosya teslimi

İnternete açık hiçbir servis mutlak anonimlik, sınırsız erişilebilirlik veya tüm üçüncü taraf platform değişikliklerine karşı tam koruma garanti edemez.

ZenithW bunun yerine tutulan veriyi en aza indirmeye ve geçici işlemlerin yaşam süresi ile kapsamını sınırlamaya çalışır.

## Sorumlu kullanım

ZenithW'yi yalnızca şu içerikler için kullanın:

- size ait olan
- indirme izniniz bulunan
- yasal olarak kullanmanıza izin verilen

Üçüncü taraf platform şartları ve geçerli telif hakkı kuralları kullanıcının sorumluluğundadır.

ZenithW; YouTube, TikTok, Instagram, X, Reddit veya diğer desteklenen platformlarla bağlantılı değildir.

Bir platformun desteklenmesi ortaklık, onay veya resmi entegrasyon anlamına gelmez.

## Hata bildirimleri

Tekrarlanabilir hatalar şu adresten bildirilebilir:

[GitHub Issues](https://github.com/boranseasonnew/zenithw/issues)

Bir sorun bildirirken:

- problemi açık şekilde anlatın
- mümkünse tekrar üretme adımlarını ekleyin
- ilgili ZenithW sürümünü belirtin
- yararlı hata bilgilerini ekleyin
- özel veya kimlik belirleyici bilgileri kaldırın

Herkese açık GitHub issue'larına asla şunları eklemeyin:

- cookie'ler
- parolalar
- özel URL'ler
- authentication token'ları
- API secret'ları
- kişisel veriler

## Lisans

- **ZenithW:** AGPL-3.0-only
- **Üçüncü taraf bağımlılıklar:** kendi ilgili lisansları
- Ek bilgiler: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
