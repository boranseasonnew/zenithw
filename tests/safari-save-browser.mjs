// Optional: run with Playwright WebKit installed and a local Pages preview.
// This tests WebKit plus missing old-iOS APIs, not a physical iPhone 7.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SAFARI_TEST_URL||'http://127.0.0.1:8774';
const origin=new URL(base);assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname),'Use a local preview only');
const token='A'.repeat(48);
const fixture=createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');
 if(req.url==='/files/'+token+'/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({state:'completed',expected_bytes:27,transferred_bytes:27}));}
 else if(req.url==='/files/'+token){res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Disposition','attachment; filename="large.mp4"');res.end('local file download fixture');}
 else {res.statusCode=404;res.end();}
});
await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
const api='http://127.0.0.1:'+fixture.address().port,file=api+'/files/'+token;
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:375,height:667},acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));if(process.env.SAFARI_TEST_DEBUG){page.on('requestfailed',r=>console.log('failed',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log('console',m.text());});}
 await page.route('**/*',async route=>{
  const url=route.request().url();if(process.env.SAFARI_TEST_DEBUG&&url.includes('/files/'))console.log('file request',url,route.request().isNavigationRequest());
  if(url.startsWith(api+'/'))return route.continue();
  if(!url.startsWith(base+'/'))return route.abort();
  if(route.request().isNavigationRequest()){
   const response=await route.fetch(),headers=response.headers();
   // WebKit upgrades HTTP localhost subresources. Production HTTPS CSP is unchanged.
   headers['content-security-policy']=headers['content-security-policy'].split(';').filter(x=>x.trim()!=='upgrade-insecure-requests').join(';').replace('connect-src ','connect-src '+api+' ');
   return route.fulfill({response,headers});
  }
  return route.continue();
 });
 await page.addInitScript(api=>{window.ZENITHW_API=api;localStorage.setItem('zw_lang','tr');Object.defineProperty(navigator,'userActivation',{configurable:true,value:undefined});window.__titleCopies=0;Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{window.__titleCopies++;}});},api);
 await page.goto(base+'/settings');await page.locator('[data-page=advanced]').click();
 for(const id of ['stSaveAsk','stSaveDownload','stSaveShare','stSaveCopy']){assert.ok(await page.locator('#'+id).isVisible());assert.equal(await page.locator('#'+id).evaluate(x=>x.tagName),'BUTTON');}
 await page.locator('#stSaveShare').click();assert.equal(await page.locator('#stSaveShare').getAttribute('aria-pressed'),'true');
 await page.reload();await page.locator('[data-page=advanced]').click();assert.equal(await page.locator('#stSaveShare').getAttribute('aria-pressed'),'true');
 await page.goto(base+'/');
 await page.evaluate(()=>{window.__shares=[];Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shares.push({type:data.files[0].type,name:data.files[0].name,hasTitle:'title' in data});}});S.saveMethod='share';openSaveModal(new Blob(['local video fixture'],{type:'application/octet-stream'}),'safari-test.mp4');});
 assert.ok(await page.locator('#saveOverlay').evaluate(x=>x.classList.contains('open')));
 assert.equal(await page.evaluate(()=>window.__shares.length),0);
 await page.locator('#saveShareButton').click();
 assert.deepEqual(await page.evaluate(()=>window.__shares[0]),{type:'video/mp4',name:'safari-test.mp4',hasTitle:false});
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('No activation','NotAllowedError');}});openSaveModal(new Blob(['local video fixture'],{type:'video/mp4'}),'safari-test.mp4');});
 await page.locator('#saveShareButton').click();assert.match(await page.locator('#saveStatus').textContent(),/indir/);
 let pending=page.waitForEvent('download');await page.locator('#saveDownloadLink').click();let download=await pending;assert.equal(download.suggestedFilename(),'safari-test.mp4');assert.equal(await download.failure(),null);
 await page.evaluate(({file,token})=>{openPreparedSaveModal({download_url:file,transfer_status_url:'/files/'+token+'/status',filename:'large.mp4'});},{file,token});
 assert.ok(await page.locator('#saveShareButton').isDisabled());assert.ok(await page.locator('#saveCopyButton').isDisabled());
 pending=page.waitForEvent('download');await page.locator('#saveDownloadLink').click();download=await pending;assert.equal(download.suggestedFilename(),'large.mp4');assert.equal(await download.failure(),null);
 await page.waitForFunction(()=>!document.getElementById('saveOverlay').classList.contains('open'));assert.notEqual(await page.locator('#saveStatus').textContent(),'Bu yöntem burada çalışmadı. Dosyayı kaydetmek için indir düğmesine dokun.');
 assert.equal(await page.evaluate(()=>window.__titleCopies),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({engine:'WebKit '+browser.version(),viewport:'375x667',settings:'four buttons visible; choice persists',share:'typed MP4; no title-only payload; rejection keeps download ready',blobDownload:'safari-test.mp4',nativeDownload:'large.mp4',titleClipboardWrites:0,uncaughtErrors:0}));
}finally{await browser.close();await new Promise(resolve=>fixture.close(resolve));}
