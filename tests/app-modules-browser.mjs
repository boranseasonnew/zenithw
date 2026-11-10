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
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(target)]||'application/octet-stream');res.end(await readFile(target));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(8769,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 const page=await browser.newPage(),errors=[];let firstRequested;
 const youtubeRequests=[];
 const firstSeen=new Promise(resolve=>{firstRequested=resolve;});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('zw_desktop_promo_dismissed','1'));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(/youtube\.com|youtu\.be/.test(route.request().postData()||''))youtubeRequests.push(url.href);
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
 const base='http://127.0.0.1:8769';
 const youtubeTitle='YouTube downloads are unavailable on the web.';
 async function assertPopupFits(card){
  const metrics=await card.evaluate(el=>{
   const {top,left,bottom,right}=el.getBoundingClientRect();
   return {top,left,bottom,right,innerWidth,innerHeight,clientWidth:el.clientWidth,clientHeight:el.clientHeight,
    scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,lang:document.documentElement.lang};
  });
  assert.ok(metrics.top>=0&&metrics.left>=0&&metrics.bottom<=metrics.innerHeight&&metrics.right<=metrics.innerWidth
   &&metrics.scrollWidth<=metrics.clientWidth&&metrics.scrollHeight<=metrics.clientHeight,
  'Popup must fit in the viewport without scrolling: '+JSON.stringify(metrics));
 }
 for(const [width,height,theme] of [[1280,800,'dark'],[320,568,'light'],[667,375,'dark']]){
  await page.setViewportSize({width,height});
  for(const language of ['tr','en','de','fr','ru','vi','zh','ja']){
   const catalog=JSON.parse(await readFile(join(root,'locales',language+'.json'),'utf8'));
   const title=catalog[youtubeTitle]||youtubeTitle;
   await page.goto(base+'/'+(language==='tr'?'':language+'/'));
   await page.evaluate(async theme=>{await ZWLanguage.ready;setTheme(theme);},theme);
   const input=page.locator('#urlInput');
   await input.fill('https://youtu.be/example');
   await input.press('Enter');
   const dialog=page.getByRole('dialog',{name:title,exact:true});
   await dialog.waitFor();
   await assertPopupFits(dialog);
   assert.ok(await dialog.locator('.youtube-handoff-logo').evaluate(img=>img.complete&&img.naturalWidth>0));
   await page.waitForFunction(()=>document.activeElement.id==='youtubeAppClose');
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'youtubeAppMobile');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'youtubeAppClose');
   for(const [id,platform] of [['youtubeAppDesktop','windows'],['youtubeAppMobile','android']]){
    const href=await dialog.locator('#'+id).getAttribute('href');
    const destination=new URL(href,base);
    assert.equal(destination.hash,'#'+platform);
    assert.ok((await page.request.get(destination.href)).ok());
   }
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>document.activeElement.id==='urlInput');
   assert.equal(await dialog.count(),0);
  }
 }
 assert.deepEqual(youtubeRequests,[]);

 const promoContext=await browser.newContext({viewport:{width:320,height:568},locale:'en'});
 await promoContext.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const promoPage=await promoContext.newPage();
 await promoPage.goto(base+'/en/');
 const reminder=promoPage.getByRole('dialog',{name:'Use ZenithW on your device'});
 await reminder.waitFor();
 await assertPopupFits(reminder);
 await promoPage.mouse.click(2,2);
 await reminder.waitFor({state:'hidden'});
 assert.equal(await promoPage.evaluate(()=>sessionStorage.getItem('zw_desktop_promo_seen')),'1');
 assert.equal(await promoPage.evaluate(()=>localStorage.getItem('zw_desktop_promo_dismissed')),null);
 await promoPage.reload();
 await promoPage.evaluate(()=>initDesktopPromo());
 assert.equal(await promoPage.locator('#desktopPromo').getAttribute('hidden'),'');
 const newSession=await promoContext.newPage();
 await newSession.goto(base+'/en/');
 await newSession.locator('#desktopPromo.open').waitFor();
 await newSession.locator('#desktopPromoNever').check();
 await newSession.locator('#desktopPromoClose').click();
 assert.equal(await newSession.evaluate(()=>localStorage.getItem('zw_desktop_promo_dismissed')),'1');
 const dismissed=await promoContext.newPage();
 await dismissed.goto(base+'/en/');
 await dismissed.waitForTimeout(5200);
 assert.equal(await dismissed.locator('#desktopPromo').getAttribute('hidden'),'');
 await promoContext.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: metadata cancellation/race, modal callbacks, settings, and actionable URL errors in eight languages on desktop/mobile.');
 console.log('PASS: YouTube web handoff, localized popup layouts and keyboard behavior, download routes, and reminder persistence.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
