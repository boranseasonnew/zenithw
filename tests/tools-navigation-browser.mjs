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
await new Promise(r=>server.listen(8770,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 const copies={tr:'araçlar',en:'tools',de:'werkzeuge',fr:'outils',ru:'инструменты',vi:'công cụ',zh:'工具',ja:'ツール'};
 for(const width of [1365,390]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('zw_desktop_promo_dismissed','1'));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  for(const [language,label] of Object.entries(copies)){
   const prefix=language==='tr'?'':language+'/';
   await page.goto('http://127.0.0.1:8770/'+prefix);
   assert.equal(await page.locator('#bbTools').textContent(),label);
   assert.equal(await page.locator('#homeStatusTxt,.discovery,#homeMediaTools').count(),0);
   assert.equal(await page.locator('.bottom-bar a[href*=remux],.bottom-bar a[href*=convert]').count(),0);
   assert.equal(await page.locator('#urlInput').isVisible(),true);
   await page.evaluate(()=>window.scrollTo(0,500));
   assert.equal(await page.evaluate(()=>window.scrollY),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Home fits '+language+' '+width);
   await page.locator('#toolsNavButton').click();
   assert.equal(await page.locator('#siteToolsMenu').isVisible(),true);
   assert.equal(await page.locator('#siteToolsMenu a').count(),4);
   for(const link of await page.locator('#siteToolsMenu a').all())assert.equal(await link.evaluate(async el=>(await fetch(el.href)).status),200);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#siteToolsMenu').isVisible(),false);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 const fallback=await browser.newPage();
 await fallback.addInitScript(()=>{delete HTMLElement.prototype.showPopover;localStorage.setItem('zw_desktop_promo_dismissed','1');});
 await fallback.goto('http://127.0.0.1:8770/');
 await fallback.locator('#toolsNavButton').click();assert.equal(await fallback.locator('#siteToolsMenu').isVisible(),true);
 await fallback.keyboard.press('Escape');assert.equal(await fallback.locator('#siteToolsMenu').isVisible(),false);
 console.log('PASS: tools navigation, four working links, eight languages, desktop/mobile no-scroll home, Escape and legacy fallback.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
