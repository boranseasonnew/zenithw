// Real bundle/HTML callback regression. Provider metadata is mocked, not downloaded.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=resolve('frontend');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+url.pathname);
  if(path!==root&&!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))throw Error('path');
  const target=url.pathname.endsWith('/')?join(path,'index.html'):extname(path)?path:path+'.html';
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.json':'application/json'})[extname(target)]||'application/octet-stream');res.end(await readFile(target));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(8769,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 const page=await browser.newPage(),errors=[];let firstRequested;
 const firstSeen=new Promise(resolve=>{firstRequested=resolve;});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('zw_desktop_promo_dismissed','1'));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.hostname==='api.zenithw.space'&&url.pathname==='/info'){
   const input=route.request().postDataJSON();
   if(input.url.endsWith('/unsupported'))return route.fulfill({status:400,json:{error_code:'unsupported_url'}});
   if(input.url.endsWith('/legacy'))return route.fulfill({status:400,json:{error:'This platform is not supported.'}});
   if(input.url.endsWith('/network'))return route.fulfill({status:502,json:{error_code:'network_error'}});
   if(input.url.endsWith('/slow')){firstRequested();await new Promise(r=>setTimeout(r,250));}
   try{return await route.fulfill({json:{title:input.url.endsWith('/slow')?'Old result':'Current result',duration:65,uploader:'Fixture',thumbnail:''}});}catch{return;}
  }
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8769/');
 await page.locator('#urlInput').fill('https://example.test/slow');
 await page.evaluate(()=>{window.firstAnalysis=fetchVideo();});
 await firstSeen;
 await page.locator('#urlInput').fill('https://example.test/current');
 await page.locator('#urlInput').press('Enter');
 await page.waitForFunction(()=>document.querySelector('#dlVTitle')?.textContent==='Current result');
 await page.evaluate(()=>window.firstAnalysis);
 assert.equal(await page.evaluate(()=>videoInfo.title),'Current result','An older response must not replace new metadata');
 assert.equal(await page.locator('#dlVMeta').textContent(),'Fixture · 1:05');
 await page.evaluate(()=>applyDownloadProfile('quality'));
 assert.equal(await page.evaluate(()=>S.quality),'2160');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zw_s')).vfmt),'webm');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#dlOverlay').getAttribute('aria-hidden'),'true');
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('modal-open')),false);
 await page.goto('http://127.0.0.1:8769/settings');
 assert.equal(await page.evaluate(()=>S.quality),'2160','Settings survive navigation');
 await page.evaluate(()=>setTheme('light'));
 assert.equal(await page.evaluate(()=>document.body.classList.contains('light')),true);
 await page.evaluate(()=>setTheme('dark'));
 await page.goto('http://127.0.0.1:8769/en/');
 await page.waitForFunction(()=>document.documentElement.lang==='en');
 for(const width of [1365,390]){
  await page.setViewportSize({width,height:844});
  for(const language of ['tr','en','de','fr','ru','vi','zh','ja']){
   const catalog=JSON.parse(await readFile(join(root,'locales',language+'.json'),'utf8'));
   await page.goto('http://127.0.0.1:8769/'+(language==='tr'?'':language+'/'));
   await page.evaluate(()=>ZWLanguage.ready);
   for(const suffix of ['unsupported','legacy']){
    await page.locator('#urlInput').fill('https://example.test/'+suffix);
    await page.locator('#urlInput').press('Enter');
    await page.waitForFunction(()=>document.querySelector('#errorWrap').classList.contains('show'));
    assert.equal(await page.locator('#errTxt').textContent(),catalog['This link does not contain a supported video, or the site is not supported. Use the page link for a single video.']);
    assert.equal(await page.locator('#dlOverlay').getAttribute('aria-hidden'),'true');
    assert.ok(await page.locator('#errorWrap').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Error must remain in the viewport');
   }
   await page.locator('#urlInput').fill('ftp://example.test/video');
   await page.locator('#urlInput').press('Enter');
   assert.equal(await page.locator('#errTxt').textContent(),catalog['Enter a valid video page link starting with https:// or http://.']);
   await page.locator('#urlInput').fill('https://example.test/network');
   await page.locator('#urlInput').press('Enter');
   await page.waitForFunction(()=>document.querySelector('#errorWrap').classList.contains('show'));
   assert.notEqual(await page.locator('#errTxt').textContent(),catalog['This link does not contain a supported video, or the site is not supported. Use the page link for a single video.']);
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: metadata cancellation/race, modal callbacks, settings, and actionable URL errors in eight languages on desktop/mobile.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
