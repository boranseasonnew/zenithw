import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../frontend/${path}`, import.meta.url), 'utf8');

test('release notes are present in the first HTML without JavaScript', () => {
  const latest = read('updates.html');
  const older = read('updates/v14.4/index.html');
  assert.match(latest, /Zenith Type: ritmini bul/);
  assert.match(latest, /<a href="\/typing"[^>]*>Zenith Type/);
  assert.match(read('updates/v16.0/index.html'), /Dosyanı seç; vokal ve müzik birlikte ayrılsın/);
  assert.match(older, /YouTube daha akıllı, ilerleme daha net/);
  assert.match(older, /Gerçek akış çözünürlüğü doğrulanıyor/);
  assert.match(older, /<link rel="canonical" href="https:\/\/zenithw\.space\/updates\/v14\.4\/">/);
  assert.ok(statSync(new URL('../frontend/updates.html', import.meta.url)).size < 45_000);
  assert.ok(statSync(new URL('../frontend/updates/v14.4/index.html', import.meta.url)).size < 45_000);
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

test('v15.3–v15.9 notes have static content and accessible archive links', () => {
  for (let minor=3; minor<=9; minor++) {
    const html=read(`updates/v15.${minor}/index.html`);
    assert.match(html, new RegExp(`id="updBadge"[^>]*>v15\\.${minor}<`));
    assert.match(html, new RegExp(`<option value="v15\\.${minor}" selected>`));
    assert.match(html, /id="updRecent"/);
    assert.match(html, /id="release-section-1"/);
    for (const lang of ['en','de','fr','ru','vi','zh','ja']) {
      const path=`${lang}/updates/v15.${minor}/index.html`;
      assert.doesNotMatch(read(path), />Neler değişti|>Son sürümler|aria-label="Son sürümler"/);
    }
  }
  assert.match(read('updates.html'), /v15.9/);
  assert.match(read('updates/v15.2/index.html'), /Yeni uygulamalar, yeni sayfalar ve daha fazla dil/);
});
