import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL('../desktop/' + path, import.meta.url), 'utf8');

test('desktop browser preview leaves native access unavailable', () => {
  const window = {};
  runInNewContext(read('src/native.js'), { window, console });
  assert.equal(window.zenith, undefined);
});

test('renderer sends structured arguments to Rust and receives download events', async () => {
  const calls = [];
  const subscriptions = new Map();
  const window = { __TAURI__: {
    core: { invoke: async (command, payload) => calls.push([command, payload]) },
    event: { listen: async (name, callback) => {
      subscriptions.set(name, callback);
      return () => subscriptions.delete(name);
    } }
  } };
  runInNewContext(read('src/native.js'), { window, console });
  const url = 'https://example.test/video?q=a%26b';
  await window.zenith.inspect(url, 'request-1');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['dispatch', { channel: 'media:inspect', args: [url, 'request-1'] }]
  ]);
  let received;
  const stop = window.zenith.onDownload(event => { received = event; });
  subscriptions.get('download:event')({ payload: { type: 'complete', jobId: 'fixture' } });
  assert.deepEqual(received, { type: 'complete', jobId: 'fixture' });
  await stop();
  assert.equal(subscriptions.size, 0);
});

test('packaged renderer receives event capabilities only in the main window', () => {
  const config = JSON.parse(read('native/tauri.conf.json'));
  assert.equal(config.identifier, 'space.zenithw.desktop.stable');
  assert.deepEqual(config.app.security.capabilities, [{
    identifier: 'main-window', windows: ['main'],
    permissions: ['core:event:allow-listen', 'core:event:allow-unlisten']
  }]);
  const html = read('src/app.html');
  assert.ok(html.indexOf('src="native.js"') < html.indexOf('src="app.js"'));
  assert.match(config.app.security.csp, /default-src 'none'/);
});
