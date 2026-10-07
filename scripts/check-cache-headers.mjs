import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const argument = name => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const base = argument('--base-url') || 'https://zenithw.space';
const api = argument('--api-url') || 'https://api.zenithw.space';
const skipApi = process.argv.includes('--skip-api');
const manifest = JSON.parse(readFileSync(new URL('./cache-assets-manifest.json', import.meta.url), 'utf8'));
let failures = 0;
async function inspect(baseUrl, path, verify) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Do not add cache-busting queries or request no-cache headers.
      const response = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      const bytes = Buffer.from(await response.arrayBuffer());
      console.log(JSON.stringify({
        url: response.url, attempt, status: response.status,
        cacheControl: response.headers.get('Cache-Control'),
        cloudflareCdnCacheControl: response.headers.get('Cloudflare-CDN-Cache-Control'),
        cfCacheStatus: response.headers.get('CF-Cache-Status'),
        age: response.headers.get('Age'), etag: response.headers.get('ETag'),
        setCookie: response.headers.has('Set-Cookie'),
      }));
      verify(response, bytes);
    } catch (error) { failures++; console.error(path + ': ' + error.message); }
  }
}
for (const entry of Object.values(manifest)) {
  await inspect(base, entry.url, (response, bytes) => {
    assert.equal(response.status, 200);
    assert.ok(!response.headers.has('Set-Cookie'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, 'Deployed file differs from its fingerprint');
    assert.match(response.headers.get('Cache-Control') || '', /max-age=31536000/);
    assert.match(response.headers.get('Cache-Control') || '', /immutable/);
  });
}
for (const path of ['/zenithw.png', '/favicon.ico', '/site-shell.js']) {
  await inspect(base, path, response => {
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Cache-Control') || '', /max-age=3600/);
    assert.ok(!response.headers.get('Cache-Control').includes('immutable'));
  });
}
for (const path of ['/', '/about', '/updates/v14.4']) {
  await inspect(base, path, response => {
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Cache-Control') || '', /max-age=0/);
    assert.ok(!response.headers.get('Cache-Control').includes('immutable'));
    assert.match(response.headers.get('Content-Security-Policy') || '', /'sha256-/);
  });
}
for (const path of ['/runtime-config.js', '/maintenance-status', '/maintenance']) {
  await inspect(base, path, response => {
    assert.match(response.headers.get('Cache-Control') || '', /no-store/);
    assert.notEqual(response.headers.get('CF-Cache-Status'), 'HIT');
  });
}
if (!skipApi) {
  // These GETs do not start jobs or access real file tokens.
  for (const path of ['/health', '/status', '/files/cache-audit-invalid-token', '/download']) {
    await inspect(api, path, response => {
      assert.match(response.headers.get('Cache-Control') || '', /no-store/);
      assert.notEqual(response.headers.get('CF-Cache-Status'), 'HIT');
    });
  }
}
console.log(failures ? failures + ' checks failed.' : 'All response and fingerprint checks passed.');
process.exitCode = failures ? 1 : 0;
