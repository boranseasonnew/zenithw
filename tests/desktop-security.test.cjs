const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { createProgressTracker } = require('../desktop/src/progress.cjs');
const { videoFormats } = require('../desktop/src/formats.cjs');

const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'src', 'main.cjs'), 'utf8');
const start = source.indexOf('function sanitizeNaming(');
const end = source.indexOf('\nfunction bounded(', start);
assert.ok(start >= 0 && end > start);
const sanitizeNaming = vm.runInNewContext(`${source.slice(start, end)}\nsanitizeNaming`);

test('Desktop output templates remain single filenames inside the job directory', () => {
  assert.equal(sanitizeNaming('%(title)s [%(id)s].%(ext)s'), '%(title)s [%(id)s].%(ext)s');
  for (const value of ['../outside', '..\\outside', 'C:\\outside', '/outside', '', '.',
    'a:b', 'a\u0000b', 'a'.repeat(201)]) {
    assert.throws(() => sanitizeNaming(value), { message: 'Invalid output filename template.' });
  }
});

test('Desktop keeps Electron isolation and gates privileged IPC to its main window', () => {
  assert.match(source, /contextIsolation:\s*true/);
  assert.match(source, /nodeIntegration:\s*false/);
  assert.match(source, /sandbox:\s*true/);
  assert.match(source, /function handleMain\(channel, handler\)/);
  assert.match(source, /event\.sender !== mainWindow\.webContents/);
  assert.match(source, /event\.senderFrame !== mainWindow\.webContents\.mainFrame/);
  assert.match(source, /setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/);
});

test('Desktop terminates Windows download process trees on cancellation and exit', () => {
  assert.match(source, /taskkill', \['\/pid', String\(record\.child\.pid\), '\/t', '\/f'\]/);
  assert.match(source, /app\.on\('before-quit'/);
});

test('Desktop reads complete large yt-dlp metadata and rejects oversized output', async () => {
  const runStart = source.indexOf('function runTool(');
  const runEnd = source.indexOf('async function performUpdate(', runStart);
  assert.ok(runStart >= 0 && runEnd > runStart);
  const runTool = vm.runInNewContext(`${source.slice(runStart, runEnd)}\nrunTool`, {
    spawn, process, Buffer, setTimeout, clearTimeout, Error, Promise
  });
  const emitJson = 'process.stdout.write(JSON.stringify({title:"demo",payload:"x".repeat(140000)}))';
  const result = await runTool(process.execPath, ['-e', emitJson], 10000, 16 * 1024 * 1024);
  assert.equal(JSON.parse(result.stdout).payload.length, 140000);
  await assert.rejects(runTool(process.execPath, ['-e', emitJson], 10000, 65536), /safe output limit/);
  assert.match(source, /90000, 16 \* 1024 \* 1024/);
});

test('Desktop keeps video, audio and postprocessing below 100% until publication', () => {
  const track = createProgressTracker();
  assert.equal(track('[SponsorBlock] Fetching SponsorBlock segments'), null);
  track('[info] id: Downloading 1 format(s): 299+251');
  track('[download] Destination: video.f299.mp4');
  assert.equal(track('[download] 10.0% of  200MiB at 2MiB/s').percent, 4);
  assert.equal(track('[download] 100% of  200MiB in 00:00:08').percent, 45);
  track('[download] Destination: audio.f251.webm');
  assert.equal(track('[download] 20.0% of  5MiB at 1MiB/s').percent, 54);
  assert.equal(track('[download] 100% of  5MiB in 00:00:01').percent, 90);
  assert.equal(track('[Merger] Merging formats').percent, 93);
  assert.equal(track('[Metadata] Adding metadata').percent, 97);
});

test('Desktop prefers direct H.264 media over an HLS stream at the same resolution', () => {
  const formats = videoFormats({ formats: [
    { format_id: '312', height: 1080, fps: 60, ext: 'mp4', protocol: 'm3u8_native', vcodec: 'avc1.64002a', acodec: 'none' },
    { format_id: '299', height: 1080, fps: 60, ext: 'mp4', protocol: 'https', vcodec: 'avc1.64002a', acodec: 'none' },
    { format_id: '303', height: 1080, fps: 60, ext: 'webm', protocol: 'https', vcodec: 'vp9', acodec: 'none' },
    { format_id: '233', ext: 'mp4', protocol: 'm3u8_native', vcodec: 'none', acodec: 'unknown', language_preference: 10 },
    { format_id: '140', ext: 'm4a', protocol: 'https', vcodec: 'none', acodec: 'mp4a.40.2', tbr: 129 },
    { format_id: '251', ext: 'webm', vcodec: 'none', acodec: 'opus', tbr: 120 }
  ] });
  assert.equal(formats[0].id, '299+140/best');
  assert.equal(formats.some((format) => format.id.startsWith('312+')), false);
  const webm = videoFormats({ formats: [
    { format_id: '299', height: 1080, fps: 60, ext: 'mp4', protocol: 'https', vcodec: 'avc1.64002a', acodec: 'none' },
    { format_id: '303', height: 1080, fps: 60, ext: 'webm', protocol: 'https', vcodec: 'vp9', acodec: 'none' },
    { format_id: '251', ext: 'webm', vcodec: 'none', acodec: 'opus', tbr: 120 }
  ] }, 'webm');
  assert.equal(webm[0].id, '303+251/best');
  assert.ok(webm.every((format) => format.ext === 'webm'));
});

test('Desktop never attempts to stream-copy an old MP4 selection into WebM', () => {
  const start = source.indexOf('function downloadArgs(');
  const end = source.indexOf('\nconst mediaExtensions', start);
  const downloadArgs = vm.runInNewContext(`${source.slice(start, end)}\ndownloadArgs`, {
    path, sanitizeNaming: (value) => value, baseArgs: () => [], bounded: (value) => value,
    aria2Args: () => []
  });
  const current = { naming: '%(title)s.%(ext)s', retries: 3, concurrentFragments: 2, playlist: false, videoContainer: 'webm', embedThumbnail: true };
  const args = downloadArgs({ kind: 'video', format: '299+140', formatExt: 'mp4', url: 'https://example.com/video' }, current, 'C:\\Temp\\job');
  assert.equal(args[args.indexOf('--merge-output-format') + 1], 'mp4');
  assert.equal(args[args.indexOf('--remux-video') + 1], 'mp4');
  assert.ok(args.includes('--embed-thumbnail'));
  const webm = downloadArgs({ kind: 'video', format: '303+251', formatExt: 'webm', url: 'https://example.com/video' }, current, 'C:\\Temp\\job');
  assert.equal(webm[webm.indexOf('--merge-output-format') + 1], 'webm');
  assert.equal(webm.includes('--embed-thumbnail'), false);
});

test('Desktop preserves downloaded streams when postprocessing cannot publish a file', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zenithw-recovery-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workDir = path.join(root, 'job');
  fs.mkdirSync(workDir);
  fs.writeFileSync(path.join(workDir, 'video.f299.mp4'), Buffer.alloc(2048));
  const start = source.indexOf('function preserveRecovery(');
  const end = source.indexOf('\nfunction jobKey(', start);
  assert.ok(start >= 0 && end > start);
  const preserveRecovery = vm.runInNewContext(`${source.slice(start, end)}\npreserveRecovery`, {
    fs, path, mediaExtensions: new Set(['.mp4']), app: { getPath: () => path.join(root, 'userdata') }
  });
  const recovery = preserveRecovery(workDir, 'test-job');
  assert.ok(fs.existsSync(path.join(recovery, 'video.f299.mp4')));
  assert.equal(fs.existsSync(workDir), false);
});
