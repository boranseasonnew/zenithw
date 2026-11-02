// ZenithW api; built into the existing classic-script entry point.
import {publicErrorMessage, showPublicError} from './errors.mjs';
import {t} from './language.mjs';
import {setProgress} from './progress.mjs';
import {openPreparedSaveModal, openSaveModal} from './save.mjs';
import {state} from './state.mjs';
import {toast} from './ui.mjs';
export const API=globalThis.window?.ZENITHW_API||"https://api.zenithw.space";


export const YOUTUBE_WEB_ENABLED=globalThis.window?.ZENITHW_YOUTUBE_WEB_ENABLED===true;


export async function downloadThumbnail(){
  if(!state.videoInfo||!state.videoInfo.url) return;
  const button=document.getElementById('dlThumbAction');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  try{
    const res=await fetch(API+'/thumbnail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:state.videoInfo.url,thumbnail_url:state.videoInfo.thumbnail||''})});
    if(!res.ok){
      const payload=await res.json().catch(()=>({error_code:'request_failed'}));
      showPublicError(payload,res.status,state.videoInfo.url,false);
      return;
    }
    const blob=await res.blob();
    if(!blob.size){throw new Error('Empty thumbnail response');}
    const a=document.createElement('a');
    const objectUrl=URL.createObjectURL(blob);
    a.href=objectUrl;
    a.download='thumbnail.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
    toast(t('thumbnailDownloaded'),'#3bba64');
  }catch(e){
    console.error('thumb dl err',e);
    showPublicError({error_code:'network_error'},0,state.videoInfo.url,false);
  }finally{
    if(button){button.disabled=false;button.removeAttribute('aria-busy');}
  }
}


export function createSocketClient(){
  if(typeof window.io==='function')return window.io(API,{autoConnect:false,reconnection:true,path:API.startsWith('/')?`${API}/socket.io`:'/socket.io'});
  console.warn('Socket.IO unavailable; downloads continue without live progress.');
  const noop=()=>{};
  return {connected:false,id:null,on:noop,off:noop,once:noop,connect:noop,disconnect:noop};
}


export function ensureSocket(){
  if(state.socketDisconnectTimer){clearTimeout(state.socketDisconnectTimer);state.socketDisconnectTimer=null;}
  if(state.socket.connected){state.socketId=state.socket.id;return Promise.resolve(state.socketId);}
  return new Promise(resolve=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      state.socket.off('connect',finish);
      state.socketId=state.socket.connected?state.socket.id:null;
      resolve(state.socketId);
    };
    state.socket.once('connect',finish);
    state.socket.connect();
    setTimeout(finish,1500);
  });
}


export function scheduleSocketDisconnect(delay){
  if(state.socketDisconnectTimer)clearTimeout(state.socketDisconnectTimer);
  state.socketDisconnectTimer=setTimeout(()=>{
    if(!state.plQueueRunning&&!state.dlAbort&&state.socket.connected)state.socket.disconnect();
    state.socketDisconnectTimer=null;
  },delay||5000);
}


export function bindSocketConnection(){
state.socket.on('connect',()=>{state.socketId=state.socket.id;});
}


export function bindSocketDisconnection(){
state.socket.on('disconnect',()=>{state.socketId=null;});
}


export function bindSocketProgress(){
state.socket.on('progress',d=>{
  if(!d||!d.download_id||d.download_id!==state.activeProgressJobId)return;
  if(d.status==='downloading')setProgress(d.percent,t('downloading'),d.speed,false,d);
  else if(d.status==='merging')setProgress(88,t('merging'),'',false);
  else if(d.status==='queued')setProgress(3,d.message||t('queued'),'',false);
  // Backend processing is ready, but a small file may still be transferring
  // into the save modal. Keep 100% for the actual client handoff completion.
  else if(d.status==='done')setProgress(90,t('downloading'),'',false);
  else if(d.status==='error')toast(publicErrorMessage(d,0,state.videoInfo.url||document.getElementById('urlInput')?.value||''),'#ed4245');
});
}


export async function cancelBackendJob(job){
  if(!job)return false;
  if(job.controller)job.controller.abort();
  if(!job.downloadId)return true;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  try{
    const res=await fetch(API+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({download_id:job.downloadId,sid:state.socketId}),signal:controller.signal});
    return res.ok;
  }catch(e){return false;}
  finally{clearTimeout(timeout);}
}


export const NATIVE_HANDOFF_START_TIMEOUT_MS=15000;


export const NATIVE_TRANSFER_TIMEOUT_MS=45*60*1000;


export async function waitForNativeTransfer(statusPath,onProgress,signal){
  const policy=await state.DOWNLOAD_POLICY_READY;statusPath=policy.preparedUrl(statusPath,API,location.href,true);
  const startedAt=Date.now();
  let transferStarted=false;
  while(Date.now()-startedAt<NATIVE_TRANSFER_TIMEOUT_MS){
    if(signal&&signal.aborted)throw new DOMException('Transfer cancelled','AbortError');
    const res=await fetch(statusPath.startsWith('http')?statusPath:API+statusPath,{cache:'no-store',signal});
    if(!res.ok)throw new Error('Transfer status unavailable');
    const status=await res.json();
    if(status.state==='transferring')transferStarted=true;
    if(onProgress&&status.expected_bytes>0){
      const pct=90+Math.floor(Math.min(1,status.transferred_bytes/status.expected_bytes)*10);
      onProgress(pct,status.transferred_bytes,status.expected_bytes);
    }
    if(status.state==='completed')return 'transfer-confirmed';
    if(['interrupted','failed','expired'].includes(status.state))throw new Error('Prepared transfer failed');
    if(!transferStarted&&Date.now()-startedAt>NATIVE_HANDOFF_START_TIMEOUT_MS)throw new Error('Browser did not start the download');
    await new Promise(r=>setTimeout(r,750));
  }
  throw new DOMException('Prepared transfer timed out','TimeoutError');
}


export async function triggerNativeDownload(path,statusPath,onProgress,signal){
  const policy=await state.DOWNLOAD_POLICY_READY;path=policy.preparedUrl(path,API,location.href);statusPath=policy.preparedUrl(statusPath,API,location.href,true);
  const a=document.createElement('a');
  a.href=path.startsWith('http')?path:API+path;document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  return waitForNativeTransfer(statusPath,onProgress,signal);
}


export const BLOB_SAVE_LIMIT=32*1024*1024;


export const MAX_TOOL_FILE_BYTES=95*1024*1024;


export const MEDIA_JOB_TIMEOUT_MS=15*60*1000;


export const PREPARED_TRANSFER_TIMEOUT_MS=5*60*1000;


export const PREPARED_TRANSFER_IDLE_MS=30000;


export async function fetchMediaJob(formData){
  if(window.ZenithLocalMedia){
    const localMedia=await window.ZenithLocalMedia.run(formData);
    if(localMedia)return {localMedia};
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),MEDIA_JOB_TIMEOUT_MS);
  try{return await fetch(API+'/convert',{method:'POST',body:formData,signal:controller.signal});}
  finally{clearTimeout(timeout);}
}


export async function handoffPreparedDownload(payload,allowSaveModal,onProgress,signal){
  if(!payload||!payload.download_url)throw new Error('Download file was not prepared');
  const policy=await state.DOWNLOAD_POLICY_READY;
  payload={...payload,download_url:policy.preparedUrl(payload.download_url,API,location.href),transfer_status_url:policy.preparedUrl(payload.transfer_status_url,API,location.href,true)};
  if(allowSaveModal&&Number(payload.size)>0&&Number(payload.size)<=BLOB_SAVE_LIMIT){
    const controller=new AbortController();
    state.activeTransferAbort=controller;
    const totalTimeout=setTimeout(()=>controller.abort(),PREPARED_TRANSFER_TIMEOUT_MS);
    let idleTimeout=null;
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
    const resetIdle=()=>{if(idleTimeout)clearTimeout(idleTimeout);idleTimeout=setTimeout(()=>controller.abort(),PREPARED_TRANSFER_IDLE_MS);};
    try{
      resetIdle();
      const transfer=await fetch(payload.download_url.startsWith('http')?payload.download_url:API+payload.download_url,{signal:controller.signal,cache:'no-store'});
      if(!transfer.ok)throw new Error('Prepared download expired');
      const expected=Number(payload.size)||0;
      const blob=await policy.readBoundedBlob(transfer,BLOB_SAVE_LIMIT,expected,(received,total)=>{resetIdle();if(onProgress&&total>0)onProgress(Math.min(99,90+Math.floor(received/total*9)),received,total);},controller.signal);
      if(!blob.size)throw new Error('Prepared download is empty');
      openSaveModal(blob,payload.filename||'download');
      return 'save-modal';
    }catch(e){
      throw e;
    }finally{
      signal?.removeEventListener('abort',abort);clearTimeout(totalTimeout);if(idleTimeout)clearTimeout(idleTimeout);
      if(state.activeTransferAbort===controller)state.activeTransferAbort=null;
    }
  }
  if(allowSaveModal){openPreparedSaveModal(payload);return 'save-modal';}
  return triggerNativeDownload(payload.download_url,payload.transfer_status_url,onProgress,signal);
}
