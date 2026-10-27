# Zenith Type: ranked, rematch ve rozet kontrolü

Bu kayıt v16.1 tesliminden sonraki değişiklikleri kapsar. Canlı migration, Edge Function deploy'u ve frontend push'u henüz yapılmadı.

## Davranış

- Aynı süre/dil/zorluk kuyruğunda en yakın Elo seçilir. Her iki oyuncunun beklemeyle genişleyen aralığı da uygunsa eşleşme oluşur: ±100 başlangıç, her 15 saniyede +100, en fazla ±1.000. Eski heartbeat ve ayar değişikliği beklemeyi sıfırlar.
- Elo 0–50.000 arasındadır; mevcut puanlar yeniden ölçeklenmez. Rozetler 5.000 gümüş, 10.000 altın, 20.000 gri/mor ametist, 50.000 turuncu/mor zirvedir. Başlangıç 1.000 ve K=24 korunur.
- Biten düelloda iki tarafın onayıyla aynı ayarlarda yeni oda açılır. Hazırlık yeniden gerekir. Özel oda yardımı yeni odaya otomatik aktarılmaz. Aynı kaynaktan ikinci rematch odası açılamaz.
- Dereceli rematch puan verebilir; aynı ikilinin son 24 saatte ilk üç puanlı maç sınırı korunur. Tavan/tabanda gerçek puan değişimi gösterilir.
- Geçmiş yalnızca giriş yapan oyuncunun tamamlanmış maçlarını ve ilgili ikilinin galibiyet/mağlubiyet/beraberlik sayılarını döndürür. Başka kullanıcı kimliği göndererek geçmiş sahipliği değiştirilemez. Yanıtta ham vuruş veya yardım alanları yoktur.
- İki kişisel rozet yalnızca sunucu tarafından verilen boolean profil alanlarından gelir. Değiştirilemeyen eski giriş kaydına bağlı sahip hesabına atanır; ad, hesap etiketi, istemci metadata'sı veya admin alanı rozet üretemez. Geliştirici açıklaması hover, klavye odağı ve mobil dokunmayla açılır.
- Mevcut özel oda admin yardımı ve admin rolü değiştirilmez.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Tam üretim build'i | Başarılı |
| Node testleri | 82 başarılı, 0 başarısız/atlanmış |
| Python backend unittest | 129 başarılı |
| Yeni JS sözdizimi ve mevcut lint | Başarılı |
| Cache / CSP / release content | Başarılı |
| Yerel PostgreSQL/PGlite | Üç temel şema, yeni migration, rozet tekilliği ve ACL kontrolleri başarılı |
| SQL entegrasyon senaryoları | Elo aralığı, en yakın rakip, heartbeat sıfırlama, aktif oda tekrar koruması, 50.000 sınırı, gerçek delta, settle idempotency, karşılıklı rematch, outsider reddi, puan tekrar sınırı, geçmiş gizliliği ve 20 satırlık sayfalama başarılı |
| Yerel tarayıcı | Masaüstü ve 390×844 mobil; rozetler, geliştirici açıklaması, ikili geçmiş, rematch bekleme ve kabul akışı başarılı; yatay taşma ve JS console hatası görülmedi |

Tarayıcıdaki Supabase istekleri yerel fixture tarafından yakalandı. PostgreSQL testleri yalnızca yerel bellekteki sentetik hesaplar ve geçici tablo kopyalarıyla çalıştırıldı. Canlı hesaba, skora veya role yazılmadı. Bu doğrulama canlı iki oturumlu uçtan uca test yerine geçmez.

İlk Node test denemesi sandbox alt süreç erişiminde bekledi; kendi test süreçleri sonlandırılıp aynı testler izinli yerel ortamda başarılı çalıştırıldı. İlk Python denemesinde yanlış sanal ortam ve sandbox geçici dosya izinleri nedeniyle ortam hataları oluştu; doğru Python ve `PYTHONPATH=backend` ile 129 test geçti.

## Yayın ve geri alma

1. Açık canlı işlem izni alındıktan sonra mevcut şema/migration durumu yeniden salt okunur doğrulanır.
2. `supabase/migrations/20261027172907_typing_ranked_matchmaking_and_badges.sql` uygulanır. Üç eski şema dosyası yeniden çalıştırılmaz.
3. `typing-api` dört güncel kaynak dosyasıyla deploy edilir; mevcut uygulama içi oturum doğrulaması korunur.
4. Profil alanları, RPC yetkileri ve mevcut admin rolü salt okunur kontrol edilir; ardından frontend main'e normal push edilir ve yayın sonucu izlenir.

Frontend commit'i `git revert` ile geri alınabilir. Yeni kolonlar ve geçmiş verileri geri almada silinmez. Puanlar 10.000'i geçtikten sonra eski 10.000 tavanlı settle fonksiyonunu geri yüklemek puan kaybı yaratabilir; backend için veri koruyan ileri düzeltme gerekir. Yayın sırasında backend ile frontend ayrı ayrı kontrol edilir.

Canlı SQL preflight, rollback içerse bile üretim DDL/veri/fonksiyon değişikliği yaptığı ve açık canlı işlem izni bulunmadığı için otomatik onay incelemesince reddedildi. Canlıda uygulanmadı ve başka bir yolla yeniden denenmedi. Migration ve API deploy'u açık kullanıcı onayı bekler; backend hazır olmadan yeni frontend yayımlanmaz.
