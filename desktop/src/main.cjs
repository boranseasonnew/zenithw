const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const activeJobs = new Map();
const COOKIE_PARTITION = 'persist:zenithw-login';
const allowedBrowsers = new Set(['chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi']);
const allowedChannels = new Set(['stable', 'nightly']);
const defaults = {
  downloadFolder: '', naming: '%(title)s [%(id)s].%(ext)s', playlist: false, language: 'tr',
  videoQuality: '1080', videoContainer: 'mp4', videoCodec: 'h264', audioFormat: 'mp3', audioQuality: '192',
  subtitles: false, subtitleLang: 'tr,en', embedMetadata: true, embedThumbnail: false, embedChapters: true,
  sponsorBlock: false, sponsorCategories: 'sponsor,selfpromo,interaction', downloadArchive: true,
  concurrentFragments: 4, retries: 10, speedLimit: '', socketTimeout: 20, ipMode: 'auto', proxyUrl: '',
  useAria2: false, aria2Connections: 8, cookieMode: 'none', cookieBrowser: 'firefox',
  cookieLoginUrl: 'https://www.youtube.com/', ytDlpChannel: 'nightly', autoUpdateYtDlp: false, reducedMotion: false,
  settingsVersion: 2
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
  return { ...defaults, downloadFolder: path.join(app.getPath('downloads'), 'ZenithW'), ...saved };
}
function saveSettings(next) {
  const clean = { ...next };
  if (clean.language && !['tr', 'en', 'ru', 'de'].includes(clean.language)) delete clean.language;
  if (clean.ipMode && !['auto', 'ipv4', 'ipv6'].includes(clean.ipMode)) delete clean.ipMode;
  if (clean.ytDlpChannel && !allowedChannels.has(clean.ytDlpChannel)) delete clean.ytDlpChannel;
  if (clean.cookieMode && !['none', 'session', 'browser'].includes(clean.cookieMode)) delete clean.cookieMode;
  if (clean.cookieBrowser && !allowedBrowsers.has(clean.cookieBrowser)) delete clean.cookieBrowser;
  settings = { ...settings, ...clean };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(settings, null, 2), { mode: 0o600 });
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
  try { url = new URL(String(value || '').trim()); } catch { throw new Error(msg('badUrl')); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(msg('badUrl'));
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
function toolVersion(name, args = ['--version']) {
  try { return execFileSync(resource(name), args, { encoding: 'utf8', windowsHide: true, timeout: 12000 }).trim().split(/\r?\n/)[0]; }
  catch { return null; }
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180, height: 760, minWidth: 680, minHeight: 540, autoHideMenuBar: true,
    backgroundColor: '#080b14', titleBarStyle: 'hidden', titleBarOverlay: { color: '#080b14', symbolColor: '#d8e1ff' },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const appHtml = path.join(__dirname, 'app.html');
  const appUrl = pathToFileURL(appHtml).href;
  mainWindow.webContents.on('will-navigate', (event, nextUrl) => {
    if (nextUrl !== appUrl) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.loadFile(appHtml);
}
function emit(job, type, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('download:event', { jobId: job.id, type, ...payload });
}
function progressFromLine(line) {
  const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/i);
  if (!match) return null;
  const percent = Math.min(100, Math.max(0, Number(match[1])));
  return { percent, detail: line.slice((match.index || 0) + match[0].length).trim() || 'İndiriliyor…' };
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
  return [...args, ...authArgs(current)];
}
function aria2Args(current = settings) {
  if (!current.useAria2) return [];
  const connections = bounded(current.aria2Connections, 1, 16, 8);
  return ['--downloader', requiredTool('aria2c.exe'), '--downloader-args', `aria2c:-x ${connections} -s ${connections} -j ${connections} --file-allocation=none --summary-interval=1`];
}
const baseArgs = (current = settings) => ['--ignore-config', '--no-warnings', '--ffmpeg-location', requiredTool('ffmpeg.exe'), ...networkArgs(current)];
function downloadArgs(job, current, workDir) {
  const output = path.join(workDir, sanitizeNaming(current.naming));
  const args = ['--newline', ...baseArgs(current), '--paths', workDir, '--paths', `temp:${workDir}`, '-o', output,
    '--retries', String(bounded(current.retries, 1, 30, 10)), '--fragment-retries', String(bounded(current.retries, 1, 30, 10)),
    '--concurrent-fragments', String(bounded(current.concurrentFragments, 1, 16, 4)), ...aria2Args(current)];
  args.push(current.playlist ? '--yes-playlist' : '--no-playlist');
  if (current.speedLimit) args.push('--limit-rate', String(current.speedLimit));
  args.push('--windows-filenames');
  if (job.kind === 'audio') args.push('-f', 'bestaudio/best', '-x', '--audio-format', job.audioFormat || current.audioFormat, '--audio-quality', `${current.audioQuality}K`);
  else { const container = current.videoContainer || 'mp4'; args.push('-f', job.format || 'bv*+ba/b', '--merge-output-format', container, '--remux-video', container); }
  if (current.embedMetadata) args.push('--embed-metadata');
  if (current.embedChapters) args.push('--embed-chapters');
  // Keep thumbnail work private to the job; only the finished media is published.
  if (current.embedThumbnail) args.push('--embed-thumbnail');
  if (current.subtitles && job.kind !== 'audio') args.push('--write-subs', '--write-auto-subs', '--sub-langs', current.subtitleLang || 'tr,en', '--embed-subs');
  if (current.sponsorBlock && job.kind !== 'audio') args.push('--sponsorblock-remove', current.sponsorCategories || 'sponsor,selfpromo,interaction');
  if (current.downloadArchive) args.push('--download-archive', path.join(app.getPath('userData'), 'download-archive.txt'));
  args.push(job.url);
  return args;
}

const mediaExtensions = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4a', '.mp3', '.opus', '.ogg', '.flac', '.wav', '.aac']);
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
function publishMedia(workDir, destination, job) {
  const inspected = fs.readdirSync(workDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(workDir, entry.name))
    .filter((file) => !/\.(f\d+|temp)\.[^.]+$/i.test(path.basename(file)))
    .map(inspectMedia)
    .filter(Boolean);
  let selected;
  if (job.kind === 'audio') {
    selected = inspected.filter((item) => item.types.has('audio')).sort((a, b) => b.size - a.size).slice(0, 1);
  } else {
    const merged = inspected.filter((item) => item.types.has('video') && item.types.has('audio'));
    const candidates = merged.length ? merged : inspected.filter((item) => item.types.has('video'));
    selected = job.playlist ? candidates : candidates.sort((a, b) => b.size - a.size).slice(0, 1);
  }
  fs.mkdirSync(destination, { recursive: true });
  return selected.map(({ file: source }) => {
    const target = uniqueDestination(destination, path.basename(source));
    fs.renameSync(source, target);
    return target;
  });
}
function jobKey(job) {
  return `${job.kind}|${job.format || job.audioFormat || ''}|${job.url}`.toLowerCase();
}
function runTool(file, args, timeout = 180000, maxStdoutBytes = 65536) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true });
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
  if (activeJobs.size) throw new Error(msg('busy'));
  if (!allowedChannels.has(channel)) throw new Error(msg('updateFail'));
  const result = await runTool(requiredTool('yt-dlp.exe'), ['--update-to', channel], 240000);
  saveSettings({ ytDlpChannel: channel });
  return { channel, version: toolVersion('yt-dlp.exe'), detail: (result.stdout || result.stderr).trim() };
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
  saveSettings({ cookieLoginUrl: url });
  if (loginWindow && !loginWindow.isDestroyed()) { loginWindow.focus(); loginWindow.loadURL(url); return { opened: true }; }
  loginWindow = new BrowserWindow({ width: 1040, height: 760, minWidth: 680, minHeight: 520, parent: mainWindow, autoHideMenuBar: true, title: 'ZenithW — Cookie Login', backgroundColor: '#09090b', webPreferences: { partition: COOKIE_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  loginWindow.webContents.setWindowOpenHandler(({ url: next }) => { try { loginWindow.loadURL(sanitizeUrl(next)); } catch {} return { action: 'deny' }; });
  loginWindow.webContents.on('will-navigate', (event, next) => { try { sanitizeUrl(next); } catch { event.preventDefault(); } });
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
handleMain('folder:choose', async () => { const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0]; });
handleMain('app:tools', async () => ({ ytDlp: fs.existsSync(resource('yt-dlp.exe')), ytDlpVersion: toolVersion('yt-dlp.exe'), ffmpeg: fs.existsSync(resource('ffmpeg.exe')), ffmpegVersion: toolVersion('ffmpeg.exe', ['-version']), aria2: fs.existsSync(resource('aria2c.exe')), aria2Version: toolVersion('aria2c.exe'), cookieCount: (await session.fromPartition(COOKIE_PARTITION).cookies.get({})).length, sessionCookies: fs.existsSync(cookiePath()), directConnection: !settings.proxyUrl }));
handleMain('engine:update', (_, channel) => performUpdate(channel));
handleMain('cookies:login', (_, url) => openLogin(url));
handleMain('cookies:save', () => exportCookies());
handleMain('cookies:clear', async () => { await session.fromPartition(COOKIE_PARTITION).clearStorageData({ storages: ['cookies'] }); fs.rmSync(cookiePath(), { force: true }); saveSettings({ cookieMode: 'none' }); return { count: 0 }; });
handleMain('media:inspect', async (_, rawUrl) => {
  const url = sanitizeUrl(rawUrl);
  try {
    const result = await runTool(requiredTool('yt-dlp.exe'), ['--no-playlist', '--dump-single-json', '--skip-download', ...baseArgs(), url], 90000, 16 * 1024 * 1024);
    const data = JSON.parse(result.stdout);
    const formats = (data.formats || []).filter((format) => format.vcodec !== 'none' && format.height).sort((a, b) => (b.height - a.height) || ((b.fps || 0) - (a.fps || 0))).map((format) => ({ id: format.acodec && format.acodec !== 'none' ? format.format_id : `${format.format_id}+bestaudio/best`, height: format.height, ext: format.ext, fps: format.fps, codec: format.vcodec, size: format.filesize || format.filesize_approx || 0 })).filter((format, index, list) => list.findIndex((item) => item.height === format.height && item.ext === format.ext && item.fps === format.fps) === index).slice(0, 12);
    return { title: data.title, uploader: data.uploader || data.channel, duration: data.duration, thumbnail: data.thumbnail, formats };
  } catch (error) { throw new Error(`${msg('inspect')} ${error.message || ''}`.trim()); }
});
handleMain('download:start', (_, request) => {
  const job = { id: randomUUID(), url: sanitizeUrl(request.url), kind: request.kind === 'audio' ? 'audio' : 'video', format: String(request.format || ''), audioFormat: String(request.audioFormat || 'mp3') };
  const key = jobKey(job);
  const existing = [...activeJobs.values()].find((item) => item.key === key);
  if (existing) return { id: existing.job.id, duplicate: true };
  const current = { ...settings };
  const workDir = path.join(app.getPath('temp'), 'ZenithW', job.id);
  fs.mkdirSync(workDir, { recursive: true });
  const child = spawn(requiredTool('yt-dlp.exe'), downloadArgs(job, current, workDir), { windowsHide: true });
  const record = { child, job, key, workDir, destination: current.downloadFolder, terminal: false, cancelled: false };
  activeJobs.set(job.id, record);
  emit(job, 'started', { title: request.title || job.url });
  let tail = '', errorTail = '';
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
    tail += text;
    const lines = tail.split(/\r?\n|\r/);
    tail = lines.pop();
    for (const line of lines) {
      const progress = progressFromLine(line);
      if (progress) emit(job, 'progress', progress);
    }
  };
  child.stdout.on('data', (chunk) => consumeOutput(chunk));
  child.stderr.on('data', (chunk) => consumeOutput(chunk, true));
  child.on('error', (error) => { if (record.cancelled) return finishCancelled(); if (record.terminal) return; record.terminal = true; activeJobs.delete(job.id); fs.rmSync(workDir, { recursive: true, force: true }); emit(job, 'failed', { detail: error.message }); });
  child.on('close', (code) => {
    if (record.terminal) return;
    if (record.cancelled) return finishCancelled();
    record.terminal = true;
    activeJobs.delete(job.id);
    let published = [];
    try { published = publishMedia(workDir, record.destination, { ...job, playlist: current.playlist }); } catch (error) { errorTail = `${errorTail}\n${error.message}`; }
    fs.rmSync(workDir, { recursive: true, force: true });
    if (published.length) {
      emit(job, 'complete', { detail: code === 0 ? 'Kaydedildi' : 'Medya kaydedildi; isteğe bağlı son işlem tamamlanamadı.', files: published.map((filePath) => path.basename(filePath)), warning: code !== 0 });
    } else if (code === 0 && current.downloadArchive) {
      emit(job, 'complete', { detail: 'Daha önce indirildiği için tekrar atlandı.', skipped: true });
    } else {
      const detail = errorTail.trim().split(/\r?\n/).filter(Boolean).pop()?.replace(/https?:\/\/\S+/g, '[URL]') || `yt-dlp: ${code}`;
      emit(job, 'failed', { detail });
    }
  });
  return { id: job.id };
});
handleMain('download:cancel', (_, jobId) => {
  const record = activeJobs.get(jobId);
  if (!record || record.terminal || record.cancelled) return false;
  record.cancelled = true;
  emit(record.job, 'cancelling', { detail: 'İptal ediliyor…' });
  if (process.platform === 'win32' && record.child.pid) {
    const terminator = spawn('taskkill', ['/pid', String(record.child.pid), '/t', '/f'], { windowsHide: true });
    terminator.on('error', () => { try { record.child.kill(); } catch {} });
  } else {
    try { record.child.kill('SIGTERM'); } catch {}
  }
  return true;
});
handleMain('folder:open', () => shell.openPath(settings.downloadFolder));
