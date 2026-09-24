# GitHub olmadan geçici production dağıtımı

Bu repo için ön yüz `frontend/` ve `functions/` ile Cloudflare Pages'te;
Flask/Socket.IO API ise mevcut AWS EC2 sunucusunda Nginx ve
`zenithw-backend.service` ile çalışacak şekilde tanımlıdır. Repo içinde
Cloudflare Pages proje adı, hesap ID'si, AWS hesap/bölge/instance ID'si veya
Desktop installer yapılandırması yoktur. Bunlar doğrulanmadan production
dağıtımı başlatılmaz.

## Ortak kapı

1. `git status --short` boş olmalı; dağıtılacak commit `git rev-parse HEAD` ile kaydedilmeli.
2. `corepack pnpm build:media`, `corepack pnpm test:media`,
   `python -m unittest discover -s tests -q` (`backend/` içinde) ve
   `python scripts/update_csp.py --check` geçmeli.
3. Resmi Wrangler ve AWS CLI kurulu, hesap oturumları hazır olmalı. Credential
   değerleri Git'e, komut satırına veya bu belgeye yazılmaz.
4. `scripts/deploy-preflight.ps1` mevcut Pages projesini/production dalını,
   `aws sts get-caller-identity` sonucunu ve mevcut EC2 instance ID'sini
   salt okunur olarak karşılaştırır. Gerçek değerler operatör tarafından
   parametre olarak verilir. Git geçmişi ve GitHub entegrasyonu değiştirilmez.

## Cloudflare Pages

`npx wrangler pages project list --json` çıktısında **mevcut** proje,
hesap ve production dalı doğrulandıktan ve production değişikliği ayrıca
onaylandıktan sonra, repo kökünden şu komut çalıştırılır:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '<doğrulanan-hesap-id>'
npx.cmd wrangler pages deploy frontend --project-name '<doğrulanan-proje>' --branch '<doğrulanan-production-dalı>'
npx.cmd wrangler pages deployment list --project-name '<doğrulanan-proje>' --environment production
```

Komut repo kökünden çalışmalıdır; Wrangler kökteki `functions/` klasörünü de
Pages Functions olarak yükler. Proje oluşturma, Git bağlantısını kesme, domain
veya secret değiştirme komutları kullanılmaz. Sonrasında `https://zenithw.space/`,
`/maintenance-status` ve statik sayfalar salt okunur isteklerle kontrol edilir.

## AWS EC2

`aws sts get-caller-identity` ve `aws ec2 describe-instances --instance-ids
<ID> --region <bölge>` ile hesap, instance, adres ve etiketler doğrulanır.
`ssh` ile önce salt okunur olarak `systemctl cat zenithw-backend`,
`readlink -f /home/ubuntu/zenithw/backend/app.py` ve `systemctl status`
kontrol edilir. EC2 için AWS'nin belgelediği SSH/SCP yöntemi kullanılabilir;
bu sunucuda CodeDeploy veya SSM dağıtım kurulumu olduğuna dair kanıt yoktur.

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
