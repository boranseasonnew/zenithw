// ZenithW download; built into the existing classic-script entry point.
import {API, MEDIA_JOB_TIMEOUT_MS, cancelBackendJob, ensureSocket, handoffPreparedDownload, scheduleSocketDisconnect} from './api.mjs';
import {showPublicError} from './errors.mjs';
import {addToLocalHistory} from './history.mjs';
import {handleYoutubeAppRequired, shouldRouteYoutubeToApps, showYoutubeAppRequired} from './input.mjs';
import {t} from './language.mjs';
import {resetProgress, setProgress} from './progress.mjs';
import {fireConfetti} from './save.mjs';
import {S, buildFilename, getPlatformName} from './settings.mjs';
import {state} from './state.mjs';
import {closeOverlay, lockPageScroll, toast} from './ui.mjs';


export async function startDownload(options={}){
  const bulk=!!options.bulk;
  const sourceInfo=bulk?{url:String(options.url||'').trim(),title:''}:state.videoInfo;
  if(!sourceInfo.url)return {ok:false,error_code:'invalid_url'};
  if(shouldRouteYoutubeToApps(sourceInfo.url)){showYoutubeAppRequired();return {ok:false,error_code:'youtube_app_required'};}
  const plan=options.plan||S,mode=options.mode||state.DL_MODE;
  const isAudio=(mode==='audio'),isMute=(mode==='mute'),fmt=isAudio?plan.afmt:plan.vfmt;
  if(!bulk)await ensureSocket();
  const btn=document.getElementById('dlBtn');
  const btnTxt=document.getElementById('dlBtnTxt');
  const cancelBtn=document.getElementById('dlCancel');
  if(!bulk){
    if(btn)btn.disabled=true;
    if(btnTxt)btnTxt.innerHTML='<div class="spinner"></div>';
    if(cancelBtn)cancelBtn.classList.add('vis');
    setProgress(5,t('connecting'),'',false);
  }
  const requestId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
  const controller=new AbortController();
  const activeJob={downloadId:requestId,controller};
  if(typeof options.onJobStart==='function')options.onJobStart(activeJob);
  if(!bulk){state.dlId=requestId;state.dlAbort=controller;state.activeProgressJobId=requestId;}
  let timedOut=false;const prepareTimeout=setTimeout(()=>{timedOut=true;controller.abort();},MEDIA_JOB_TIMEOUT_MS);
  try{
    const policy=await state.DOWNLOAD_POLICY_READY;
    const preferredSub=plan.subtitleLang&&plan.subtitleLang!=='auto'?plan.subtitleLang:'tr';
    const body={url:sourceInfo.url,quality:plan.quality,format:fmt,codec:plan.codec,audioQ:plan.audioQ,youtube_adaptive_quality:!!plan.youtubeAdaptiveQuality,metadata:plan.metadata,sid:bulk?'':state.socketId,download_id:requestId,audio_only:isAudio,mute:isMute,sponsorblock:!!plan.sponsorblock,subtitles:!!plan.subtitles,sub_langs:[preferredSub,'en']};
    if(!bulk)body.download_name=buildFilename(plan.fnfTemplate||'{title}.{ext}',sourceInfo,fmt);
    let res,payload;let retryBudget=0;
    for(let attempt=0;;attempt++){
      res=await fetch(API+'/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      payload=await res.json().catch(()=>({}));
      const recoverable=res.status===429||(res.status===503&&payload.error_code==='server_busy');
      const delay=policy.retryDelay(res.headers.get('Retry-After'));
      if(!bulk||!recoverable||attempt>=2||retryBudget+delay>180000)break;
      retryBudget+=delay;options.onRetry?.(delay);await policy.abortableWait(delay,controller.signal);
    }
    clearTimeout(prepareTimeout);
    if(!bulk)state.dlId=null;
    if(res.status===409)return {ok:false,error_code:'cancelled'};
    if(!res.ok){
      if(handleYoutubeAppRequired(payload))return {ok:false,error_code:'youtube_app_required',status:res.status};
      if(!bulk){resetProgress();showPublicError(payload,res.status,sourceInfo.url,false);}
      return {ok:false,error_code:payload.error_code||'request_failed',status:res.status,retry_after:res.headers.get('Retry-After')};
    }
    // Batch items always use native handoff; a later item cannot replace a
    // small-file Blob waiting in the save modal.
    const handoff=await handoffPreparedDownload(payload,!bulk,bulk?options.onProgress:(pct,received,total)=>{
      setProgress(pct,t('downloading'),'',false,{downloaded_bytes:received,total_bytes:total});
    },controller.signal);
    addToLocalHistory({url:sourceInfo.url,title:sourceInfo.title||payload.filename||'video',platform:getPlatformName(sourceInfo.url||''),format:fmt});
    if(!bulk){
      resetProgress();closeOverlay('dlOverlay');
      if(handoff==='save-modal')lockPageScroll();
      else{toast(t('downloaded'),'#3bba64');fireConfetti();}
    }
    return {ok:true,payload,handoff};
  }catch(e){
    if(!bulk){
      state.dlAbort=null;resetProgress();
      if(e.name!=='AbortError')showPublicError({error_code:'network_error'},0,sourceInfo.url,false);
    }
    return {ok:false,error_code:timedOut?'request_timeout':e.name==='AbortError'?'cancelled':'network_error'};
  }
  finally{
    clearTimeout(prepareTimeout);
    if(state.activeProgressJobId===requestId)state.activeProgressJobId=null;
    if(!bulk){state.dlAbort=null;state.dlId=null;scheduleSocketDisconnect();}
  }
}


export async function cancelDownload(){
  const job=(state.dlId||state.dlAbort)?{downloadId:state.dlId,controller:state.dlAbort}:null;
  const cancelBtn=document.getElementById('dlCancel');
  if(cancelBtn)cancelBtn.disabled=true;
  if(state.activeTransferAbort)state.activeTransferAbort.abort();
  await cancelBackendJob(job);
  state.dlAbort=null;state.dlId=null;state.activeProgressJobId=null;
  resetProgress();toast(t('cancelled'),'#f59e0b');scheduleSocketDisconnect();
}
