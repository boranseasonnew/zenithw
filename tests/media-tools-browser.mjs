// UI regression uses synthetic stems, not a downloaded neural model or inference benchmark.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {rows as v17Copy} from '../scripts/v17-release-copy.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=resolve('frontend'),temp=await mkdtemp(join(tmpdir(),'zenith-media-ui-'));
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),path=resolve(root,'.'+url.pathname);
  if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403);return res.end();}
  const target=url.pathname.endsWith('/')?join(path,'index.html'):extname(path)?path:path+'.html';
  const data=await readFile(target);res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json'})[extname(target)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}),...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage();let uploads=0;
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='POST'){uploads++;return route.abort();}
  if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.pathname==='/vendor/lilith-engine/index.js'&&!url.searchParams.has('actual')){
   return route.fulfill({contentType:'application/javascript',body:`
    export * from '/vendor/lilith-engine/index.js?actual';
    import {SynchronizedPlayer as RealPlayer} from '/vendor/lilith-engine/index.js?actual';
    window.previewPlayers=0;
    export class SynchronizedPlayer extends RealPlayer{constructor(...args){super(...args);window.previewPlayers++;}}
    export async function inspectAudio(){return {duration:1,channels:2};}
    export async function createSeparator(){return {storageInfo:async()=>({cachedBytes:0}),dispose:async()=>{},separate:async()=>{
     const channels=()=>[new Float32Array(44100).fill(.1),new Float32Array(44100).fill(.1)];
     return {vocals:{channels:channels(),sampleRate:44100,duration:1},instrumental:{channels:channels(),sampleRate:44100,duration:1},metadata:{backend:'wasm',totalSeconds:1},dispose(){}};
    }}}
   `});
  }
  return route.continue();
 });
 await page.goto('http://127.0.0.1:8766/en/audio-separator.html');
 await page.locator('#studio input[type=file]').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:Buffer.from('synthetic')});
 await page.locator('.stem-card').nth(1).waitFor();
 await page.waitForFunction(()=>!document.querySelector('#studio input[type=file]').disabled);
 assert.equal(await page.evaluate(()=>window.previewPlayers),0,'Do not copy PCM into playback buffers before playback');
 const first=page.locator('.stem-card').first();
 await first.locator('.mute-button').click();
 await first.locator('.play-button').click();
 await page.waitForFunction(()=>window.previewPlayers===1);
 await page.locator('.stem-card').nth(1).locator('.play-button').click();
 assert.equal(await page.evaluate(()=>window.previewPlayers),1,'Both stems share one player');
 await first.locator('.download-button').click();
 const wavDownload=page.waitForEvent('download');
 await page.locator('.format-choice[data-format=wav]').click();
 const wav=await wavDownload;assert.ok(wav.suggestedFilename().endsWith('_vocals.wav'));assert.equal(await wav.failure(),null);
 const zipDownload=page.waitForEvent('download');
 await page.locator('.results-heading button').last().click();
 const zip=await zipDownload;assert.ok(zip.suggestedFilename().endsWith('_stems.zip'));assert.equal(await zip.failure(),null);
 await page.waitForFunction(()=>!document.querySelector('#studio input[type=file]').disabled);
 assert.equal(uploads,0);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Separator fits mobile width');
 const fixture=join(temp,'source.mp4');
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1','-c:v','libx264','-c:a','aac',fixture]);
 await page.goto('http://127.0.0.1:8766/en/remux.html');
 await page.locator('#localMediaMode').selectOption('only');
 await page.locator('#remuxFileInput').setInputFiles(fixture);
 assert.equal(uploads,0,'Choosing a file must not upload it');
 await page.locator('#remuxFormat').selectOption('mkv');
 assert.equal(await page.locator('#remuxTargetType').textContent(),'MKV');
 await page.locator('#remuxStart').click();
 await page.waitForFunction(()=>document.querySelector('.local-media-panel progress').value===1);
 assert.equal(uploads,0,'Local MP4-to-MKV must not upload');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Remux fits mobile width');
 for(const [language,index] of [['en',1],['ja',7]]){
  await page.goto('http://127.0.0.1:8766/'+language+'/updates.html');
  await page.waitForFunction(title=>document.querySelector('#updPostTitle').textContent===title,v17Copy[0][index]);
  assert.equal(await page.locator('#updBadge').textContent(),'v17.0');
  assert.equal(await page.locator('#updNavRow a.next').getAttribute('href'),'/'+language+'/updates/v16.1/');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Release notes fit mobile width');
  await page.locator('#updNavRow a.next').click();
  await page.waitForFunction(()=>document.querySelector('#updBadge')?.textContent==='v16.1');
  assert.equal(await page.locator('#updNavRow a').first().getAttribute('href'),'/'+language+'/updates');
 }
 console.log('PASS: lazy real playback, WAV/ZIP downloads, local MP4→MKV, privacy, mobile layout, web 17.0 localized release/archive navigation. Synthetic separator result; neural inference not tested.');
}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 await rm(temp,{recursive:true,force:true});
}
