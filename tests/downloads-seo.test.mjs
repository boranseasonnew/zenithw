import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';
import { onRequest } from '../functions/_middleware.js';
import { guides } from '../scripts/seo-content.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const config=JSON.parse(read('shared/site-config.json'));
const routes=JSON.parse(read('shared/localized-routes.json'));
const languages=['tr','en','de','fr','ru','vi','zh','ja'];
const catalogs=Object.fromEntries(languages.map(lang=>[lang,JSON.parse(read(`frontend/locales/${lang}.json`))]));
const languagePath=(route,lang)=>lang==='tr'?route:'/'+lang+(route==='/'?'/':route);
const fileFor=route=>'frontend/'+(route.endsWith('/')?route.slice(1)+'index.html':route.slice(1)+'.html');
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const visible=html=>decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'')).replace(/\s+/g,' ');

test('all 600 localized pages have self-canonicals, complete reciprocal hreflang and valid translated metadata',()=>{
 for(const route of routes)for(const lang of languages){
  const localized=languagePath(route,lang), html=read(fileFor(localized)), expected=config.origin+localized;
  assert.match(html,new RegExp('<html lang="'+(lang==='zh'?'zh-CN':lang)+'"'),localized);
  const canonicals=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  assert.equal(canonicals.length,1,localized);assert.equal(canonicals[0][1],expected);
  const alternatives=[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  assert.equal(alternatives.length,9,localized);
  for(const other of languages)assert.ok(alternatives.some(([,code,url])=>code===(other==='zh'?'zh-CN':other)&&url===config.origin+languagePath(route,other)),localized+' '+other);
  assert.ok(alternatives.some(([,code,url])=>code==='x-default'&&url===config.origin+route));
  assert.equal([...html.matchAll(/<h1\b/g)].length,1,localized+' H1');
  const title=decode(/<title[^>]*>(.*?)<\/title>/s.exec(html)[1]);
  assert.ok(title.length>8 && title.includes('ZenithW'),localized+' title');
  assert.ok(/name="description"[^>]*content="[^"]{8,}"/.test(html),localized+' description');
  assert.ok(html.includes('property="og:url" content="'+expected+'"'));
  assert.ok(html.includes('name="twitter:title"'));
  const graph=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])['@graph'];
  assert.equal(graph.find(item=>['WebPage','TechArticle'].includes(item['@type'])).inLanguage,lang==='zh'?'zh-CN':lang);
 }
});

test('all four complete guide articles contain their translated paragraphs and steps without JavaScript',()=>{
 for(const guide of guides)for(const lang of languages){
  const source=visible(read(fileFor(languagePath('/guides/'+guide.slug,lang))));
  for(const section of guide.en.sections)for(const original of [section.heading,...(section.paragraphs||[]),...(section.steps||[])]){
   const expected=catalogs[lang][original.trim()];
   assert.ok(expected,lang+' catalog: '+original);
   assert.ok(source.includes(visible(expected)),lang+' guide: '+original);
  }
 }
});

test('release archives contain translated content and their real per-version canonical',()=>{
 const ctx=vm.createContext({window:{}}), core=read('frontend/updates-core.99daf4ea6088.js');
 vm.runInContext(core.slice(0,core.indexOf('let CUR_LANG='))+';globalThis.releases=CURRENT_RELEASES;',ctx);
 vm.runInContext(read('frontend/updates-archive.07c744021db2.js'),ctx);
 for(const [index,release] of [...ctx.releases,...ctx.window.ZW_UPDATE_ARCHIVE].entries())for(const lang of languages){
  const route=index===0?'/updates':`/updates/${release.ver}/`, html=read(fileFor(languagePath(route,lang))), text=visible(html);
  assert.match(html,/<title id="pgTitle"/);assert.match(html,/<meta name="description" id="pgDesc"/);
  const strings=lang==='tr'?[release.titleTr,...release.introTr,...release.sections.flatMap(section=>[section.hTr,section.pTr])]:[release.titleEn,...release.introEn,...release.sections.flatMap(section=>[section.hEn,section.pEn])];
  for(const original of strings) {
   const translated=catalogs[lang][original.trim()] || original;
   assert.ok(text.includes(visible(translated)),`${lang} ${release.ver}: ${original}`);
  }
 }
});

test('the sitemap includes every real localized route and excludes aliases, private UI and nonexistent translations',()=>{
 const sitemap=read('frontend/sitemap.xml'), urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
 assert.equal(new Set(urls).size,urls.length);
 for(const url of urls){
  const path=new URL(url).pathname;assert.ok(existsSync(join(root,fileFor(path))),url);
  assert.doesNotMatch(path,/(?:^|\/)(app|pc-app|settings|history|maintenance)(?:\/|$)/);
 }
 for(const route of routes)for(const lang of languages)assert.ok(urls.includes(config.origin+languagePath(route,lang)));
 for(const lang of languages.filter(l=>l!=='tr'))assert.ok(!urls.includes(config.origin+'/'+lang+'/about/privacy'));
 assert.ok(!sitemap.includes('<lastmod>2026-10-10</lastmod>'));
});

test('legacy Android and Windows requests permanently redirect to the right language and anchor, preserving queries',async()=>{
 for(const lang of languages)for(const [old,anchor] of [['app','android'],['pc-app','windows']])for(const suffix of ['','.html','/'])for(const method of ['GET','HEAD']) {
  const prefix=lang==='tr'?'':'/'+lang, url='https://zenithw.space'+prefix+'/'+old+suffix+'?source=old';
  const response=await onRequest({request:new Request(url,{method}),env:{},next(){throw new Error('Alias must not request an asset');}});
  assert.equal(response.status,301);assert.equal(response.headers.get('Location'),'https://zenithw.space'+prefix+'/downloads?source=old#'+anchor);assert.equal(await response.text(),'');
 }
});

test('download choices use actual release assets, verified versions and honest pending-store labels',()=>{
 const html=read('frontend/en/downloads.html');
 assert.ok(html.includes('Windows 10/11'));assert.ok(html.includes('Android 7.0'));
 for(const platform of ['windows','android'])assert.ok(html.includes(config[platform].version));
 for(const asset of [config.windows.installer,config.windows.portable,...config.android.apks])assert.ok(html.includes('href="'+asset.url+'"'));
 assert.equal((html.match(/>Under Review<\/span>/g)||[]).length,4);
 assert.ok(!html.includes('https://apps.microsoft.com/detail/'));assert.ok(!html.includes('https://www.uptodown.com/zenith'));
 assert.ok(html.includes('winget install --id ZenithW.Desktop --exact --source winget'));
 assert.ok(visible(html).includes(catalogs.en['This command will be available after the WinGet package is approved.']));
});

test('Telegram links on all public/private pages use the shared URL and safe new-tab attributes',()=>{
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
 for(const file of walk(join(root,'frontend')).filter(file=>file.endsWith('.html'))){
  const source=readFileSync(file,'utf8');assert.ok(source.includes('data-community="footer"'),file);
  for(const match of source.matchAll(/<a\b[^>]*href="https:\/\/t\.me\/[^>]+>/g)){
   assert.ok(match[0].includes('href="'+config.telegram+'"'),file);assert.ok(match[0].includes('target="_blank"'));assert.ok(match[0].includes('rel="noopener noreferrer"'));
  }
 }
});

test('removing Telegram configuration removes previously generated links instead of leaving broken placeholders',()=>{
 const temp=mkdtempSync(join(tmpdir(),'zenith-community-test-'));
 try {
  for(const directory of ['scripts','shared','frontend'])mkdirSync(join(temp,directory));
  cpSync(join(root,'scripts/build-community.mjs'),join(temp,'scripts/build-community.mjs'));
  writeFileSync(join(temp,'shared/site-config.json'),JSON.stringify({telegram:null}));
  writeFileSync(join(temp,'frontend/index.html'),read('frontend/index.html'));
  execFileSync(process.execPath,[join(temp,'scripts/build-community.mjs')],{stdio:'pipe'});
  const result=readFileSync(join(temp,'frontend/index.html'),'utf8');assert.doesNotMatch(result,/<a\b[^>]*href="https:\/\/t\.me\//);assert.ok(!result.includes('data-community="footer"'));
 } finally { rmSync(temp,{recursive:true,force:true}); }
});

function languageRuntime(url,saved='ru') {
 const assigned=[],document={readyState:'complete',documentElement:{getAttribute:()=>null},querySelectorAll:()=>[],getElementById:()=>null};
 const location=new URL(url);location.assign=value=>assigned.push(value);
 const window={location,dispatchEvent(){}};
 const ctx=vm.createContext({window,document,navigator:{languages:['ja-JP']},localStorage:{getItem:()=>saved,setItem(){}},URLSearchParams,CustomEvent:class{},console,fetch:async url=>({ok:true,json:async()=>catalogs[/([a-z]+)\.json$/.exec(url)[1]]})});
 vm.runInContext(read('frontend/site-language.js'),ctx);return {api:window.ZWLanguage,assigned};
}
test('explicit locale URLs win over preferences; navigation preserves queries/anchors and legal routes',async()=>{
 const {api}=languageRuntime('https://zenithw.space/de/downloads');await api.ready;assert.equal(api.current,'de');
 assert.equal(api.path('/updates/v14.4/?a=b#section-1'),'/de/updates/v14.4/?a=b#section-1');
 assert.equal(api.path('/app'),'/de/downloads#android');assert.equal(api.path('/pc-app.html'),'/de/downloads#windows');
 assert.equal(api.path('/en/'),'/de/');assert.equal(api.path('/about/privacy'),'/about/privacy');assert.equal(api.path('//evil.example'),'//evil.example');
 const settings=languageRuntime('https://zenithw.space/settings?return=%2Fde%2Fdownloads%23windows');await settings.api.ready;assert.equal(settings.api.current,'de');await settings.api.use('ja');assert.deepEqual(settings.assigned,['/ja/downloads#windows']);
});
