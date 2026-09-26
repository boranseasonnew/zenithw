const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { spawn } = require('node:child_process');

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
