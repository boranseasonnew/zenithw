const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createProgressTracker } = require('./progress.cjs');
const { videoFormats } = require('./formats.cjs');
const { retryDownload, redactDiagnostic } = require('./download-retry.cjs');

const engineCopy = require('./engine-copy.json');
const local = text => engineCopy[text]?.[Math.max(0,['tr','en','ru','de'].indexOf(settings?.language||'en'))] || text;
const activeJobs = new Map();
const versionCache = new Map();
// Stable uses its own identity; the previous edition stays available.
app.setPath('userData', path.join(app.getPath('appData'), 'Zenith Stable'));
if (process.platform === 'win32') app.setAppUserModelId('space.zenithw.desktop.stable');
const COOKIE_PARTITION = 'persist:zenithw-login';
let updating = false;
const historyPath = () => path.join(app.getPath('userData'), 'history.json');
let history = [];
const profilesPath = () => path.join(app.getPath('userData'), 'profiles.json');
let profiles = [];
let scriptFiles = {};
const scriptPath = () => path.join(app.getPath('userData'), 'scripts.json');
function writePrivate(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}
function readArray(file, limit) {
  try { const value = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(value) ? value.slice(0, limit) : []; } catch { return []; }
}
function remember(job, result) {
  history = [{ id: job.id, title: job.title, thumbnail: job.thumbnail, kind: job.kind, createdAt: Date.now(), ...result }, ...history].slice(0, 300);
  writePrivate(historyPath(), history);
}

const allowedBrowsers = new Set(['chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi']);
const allowedChannels = new Set(['stable', 'nightly']);
const defaults = {
  downloadFolder: '', naming: '%(title)s [%(id)s].%(ext)s', playlist: false, language: 'en',
  videoQuality: '1080', videoContainer: 'mp4', videoCodec: 'h264', audioFormat: 'mp3', audioQuality: '192',
  subtitles: false, subtitleLang: 'tr,en', embedMetadata: true, embedThumbnail: false, embedChapters: true,
  sponsorBlock: false, sponsorCategories: 'sponsor,selfpromo,interaction', downloadArchive: true,
  concurrentFragments: 4, retries: 10, speedLimit: '', socketTimeout: 20, ipMode: 'auto', proxyUrl: '',
  useAria2: false, aria2Connections: 8, cookieMode: 'none', cookieBrowser: 'firefox',
  cookieLoginUrl: 'https://www.youtube.com/', ytDlpChannel: 'stable', autoUpdateYtDlp: true, reducedMotion: false,
  fragmentRetries: 10, fileAccessRetries: 3, throttleRate: '', unavailableFragments: 'skip', keepFragments: false,
  userAgent: '', refererUrl: '', playlistItems: '', accurateTrim: false, advancedMode: false, hideHelp: false,
  extractorRetries: 3, extractorArgs: '', sleepRequests: 0, sleepInterval: 0, maxSleepInterval: 0, sleepSubtitles: 0,
  splitChapters: false, keepOriginal: false, fixupPolicy: 'detect_or_warn', writeInfoJson: false, writeDescription: false,
  writeThumbnail: false, autoSubtitles: true, embedSubtitles: true, subtitleFormat: 'best',
  playlistReverse: false, playlistPolicy: 'stop', breakOnExisting: false, sponsorAction: 'remove',
  playlistRandom: false, playlistFolder: false, playlistNumber: false, lazyPlaylist: false,
  scriptBeforeEnabled: false, scriptAfterEnabled: false, scriptTimeout: 60, scriptPolicy: 'stop',
  onboardingComplete: false, settingsVersion: 3
};
let settings;
let mainWindow;
let loginWindow;

const messages = {
  tr: { missing: 'uygulama paketinde bulunamadı. Yeniden kurulum gerekebilir.', badUrl: 'Yalnızca http/https bağlantıları kullanılabilir.', inspect: 'Bağlantı analiz edilemedi.', busy: 'Aktif indirme varken yt-dlp güncellenemez.', updateFail: 'yt-dlp güncellenemedi.', loginSaved: 'Oturum çerezleri yalnızca bu bilgisayara kaydedildi.', loginEmpty: 'Kaydedilecek oturum çerezi bulunamadı.' },
  en: { missing: 'is missing from the application package. Reinstall may be required.', badUrl: 'Only http/https links are allowed.', inspect: 'The link could not be analyzed.', busy: 'yt-dlp cannot be updated while downloads are active.', updateFail: 'yt-dlp could not be updated.', loginSaved: 'Session cookies were saved only on this computer.', loginEmpty: 'No session cookies were found to save.' },
  ru: { missing: 'отсутствует в пакете приложения. Может потребоваться переустановка.', badUrl: 'Разрешены только ссылки http/https.', inspect: 'Не удалось проанализировать ссылку.', busy: 'Нельзя обновить yt-dlp во время активной загрузки.', updateFail: 'Не удалось обновить yt-dlp.', loginSaved: 'Cookie сеанса сохранены только на этом компьютере.', loginEmpty: 'Cookie сеанса для сохранения не найдены.' },
  de: { missing: 'fehlt im Anwendungspaket. Eine Neuinstallation kann erforderlich sein.', badUrl: 'Nur http/https-Links sind erlaubt.', inspect: 'Der Link konnte nicht analysiert werden.', busy: 'yt-dlp kann während aktiver Downloads nicht aktualisiert werden.', updateFail: 'yt-dlp konnte nicht aktualisiert werden.', loginSaved: 'Sitzungs-Cookies wurden nur auf diesem Computer gespeichert.', loginEmpty: 'Keine Sitzungs-Cookies zum Speichern gefunden.' }
};
const msg = (key) => (messages[settings?.language] || messages.tr)[key] || messages.tr[key] || key;
const configPath = () => path.join(app.getPath('userData'), 'settings.json');
const cookiePath = () => path.join(app.getPath('userData'), 'session-cookies.txt');
function readSettings() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch {}
  // v0.2 embedded thumbnails by default. That could leave a jpg/webp beside a
  // successfully merged video when the final embed step failed. Make it opt-in
  // once, while preserving an explicit choice made in newer settings.
  if (!saved.settingsVersion) saved.embedThumbnail = false;
  return { ...defaults, language: ({tr:'tr',ru:'ru',de:'de'})[app.getLocale().split('-')[0]] || 'en', downloadFolder: path.join(app.getPath('downloads'), 'Zenith'), ...saved };
}
function validatedSettings(next) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) throw new Error('Invalid settings.');
  const clean = {};
  const enums = { language: ['tr','en','ru','de'], ipMode: ['auto','ipv4','ipv6'], ytDlpChannel: [...allowedChannels],
    cookieMode: ['none','session','browser'], cookieBrowser: [...allowedBrowsers], videoContainer: ['mp4','webm','mkv','mov','avi','flv'],
    videoCodec: ['h264','vp9','av1','auto'], audioFormat: ['mp3','m4a','opus','flac','wav','aac','vorbis','alac'], unavailableFragments: ['skip','abort'],
    fixupPolicy: ['detect_or_warn','warn','never'], subtitleFormat: ['best','srt','vtt','ass'],
    playlistPolicy: ['stop','continue'], sponsorAction: ['remove','mark'], scriptPolicy: ['stop','continue'] };
  const numbers = { retries: [1,30], fragmentRetries: [1,30], fileAccessRetries: [1,30], concurrentFragments: [1,16],
    aria2Connections: [1,16], socketTimeout: [5,120], videoQuality: [144,8640], audioQuality: [32,512],
    extractorRetries: [1,30], sleepRequests: [0,120], sleepInterval: [0,300], maxSleepInterval: [0,300], sleepSubtitles: [0,120], scriptTimeout: [5,300] };
  for (const [key, value] of Object.entries(next)) {
    if (!(key in defaults)) continue;
    if (enums[key]) { if (!enums[key].includes(value)) throw new Error(`Invalid ${key}.`); clean[key] = value; }
    else if (numbers[key]) clean[key] = bounded(value, ...numbers[key], defaults[key]);
    else if (typeof defaults[key] === 'boolean') { if (typeof value !== 'boolean') throw new Error(`Invalid ${key}.`); clean[key] = value; }
    else if (key === 'settingsVersion') continue;
    else { if (typeof value !== 'string' || value.length > 1024 || /[\r\n\0]/.test(value)) throw new Error(`Invalid ${key}.`); clean[key] = value.trim(); }
  }
  if ('downloadFolder' in clean && !path.isAbsolute(clean.downloadFolder)) throw new Error('Choose an absolute download folder.');
  if ('naming' in clean) clean.naming = sanitizeNaming(clean.naming);
  if ('proxyUrl' in clean) clean.proxyUrl = sanitizeProxy(clean.proxyUrl);
  for (const key of ['speedLimit', 'throttleRate']) if (clean[key] && !/^\d+(?:\.\d+)?[KMGTP]?$/i.test(clean[key])) throw new Error('Use a rate such as 800K or 5M.');
  if (clean.playlistItems && !/^[\d,:-]+$/.test(clean.playlistItems)) throw new Error('Playlist selection: 1,3,5-10');
  const merged = { ...settings, ...clean };
  if (merged.playlistReverse && merged.playlistRandom) throw new Error(local('Ters ve karışık sıra birlikte seçilemez.'));
  if (merged.lazyPlaylist && (merged.playlistReverse || merged.playlistRandom)) throw new Error(local('Listeyi beklemeden başlatmak için normal sıra seçin.'));
  for (const key of ['cookieLoginUrl','refererUrl']) if (clean[key]) clean[key] = sanitizeUrl(clean[key]);
  if (clean.cookieLoginUrl && new URL(clean.cookieLoginUrl).protocol !== 'https:') throw new Error('Login requires HTTPS.');
  if (clean.subtitleLang && !/^[a-zA-Z0-9,*._-]+$/.test(clean.subtitleLang)) throw new Error('Invalid subtitle languages.');
  const categories = new Set(['sponsor','intro','outro','selfpromo','preview','filler','interaction','music_offtopic']);
  if (clean.sponsorCategories && !clean.sponsorCategories.split(',').every(v => categories.has(v.trim()))) throw new Error('Invalid SponsorBlock categories.');
  if (clean.extractorArgs && !/^[a-zA-Z0-9_.-]+:.+$/.test(clean.extractorArgs)) throw new Error('Use extractor:option=value.');
  if ((clean.maxSleepInterval ?? settings.maxSleepInterval) && (clean.maxSleepInterval ?? settings.maxSleepInterval) < (clean.sleepInterval ?? settings.sleepInterval)) throw new Error(local('En fazla bekleme değeri daha küçük olamaz.'));
  return clean;
}
function saveSettings(next) {
  settings = { ...settings, ...validatedSettings(next), settingsVersion: 3 };
  writePrivate(configPath(), settings);
  return settings;
}

function resource(name) {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
  return path.join(base, 'bin', name);
}
function requiredTool(name) {
  const tool = resource(name);
  if (!fs.existsSync(tool)) throw new Error(`${name} ${msg('missing')}`);
  return tool;
}
function sanitizeUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim().replace(/^(?![a-z][a-z0-9+.-]*:\/\/)/i, 'https://')); } catch { throw new Error(msg('badUrl')); }
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new Error(msg('badUrl'));
  return url.href;
}
function sanitizeProxy(value) {
  if (!String(value || '').trim()) return '';
  const url = new URL(String(value).trim());
  if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(url.protocol)) throw new Error('Proxy: http, https, socks4 veya socks5 kullanın.');
  return url.href;
}
function sanitizeNaming(value) {
  const naming = String(value || '').trim();
  // yt-dlp expands this template inside a private job directory.  A template
  // must remain a filename, never a path, drive or Windows device name.
  if (!naming || naming.length > 200 || /[\\/:*?"<>|\x00-\x1f]/.test(naming) || naming.startsWith('.')) {
    throw new Error('Invalid output filename template.');
  }
  return naming;
}
function bounded(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
async function toolVersion(name, args = ['--version']) {
  const tool = resource(name);
  if (!fs.existsSync(tool)) return null;
  const stamp = fs.statSync(tool).mtimeMs;
  if (versionCache.get(name)?.stamp === stamp) return versionCache.get(name).value;
  try {
    const result = await runTool(tool, args, 12000);
    const value = result.stdout.trim().split(/\r?\n/)[0];
    versionCache.set(name, { stamp, value });
    return value;
  } catch { return null; }
}
function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'brand.png'), width: 1220, height: 790, minWidth: 780, minHeight: 540, autoHideMenuBar: true,
    backgroundColor: '#090a0c', title: 'Zenith 4.0.1', titleBarStyle: 'hidden', titleBarOverlay: { color: '#17181b', symbolColor: '#bfc2ca', height: 44 },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const appHtml = path.join(__dirname, 'app.html');
  const appUrl = pathToFileURL(appHtml).href;
  mainWindow.webContents.on('will-navigate', (event, nextUrl) => {
    if (nextUrl !== appUrl) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'clipboard-read'));
  mainWindow.webContents.session.setPermissionCheckHandler((_contents, permission) => permission === 'clipboard-read');
  mainWindow.loadFile(appHtml);
}
function emit(job, type, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('download:event', { jobId: job.id, type, ...payload, ...(payload.detail ? {detail:local(payload.detail)} : {}) });
}
function authArgs(current = settings) {
  if (current.cookieMode === 'session' && fs.existsSync(cookiePath())) return ['--cookies', cookiePath()];
  if (current.cookieMode === 'browser' && allowedBrowsers.has(current.cookieBrowser)) return ['--cookies-from-browser', current.cookieBrowser];
  return [];
}
function networkArgs(current = settings) {
  const args = [];
  if (current.ipMode === 'ipv4') args.push('--force-ipv4');
  if (current.ipMode === 'ipv6') args.push('--force-ipv6');
  const proxy = sanitizeProxy(current.proxyUrl);
  if (proxy) args.push('--proxy', proxy);
  args.push('--socket-timeout', String(bounded(current.socketTimeout, 5, 120, 20)));
  if (current.userAgent) args.push('--user-agent', current.userAgent);
  if (current.refererUrl) args.push('--referer', sanitizeUrl(current.refererUrl));
  args.push('--extractor-retries', String(current.extractorRetries));
  if (current.extractorArgs) args.push('--extractor-args', current.extractorArgs);
  if (current.sleepRequests) args.push('--sleep-requests', String(current.sleepRequests));
  return [...args, ...authArgs(current)];
}
function aria2Args(current = settings) {
  if (!current.useAria2) return [];
  const connections = bounded(current.aria2Connections, 1, 16, 8);
  return ['--downloader', `http,ftp:${requiredTool('aria2c.exe')}`, '--downloader', 'dash,m3u8:native', '--downloader-args', `aria2c:-x ${connections} -s ${connections} -j 1 --file-allocation=none --summary-interval=1 --connect-timeout=20 --timeout=30 --max-tries=3`];
}
const baseArgs = (current = settings) => ['--ignore-config', '--ffmpeg-location', requiredTool('ffmpeg.exe'),
  '--js-runtimes', `deno:${requiredTool('deno.exe')}`, ...networkArgs(current)];
function downloadArgs(job, current, workDir) {
  const output = path.join(workDir, current.playlist && current.playlistFolder ? '%(playlist_title,playlist_id|Playlist)s' : '', (current.playlist && current.playlistNumber ? '%(playlist_index)03d - ' : '') + sanitizeNaming(current.naming));
  const args = ['--newline', ...baseArgs(current), '--paths', workDir, '--paths', `temp:${workDir}`, '-o', output,
    '--retries', String(bounded(current.retries, 1, 30, 10)), '--fragment-retries', String(bounded(current.fragmentRetries, 1, 30, 10)), '--file-access-retries', String(bounded(current.fileAccessRetries, 1, 30, 3)),
    '--concurrent-fragments', String(bounded(current.concurrentFragments, 1, 16, 4)), ...aria2Args(current)];
  args.push(current.playlist ? '--yes-playlist' : '--no-playlist');
  if (current.speedLimit) args.push('--limit-rate', String(current.speedLimit));
  args.push('--windows-filenames', current.unavailableFragments === 'abort' ? '--abort-on-unavailable-fragments' : '--skip-unavailable-fragments');
  if (current.keepFragments) args.push('--keep-fragments');
  if (current.throttleRate) args.push('--throttled-rate', current.throttleRate);
  if (current.playlist && current.playlistItems) args.push('--playlist-items', current.playlistItems);
  if (current.playlist) {
    if (current.playlistReverse) args.push('--playlist-reverse');
    if (current.playlistRandom) args.push('--playlist-random');
    if (current.lazyPlaylist) args.push('--lazy-playlist');
    args.push(current.playlistPolicy === 'continue' ? '--ignore-errors' : '--abort-on-error');
    if (current.breakOnExisting) args.push('--break-on-existing');
  }
  if (current.sleepInterval) args.push('--sleep-interval', String(current.sleepInterval));
  if (current.maxSleepInterval && current.sleepInterval) args.push('--max-sleep-interval', String(current.maxSleepInterval));
  if (current.sleepSubtitles) args.push('--sleep-subtitles', String(current.sleepSubtitles));
  if (current.keepOriginal) args.push('--keep-video');
  args.push('--fixup', current.fixupPolicy);
  if (current.writeInfoJson) args.push('--write-info-json');
  if (current.writeDescription) args.push('--write-description');
  if (current.writeThumbnail) args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
  if (current.splitChapters && job.kind === 'video' && !job.trim) args.push('--split-chapters', '--paths', `chapter:${workDir}`, '-o', 'chapter:%(title)s - %(section_number)03d %(section_title)s.%(ext)s');
  if (job.trim) {
    args.push('--download-sections', `*${job.trim.start}-${job.trim.end ?? 'inf'}`);
    if (current.accurateTrim) args.push('--force-keyframes-at-cuts');
  }
  let outputContainer = '';
  if (job.kind === 'audio') args.push('-f', 'bestaudio/best', '-x', '--audio-format', job.audioFormat || current.audioFormat, '--audio-quality', `${current.audioQuality}K`);
  else {
    const container = current.videoContainer || 'mp4';
    outputContainer = container;
    const height = job.videoQuality || current.videoQuality;
    const cap = Number(height) >= 8640 ? '' : `[height<=?${height}]`;
    const sourceContainer = container === 'webm' ? 'webm' : 'mp4';
    const compatible = sourceContainer === 'mp4' ? `bv*${cap}[ext=mp4]+ba[ext=m4a]/b${cap}[ext=mp4]/bv*${cap}+ba/b${cap}` : `bv*${cap}[ext=webm]+ba[ext=webm]/bv*${cap}+ba/b${cap}`;
    args.push('-f', current.playlist ? compatible : job.format || compatible,
      '--merge-output-format', container === 'webm' && job.formatExt !== 'webm' ? 'mkv' : ['mp4','mkv','webm'].includes(container) ? container : 'mkv');
    // Legacy containers need actual conversion, not a renamed extension.
    args.push(['avi','flv','webm'].includes(container) ? '--recode-video' : '--remux-video', container);

  }
  if (current.embedMetadata) args.push('--embed-metadata');
  if (current.embedChapters && (job.kind === 'audio' || ['mp4','mkv','webm','mov'].includes(outputContainer))) args.push('--embed-chapters');
  // Keep thumbnail work private to the job; only the finished media is published.
  // yt-dlp cannot embed a thumbnail in a WebM file; requesting it marks an
  // otherwise successful download as a postprocessing failure.
  if (current.embedThumbnail) {
    const canEmbed = job.kind === 'audio' ? ['mp3','m4a','opus','flac','vorbis','alac'].includes(job.audioFormat || current.audioFormat) : ['mp4','mkv','mov'].includes(outputContainer);
    args.push('--convert-thumbnails', 'jpg');
    if (canEmbed) args.push('--embed-thumbnail');
    else args.push('--write-thumbnail');
  }
  if (current.subtitles && job.kind !== 'audio') {
    args.push('--write-subs', '--sub-langs', current.subtitleLang || 'tr,en');
    if (current.autoSubtitles) args.push('--write-auto-subs');
    if (current.embedSubtitles && ['mp4','mkv','webm','mov'].includes(outputContainer)) args.push('--embed-subs');
    if (current.subtitleFormat !== 'best') args.push('--convert-subs', current.subtitleFormat);
  }
  if (current.sponsorBlock && job.kind !== 'audio') args.push(current.sponsorAction === 'mark' ? '--sponsorblock-mark' : '--sponsorblock-remove', current.sponsorCategories || 'sponsor,selfpromo,interaction');
  if (current.downloadArchive && !job.trim) args.push('--download-archive', path.join(app.getPath('userData'), 'download-archive.txt'));
  args.push(job.url);
  return args;
}

const mediaExtensions = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4a', '.mp3', '.opus', '.ogg', '.flac', '.wav', '.aac', '.flv']);
function inspectMedia(file) {
  if (!mediaExtensions.has(path.extname(file).toLowerCase())) return null;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 1024) return null;
    const probe = execFileSync(requiredTool('ffprobe.exe'), ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    const types = new Set(probe.toLowerCase().split(/\s+/).filter(Boolean));
    return types.has('audio') || types.has('video') ? { file, size: stat.size, types } : null;
  } catch { return null; }
}
function uniqueDestination(folder, name) {
  const parsed = path.parse(name);
  let target = path.join(folder, name);
  for (let index = 1; fs.existsSync(target); index += 1) target = path.join(folder, `${parsed.name} (${index})${parsed.ext}`);
  return target;
}
function jobFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? jobFiles(file) : entry.isFile() ? [file] : [];
  });
}
function publishMedia(workDir, destination, job) {
  const inspected = jobFiles(workDir)
    .filter((file) => job.keepOriginal || !/\.(f\d+|temp)\.[^.]+$/i.test(path.basename(file)))
    .map(inspectMedia)
    .filter(Boolean);
  let selected;
  if (job.kind === 'audio') {
    const audio = inspected.filter((item) => item.types.has('audio')).sort((a, b) => b.size - a.size);
    selected = job.playlist || job.keepOriginal ? audio : audio.slice(0, 1);
  } else {
    const merged = inspected.filter((item) => item.types.has('video') && item.types.has('audio'));
    const candidates = merged.length ? merged : inspected.filter((item) => item.types.has('video'));
    selected = job.playlist || job.splitChapters || job.keepOriginal ? inspected.filter(item => item.types.has('video')) : candidates.sort((a, b) => b.size - a.size).slice(0, 1);
  }
  fs.mkdirSync(destination, { recursive: true });
  return selected.map(({ file: source }) => {
    const relativeFolder = path.relative(workDir, path.dirname(source));
    const targetFolder = job.playlistFolder && relativeFolder ? path.join(destination, relativeFolder) : destination;
    if (path.relative(destination, targetFolder).startsWith('..')) throw new Error('Invalid playlist folder.');
    fs.mkdirSync(targetFolder, { recursive: true });
    const target = uniqueDestination(targetFolder, path.basename(source));
    try { fs.renameSync(source, target); }
    catch (error) {
      if (error.code !== 'EXDEV') throw error;
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      fs.unlinkSync(source);
    }
    // Unsupported cover containers receive a matching JPG sidecar. If an
    // embedding postprocessor failed, preserve that cover with the saved media.
    const originalStem = path.parse(source).name;
    const targetStem = path.parse(target).name;
    const sidecarExtensions = new Set(['.jpg','.png','.webp','.json','.description','.srt','.vtt','.ass','.lrc']);
    const sourceFolder = path.dirname(source);
    for (const entry of fs.readdirSync(sourceFolder, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.startsWith(originalStem + '.') || !sidecarExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      const suffix = entry.name.slice(originalStem.length);
      fs.copyFileSync(path.join(sourceFolder, entry.name), uniqueDestination(targetFolder, targetStem + suffix));
    }
    return target;
  });
}
function preserveRecovery(workDir, jobId) {
  if (!fs.existsSync(workDir)) return '';
  try {
    const hasMedia = jobFiles(workDir).some(file => (mediaExtensions.has(path.extname(file).toLowerCase()) || file.endsWith('.part')) && fs.statSync(file).size > 1024);
    if (!hasMedia && !fs.existsSync(path.join(workDir, 'failure.json'))) return '';
    const recovery = path.join(app.getPath('userData'), 'recovery', jobId);
    fs.mkdirSync(path.dirname(recovery), { recursive: true });
    fs.renameSync(workDir, recovery);
    return recovery;
  } catch {
    // If moving fails, leave the original private job directory intact.
    return workDir;
  }
}
function jobKey(job) {
  return `${job.kind}|${job.format || job.audioFormat || ''}|${JSON.stringify(job.trim)}|${settings.videoContainer}|${job.url}`;
}
function runTool(file, args, timeout = 180000, maxStdoutBytes = 65536, spawnOptions = {}, record = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { ...spawnOptions, windowsHide: true });
    if (record) record.child = child;
    const stdoutChunks = [];
    let stdoutBytes = 0, stderr = '';
    let settled = false;
    const done = (callback) => { if (settled) return; settled = true; clearTimeout(timer); callback(); };
    const terminate = () => {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }).on('error', () => child.kill());
      } else child.kill('SIGTERM');
    };
    const timer = setTimeout(() => { terminate(); done(() => reject(new Error('İşlem zaman aşımına uğradı.'))); }, timeout);
    child.stdout.on('data', (chunk) => {
      if (settled) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxStdoutBytes) {
        terminate();
        done(() => reject(new Error('Media metadata exceeded the safe output limit.')));
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-65536); });
    child.on('error', (error) => done(() => reject(error)));
    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      done(() => code === 0 ? resolve({ stdout, stderr }) : reject(new Error((stderr || stdout).trim())));
    });
  });
}
async function performUpdate(channel) {
  if (updating) throw new Error('yt-dlp update already running.');
  if (activeJobs.size) throw new Error(msg('busy'));
  if (!allowedChannels.has(channel)) throw new Error(msg('updateFail'));
  updating = true;
  try {
    const result = await runTool(requiredTool('yt-dlp.exe'), ['--update-to', channel], 240000);
    saveSettings({ ytDlpChannel: channel });
    return { channel, version: await toolVersion('yt-dlp.exe'), detail: (result.stdout || result.stderr).trim() };
  } finally { updating = false; }
}
function cookieLine(cookie) {
  const domain = `${cookie.httpOnly ? '#HttpOnly_' : ''}${cookie.domain || ''}`.replace(/[\t\r\n]/g, '');
  const fields = [domain, String(cookie.domain || '').startsWith('.') ? 'TRUE' : 'FALSE', cookie.path || '/', cookie.secure ? 'TRUE' : 'FALSE', Math.floor(cookie.expirationDate || 0), cookie.name, cookie.value];
  return fields.map((value) => String(value ?? '').replace(/[\t\r\n]/g, '')).join('\t');
}
async function exportCookies() {
  const cookies = await session.fromPartition(COOKIE_PARTITION).cookies.get({});
  if (!cookies.length) return { count: 0, message: msg('loginEmpty') };
  const content = ['# Netscape HTTP Cookie File', '# Generated locally by ZenithW Desktop', '', ...cookies.map(cookieLine), ''].join('\n');
  fs.writeFileSync(cookiePath(), content, { mode: 0o600 });
  saveSettings({ cookieMode: 'session' });
  return { count: cookies.length, message: msg('loginSaved') };
}
function openLogin(rawUrl) {
  const url = sanitizeUrl(rawUrl || settings.cookieLoginUrl);
  if (new URL(url).protocol !== 'https:') throw new Error('Login requires HTTPS.');
  saveSettings({ cookieLoginUrl: url });
  if (loginWindow && !loginWindow.isDestroyed()) { loginWindow.focus(); loginWindow.loadURL(url); return { opened: true }; }
  const loginTitle = { tr: 'Tarayıcı oturumu', en: 'Browser session', ru: 'Сеанс браузера', de: 'Browsersitzung' }[settings.language] || 'Browser session';
  loginWindow = new BrowserWindow({ icon: path.join(__dirname, 'brand.png'), width: 1040, height: 760, minWidth: 680, minHeight: 520, parent: mainWindow, autoHideMenuBar: true, title: 'Zenith — ' + loginTitle, backgroundColor: '#09090b', webPreferences: { partition: COOKIE_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  loginWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  loginWindow.webContents.session.setPermissionCheckHandler(() => false);
  loginWindow.webContents.setWindowOpenHandler(({ url: next }) => { try { const target = sanitizeUrl(next); if (new URL(target).protocol === 'https:') loginWindow.loadURL(target); } catch {} return { action: 'deny' }; });
  loginWindow.webContents.on('will-navigate', (event, next) => { try { if (new URL(sanitizeUrl(next)).protocol !== 'https:') throw new Error('HTTPS required'); } catch { event.preventDefault(); } });
  loginWindow.on('closed', async () => {
    loginWindow = null;
    try { mainWindow?.webContents.send('cookies:updated', await exportCookies()); }
    catch (error) { mainWindow?.webContents.send('cookies:updated', { count: 0, message: error.message }); }
  });
  loginWindow.loadURL(url);
  return { opened: true };
}

app.whenReady().then(() => {
  settings = readSettings();
  history = readArray(historyPath(), 300);
  profiles = readArray(profilesPath(), 12);
  try { scriptFiles = JSON.parse(fs.readFileSync(scriptPath(), 'utf8')); } catch {}
  createWindow();
  if (settings.autoUpdateYtDlp) setTimeout(() => performUpdate(settings.ytDlpChannel).then((result) => mainWindow?.webContents.send('engine:updated', result)).catch((error) => mainWindow?.webContents.send('engine:updated', { error: error.message })), 1600);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('before-quit', () => {
  for (const record of activeJobs.values()) {
    record.cancelled = true;
    try {
      if (process.platform === 'win32' && record.child.pid) spawn('taskkill', ['/pid', String(record.child.pid), '/t', '/f'], { windowsHide: true });
      else record.child.kill('SIGTERM');
    } catch {}
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

function handleMain(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
      throw new Error('Unauthorized IPC sender.');
    }
    return handler(event, ...args);
  });
}

handleMain('settings:get', () => settings);
handleMain('settings:save', (_, next) => saveSettings(next || {}));
handleMain('scripts:get', () => ({ ...scriptFiles }));
handleMain('scripts:choose', async (_, phase) => {
  if (!['before','after'].includes(phase)) throw new Error('Invalid script phase.');
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'PowerShell script', extensions: ['ps1'] }] });
  if (result.canceled) return null;
  const file = result.filePaths[0];
  if (path.extname(file).toLowerCase() !== '.ps1' || !fs.statSync(file).isFile()) throw new Error(local('Bir .ps1 dosyası seçin.'));
  scriptFiles[phase] = file;
  writePrivate(scriptPath(), scriptFiles);
  return { ...scriptFiles };
});
handleMain('scripts:clear', (_, phase) => {
  if (!['before','after'].includes(phase)) throw new Error('Invalid script phase.');
  delete scriptFiles[phase];
  writePrivate(scriptPath(), scriptFiles);
  saveSettings({ [phase === 'before' ? 'scriptBeforeEnabled' : 'scriptAfterEnabled']: false });
  return { ...scriptFiles };
});
async function runScript(phase, current, record, files = []) {
  if (!current[phase === 'before' ? 'scriptBeforeEnabled' : 'scriptAfterEnabled']) return '';
  const file = record.scripts[phase];
  try {
    if (!file || !path.isAbsolute(file) || path.extname(file).toLowerCase() !== '.ps1' || !fs.statSync(file).isFile()) throw new Error(local('Script dosyası seçilmedi veya bulunamadı.'));
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    // Never interpolate media metadata into a command. Values travel as environment data.
    await runTool(powershell, ['-NoLogo','-NoProfile','-NonInteractive','-File',file], current.scriptTimeout * 1000, 65536,
      { cwd: path.dirname(file), env: { ...process.env, ZENITHW_EVENT: phase, ZENITHW_URL: record.job.url, ZENITHW_OUTPUT_DIR: record.destination, ZENITHW_FILES_JSON: JSON.stringify(files) } }, record);
    return '';
  } catch {
    if (record.cancelled) throw new Error(local('İptal edildi.'));
    if (phase === 'before' && current.scriptPolicy === 'stop') throw new Error(local('İndirme öncesi script tamamlanamadı; dosyayı ve PowerShell izinlerini kontrol edin.'));
    return phase === 'before' ? 'Ön script tamamlanamadı; indirmeye devam ediliyor.' : 'Dosya kaydedildi; son script tamamlanamadı.';
  }
}
handleMain('folder:choose', async () => { const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0]; });
handleMain('app:tools', async () => {
  const [ytDlpVersion, ffmpegVersion, aria2Version, cookies] = await Promise.all([
    toolVersion('yt-dlp.exe'), toolVersion('ffmpeg.exe', ['-version']), toolVersion('aria2c.exe'),
    session.fromPartition(COOKIE_PARTITION).cookies.get({})
  ]);
  return { ytDlp: !!ytDlpVersion, ytDlpVersion, ffmpeg: !!ffmpegVersion, ffmpegVersion, aria2: !!aria2Version, aria2Version,
    cookieCount: cookies.length, sessionCookies: fs.existsSync(cookiePath()), directConnection: !settings.proxyUrl };
});
handleMain('engine:update', (_, channel) => performUpdate(channel));
handleMain('cookies:login', (_, url) => openLogin(url));
handleMain('cookies:save', () => exportCookies());
handleMain('cookies:clear', async () => { await session.fromPartition(COOKIE_PARTITION).clearStorageData({ storages: ['cookies'] }); fs.rmSync(cookiePath(), { force: true }); saveSettings({ cookieMode: 'none' }); return { count: 0 }; });
handleMain('media:inspect', async (_, rawUrl) => {
  if (updating) throw new Error('yt-dlp is updating. Please wait.');
  const url = sanitizeUrl(rawUrl);
  try {
    const playlistArgs = settings.playlist ? ['--yes-playlist', '--flat-playlist', '--playlist-end', '1'] : ['--no-playlist'];
    const result = await runTool(requiredTool('yt-dlp.exe'), [...playlistArgs, '--dump-single-json', '--skip-download', ...baseArgs(), url], 90000, 16 * 1024 * 1024);
    const data = JSON.parse(result.stdout);
    const formats = videoFormats(data, settings.videoContainer, settings.videoCodec);
    return { title: data.title, uploader: data.uploader || data.channel, duration: data.duration, thumbnail: data.thumbnail || data.thumbnails?.at(-1)?.url, formats, isPlaylist: data._type === 'playlist' || Array.isArray(data.entries) };
  } catch (error) { throw new Error(`${msg('inspect')} ${error.message || ''}`.trim()); }
});
handleMain('download:start', async (_, request) => {
  if (updating) throw new Error('yt-dlp is updating. Please wait.');
  if (activeJobs.size >= 3) throw new Error(local('En fazla 3 eşzamanlı indirme.'));
  if (!request || typeof request !== 'object') throw new Error('Invalid download request.');
  if (request.format && !/^[a-zA-Z0-9_+./<>=*\[\]-]{1,300}$/.test(request.format)) throw new Error('Invalid format.');
  if (request.audioFormat && !['mp3','m4a','opus','flac','wav'].includes(request.audioFormat)) throw new Error('Invalid audio format.');
  let trim = null;
  if (request.trim) {
    const start = Number(request.trim.start);
    const end = request.trim.end === null || request.trim.end === '' ? null : Number(request.trim.end);
    if (!Number.isFinite(start) || start < 0 || start > 604800 || (end !== null && (!Number.isFinite(end) || end <= start || end > 604800))) throw new Error(local('Geçerli bir başlangıç ve bitiş seçin.'));
    trim = { start, end };
  }

  const job = { id: randomUUID(), url: sanitizeUrl(request.url), kind: request.kind === 'audio' ? 'audio' : 'video', trim, title: String(request.title || 'Medya').slice(0, 300), thumbnail: /^https:\/\//.test(request.thumbnail || '') ? String(request.thumbnail).slice(0, 2048) : '', format: String(request.format || ''), formatExt: ['mp4', 'webm', 'mkv'].includes(request.formatExt) ? request.formatExt : '', audioFormat: String(request.audioFormat || 'mp3') };
  const key = jobKey(job);
  const existing = [...activeJobs.values()].find((item) => item.key === key);
  if (existing) return { id: existing.job.id, duplicate: true };
  job.videoQuality = bounded(request.videoQuality, 144, 8640, settings.videoQuality);
  const current = { ...settings };
  requiredTool('yt-dlp.exe'); requiredTool('ffmpeg.exe'); requiredTool('ffprobe.exe');
  const workDir = path.join(app.getPath('temp'), 'ZenithW', job.id);
  fs.mkdirSync(workDir, { recursive: true });
  let args;
  try { args = downloadArgs(job, current, workDir); }
  catch (error) { fs.rmSync(workDir, { recursive: true, force: true }); throw error; }
  const record = { child: null, job, key, workDir, scripts: { ...scriptFiles }, destination: current.downloadFolder, terminal: false, cancelled: false };
  activeJobs.set(job.id, record);
  emit(job, 'started', { title: request.title || job.url });
  let scriptWarning = '';
  try {
    scriptWarning = await runScript('before', current, record);
    if (record.cancelled) throw new Error(local('İptal edildi.'));
  } catch (error) {
    activeJobs.delete(job.id);
    record.terminal = true;
    fs.rmSync(workDir, { recursive: true, force: true });
    emit(job, record.cancelled ? 'cancelled' : 'failed', { detail: error.message });
    return { id: job.id };
  }
  let attempt = 0, transportSettings = current, refreshed = false;
  const attempts = [];
  const launch = () => {
    const child = spawn(requiredTool('yt-dlp.exe'), args, { windowsHide: true });
    record.child = child;
    let stdoutTail = '', stderrTail = '', errorTail = '', archiveSkipped = false;
    const trackProgress = createProgressTracker();
    const finishCancelled = () => {
      if (record.terminal) return;
      record.terminal = true;
      activeJobs.delete(job.id);
      fs.rmSync(workDir, { recursive: true, force: true });
      emit(job, 'cancelled', { detail: 'İptal edildi.' });
    };
    const consumeOutput = (chunk, isError = false) => {
      const text = chunk.toString();
      if (isError) errorTail = `${errorTail}\n${text}`.slice(-6000);
      const lines = `${isError ? stderrTail : stdoutTail}${text}`.split(/\r?\n|\r/);
      if (isError) stderrTail = lines.pop();
      else stdoutTail = lines.pop();
      for (const line of lines) {
        if (/has already been recorded in the archive/i.test(line)) archiveSkipped = true;
        const progress = trackProgress(line);
        if (progress) emit(job, 'progress', progress);
      }
    };
    child.stdout.on('data', (chunk) => consumeOutput(chunk));
    child.stderr.on('data', (chunk) => consumeOutput(chunk, true));
    child.on('error', (error) => { if (record.cancelled) return finishCancelled(); if (record.terminal) return; record.terminal = true; activeJobs.delete(job.id); fs.rmSync(workDir, { recursive: true, force: true }); emit(job, 'failed', { detail: error.message }); });
    child.on('close', async (code) => {
      if (record.terminal) return;
      if (record.cancelled) return finishCancelled();
      attempts.push({ downloader: transportSettings.useAria2 ? 'aria2' : 'native', code, detail: redactDiagnostic(errorTail) });
      const retry = retryDownload({ attempt, code, error: errorTail + stdoutTail, useAria2: transportSettings.useAria2, refreshed });
      if (retry) {
        attempt += 1;
        refreshed = retry.refreshed;
        transportSettings = { ...current, useAria2: retry.useAria2 };
        // Re-extract the original page and validate fresh media URLs before resuming.
        // Never reuse cached signed URLs or change the user's authentication settings.
        args = downloadArgs(job, transportSettings, workDir);
        args.splice(args.length - 1, 0, '--check-formats');
        emit(job, 'progress', { percent: 0, detail: local(retry.reason === 'aria2' ? 'Aria2 başarısız; normal indirme deneniyor…' : 'İndirme bağlantısı yenileniyor…') });
        launch();
        return;
      }
      record.terminal = true;
      let published = [];
      try { published = publishMedia(workDir, record.destination, { ...job, playlist: current.playlist, playlistFolder: current.playlistFolder, splitChapters: current.splitChapters, keepOriginal: current.keepOriginal }); } catch (error) { errorTail = `${errorTail}\n${error.message}`; }
      if (!published.length && code !== 0) {
        writePrivate(path.join(workDir, 'failure.json'), { version: app.getVersion(), createdAt: new Date().toISOString(), attempts });
      }
      const recoveryPath = published.length ? '' : preserveRecovery(workDir, job.id);
      if (!recoveryPath) {
        if (current.keepFragments && fs.readdirSync(workDir).length) {
          const retained = path.join(app.getPath('userData'), 'fragments', job.id);
          fs.mkdirSync(path.dirname(retained), { recursive: true });
          fs.renameSync(workDir, retained);
        } else fs.rmSync(workDir, { recursive: true, force: true });
      }
      if (published.length) {
        const afterWarning = await runScript('after', current, record, published).catch(() => 'Dosya kaydedildi; son script kesildi.');
        const warning = code !== 0 || !!scriptWarning || !!afterWarning;
        remember(job, { files: published, warning });
        emit(job, 'complete', { detail: afterWarning || scriptWarning || (code === 0 ? 'Kaydedildi' : 'Medya kaydedildi; isteğe bağlı son işlem tamamlanamadı.'), files: published.map((filePath) => path.basename(filePath)), warning });
      } else if (code === 0 && archiveSkipped) {
        emit(job, 'complete', { detail: 'Daha önce indirildiği için tekrar atlandı.', skipped: true });
      } else {
        const reason = errorTail.trim().split(/\r?\n/).filter(Boolean).pop()?.replace(/https?:\/\/\S+/g, '[URL]') || `yt-dlp: ${code}`;
        const detail = recoveryPath ? `${reason} · Kurtarma dosyaları: ${recoveryPath}` : reason;
        emit(job, 'failed', { detail });
      }
      activeJobs.delete(job.id);
    });
  };
  launch();
  return { id: job.id };
});
handleMain('download:cancel', (_, jobId) => {
  const record = activeJobs.get(jobId);
  if (!record || record.terminal || record.cancelled) return false;
  record.cancelled = true;
  emit(record.job, 'cancelling', { detail: 'İptal ediliyor…' });
  if (process.platform === 'win32' && record.child?.pid) {
    const terminator = spawn('taskkill', ['/pid', String(record.child.pid), '/t', '/f'], { windowsHide: true });
    terminator.on('error', () => { try { record.child.kill(); } catch {} });
  } else {
    try { record.child.kill('SIGTERM'); } catch {}
  }
  return true;
});
handleMain('folder:open', () => shell.openPath(settings.downloadFolder));
handleMain('history:get', () => history.map(item => ({ ...item, files: (item.files || []).map(file => path.basename(file)) })));
handleMain('history:open', (_, id, reveal) => {
  const item = history.find(item => item.id === id);
  const file = item?.files?.[0];
  if (!file || !fs.existsSync(file)) throw new Error(local('Dosya bulunamadı.'));
  if (reveal) shell.showItemInFolder(file); else return shell.openPath(file);
});
handleMain('profiles:list', () => profiles.map(({ id, name }) => ({ id, name })));
handleMain('profiles:save', (_, name) => {
  const label = String(name || '').trim().slice(0, 40);
  if (!label) throw new Error('Profil adı girin.');
  const existing = profiles.find(profile => profile.name === label);
  if (!existing && profiles.length >= 12) throw new Error('En fazla 12 profil.');
  const item = { id: existing?.id || randomUUID(), name: label, settings: { ...settings } };
  profiles = [item, ...profiles.filter(profile => profile.id !== item.id)];
  writePrivate(profilesPath(), profiles);
  return { id: item.id, name: item.name };
});
handleMain('profiles:load', (_, id) => {
  const item = profiles.find(profile => profile.id === id);
  if (!item) throw new Error(local('Profil bulunamadı.'));
  return saveSettings({ ...item.settings, onboardingComplete: true });
});
const privateConfigKeys = new Set(['downloadFolder','cookieMode','cookieBrowser','cookieLoginUrl','proxyUrl','refererUrl','userAgent','extractorArgs','onboardingComplete','scriptBeforeEnabled','scriptAfterEnabled']);
handleMain('settings:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: 'ZenithW-settings.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (result.canceled) return false;
  writePrivate(result.filePath, { version: 1, settings: Object.fromEntries(Object.entries(settings).filter(([key]) => !privateConfigKeys.has(key))) });
  return true;
});
handleMain('settings:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'ZenithW settings', extensions: ['json'] }] });
  if (result.canceled) return null;
  if (fs.statSync(result.filePaths[0]).size > 65536) throw new Error(local('Ayar dosyası çok büyük.'));
  const value = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
  if (value.version !== 1 || !value.settings) throw new Error('Geçerli bir ZenithW ayar dosyası seçin.');
  return saveSettings(Object.fromEntries(Object.entries(value.settings).filter(([key]) => !privateConfigKeys.has(key))));
});
handleMain('cookies:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Netscape cookies', extensions: ['txt'] }] });
  if (result.canceled) return false;
  if (fs.statSync(result.filePaths[0]).size > 1024 * 1024) throw new Error(local('Cookie dosyası çok büyük.'));
  const content = fs.readFileSync(result.filePaths[0], 'utf8');
  if (!/^# (?:Netscape )?HTTP Cookie File/m.test(content)) throw new Error(local('Netscape cookie dosyası seçin.'));
  const rows = content.split(/\r?\n/).filter(line => line && (!line.startsWith('#') || line.startsWith('#HttpOnly_')));
  if (!rows.length || rows.length > 2000 || rows.some(line => line.split('\t').length !== 7)) throw new Error(local('Geçersiz cookie dosyası.'));
  fs.writeFileSync(cookiePath(), content, { mode: 0o600 });
  saveSettings({ cookieMode: 'session' });
  return { count: rows.length };
});
