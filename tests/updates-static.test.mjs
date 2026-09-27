import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../frontend/${path}`, import.meta.url), 'utf8');

test('release notes are present in the first HTML without JavaScript', () => {
  const latest = read('updates.html');
  const older = read('updates/v14.4/index.html');
  assert.match(latest, /Daha net sınırlar, daha temiz bir ZenithW/);
  assert.match(latest, /YouTube web erişimi kapalı/);
  assert.match(older, /YouTube daha akıllı, ilerleme daha net/);
  assert.match(older, /Gerçek akış çözünürlüğü doğrulanıyor/);
  assert.match(older, /<link rel="canonical" href="https:\/\/zenithw\.space\/updates\/v14\.4">/);
  assert.ok(statSync(new URL('../frontend/updates.html', import.meta.url)).size < 20_000);
  assert.ok(statSync(new URL('../frontend/updates/v14.4/index.html', import.meta.url)).size < 20_000);
  assert.match(read('sitemap.xml'), /https:\/\/zenithw\.space\/updates\/v14\.4/);
});

test('restored Turkish content is stored as valid UTF-8 text', () => {
  for (const page of ['community.html', 'about/community.html', 'credit.html', 'app.html']) {
    const html = read(page);
    assert.doesNotMatch(html, /(?:Ã[¼¶§]|Ä[±°Ÿ]|Å[žŸ]|â€)/, page);
  }
  assert.match(read('community.html'), /topluluk \/ açık geliştirme/);
  assert.match(read('credit.html'), /Emeği geçenler ve lisanslar/);
});
