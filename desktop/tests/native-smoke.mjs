// Real WebView2 → Rust IPC → bundled yt-dlp/FFmpeg smoke test.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createServer as createSocket } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const executable = resolve(process.argv[2] || '');
const tools = resolve(process.argv[3] || join(dirname(executable), 'bin'));
assert.ok(process.argv[2], 'Usage: node desktop/tests/native-smoke.mjs <Zenith.exe> [tools-directory]');
const root = await mkdtemp(join(tmpdir(), 'zenith-native-smoke-'));
const data = join(root, 'data');
const output = join(root, 'output');
const fixture = join(root, 'fixture.mp4');
await mkdir(data);
await mkdir(output);
await writeFile(join(data, 'settings.json'), JSON.stringify({
  settingsVersion: 3, language: 'en', downloadFolder: output, onboardingComplete: true,
  autoUpdateYtDlp: false, downloadArchive: false, maxDownloads: 1, theme: 'light'
}));
const generated = spawnSync(join(tools, 'ffmpeg.exe'), [
  '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=blue:size=160x90:rate=24:duration=2',
  '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', fixture
], { windowsHide: true });
assert.equal(generated.status, 0, generated.stderr?.toString() || generated.error?.message);
const bytes = await readFile(fixture);
const server = createServer((request, response) => {
  if (request.url === '/playlist.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return response.end('<title>Smoke playlist</title><video controls src="/fixture.mp4"></video><video controls src="/second.mp4"></video>');
  }
  response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': bytes.length });
  if (request.method === 'HEAD') return response.end();
  if (request.url !== '/slow.mp4') return response.end(bytes);
  let offset = 0;
  const timer = setInterval(() => {
    response.write(bytes.subarray(offset, offset + 256));
    offset += 256;
    if (offset >= bytes.length) { clearInterval(timer); response.end(); }
  }, 100);
  response.on('close', () => clearInterval(timer));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const portPicker = createSocket();
await new Promise(resolve => portPicker.listen(0, '127.0.0.1', resolve));
const port = portPicker.address().port;
await new Promise(resolve => portPicker.close(resolve));
const source = 'http://127.0.0.1:' + server.address().port;
const launch = () => spawn(executable, [], {
  windowsHide: true,
  env: { ...process.env, ZENITHW_DATA_DIR: data,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-address=127.0.0.1 --remote-debugging-port=' + port }
});
let app = launch();
let socket;
let diagnostics = '';
function captureDiagnostics() {
  app.stderr.on('data', chunk => { diagnostics += chunk; });
  app.stdout.on('data', chunk => { diagnostics += chunk; });
}
captureDiagnostics();
async function until(action, description, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let error;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) throw Error('Zenith exited early: ' + diagnostics);
    try { const value = await action(); if (value) return value; } catch (e) { error = e; }
    await delay(120);
  }
  throw Error('Timed out waiting for ' + description + (error ? ': ' + error.message : '') + '\n' + diagnostics);
}
async function connect() {
  const target = await until(async () => {
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    return targets.find(item => item.type === 'page' && /^http:\/\/tauri\.localhost\/(?:app\.html)?$/.test(item.url));
  }, 'the packaged WebView2 renderer');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const result = JSON.parse(event.data);
    const handler = pending.get(result.id);
    if (handler) { pending.delete(result.id); handler(result); }
  });
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(Error('WebView evaluation timed out')); }, 25000);
    pending.set(id, response => {
      clearTimeout(timeout);
      const exception = response.result?.exceptionDetails;
      if (response.error || exception) reject(Error(response.error?.message || exception.exception?.description || exception.exception?.value || exception.text));
      else resolve(response.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await request('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  await until(() => evaluate('Boolean(window.zenith && !document.querySelector("#launch-splash"))'), 'Rust bridge and initial settings');
  return { evaluate, request };
}
async function stop(graceful = false) {
  socket?.close();
  if (app.exitCode !== null) return;
  const exited = once(app, 'exit');
  if (graceful) {
    const powershell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${app.pid}).CloseMainWindow()`], { windowsHide: true });
    assert.match(result.stdout.toString(), /True/);
    const code = await Promise.race([exited, delay(10000).then(() => { throw Error('Windows did not close Zenith'); })]);
    assert.equal(code[0], 0, diagnostics);
  } else {
    app.kill();
    await exited;
  }
}
function contrast(first, second) {
  const luminance = color => {
    const values = color.startsWith('#') ? (color.length === 4 ? color.slice(1).split('').map(c => parseInt(c + c, 16)) : color.slice(1).match(/../g).map(c => parseInt(c, 16))) : color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
    const rgb = values.map(value => value / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
try {
  let { evaluate, request } = await connect();
  const call = (name, ...args) => evaluate('window.zenith.' + name + '(...' + JSON.stringify(args) + ')');
  assert.equal((await call('appInfo')).version, '5.0.0');
  assert.equal((await call('settings.get')).theme, 'light');
  await call('settings.save', { theme: 'dark', videoQuality: 720 });
  assert.equal(JSON.parse(await readFile(join(data, 'settings.json'), 'utf8')).videoQuality, 720);
  const profile = await call('profiles.save', 'Smoke profile');
  assert.equal((await call('profiles.list'))[0].id, profile.id);
  assert.equal((await call('profiles.load', profile.id)).videoQuality, 720);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); true`);
  const read = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);
  const change = (selector, value) => evaluate(`(() => {
    const field = document.querySelector(${JSON.stringify(selector)});
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const openSettings = async () => {
    await click('#workspace-menu-button');
    assert.equal(await evaluate('document.querySelector("#workspace-menu").matches(":popover-open")'), true);
    await click('#workspace-menu [data-settings="general-settings"]');
    assert.equal(await evaluate('document.querySelector("#settings-dialog").open'), true);
  };
  const tab = id => click(`.settings-tabs button[data-tab="${id}"]`);
  const key = async (name, code, windowsVirtualKeyCode) => {
    await request('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode });
    await request('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode });
  };
  const setting = async (id, expected) => until(async () => (await call('settings.get'))[id] === expected, id + ' persisted as ' + expected);
  await openSettings();
  const themes = await evaluate('[...document.querySelector("#theme").options].map(option => [option.value,option.textContent])');
  assert.deepEqual(themes, [['light', 'White'], ['dark', 'Black'], ['neon', 'Purple neon'], ['system', 'System']]);
  for (const [value, background] of [['light', 'rgb(255, 255, 255)'], ['dark', 'rgb(12, 12, 15)'], ['neon', 'rgb(18, 11, 34)']]) {
    await change('#theme', value);
    await setting('theme', value);
    await until(() => evaluate(`document.documentElement.dataset.theme === ${JSON.stringify(value)}`), value + ' applied in the renderer');
    const colors = await evaluate(`(() => {
      const style = getComputedStyle(document.documentElement);
      const color = name => style.getPropertyValue('--' + name).trim();
      return { background: getComputedStyle(document.body).backgroundColor, panel: color('panel'),
        text: color('text'), muted: color('muted'), focus: color('focus'), accent: color('accent'), onAccent: color('on-accent') };
    })()`);
    assert.equal(colors.background, background);
    assert.ok(contrast(colors.text, colors.panel) >= 4.5, value + ' text contrast');
    assert.ok(contrast(colors.muted, colors.panel) >= 4.5, value + ' secondary text contrast');
    assert.ok(contrast(colors.focus, colors.panel) >= 3, value + ' focus indicator contrast');
    assert.ok(contrast(colors.accent, colors.onAccent) >= 4.5, value + ' button text contrast');
  }
  await change('#theme', 'system');
  await setting('theme', 'system');
  for (const [preference, background] of [['light', 'rgb(255, 255, 255)'], ['dark', 'rgb(12, 12, 15)']]) {
    await request('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: preference }] });
    await until(() => evaluate(`getComputedStyle(document.body).backgroundColor === ${JSON.stringify(background)}`), 'system follows ' + preference);
  }
  await request('Emulation.setEmulatedMedia', { features: [] });
  await change('#theme', 'neon');
  await setting('theme', 'neon');
  await change('#accentColor', 'violet');
  await setting('accentColor', 'violet');
  const switches = await evaluate(`[...document.querySelectorAll('#settings-dialog .settings-panel input[type="checkbox"][id]')].map(input => ({
    id: input.id, panel: input.closest('.settings-panel').id, label: input.getAttribute('aria-labelledby') || input.getAttribute('aria-label')
  }))`);
  assert.ok(switches.length >= 25, 'Settings switch inventory');
  assert.ok(switches.every(item => item.label), 'Every settings switch has a readable label');
  const initial = await call('settings.get');
  if (!initial.advancedMode) {
    await click('#advancedMode');
    await setting('advancedMode', true);
  }
  for (const { id, panel } of switches) {
    await tab(panel);
    assert.equal(await evaluate(`document.querySelector('.settings-tabs button[data-tab="${panel}"]').getAttribute('aria-pressed')`), 'true');
    const old = (await call('settings.get'))[id];
    assert.equal(typeof old, 'boolean', id);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).getClientRects().length > 0`), true, id + ' is available in its settings category');
    await click('#' + id);
    await setting(id, !old);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).checked`), !old, id + ' checked state');
    await click('#' + id);
    await setting(id, old);
  }
  await tab('general-settings');
  await click('#hideHelp');
  await setting('hideHelp', true);
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#folder-value")).display !== "none"'), true);
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#general-settings .setting small:not([data-live-status])")).display'), 'none');
  await click('#hideHelp');
  await setting('hideHelp', false);
  await evaluate('document.querySelector("#naming").focus(); document.querySelector("#naming").value = "A draft filename"; true');
  await click('#reducedMotion');
  await setting('reducedMotion', true);
  assert.equal(await read('#naming'), 'A draft filename');
  await evaluate('document.querySelector("#naming").value = settings.naming; document.querySelector("#reducedMotion").focus(); true');
  await key(' ', 'Space', 32);
  await setting('reducedMotion', false);
  await tab('network-settings');
  const proxy = (await call('settings.get')).proxyUrl;
  await change('#proxyUrl', 'not a proxy');
  await until(() => evaluate('document.querySelector("#save-state").dataset.state === "error"'), 'visible validation error');
  assert.equal((await call('settings.get')).proxyUrl, proxy);
  assert.match(await evaluate('document.querySelector("#save-state").textContent'), /url|proxy/i);
  await tab('general-settings');
  await click('#advancedMode');
  await setting('advancedMode', false);
  await request('Emulation.setDeviceMetricsOverride', { width: 780, height: 540, deviceScaleFactor: 1, mobile: false });
  const headings = new Set();
  for (const lang of ['tr', 'de', 'ru', 'en']) {
    await tab('general-settings');
    await change('#language', lang);
    await setting('language', lang);
    await until(() => evaluate(`document.documentElement.lang === ${JSON.stringify(lang)}`), lang + ' applies to the app');
    for (const name of ['news', 'about']) {
      await tab(name + '-settings');
      const article = await evaluate(`(() => {
        const panel = document.querySelector('#${name}-settings'), content = document.querySelector('.settings-content');
        return { heading: panel.querySelector('h3').textContent, body: panel.textContent,
          sections: panel.querySelectorAll('h4').length, visible: panel.getClientRects().length > 0,
          horizontallyFits: content.scrollWidth <= content.clientWidth + 2, scrolls: content.scrollHeight > content.clientHeight };
      })()`);
      assert.ok(article.visible && article.horizontallyFits && article.scrolls, lang + ' ' + name + ' at minimum viewport');
      assert.ok(article.sections >= 3 && article.body.length > 700, lang + ' ' + name + ' has substantive content');
      assert.match(article.body, /Rust/);
      assert.match(article.body, /WebView2/);
      if (name === 'news') headings.add(article.heading);
    }
  }
  assert.equal(headings.size, 4, 'new release headings are localized in every desktop language');
  await request('Emulation.clearDeviceMetricsOverride');
  await click('#settings-dialog .close-dialog');
  assert.equal(await evaluate('document.querySelector("#settings-dialog").open'), false);
  await openSettings();
  await key('Escape', 'Escape', 27);
  await until(() => evaluate('!document.querySelector("#settings-dialog").open'), 'Escape dismisses settings');
  await openSettings();
  const corner = await evaluate(`(() => {
    const rect = document.querySelector('#settings-dialog').getBoundingClientRect();
    return {x: Math.ceil(rect.left+18), y: Math.ceil(rect.top+18)};
  })()`);
  await request('Input.dispatchMouseEvent', { type: 'mousePressed', ...corner, button: 'left', buttons: 1, clickCount: 1 });
  await request('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 3, y: 3, button: 'left', buttons: 0, clickCount: 1 });
  assert.equal(await evaluate('document.querySelector("#settings-dialog").open'), true, 'a drag that begins inside the dialog does not close it');
  await request('Input.dispatchMouseEvent', { type: 'mousePressed', x: 3, y: 3, button: 'left', buttons: 1, clickCount: 1 });
  await request('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 3, y: 3, button: 'left', buttons: 0, clickCount: 1 });
  await until(() => evaluate('!document.querySelector("#settings-dialog").open'), 'backdrop dismisses settings');
  await click('[data-quick="subtitles"]');
  await evaluate('document.querySelector("#quick-body [data-key=subtitles]").focus(); true');
  await key(' ', 'Space', 32);
  await setting('subtitles', true);
  await until(() => evaluate('document.activeElement.dataset.key === "subtitles"'), 'quick switch keeps keyboard focus');
  await key(' ', 'Space', 32);
  await setting('subtitles', false);
  await key('Escape', 'Escape', 27);
  assert.equal(await evaluate('document.querySelector("#url-options").matches(":popover-open")'), false);
  assert.equal(await evaluate('document.activeElement.dataset.quick'), 'subtitles');
  console.log('PASS: four theme modes, contrast, ' + switches.length + ' switches in both directions, native settings persistence, failed-save feedback, dialog controls, and quick settings focus.');
  const found = await call('tools');
  assert.ok(found.ytDlp && found.ffmpeg && found.aria2, JSON.stringify(found));
  await assert.rejects(call('cookies.login', 'http://example.com/'), /HTTPS/);
  await assert.rejects(call('inspect', 'file:///C:/Windows/win.ini'), /HTTP/);
  const inspected = await call('inspect', source + '/fixture.mp4', 'smoke-inspect');
  assert.ok(inspected.title, JSON.stringify(inspected));
  await evaluate(`(() => {
    document.querySelector('#url').value = ${JSON.stringify(source + '/fixture.mp4')};
    document.querySelector('#url-form').requestSubmit();
    return true;
  })()`);
  await until(() => evaluate('document.querySelector("#media-dialog").open'), 'the renderer download dialog');
  await evaluate('document.querySelector("#media-dialog").close(); true');
  await evaluate('window.smokeEvents = []; window.zenith.onDownload(event => window.smokeEvents.push(event)); true');
  const waitEvent = (id, type) => until(() => evaluate(
    'window.smokeEvents.find(e => e.jobId === ' + JSON.stringify(id) + ' && e.type === ' + JSON.stringify(type) + ')'
  ), type + ' event');
  await openSettings();
  await tab('playlist-settings');
  if (!(await call('settings.get')).playlist) await click('#playlist');
  await setting('playlist', true);
  if (!(await call('settings.get')).promptPlaylist) await click('#promptPlaylist');
  await setting('promptPlaylist', true);
  await change('#playlistItems', '1:5');
  await setting('playlistItems', '1:5');
  await click('#settings-dialog .close-dialog');
  const analyzePlaylist = async () => {
    await evaluate(`document.querySelector('#url').value = ${JSON.stringify(source + '/playlist.html')}; document.querySelector('#url-form').requestSubmit(); true`);
    await until(() => evaluate('document.querySelector("#media-dialog").open'), 'the playlist download dialog');
    assert.equal(await evaluate('document.querySelector("#download-playlist").checked'), true);
  };
  await analyzePlaylist();
  await click('#download');
  await until(() => evaluate('document.querySelector("#playlist-dialog").open'), 'playlist selection when prompting is on');
  await click('#playlist-none');
  assert.equal(await evaluate('document.querySelector("#playlist-confirm").disabled'), true);
  await click('#playlist-all');
  assert.equal(await evaluate('document.querySelector("#playlist-confirm").disabled'), false);
  await click('#playlist-dialog .close-dialog');
  await click('#media-dialog .close-dialog');
  await openSettings();
  await tab('playlist-settings');
  await click('#promptPlaylist');
  await setting('promptPlaylist', false);
  await click('#settings-dialog .close-dialog');
  await analyzePlaylist();
  await click('#download');
  await until(() => evaluate('window.smokeEvents.find(e => e.type === "started")'), 'playlist starts without a prompt');
  assert.equal(await evaluate('document.querySelector("#playlist-dialog").open'), false);
  const playlistResult = await until(() => evaluate('window.smokeEvents.find(e => ["complete","failed"].includes(e.type))'), 'selected playlist item publication', 60000);
  assert.equal(playlistResult.type, 'complete', JSON.stringify(playlistResult));
  assert.equal(playlistResult.files.length, 2);
  console.log('PASS: real playlist metadata, select all/none, and prompt on/off with a preset range.');
  const slow = await call('start', { url: source + '/slow.mp4', title: 'Slow fixture', kind: 'video' });
  await waitEvent(slow.id, 'started');
  const queued = await call('start', { url: source + '/fixture.mp4', title: 'Fast fixture', kind: 'video' });
  await waitEvent(queued.id, 'queued');
  assert.equal((await call('start', { url: source + '/fixture.mp4', kind: 'video' })).duplicate, true);
  assert.equal(await call('cancel', slow.id), true);
  await waitEvent(slow.id, 'cancelled');
  const completed = await until(() => evaluate(
    'window.smokeEvents.find(e => e.jobId === ' + JSON.stringify(queued.id) + ' && ["complete","failed"].includes(e.type))'
  ), 'download publication', 60000);
  assert.equal(completed.type, 'complete', JSON.stringify(completed));
  assert.ok(completed.files?.length);
  const history = await call('history.get');
  assert.equal(history[0].id, queued.id);
  assert.ok((await stat(join(output, completed.files[0]))).size > 1024);
  assert.equal(JSON.parse(await readFile(join(data, 'history.json'), 'utf8'))[0].id, queued.id);
  await stop(true);
  diagnostics = '';
  app = launch();
  captureDiagnostics();
  ({ evaluate, request } = await connect());
  assert.equal((await call('settings.get')).theme, 'neon');
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'neon');
  assert.equal((await call('history.get'))[0].id, queued.id);
  assert.equal((await call('settings.get')).reducedMotion, false);
  console.log('PASS: WebView2 IPC, v4 settings data, profiles, bundled tools, URL validation, metadata, deduplicated queue, cancellation, media publication, and history.');
} finally {
  await stop();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  if (dirname(resolve(root)) === resolve(tmpdir()) && basename(root).startsWith('zenith-native-smoke-')) {
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {});
  }
}
