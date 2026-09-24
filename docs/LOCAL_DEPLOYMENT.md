# GitHub olmadan geçici production dağıtımı

Bu repo için ön yüz `frontend/` ve `functions/` ile Cloudflare Pages'te;
Flask/Socket.IO API ise mevcut AWS EC2 sunucusunda Nginx ve
`zenithw-backend.service` ile çalışacak şekilde tanımlıdır. Desktop installer
yapılandırması bu kaynak kopyasında yoktur.

## 24 Eylül 2026 production envanteri (salt okunur doğrulama)

| Hizmet | Mevcut hedef | Gözlenen durum |
| --- | --- | --- |
| Cloudflare Pages | Hesap `90451b70620888762baaeb767e692a8c`, proje `zenithw`, production dalı `main` | `zenithw.space` ve `zenithw.pages.dev`; GitHub `boranseason/zenithw` bağlantısı ve otomatik deployment açık; son production kaynak commit'i `ccbcee4a2c6903e7ce49ff09f1326de70d0d735e` |
| AWS EC2 | Hesap `272115513551`, bölge `eu-north-1`, instance `i-0bf2df7600efaa37d` | `ZenithW backend`, IP `13.61.113.104`; `zenithw-backend.service` çalışıyor, `/home/ubuntu/zenithw` temiz `main` dalında `eddca41d3355c5c2f003d1fc05d997e9e692d107` |

Cloudflare build komutu `exit 0`, çıktı dizini `frontend`, proje kök dizini repo
köküdür. Yerel kaynak, EC2'deki backend dosyasıyla aynı değildir. Cloudflare
commit'i EC2 Git deposunda yoktur. Bu sürüm farkları dağıtım sırasında
karşılaştırılmalı; yalnızca commit hash'ine bakarak içerik eşitliği varsayılmamalı.
Canlı `app.html` ile yerel dosya karşılaştırmasında mobil APK bağlantısı/metni
farklıdır; canlı yanıta Cloudflare'ın eklediği challenge betiği de görünür.
EC2'de takip edilen 23 backend dosyasının 15'inin SHA-256 özeti yerelden
farklıdır; `app.py` ve requirements dosyaları da bu gruptadır. Bu farklar
incelenmeden tüm `backend/` ağacı sunucunun üzerine kopyalanmaz.
Yerel bilgisayardan port 22 bağlantısı zaman aşımına uğradı; tarayıcıdaki EC2
Instance Connect terminali çalışıyor. Yerel AWS CLI ve Wrangler kurulu değil;
`npx --yes wrangler whoami` denemesi npm `ECONNRESET` ile sonuçlandı. Tarayıcı
oturumu bu CLI'ları kendiliğinden yetkilendirmez. Aynı tarihte canlı
`https://zenithw.space/` HTTP 200, `https://api.zenithw.space/health` HTTP 204
yanıtı verdi. Bunlar deployment sonrası doğrulama için başlangıç durumudur.
Wrangler 4.138.0 geçici olarak çalıştırılabildi, ancak `whoami` sonucu
yetkilendirilmemiş oturum gösterdi. EC2 güvenlik grubu `sg-0d4d60188a7cd7201`
SSH/TCP 22 için yalnızca `13.48.4.200/30` aralığına izin veriyor. CloudShell'den
de SSH erişimi engelli. SSM ajanı etkin olsa bile instance'da IAM profili yok,
SSM managed instance listesinde görünmüyor; mevcut EC2 Instance Connect
Endpoint da bulunmadı. Bu nedenle backend aktarımı için, onayla sınırlı ve
işlem sonunda geri alınacak dar bir SSH kuralı veya eşdeğer onaylı bir erişim
yolu gerekli. Güvenlik grubu kuralı otomatik olarak genişletilmez.

## Ortak kapı

1. `git status --short` boş olmalı; dağıtılacak commit `git rev-parse HEAD` ile kaydedilmeli.
2. `corepack pnpm build:media`, `corepack pnpm test:media`,
   `python -m unittest discover -s tests -q` (`backend/` içinde) ve
   `python scripts/update_csp.py --check` geçmeli.
3. Resmi Wrangler ve AWS CLI kurulu, hesap oturumları hazır olmalı. Credential
   değerleri Git'e, komut satırına veya bu belgeye yazılmaz.
4. `scripts/deploy-preflight.ps1` mevcut Pages projesini/production dalını,
   `aws sts get-caller-identity` sonucunu ve mevcut EC2 instance ID'sini
   salt okunur olarak karşılaştırır. Yukarıdaki doğrulanmış değerler parametre
   olarak verilir. Git geçmişi ve GitHub entegrasyonu değiştirilmez.

## Cloudflare Pages

`npx wrangler pages project list --json` çıktısında **mevcut** proje,
hesap ve production dalı doğrulandıktan ve production değişikliği ayrıca
onaylandıktan sonra, repo kökünden şu komut çalıştırılır:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '90451b70620888762baaeb767e692a8c'
npx.cmd wrangler pages deploy frontend --project-name zenithw --branch main --commit-hash (git rev-parse HEAD)
npx.cmd wrangler pages deployment list --project-name zenithw --environment production
```

Komut repo kökünden çalışmalıdır; Wrangler kökteki `functions/` klasörünü de
Pages Functions olarak yükler. Proje oluşturma, Git bağlantısını kesme, domain
veya secret değiştirme komutları kullanılmaz. Sonrasında `https://zenithw.space/`,
`/maintenance-status` ve statik sayfalar salt okunur isteklerle kontrol edilir.

## AWS EC2

`aws sts get-caller-identity` ve `aws ec2 describe-instances --instance-ids
i-0bf2df7600efaa37d --region eu-north-1` ile hesap, instance, adres ve
etiketler yeniden doğrulanır.
`ssh` ile önce salt okunur olarak `systemctl cat zenithw-backend`,
`readlink -f /home/ubuntu/zenithw/backend/app.py` ve `systemctl status`
kontrol edilir. EC2 için AWS'nin belgelediği SSH/SCP yöntemi kullanılabilir;
bu sunucuda CodeDeploy veya SSM dağıtım kurulumu olduğuna dair kanıt yoktur.
SSH erişimi sağlanmadan veya aynı güvenlikte doğrulanmış başka bir aktarım
yolu kurulmadan backend dağıtımı başlatılmaz. EC2 Instance Connect tarayıcı
terminali tek başına yerel dosyaları sunucuya taşımaz.

Onaydan sonra yalnızca commitlenmiş backend dosyaları `git archive HEAD backend`
ile arşivlenir ve SCP ile mevcut instance'a geçici dizine kopyalanır. Sunucuda
`/etc/zenithw.env`, `backend/cookies.txt`, `backend/downloads/`, sanal ortam ve
veritabanı korunur. Güncellenecek dosyaların yedeği aynı sunucuda alınır;
arşiv önce ayrı dizinde açılıp çalışan dosyalarla karşılaştırılır. Bağımlılık
değişmişse mevcut servise dokunmadan ayrıca incelenir. İnceleme ve onaydan
sonra yalnızca değişen uygulama dosyaları yerleştirilir, mevcut
`zenithw-backend.service` yeniden başlatılır; `systemctl status`, günlükler,
`/health`, `/ready` ve `/status` doğrulanır. Hata halinde yedeklenen dosyalar
geri konup aynı servis yeniden başlatılır. Komutların tam yolu ve dosya listesi,
gerçek instance incelendikten sonra kesinleştirilir.

## GitHub geri geldiğinde

Mevcut GitHub remote URL'si doğrulanıp `origin` olarak eklenir. Bu klasörde
önceden `.git` bulunmadığı için oluşturulan local geçmişin kökü eski GitHub
geçmişinden bağımsızdır. Önce `git fetch origin` ve iki geçmiş karşılaştırılır;
gerekirse `--allow-unrelated-histories` ile çatışmalar çözülerek **iki geçmişi
de koruyan** bir merge commit oluşturulur. Ardından normal `git push origin main`
ile mevcut CI/CD akışı yeniden kullanılır. Force push yapılmaz.

Resmi kaynaklar: [Cloudflare Pages Wrangler dağıtımı](https://developers.cloudflare.com/workers/wrangler/commands/pages/),
[Git bağlantısı ile manuel dağıtım](https://developers.cloudflare.com/pages/configuration/git-integration/),
[AWS EC2 SSH/SCP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html),
[AWS CLI EC2 instance sorgusu](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html).
