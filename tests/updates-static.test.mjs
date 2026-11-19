import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import {rows as v17Copy} from '../scripts/v17-release-copy.mjs';

const read = path => readFileSync(new URL(`../frontend/${path}`, import.meta.url), 'utf8');

test('release notes are present in the first HTML without JavaScript', () => {
  const latest = read('updates.html');
  const older = read('updates/v14.4/index.html');
  assert.match(latest, /Yeni araçlar, daha iyi medya kontrolü/);
  assert.match(read('updates/v16.1/index.html'), /Zenith Type: ritmini bul/);
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

test('web 17.1 is complete in eight languages and preserves v17.0 as an archive', () => {
  const languages=['tr','en','de','fr','ru','vi','zh','ja'];
  for(const [index,language] of languages.entries()){
    const prefix=language==='tr'?'':language+'/';
    const latest=read(prefix+'updates.html');
    assert.match(latest,/id="updBadge"[^>]*>v17\.1</);
    assert.ok(latest.includes(v17Copy[0][index]),language+' release title');
    assert.ok(latest.includes(v17Copy[1][index]),language+' release introduction');
    for(let section=0;section<6;section++){
      assert.ok(latest.includes(v17Copy[3+section*2][index]),language+' section '+section);
      assert.ok(latest.includes(v17Copy[4+section*2][index]),language+' section copy '+section);
    }
    assert.match(latest,/<option value="v17\.1" selected>/);
    assert.match(latest,/href="\/updates\/v17\.0\/"/);
    assert.match(latest,/updates-core\.0aa3d3bc7b27\.js/);
    assert.match(latest,/site-language\.d606975b05f0\.js/);
    assert.match(latest,/version\.js\?v=17\.1/);
    const archived=read(prefix+'updates/v17.1/index.html');
    assert.match(archived,/id="updBadge"[^>]*>v17\.1</);
    assert.match(archived,new RegExp('rel="canonical" href="https://zenithw\\.space/'+prefix+'updates/v17\\.1/"'));
    assert.match(archived,/<option value="v17\.1" selected>/);
    const older=read(prefix+'updates/v16.1/index.html');
    assert.match(older,/id="updBadge"[^>]*>v16\.1</);
    assert.match(older,new RegExp('rel="canonical" href="https://zenithw\\.space/'+prefix+'updates/v16\\.1/"'));
    assert.match(read(prefix+'index.html'),/version\.js\?v=17\.1-desktop5\.0\.0/);
  }
  const archivedV170=read('updates/v17.0/index.html');
  assert.match(archivedV170,/id="updBadge"[^>]*>v17\.0</);
  assert.match(archivedV170,/rel="canonical" href="https:\/\/zenithw\.space\/updates\/v17\.0\//);
  assert.match(read('site-language.js'),/updates\/v17\.1\//);
  const sitemap=read('sitemap.xml');
  for(const language of languages){
    const prefix=language==='tr'?'':language+'/';
    assert.ok(sitemap.includes('https://zenithw.space/'+prefix+'updates/v17.1/'),language+' sitemap');
  }
  assert.match(read('version.js'),/ver: 'v17\.1'/);
  for(const file of ['README.md','README.tr.md','README.de.md','README.fr.md','README.ja.md']){
    assert.match(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/17\.1/,file);
  }
  const versionSource=read('version.js');
  const webVersion=/ver:\s*'v([0-9.]+)'/.exec(versionSource)[1];
  const desktopVersion=/desktop:\s*\{\s*ver:\s*'v([0-9.]+)'/.exec(versionSource)[1];
  const desktopReadme=new URL('../desktop/README.md',import.meta.url);
  if(existsSync(desktopReadme))assert.ok(readFileSync(desktopReadme,'utf8').includes('Web '+webVersion),'desktop/README.md web version');
  const storeReadme=new URL('../desktop/store/README.md',import.meta.url);
  if(existsSync(storeReadme))assert.ok(readFileSync(storeReadme,'utf8').includes('Desktop **'+desktopVersion+'**'),'desktop/store/README.md desktop version');
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
