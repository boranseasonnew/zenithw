import {test} from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {listModels,encodeWav,waveformPeaks} from '../frontend/vendor/lilith-engine/index.js';
import {AUDIO_WORKER_CSP} from '../shared/audio-separator-security.mjs';
import {onRequest} from '../functions/_middleware.js';
test('integration uses the independent public SDK, not another engine',()=>{
 const js=readFileSync(new URL('../frontend/audio-tools.js',import.meta.url),'utf8');assert.match(js,/vendor\/lilith-engine\/index.js\?v=/);assert.doesNotMatch(js,/onnxruntime-web|PffftSTFT/);assert.match(js,/mountStudio/);
 assert.equal(listModels()[0].id,'mdx-default');assert.equal(listModels()[0].sizeBytes,66762490);
 const worker=readFileSync(new URL('../frontend/vendor/lilith-engine/separation-worker.js',import.meta.url),'utf8');
 assert.equal(readFileSync(new URL('../frontend/audio-separator-worker.js',import.meta.url),'utf8'),worker.replaceAll('"./runtime/','"/vendor/lilith-engine/runtime/'));
});
test('WASM permission/download hosts remain scoped to worker response',async()=>{
 const response=await onRequest({request:new Request('https://zenithw.space/audio-separator-worker.js'),next:async()=>new Response('// worker',{headers:{'Content-Type':'text/javascript'}})});
 assert.equal(response.headers.get('Content-Security-Policy'),AUDIO_WORKER_CSP);assert.match(AUDIO_WORKER_CSP,/'wasm-unsafe-eval'/);assert.doesNotMatch(AUDIO_WORKER_CSP,/'unsafe-eval'|https:\*/);
 assert.doesNotMatch(readFileSync(new URL('../shared/pages-security.mjs',import.meta.url),'utf8'),/'wasm-unsafe-eval'/);
 const routes=JSON.parse(readFileSync(new URL('../frontend/_routes.json',import.meta.url),'utf8'));assert.ok(!routes.exclude.includes('/audio-separator-worker.js'));
});
test('runtime parts are Pages compatible and full notices distributed',()=>{
 const runtime=JSON.parse(readFileSync(new URL('../frontend/vendor/lilith-engine/runtime.json',import.meta.url),'utf8'));
 for(const path of runtime.parts)assert.ok(statSync(new URL('../frontend/vendor/lilith-engine/'+path,import.meta.url)).size<=25*1024*1024);
 assert.ok(readFileSync(new URL('../frontend/vendor/lilith-engine/licenses/onnxruntime-ThirdPartyNotices.txt',import.meta.url)).length>300000);
});
test('all eight clean routes preserve title, exact future note and original localization',()=>{
 for(const lang of ['tr','en','de','fr','ru','vi','zh','ja']){
  const path=(lang==='tr'?'':lang+'/')+'audio-separator.html',html=readFileSync(new URL('../frontend/'+path,import.meta.url),'utf8');
  assert.match(html,/<title>[^<]+ \| ZenithW<\/title>/);assert.ok(html.includes('Android and Windows support may come in the future. Not guaranteed.'));assert.match(html,/id="studio"/);assert.doesNotMatch(html,/<iframe|huggingface.*(?:preconnect|preload)/);
  const catalog=JSON.parse(readFileSync(new URL('../frontend/locales/'+lang+'.json',import.meta.url),'utf8'));
  for(const key of ['Play Both','Pause Both','Browse files','Waveform','Seek','Volume','Mute','Ready for playback'])assert.ok(catalog[key],lang+': '+key);
 }
});
test('integration exposes genuine PCM waveform/export utilities',async()=>{
 const channels=[Float32Array.from([0,.7,-.2]),Float32Array.from([0,.2,-.8])];assert.equal(waveformPeaks(channels,1)[0],Math.fround(.8));const bytes=await encodeWav(channels).arrayBuffer();assert.equal(new DataView(bytes).getUint32(24,true),44100);assert.equal(bytes.byteLength,56);
});

test('npm and Cloudflare pnpm locks preserve the declared Lilith dependencies',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const npmLock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
 const importer=readFileSync(new URL('../pnpm-lock.yaml',import.meta.url),'utf8').replaceAll('\r\n','\n').split('\npackages:')[0];
 for(const name of ['@lilith/audio-engine','onnxruntime-web']){
  const version=manifest.dependencies[name];assert.equal(npmLock.packages[''].dependencies[name],version);
  assert.ok(importer.includes(`      '${name}':\n        specifier: ${version}`)||importer.includes(`      ${name}:\n        specifier: ${version}`),'pnpm importer must match '+name);
 }
});

test('Studio strings and engine information use every existing locale catalog',()=>{
 const source=readFileSync(new URL('../shared/lilith-studio.ts',import.meta.url),'utf8');
 const english=vm.runInNewContext('({'+source.match(/export const ENGLISH=\{([\s\S]*?)\n\};/)[1]+'})');
 const titleKey='AI Vocal Remover & Audio Separator | ZenithW',future='Android and Windows support may come in the future. Not guaranteed.';
 const info=['Powered by Lilith Audio Engine','Free and open source','Source code on GitHub','Read the MIT license','Support development','Model and dependency licenses',future,titleKey];
 for(const language of ['tr','en','de','fr','ru','vi','zh','ja']){
  const catalog=JSON.parse(readFileSync(new URL('../frontend/locales/'+language+'.json',import.meta.url),'utf8'));
  for(const text of [...Object.values(english),...info])assert.ok(catalog[text],language+': '+text);
  assert.doesNotThrow(()=>new Intl.NumberFormat(catalog['en-US']).format(1.2));
  const html=readFileSync(new URL('../frontend/'+(language==='tr'?'':language+'/')+'audio-separator.html',import.meta.url),'utf8');
  assert.equal(html.match(/<title>([^<]+)<\/title>/)[1].replaceAll('&amp;','&'),catalog[titleKey]);
  assert.ok(html.includes(catalog['Powered by Lilith Audio Engine']));
  assert.ok(html.includes(catalog[future]));
  assert.ok(html.includes('https://github.com/boranseasonnew/lilith-audio-engine'));
  assert.ok(html.includes('https://github.com/sponsors/boranseasonnew'));
  if(language!=='en')for(const key of ['resultsInfo','modelInfo','privacy','playbackError','exportError'])assert.notEqual(catalog[english[key]],english[key],language+': untranslated '+key);
 }
});
