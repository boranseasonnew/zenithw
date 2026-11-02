// ZenithW bulk; built into the existing classic-script entry point.
import {cancelBackendJob} from './api.mjs';
import {startDownload} from './download.mjs';
import {shouldRouteYoutubeToApps, showYoutubeAppRequired, toggleBulkMode} from './input.mjs';
import {t} from './language.mjs';
import {S} from './settings.mjs';
import {state} from './state.mjs';
import {toast} from './ui.mjs';

export async function fetchBulkVideos(){
  if(state.bulkRunning){await cancelBulkDownloads();return;}
  const textarea=document.getElementById('urlTextarea');
  let requestedUrls;
  try{requestedUrls=(await state.DOWNLOAD_POLICY_READY).normalizeBulkUrls(textarea.value);}catch(e){toast(t(e instanceof RangeError?'bulkMaxLinks':'errUnsupported'),'#ed4245');return;}
  if(requestedUrls.length===0){toast(t('bulkNeedLink'),'#ed4245');return;}
  if(requestedUrls.length>10){toast(t('bulkMaxLinks'),'#f59e0b');return;}
  const blockedYoutube=requestedUrls.filter(shouldRouteYoutubeToApps);
  const urls=requestedUrls.filter(url=>!shouldRouteYoutubeToApps(url));
  if(blockedYoutube.length)showYoutubeAppRequired();
  if(urls.length===0)return;

  const successCount=[];
  const failCount=[];
  const plan={...S},mode=state.DL_MODE;textarea.disabled=true;
  const goBtn=document.querySelector('.url-go-btn');
  state.bulkRunning=true;state.bulkStopRequested=false;
  if(goBtn){goBtn.onclick=cancelBulkDownloads;goBtn.setAttribute('aria-label',t('dlCancel'));goBtn.innerHTML='✕';}

  try{for(let i=0;i<urls.length;i++){
    if(state.bulkStopRequested)break;
    const url=urls[i];
    document.getElementById('urlSpinWrap').innerHTML=`<div style="font-size:10px;color:var(--text2)">${i+1}/${urls.length}</div>`;
    try{
      // Bulk deliberately skips /info: /download already extracts the title and
      // prepares the file, so each item costs one backend/upstream job.
      const result=await startDownload({bulk:true,url,plan,mode,onJobStart:job=>{state.activeBulkJob=job;},onRetry:()=>{document.getElementById('urlSpinWrap').textContent=`${i+1}/${urls.length} · ${t('queued')}`;},onProgress:(pct,received,total)=>{if(total>0)document.getElementById('urlSpinWrap').textContent=`${i+1}/${urls.length} · ${Math.min(100,Math.floor(received/total*100))}%`;}});
      state.activeBulkJob=null;
      if(result.ok)successCount.push(url);
      else failCount.push(url);
    }catch(e){
      failCount.push(url);
    }
    try{await (await state.DOWNLOAD_POLICY_READY).abortableWait(500,state.activeBulkJob?.controller.signal);}catch{}
  }
  }finally{state.activeBulkJob=null;state.bulkRunning=false;textarea.disabled=false;}
  document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  if(!state.bulkStopRequested)toast(`${successCount.length} ${t('bulkSuccessWord')}, ${failCount.length} ${t('bulkFailWord')}`,successCount.length>0?'#3bba64':'#ed4245');
  const remaining=requestedUrls.filter(url=>!successCount.includes(url));textarea.value=remaining.join('\n');
  if(!state.bulkStopRequested&&remaining.length===0)toggleBulkMode();
  else if(goBtn){goBtn.onclick=fetchBulkVideos;goBtn.setAttribute('aria-label',t('dlBtn'));goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
}


export async function cancelBulkDownloads(){
  if(!state.bulkRunning)return;
  state.bulkStopRequested=true;
  await cancelBackendJob(state.activeBulkJob);
  toast(t('cancelled'),'#f59e0b');
}
