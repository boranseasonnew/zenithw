const $ = (selector) => document.querySelector(selector);
let kind = 'video';
let media = null;
let settings = {};
let tools = {};
const jobs = new Map();
let starting = false;
const QUEUE_STORAGE_KEY = 'zenithw.desktop.queue.v1';

function restoreQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return;
    for (const job of saved.slice(0, 80)) {
      if (!job || typeof job.id !== 'string' || typeof job.title !== 'string') continue;
      // A process cannot survive an application restart. Preserve its record
      // honestly instead of suggesting it is still running.
      jobs.set(job.id, { ...job, done: true, failed: !!job.failed, cancelled: !!job.cancelled, detail: job.detail || tr('failed') });
    }
  } catch {}
}
function persistQueue() {
  try {
    const saved = [...jobs.values()].filter((job) => job.done).slice(-80)
      .map(({ id, title, percent, detail, failed, cancelled, done }) => ({ id, title, percent, detail, failed, cancelled, done }));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(saved));
  } catch {}
}

const words = {
  navDownload:['İndir','Download','Скачать','Download'], navQueue:['İndirmeler','Downloads','Загрузки','Downloads'], navHistory:['Geçmiş','History','История','Verlauf'], navSettings:['Ayarlar','Settings','Настройки','Einstellungen'],
  openFolder:['Klasörü aç','Open folder','Открыть папку','Ordner öffnen'], urlPlaceholder:['video bağlantısını buraya bırak','paste a media link here','вставьте ссылку на медиа','Medienlink hier einfügen'], paste:['Yapıştır','Paste','Вставить','Einfügen'], continue:['Devam et','Continue','Продолжить','Weiter'], video:['Video','Video','Видео','Video'], audio:['Ses','Audio','Аудио','Audio'], quality:['Kalite','Quality','Качество','Qualität'], sourceOptions:['Kaynakta bulunan seçenekler','Options found at source','Варианты из источника','Verfügbare Quelloptionen'], startDownload:['İndirmeyi başlat','Start download','Начать загрузку','Download starten'], queueEmpty:['İndirme yok','No downloads','Нет загрузок','Keine Downloads'], historyEmpty:['Tamamlanan indirmeler burada görünür','Completed downloads appear here','Завершённые загрузки появятся здесь','Abgeschlossene Downloads erscheinen hier'], saved:['Kaydedildi','Saved','Сохранено','Gespeichert'],
  tabGeneral:['Genel','General','Общие','Allgemein'], tabEngine:['Motor','Engine','Движок','Engine'], tabDownload:['İndirme','Download','Загрузка','Download'], tabContent:['İçerik','Content','Содержимое','Inhalt'], tabNetwork:['Bağlantı','Network','Сеть','Netzwerk'], tabAuth:['Oturum','Session','Сессия','Sitzung'],
  language:['Dil','Language','Язык','Sprache'], languageHelp:['Uygulamanın arayüz dili','Application interface language','Язык интерфейса приложения','Sprache der Oberfläche'], reducedMotion:['Azaltılmış hareket','Reduced motion','Уменьшение анимации','Reduzierte Bewegung'], reducedMotionHelp:['Arayüz geçişlerini azaltır','Reduces interface transitions','Уменьшает анимацию интерфейса','Reduziert Oberflächenanimationen'],
  updateChannel:['yt-dlp sürüm kanalı','yt-dlp release channel','Канал обновлений yt-dlp','yt-dlp-Updatekanal'], updateChannelHelp:['Nightly daha hızlı site düzeltmeleri alır','Nightly receives site fixes sooner','Nightly быстрее получает исправления сайтов','Nightly erhält Website-Fixes früher'], autoUpdate:['Açılışta kontrol et','Check at startup','Проверять при запуске','Beim Start prüfen'], autoUpdateHelp:['Seçili kanaldan otomatik günceller','Updates automatically from the selected channel','Автообновление из выбранного канала','Aktualisiert automatisch aus dem gewählten Kanal'], updateNow:['Şimdi güncelle','Update now','Обновить сейчас','Jetzt aktualisieren'], updateNowHelp:['İndirme yokken güvenle çalışır','Runs when no download is active','Работает при отсутствии активных загрузок','Läuft ohne aktive Downloads'], update:['Güncelle','Update','Обновить','Aktualisieren'], updating:['Güncelleniyor…','Updating…','Обновление…','Aktualisierung…'], updated:['yt-dlp güncellendi','yt-dlp updated','yt-dlp обновлён','yt-dlp aktualisiert'],
  downloadFolder:['İndirme klasörü','Download folder','Папка загрузок','Downloadordner'], change:['Değiştir','Change','Изменить','Ändern'], fileName:['Dosya adı','File name','Имя файла','Dateiname'], fileNameHelp:['Kaydedilen dosyaların düzeni','Saved file naming pattern','Шаблон имени файла','Muster für gespeicherte Dateien'], playlistHelp:['Tüm listeyi indirmeye izin ver','Allow downloading the full playlist','Разрешить загрузку всего плейлиста','Gesamte Playlist herunterladen'], skipDuplicates:['Tekrarları atla','Skip duplicates','Пропускать повторы','Duplikate überspringen'], skipDuplicatesHelp:['Daha önce indirilenleri arşivden denetler','Checks previously downloaded items','Проверяет ранее загруженные файлы','Prüft bereits geladene Medien'],
  defaultQuality:['Varsayılan kalite','Default quality','Качество по умолчанию','Standardqualität'], defaultQualityHelp:['Analiz sonucunda önce gösterilir','Shown first after analysis','Показывается первым после анализа','Wird nach der Analyse zuerst gezeigt'], container:['Konteyner','Container','Контейнер','Container'], containerHelp:['Birleştirme sonrası dosya türü','File type after merge','Тип файла после объединения','Dateityp nach dem Zusammenführen'], codec:['Codec tercihi','Codec preference','Предпочтительный кодек','Codec-Präferenz'], codecHelp:['Kalite sıralamasında kullanılır','Used when sorting quality','Используется при сортировке качества','Wird bei der Qualitätssortierung verwendet'],
  audioFormat:['Ses formatı','Audio format','Формат аудио','Audioformat'], audioFormatHelp:['Ses indirmelerinde çıktı türü','Output type for audio downloads','Формат аудиозагрузки','Ausgabeformat für Audio'], bitrate:['Bit hızı','Bitrate','Битрейт','Bitrate'], bitrateHelp:['Kayıplı ses çıktıları için','For lossy audio outputs','Для аудио с потерями','Für verlustbehaftete Audioformate'], metadataHelp:['Başlık, sanatçı ve kaynak bilgisini göm','Embed title, artist and source','Встроить название, автора и источник','Titel, Künstler und Quelle einbetten'], thumbnail:['Kapak görseli','Thumbnail','Обложка','Vorschaubild'], thumbnailHelp:['Dosyaya küçük resmi göm','Embed thumbnail into the file','Встроить обложку в файл','Vorschaubild einbetten'], chapters:['Bölümler','Chapters','Главы','Kapitel'], chaptersHelp:['Chapter bilgisini koru','Preserve chapter information','Сохранить информацию о главах','Kapitelinformationen behalten'], subtitles:['Altyazı','Subtitles','Субтитры','Untertitel'], subtitlesHelp:['Bulunursa videoya göm','Embed into video when available','Встроить в видео при наличии','Falls verfügbar ins Video einbetten'], subtitleLanguages:['Altyazı dilleri','Subtitle languages','Языки субтитров','Untertitelsprachen'], subtitleLanguagesHelp:['Virgülle ayır: tr,en','Comma-separated: tr,en','Через запятую: ru,en','Kommagetrennt: de,en'], sponsorHelp:['Seçili bölümleri videodan çıkar','Remove selected segments from video','Удалить выбранные сегменты','Gewählte Segmente entfernen'], sponsorCategories:['Sponsor kategorileri','Sponsor categories','Категории SponsorBlock','Sponsor-Kategorien'],
  ipMode:['IP protokolü','IP protocol','IP-протокол','IP-Protokoll'], ipModeHelp:['Otomatik, yalnızca IPv4 veya yalnızca IPv6','Automatic, IPv4 only or IPv6 only','Авто, только IPv4 или только IPv6','Automatisch, nur IPv4 oder nur IPv6'], automatic:['Otomatik','Automatic','Автоматически','Automatisch'], aria2Help:['Çok bağlantılı harici indirici; varsayılan kapalı','Multi-connection external downloader; off by default','Внешний многопоточный загрузчик; по умолчанию выключен','Externer Mehrfach-Downloader; standardmäßig aus'], aria2Connections:['aria2 bağlantıları','aria2 connections','Соединения aria2','aria2-Verbindungen'], aria2ConnectionsHelp:['1–16 bağlantı','1–16 connections','1–16 соединений','1–16 Verbindungen'], fragments:['Eşzamanlı parçalar','Concurrent fragments','Параллельные фрагменты','Parallele Fragmente'], fragmentsHelp:['DASH/HLS için 1–16','1–16 for DASH/HLS','1–16 для DASH/HLS','1–16 für DASH/HLS'], retries:['Yeniden deneme','Retries','Повторные попытки','Wiederholungen'], retriesHelp:['Geçici bağlantı hatalarında','For temporary connection errors','При временных сетевых ошибках','Bei temporären Verbindungsfehlern'], timeout:['Bağlantı zaman aşımı','Connection timeout','Тайм-аут соединения','Verbindungs-Timeout'], timeoutHelp:['5–120 saniye','5–120 seconds','5–120 секунд','5–120 Sekunden'], speedLimit:['Hız sınırı','Speed limit','Ограничение скорости','Geschwindigkeitslimit'], speedLimitHelp:['Boş bırak veya 5M, 800K yaz','Leave empty or enter 5M, 800K','Оставьте пустым или введите 5M, 800K','Leer lassen oder 5M, 800K eingeben'], unlimited:['Sınırsız','Unlimited','Без ограничений','Unbegrenzt'],
  cookieMode:['Çerez kaynağı','Cookie source','Источник cookie','Cookie-Quelle'], cookieModeHelp:['Kapalı, uygulama oturumu veya tarayıcı','Off, app session or browser','Выкл., сессия приложения или браузер','Aus, App-Sitzung oder Browser'], disabled:['Kapalı','Off','Выключено','Aus'], appSession:['Uygulama oturumu','App session','Сессия приложения','App-Sitzung'], browser:['Tarayıcı','Browser','Браузер','Browser'], browserHelp:['yt-dlp çerezleri seçilen tarayıcıdan okur','yt-dlp reads cookies from the selected browser','yt-dlp читает cookie из выбранного браузера','yt-dlp liest Cookies aus dem gewählten Browser'], loginUrl:['Oturum açma adresi','Login address','Адрес входа','Anmeldeadresse'], loginUrlHelp:['Adres uygulama içinde açılır; kapatınca çerezler yalnızca bilgisayarda saklanır','Opens inside the app; cookies stay only on this computer after closing','Открывается в приложении; после закрытия cookie остаются только на этом ПК','Öffnet sich in der App; Cookies bleiben nach dem Schließen nur auf diesem PC'], openLogin:['Oturumu aç','Open login','Открыть вход','Anmeldung öffnen'], savedSession:['Kaydedilen oturum','Saved session','Сохранённая сессия','Gespeicherte Sitzung'], noCookies:['Henüz çerez yok','No cookies yet','Cookie ещё нет','Noch keine Cookies'], cookieCount:['{count} çerez yerelde hazır','{count} cookies ready locally','{count} cookie сохранено локально','{count} Cookies lokal bereit'], clear:['Temizle','Clear','Очистить','Löschen'], privacyNote:['Şifreler okunmaz. Oturum çerezleri ZenithW sunucusuna gönderilmez ve sadece yerel yt-dlp işlemlerinde kullanılır.','Passwords are not read. Session cookies are never sent to ZenithW servers and are used only by local yt-dlp jobs.','Пароли не считываются. Cookie не отправляются на серверы ZenithW и используются только локальным yt-dlp.','Passwörter werden nicht gelesen. Cookies werden nie an ZenithW-Server gesendet und nur lokal von yt-dlp verwendet.'],
  analyzeFirst:['Önce bağlantı gir','Enter a link first','Сначала введите ссылку','Zuerst einen Link eingeben'], analyzing:['Analiz ediliyor…','Analyzing…','Анализ…','Analyse…'], analyzeFailed:['Bağlantı analiz edilemedi','Link analysis failed','Не удалось проанализировать ссылку','Linkanalyse fehlgeschlagen'], untitled:['Başlıksız','Untitled','Без названия','Ohne Titel'], media:['Medya','Media','Медиа','Medien'], sizeUnknown:['Boyut bilinmiyor','Size unknown','Размер неизвестен','Größe unbekannt'], preparing:['Hazırlanıyor','Preparing','Подготовка','Vorbereitung'], started:['İndirme başladı','Download started','Загрузка началась','Download gestartet'], complete:['Tamamlandı','Completed','Завершено','Abgeschlossen'], cancel:['İptal','Cancel','Отмена','Abbrechen'], failed:['İndirme başarısız','Download failed','Ошибка загрузки','Download fehlgeschlagen'], clipboardFailed:['Panoya erişilemedi','Clipboard unavailable','Буфер обмена недоступен','Zwischenablage nicht verfügbar'], loginOpened:['Oturum penceresi açıldı; girişten sonra pencereyi kapat','Login opened; close the window after signing in','Окно входа открыто; закройте его после авторизации','Anmeldung geöffnet; Fenster danach schließen'], cookiesCleared:['Oturum temizlendi','Session cleared','Сессия очищена','Sitzung gelöscht']
};
const langs = ['tr','en','ru','de'];
const jobStateText = { cancelling: ['İptal ediliyor…', 'Cancelling…', 'Отмена…', 'Wird abgebrochen…'], cancelled: ['İptal edildi', 'Cancelled', 'Отменено', 'Abgebrochen'] };
const tr = (key, values = {}) => {
  const index = Math.max(0, langs.indexOf(settings.language || 'tr'));
  let value = words[key]?.[index] || words[key]?.[0] || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replace(`{${name}}`, replacement);
  return value;
};
const jobState = (key) => jobStateText[key]?.[Math.max(0, langs.indexOf(settings.language || 'tr'))] || key;
const esc = (value) => { const node = document.createElement('span'); node.textContent = value ?? ''; return node.innerHTML; };
const duration = (seconds) => seconds ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '—';
const size = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 * 100 ? 0 : 1)} MB` : tr('sizeUnknown');
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2800); }
function applyLanguage() {
  document.documentElement.lang = settings.language || 'tr';
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = tr(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = tr(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => { node.title = tr(node.dataset.i18nTitle); });
  if (media) renderFormats(media.formats || []);
}
function view(id) { document.querySelectorAll('.view,.nav').forEach((node) => node.classList.remove('active')); $(`#${id}`).classList.add('active'); document.querySelector(`.nav[data-view="${id}"]`)?.classList.add('active'); }
function renderFormats(list) {
  const preferred = Number(settings.videoQuality || 1080);
  const sorted = [...list].sort((a, b) => Math.abs(a.height - preferred) - Math.abs(b.height - preferred));
  const items = kind === 'audio' ? [{id:'mp3',height:'MP3',ext:'320 / 192 kbps'},{id:'m4a',height:'M4A',ext:'AAC'},{id:'opus',height:'OPUS',ext:'Efficient'},{id:'flac',height:'FLAC',ext:'Lossless'}] : sorted;
  $('#quality-grid').innerHTML = items.slice(0, 8).map((format, index) => `<button class="quality ${index === 0 ? 'active' : ''}" data-id="${esc(format.id)}"><b>${esc(kind === 'audio' ? format.height : `${format.height}p`)}</b><span>${esc([format.ext, format.fps ? `${format.fps} FPS` : '', kind === 'video' ? size(format.size) : ''].filter(Boolean).join(' · '))}</span></button>`).join('');
  $('#format').value = items[0]?.id || '';
  document.querySelectorAll('.quality').forEach((button) => { button.onclick = () => { document.querySelectorAll('.quality').forEach((item) => item.classList.toggle('active', item === button)); $('#format').value = button.dataset.id; }; });
}
async function analyze() {
  const url = $('#url').value.trim();
  if (!url) return toast(tr('analyzeFirst'));
  const button = $('#inspect'); button.disabled = true; button.textContent = tr('analyzing');
  try { media = await window.zenith.inspect(url); $('#thumb').src = media.thumbnail || ''; $('#uploader').textContent = media.uploader || tr('media'); $('#title').textContent = media.title || tr('untitled'); $('#duration').textContent = duration(media.duration); renderFormats(media.formats || []); $('#media').hidden = false; }
  catch (error) { toast(typeof error === 'string' ? error : error?.message || tr('analyzeFailed')); }
  finally { button.disabled = false; button.innerHTML = `<span>${esc(tr('continue'))}</span> <b>→</b>`; }
}
async function start() {
  if (!media || starting) return;
  const button = $('#download');
  starting = true;
  button.disabled = true;
  try {
    const result = await window.zenith.start({ url: $('#url').value, title: media.title, kind, format: kind === 'video' ? $('#format').value : '', audioFormat: kind === 'audio' ? $('#format').value : settings.audioFormat });
    if (!jobs.has(result.id)) jobs.set(result.id, { id: result.id, title: media.title, percent: 0, detail: tr('preparing'), done: false, failed: false });
    renderQueue(); view('queue'); toast(result.duplicate ? tr('started') : tr('started'));
  }
  catch (error) { toast(error?.message || tr('failed')); }
  finally { starting = false; button.disabled = false; }
}
function renderQueue() {
  const box = $('#queue-list'); $('#queue-count').textContent = jobs.size;
  if (!jobs.size) { box.innerHTML = `<div class="empty">${esc(tr('queueEmpty'))}</div>`; return; }
  box.innerHTML = [...jobs.values()].map((job) => `<article class="queue-item ${job.done ? 'is-done' : ''}"><div class="queue-title"><span>${esc(job.title)}</span><div class="queue-actions">${job.done ? `<button class="dismiss" data-dismiss="${job.id}" title="Kayıt listesinden kaldır">×</button>` : `<button data-cancel="${job.id}" ${job.cancelling ? 'disabled' : ''}>${esc(job.cancelling ? jobState('cancelling') : tr('cancel'))}</button>`}</div></div><div class="track"><i style="width:${job.percent}%"></i></div><div class="queue-meta"><b>${job.percent}%</b><span>${esc(job.detail)}</span></div></article>`).join('');
  document.querySelectorAll('[data-cancel]').forEach((button) => { button.onclick = async () => { const job = jobs.get(button.dataset.cancel); if (!job || job.done || job.cancelling) return; job.cancelling = true; job.detail = jobState('cancelling'); renderQueue(); if (!await window.zenith.cancel(job.id)) { job.cancelling = false; renderQueue(); } }; });
  document.querySelectorAll('[data-dismiss]').forEach((button) => { button.onclick = () => { jobs.delete(button.dataset.dismiss); persistQueue(); renderQueue(); }; });
  persistQueue();
}
const fields = ['language','reducedMotion','ytDlpChannel','autoUpdateYtDlp','naming','playlist','downloadArchive','videoQuality','videoContainer','videoCodec','audioFormat','audioQuality','embedThumbnail','embedMetadata','embedChapters','subtitles','subtitleLang','sponsorBlock','sponsorCategories','ipMode','useAria2','aria2Connections','concurrentFragments','retries','socketTimeout','speedLimit','proxyUrl','cookieMode','cookieBrowser','cookieLoginUrl'];
function updateCookieUi() { $('#browser-cookie-setting').classList.toggle('hidden-setting', settings.cookieMode !== 'browser'); }
async function refreshTools() {
  tools = await window.zenith.tools();
  $('#engine-state').textContent = tools.ytDlp && tools.ffmpeg ? `yt-dlp ${tools.ytDlpVersion || ''}`.trim() : 'Engine missing';
  $('#ytdlp-version').textContent = tools.ytDlpVersion || '—'; $('#ffmpeg-version').textContent = tools.ffmpegVersion || '—'; $('#aria2-version').textContent = tools.aria2Version || '—';
  $('#cookie-status').textContent = tools.cookieCount ? tr('cookieCount', { count: tools.cookieCount }) : (tools.sessionCookies ? tr('appSession') : tr('noCookies'));
}
async function loadSettings() {
  settings = await window.zenith.settings.get();
  $('#folder-value').textContent = settings.downloadFolder;
  fields.forEach((id) => { const element = $(`#${id}`); if (!element) return; element.type === 'checkbox' ? element.checked = !!settings[id] : element.value = settings[id] ?? ''; });
  document.documentElement.classList.toggle('reduced-motion', !!settings.reducedMotion);
  applyLanguage(); updateCookieUi(); await refreshTools();
}
async function saveField(element) {
  let value = element.type === 'checkbox' ? element.checked : element.value;
  if (element.type === 'number') value = Number(value);
  settings = await window.zenith.settings.save({ [element.id]: value });
  if (element.id === 'language') applyLanguage();
  if (element.id === 'reducedMotion') document.documentElement.classList.toggle('reduced-motion', !!value);
  if (element.id === 'cookieMode') updateCookieUi();
  const state = $('#save-state'); state.textContent = tr('saved'); state.classList.add('flash'); setTimeout(() => state.classList.remove('flash'), 500);
}

document.querySelectorAll('.nav').forEach((button) => { button.onclick = () => view(button.dataset.view); });
document.querySelectorAll('.mode').forEach((button) => { button.onclick = () => { document.querySelectorAll('.mode').forEach((item) => item.classList.toggle('active', item === button)); kind = button.dataset.kind; if (media) renderFormats(media.formats || []); }; });
document.querySelectorAll('.settings-tabs button').forEach((button) => { button.onclick = () => { document.querySelectorAll('.settings-tabs button,.settings-panel').forEach((item) => item.classList.remove('active')); button.classList.add('active'); $(`#${button.dataset.tab}`).classList.add('active'); }; });
$('#inspect').onclick = analyze; $('#url').onkeydown = (event) => { if (event.key === 'Enter') analyze(); }; $('#download').onclick = start;
$('#paste').onclick = async () => { try { $('#url').value = await navigator.clipboard.readText(); } catch { toast(tr('clipboardFailed')); } };
$('#open-folder').onclick = $('#queue-folder').onclick = () => window.zenith.openDownloads();
$('#choose-folder').onclick = async () => { const folder = await window.zenith.pickFolder(); if (folder) { settings = await window.zenith.settings.save({ downloadFolder: folder }); $('#folder-value').textContent = folder; } };
$('#update-ytdlp').onclick = async () => { const button = $('#update-ytdlp'); button.disabled = true; button.textContent = tr('updating'); try { const result = await window.zenith.updateYtDlp($('#ytDlpChannel').value); $('#update-detail').textContent = result.detail || tr('updated'); toast(`${tr('updated')}: ${result.version || ''}`); await refreshTools(); } catch (error) { toast(error?.message || String(error)); } finally { button.disabled = false; button.textContent = tr('update'); } };
$('#open-cookie-login').onclick = async () => { try { settings = await window.zenith.settings.save({ cookieLoginUrl: $('#cookieLoginUrl').value }); await window.zenith.cookies.login(settings.cookieLoginUrl); toast(tr('loginOpened')); } catch (error) { toast(error?.message || String(error)); } };
$('#clear-cookies').onclick = async () => { await window.zenith.cookies.clear(); settings = await window.zenith.settings.get(); toast(tr('cookiesCleared')); await refreshTools(); updateCookieUi(); };
fields.forEach((id) => $(`#${id}`)?.addEventListener('change', (event) => saveField(event.target)));
window.zenith.onDownload((event) => { const job = jobs.get(event.jobId); if (!job) return; if (event.type === 'progress') { job.percent = Math.max(job.percent, Math.min(100, Number(event.percent) || 0)); job.detail = event.detail; } if (event.type === 'cancelling') { job.cancelling = true; job.detail = event.detail || jobState('cancelling'); } if (event.type === 'complete' || event.type === 'failed' || event.type === 'cancelled') { job.done = true; job.cancelling = false; job.failed = event.type === 'failed'; job.cancelled = event.type === 'cancelled'; job.percent = event.type === 'complete' ? 100 : job.percent; job.detail = event.detail || (event.type === 'complete' ? tr('complete') : event.type === 'cancelled' ? jobState('cancelled') : tr('failed')); toast(event.type === 'complete' ? tr('complete') : event.type === 'cancelled' ? jobState('cancelled') : tr('failed')); } renderQueue(); });
window.zenith.onCookiesUpdated(async (event) => { toast(event.message); await refreshTools(); settings = await window.zenith.settings.get(); $('#cookieMode').value = settings.cookieMode; updateCookieUi(); });
window.zenith.onEngineUpdated(async (event) => { toast(event.error || `${tr('updated')}: ${event.version || ''}`); await refreshTools(); });
restoreQueue();
loadSettings().then(renderQueue).catch((error) => toast(error?.message || String(error)));
