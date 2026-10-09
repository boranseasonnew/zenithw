import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { onRequest } from '../functions/_middleware.js';
import { PAGES_CSP } from '../shared/pages-security.mjs';
import { STATIC_ASSET_PATHS } from '../shared/pages-cache-assets.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(join(root, file), 'utf8');
const manifest = JSON.parse(read('scripts/cache-assets-manifest.json'));
const routes = JSON.parse(read('frontend/_routes.json'));
const headersText = read('frontend/_headers');
const headers = new Map();
let pattern;
for (const line of headersText.split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue;
  if (!/^\s/.test(line)) { pattern = line; headers.set(pattern, {}); }
  else {
    const [, name, value] = /^\s+([^:]+):\s*(.+)$/.exec(line);
    headers.get(pattern)[name.toLowerCase()] = value;
  }
}
const excluded = path => routes.exclude.some(rule => rule.endsWith('*')
  ? path.startsWith(rule.slice(0, -1)) : path === rule);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});

test('only verified content-hashed copies are immutable; ordinary assets have bounded TTLs', () => {
  for (const [source, entry] of Object.entries(manifest)) {
    const bytes = readFileSync(join(root, 'frontend', entry.url));
    const actual = createHash('sha256').update(bytes).digest('hex');
    assert.equal(actual, entry.sha256, source);
    assert.ok(entry.url.includes('.' + actual.slice(0, 12) + '.'), source);
    assert.equal(headers.get('/cache-assets/*')['cache-control'], 'public, max-age=31536000, immutable');
    assert.ok(!headers.get('/' + source)['cache-control'].includes('immutable'));
    assert.ok(excluded(entry.url));
  }
  for (const [url, values] of headers) {
    if (values['cache-control']?.includes('immutable')) {
      assert.equal(url, '/cache-assets/*');
      for (const file of walk(join(root, 'frontend/cache-assets'))) {
        const bytes = readFileSync(file);
        assert.ok(file.includes('.' + createHash('sha256').update(bytes).digest('hex').slice(0, 12) + '.'));
      }
    }
  }
  for (const url of ['/favicon.ico', '/zenithw.png', '/site-shell.js', '/vendor/local-media-worker.js']) {
    assert.equal(headers.get(url)['cache-control'], 'public, max-age=3600, must-revalidate');
  }
  assert.match(headers.get('/runtime-config.js')['cache-control'], /no-store/);
  assert.equal(headers.get('/version.js')['cloudflare-cdn-cache-control'], 'no-store');
  assert.match(headers.get('/sitemap.xml')['cache-control'], /s-maxage=300/);
});

test('Pages output uses valid header/routing rules and never excludes HTML or dynamic endpoints', () => {
  assert.ok(headers.size <= 100);
  assert.ok(headersText.split('\n').every(line => line.length <= 2000));
  assert.equal(headers.get('/*')['cache-control'], undefined);
  assert.deepEqual(routes.include, ['/*']);
  assert.ok(routes.include.length + routes.exclude.length <= 100);
  assert.ok(routes.exclude.every(rule => rule.length <= 100));
  for (const path of ['/', '/about', '/updates/v14.4', '/status', '/maintenance', '/maintenance-status',
    '/maintenance-config.json', '/api/info', '/files/token.mp4', '/download', '/auth/session']) {
    assert.ok(!excluded(path), path);
  }
  for (const path of STATIC_ASSET_PATHS) assert.ok(excluded(path), path);
});

test('every generated resource reference resolves and dependency fingerprints are linked', () => {
  for (const page of walk(join(root, 'frontend')).filter(path => path.endsWith('.html'))) {
    const source = readFileSync(page, 'utf8');
    assert.ok(!source.includes('/cache-assets//cache-assets/'), page);
    for (const match of source.matchAll(/\/cache-assets\/[^"'\s?<>]+/g)) {
      assert.ok(readFileSync(join(root, 'frontend', match[0])).length > 0, page + ': ' + match[0]);
    }
  }
  const core = manifest['updates-core.99daf4ea6088.js'].url;
  assert.ok(read('frontend' + core).includes(manifest['updates-archive.07c744021db2.js'].url));
  assert.ok(read('frontend' + manifest['fonts.css'].url).includes(manifest['fonts/GeistMono-Variable.woff2'].url));
});

function context(path, { active = false, method = 'GET', requestHeaders = {}, responseHeaders = {}, status = 200 } = {}) {
  const calls = { assets: 0, next: 0 };
  return {
    calls,
    request: new Request('https://zenithw.space' + path, { method, headers: requestHeaders }),
    env: { MAINTENANCE_MODE: 'workflow', ASSETS: { fetch: async url => {
      calls.assets++;
      if (new URL(url).pathname === '/maintenance-config.json') return Response.json({ active, retryAfter: 900 });
      return new Response('<html>Maintenance</html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    } } },
    next: async () => {
      calls.next++;
      return new Response(method === 'HEAD' ? null : '<html>Page</html>', {
        status, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=31536000, immutable', ...responseHeaders },
      });
    },
  };
}
const assertBypass = response => {
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'), 'no-store');
};

test('public static assets bypass maintenance work even while maintenance is active', async () => {
  for (const path of ['/zenithw.png', '/robots.txt', '/vendor/local-media-worker.js', manifest['fonts.css'].url]) {
    const ctx = context(path, { active: true });
    await onRequest(ctx);
    assert.deepEqual(ctx.calls, { assets: 0, next: 1 }, path);
  }
});

test('HTML revalidates, carries the full CSP and never caches the live maintenance decision', async () => {
  const ctx = context('/about');
  const response = await onRequest(ctx);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
  assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Security-Policy'), PAGES_CSP);
  assert.match(PAGES_CSP, /'sha256-/);
  assert.ok(!PAGES_CSP.match(/script-src[^;]*'unsafe-inline'/));
});

test('maintenance status, previews, 503s and unsupported methods remain uncached', async () => {
  for (const [path, options, status] of [
    ['/', { active: true }, 503],
    ['/maintenance', { active: true }, 200],
    ['/maintenance-status', { active: true }, 200],
    ['/maintenance-status', { method: 'POST' }, 405],
    ['/maintenance-status', { method: 'HEAD' }, 200],
  ]) {
    const response = await onRequest(context(path, options));
    assert.equal(response.status, status, path);
    assertBypass(response);
    if (status === 503) assert.equal(response.headers.get('Retry-After'), '900');
    if (options.method === 'HEAD') assert.equal(await response.text(), '');
  }
});

test('cookie/auth responses, errors and API-shaped paths remain private without changing their body', async () => {
  for (const options of [
    { requestHeaders: { Cookie: 'session=example' } },
    { requestHeaders: { Authorization: 'Bearer example' } },
    { responseHeaders: { 'Set-Cookie': 'session=example; HttpOnly' } },
    { responseHeaders: { 'Content-Type': 'application/json' } },
    { method: 'POST' },
    { status: 404 },
  ]) {
    const response = await onRequest(context('/api/private.png', options));
    assertBypass(response);
    assert.match(response.headers.get('Cache-Control'), /private/);
    assert.equal(await response.text(), '<html>Page</html>');
  }
});

test('source/dependency changes rotate URLs and retain old hashed copies for cached pages', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'zenithw-cache-test-'));
  try {
    for (const path of ['scripts/build-cache-assets.mjs', 'scripts/update_csp.py', 'scripts/cache-assets-manifest.json',
      'frontend/_headers', 'frontend/index.html', 'frontend/about.html', 'frontend/cache-assets',
      ...Object.keys(manifest).map(source => 'frontend/' + source)]) {
      const destination = join(fixture, path);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, path), destination, { recursive: true });
    }
    const archive = join(fixture, 'frontend/updates-archive.07c744021db2.js');
    writeFileSync(archive, readFileSync(archive, 'utf8') + '\n// simulated content update\n');
    const font = join(fixture, 'frontend/fonts/GeistMono-Variable.woff2');
    writeFileSync(font, Buffer.concat([readFileSync(font), Buffer.from('new-version')]));
    execFileSync(process.execPath, [join(fixture, 'scripts/build-cache-assets.mjs')], { cwd: fixture, stdio: 'pipe' });
    const updated = JSON.parse(readFileSync(join(fixture, 'scripts/cache-assets-manifest.json'), 'utf8'));
    for (const source of ['updates-archive.07c744021db2.js', 'updates-core.99daf4ea6088.js', 'fonts/GeistMono-Variable.woff2', 'fonts.css']) {
      assert.notEqual(updated[source].url, manifest[source].url, source);
      assert.ok(readFileSync(join(fixture, 'frontend', manifest[source].url)).length > 0);
    }
    const html = readFileSync(join(fixture, 'frontend/index.html'), 'utf8');
    assert.ok(html.includes(updated['fonts.css'].url));
    assert.ok(!html.includes(manifest['fonts.css'].url));
    execFileSync(process.execPath, [join(fixture, 'scripts/build-cache-assets.mjs'), '--check'], { cwd: fixture, stdio: 'pipe' });
    writeFileSync(join(fixture, 'frontend/cache-assets/unverified.js'), 'not fingerprinted');
    assert.throws(() => execFileSync(process.execPath, [join(fixture, 'scripts/build-cache-assets.mjs')], { cwd: fixture, stdio: 'pipe' }), /Unsafe file in the immutable output directory/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
