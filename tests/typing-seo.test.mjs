import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const copy=JSON.parse(read('shared/typing-seo.json'));
const origin='https://zenithw.space';

test('Type has static localized content, self-canonicals and reciprocal sitemap alternates',()=>{
 const sitemap=read('frontend/sitemap.xml');
 let referenceIds;
 for(const lang of ['tr','en']){
  const html=read('frontend/'+(lang==='tr'?'typing.html':'en/typing.html'));
  const decoded=html.replaceAll('&#x27;',"'").replaceAll('&amp;','&');
  const path=copy[lang].path;
  assert.match(html,new RegExp('<html lang="'+lang+'"[^>]*data-typing-language="'+lang+'"'));
  assert.equal([...html.matchAll(/rel="canonical"/g)].length,1);
  assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'));
  assert.ok(html.includes(copy[lang].heading));
  assert.ok(decoded.includes(copy[lang].steps));
  assert.ok(decoded.includes(copy[lang].formula));
  assert.doesNotMatch(html,/<meta name="robots"[^>]*noindex/);
  for(const other of ['tr','en'])assert.ok(html.includes('hreflang="'+other+'" href="'+origin+copy[other].path+'"'));
  assert.equal([...sitemap.matchAll(new RegExp('<loc>'+origin+path+'</loc>','g'))].length,1);
  const entry=sitemap.split('<url>').find(entry=>entry.includes('<loc>'+origin+path+'</loc>'));
  assert.ok(entry.includes('<lastmod>'+copy.updated+'</lastmod>'));
  assert.ok(entry.includes('hreflang="en"'));
  assert.ok(entry.includes('hreflang="tr"'));
  const data=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.equal(data['@type'],'WebApplication');
  assert.equal(data.url,origin+path);
  assert.equal(data.inLanguage,lang);
  const nodes=[...html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g)].map(match=>[match[2],match[1]]);
  if(lang==='tr')referenceIds=nodes;
  else assert.deepEqual(nodes,referenceIds,'translation preserves interactive IDs and element types');
 }
 assert.ok(read('frontend/en/typing.html').includes('How does the test work?'));
 assert.ok(read('frontend/index.html').includes('href="/typing"'));
 assert.ok(read('frontend/en/index.html').includes('href="/en/typing"'));
});

test('explicit Turkish Type URL wins over an English browser preference',()=>{
 const document={documentElement:{dataset:{typingLanguage:'tr'}}};
 const context=vm.createContext({document,navigator:{languages:['en-US']},window:{}});
 vm.runInContext(read('frontend/typing-i18n.js'),context);
 assert.equal(context.window.TypeI18n.language,'tr');
 assert.equal(document.documentElement.lang,'tr');
});
