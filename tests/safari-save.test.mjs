import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../frontend/app.d4596317c4a7.js',import.meta.url),'utf8');
const fragment=source.slice(source.indexOf('function releasePendingBlob()'),source.indexOf('// ── FILENAME'));
function setup(navigator={}){
 const nodes=new Map(),calls={opened:[],closed:[],downloads:0,confetti:0,messages:[]};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',removeAttribute(name){delete this[name];},click(){calls.downloads++;void ctx.saveAction('download',{});}});return nodes.get(id);};
 const ctx={navigator,S:{saveMethod:'ask'},pendingBlob:null,pendingFilename:null,pendingObjectUrl:null,pendingNativeDownload:null,document:{getElementById:node},URL:{createObjectURL:()=> 'blob:test-file',revokeObjectURL(){}},File,Blob,window:{},setTimeout(){},openOverlay:id=>calls.opened.push(id),closeOverlay:id=>calls.closed.push(id),t:key=>key,toast:message=>calls.messages.push(message),fireConfetti:()=>calls.confetti++,waitForNativeTransfer:async()=>{}};
 vm.createContext(ctx);vm.runInContext(fragment,ctx);return {ctx,node,calls};
}
test('asynchronous share preference waits for a fresh tap and preserves the video MIME without title-only data',async()=>{
 let shared;const {ctx,calls}=setup({canShare:()=>true,share:async value=>{shared=value;}});ctx.S.saveMethod='share';ctx.openSaveModal(new Blob(['fixture'],{type:'application/octet-stream'}),'clip.mp4');
 assert.equal(shared,undefined);assert.deepEqual(calls.opened,['saveOverlay']);
 await ctx.saveAction('share');assert.equal(shared.files[0].type,'video/mp4');assert.equal(shared.files[0].name,'clip.mp4');assert.equal('title' in shared,false);assert.equal('text' in shared,false);
});
test('share rejection keeps the download action visible and never reports success or copies a name',async()=>{
 const {ctx,node,calls}=setup({canShare:()=>true,share:async()=>{throw Object.assign(Error('gesture expired'),{name:'NotAllowedError'});}});ctx.openSaveModal(new Blob(['fixture'],{type:'video/mp4'}),'clip.mp4');await ctx.saveAction('share');
 assert.equal(node('saveDownloadLink').href,'blob:test-file');assert.equal(node('saveStatus').textContent,'saveRetryDownload');assert.equal(calls.closed.length,0);assert.equal(calls.downloads,0);assert.equal(calls.confetti,0);
});
test('canceling the native share sheet does not trigger an unwanted download',async()=>{
 const {ctx,calls}=setup({canShare:()=>true,share:async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});}});ctx.openSaveModal(new Blob(['fixture']),'clip.mp4');await ctx.saveAction('share');assert.equal(calls.downloads,0);assert.equal(calls.closed.length,0);
});
test('older Safari with no userActivation API gets a real download anchor',async()=>{
 const {ctx,node,calls}=setup();ctx.S.saveMethod='download';ctx.openSaveModal(new Blob(['fixture']),'clip.mp4');assert.equal(calls.downloads,0);assert.deepEqual(calls.opened,['saveOverlay']);assert.equal(node('saveDownloadLink').download,'clip.mp4');await ctx.saveAction('download');assert.equal(calls.downloads,1);
});
test('clipboard construction failures keep the file ready without substituting text',async()=>{
 const {ctx,node,calls}=setup({clipboard:{write:async()=>assert.fail('must not write title text')}});ctx.window.ClipboardItem=true;ctx.ClipboardItem=class{constructor(){throw Error('MIME unsupported');}};ctx.openSaveModal(new Blob(['fixture'],{type:'video/mp4'}),'clip.mp4');await ctx.saveAction('copy');assert.equal(node('saveStatus').textContent,'saveRetryDownload');assert.equal(calls.closed.length,0);
});
test('large prepared files use a direct server link without a browser-memory blob',()=>{
 const {ctx,node}=setup();ctx.openPreparedSaveModal({download_url:'https://api.zenithw.space/files/validated-token',transfer_status_url:'status',filename:'large.mp4'});assert.equal(ctx.pendingBlob,null);assert.equal(node('saveDownloadLink').href,'https://api.zenithw.space/files/validated-token');assert.equal(node('saveShareButton').disabled,true);assert.equal(node('saveCopyButton').disabled,true);
});
