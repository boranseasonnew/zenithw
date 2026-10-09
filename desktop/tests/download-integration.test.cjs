const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { loadMain } = require('./main-harness.cjs');

test('real job flow retries aria2 with fresh native arguments and retains settings', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zenith-download-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [], events = [];
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const api = loadMain({ directory, onEvent: event => { events.push(event); if (event.type === 'failed') finish(); },
    childProcess: { spawn(file, args) {
      calls.push(args);
      const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
      setImmediate(() => { child.stderr.write(calls.length === 1 ? 'ERROR: aria2c exited with code 22\n' : 'ERROR: HTTP Error 403: Forbidden https://media.test/?sig=private\n'); child.emit('close', 1); });
      return child;
    }, execFileSync() { throw new Error('no completed media'); } }
  });
  api.initialize({ useAria2: true, cookieMode: 'none', downloadArchive: false });
  // File existence validation remains active, even with the process stub.
  assert.ok(fs.existsSync(path.resolve(__dirname, '../resources/bin/deno.exe')));
  await api.invoke('download:start', { url: 'https://video.test/watch', title: 'Test', kind: 'video', format: '299+140/best' });
  await done;
  assert.equal(calls.length, 3);
  assert.ok(calls[0].includes('--downloader'));
  assert.ok(!calls[1].includes('--downloader'));
  assert.ok(calls[1].includes('--check-formats'));
  assert.ok(!calls[1].includes('--no-continue'));
  assert.ok(!calls[2].includes('--downloader'));
  assert.ok(calls[2].includes('--check-formats'));
  assert.ok(calls[2].includes('--no-continue'));
  assert.equal(calls[2][calls[2].indexOf('--http-chunk-size') + 1], '1M');
  assert.equal(calls[0].at(-1), calls[1].at(-1));
  assert.equal(api.invoke('settings:get').useAria2, true);
  assert.equal(api.activeJobs.size, 0);
  const recovery = events.find(event => event.type === 'failed').detail.split('Kurtarma dosyaları: ')[1];
  const report = fs.readFileSync(path.join(recovery, 'failure.json'), 'utf8');
  assert.doesNotMatch(report, /sig=private/);
  assert.equal(JSON.parse(report).attempts.length, 3);
  assert.equal(JSON.parse(report).attempts[2].restarted, true);
  assert.equal(events.filter(event => event.type === 'failed').length, 1);
});

test('inspection and downloads explicitly use the packaged JS runtime', () => {
  const api = loadMain({ directory: os.tmpdir() });
  api.initialize({});
  const args = api.baseArgs();
  assert.equal(args[args.indexOf('--js-runtimes') + 1], `deno:${path.resolve(__dirname, '../resources/bin/deno.exe')}`);
});
