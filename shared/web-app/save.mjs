// ZenithW save; built into the existing classic-script entry point.
import {waitForNativeTransfer} from './api.mjs';
import {t} from './language.mjs';
import {S} from './settings.mjs';
import {state} from './state.mjs';
import {closeOverlay, openOverlay, toast} from './ui.mjs';


// ── SAVE MODAL ────────────────────────────────────────
// Small celebratory confetti burst — no deps, plain DOM + CSS
export const CONFETTI_COLORS=['#3bba64','#ff4a97','#f59e0b','#5b8def','#ffffff'];


export function fireConfetti(){
  const host=document.createElement('div');
  host.className='confetti-host';
  document.body.appendChild(host);
  const n=22;
  for(let i=0;i<n;i++){
    const p=document.createElement('span');
    p.className='confetti-piece';
    const angle=(Math.random()*140-70)*(Math.PI/180); // upward-ish spread
    const dist=80+Math.random()*120;
    const dx=Math.sin(angle)*dist;
    const dy=-Math.abs(Math.cos(angle)*dist)-40;
    p.style.setProperty('--dx',dx+'px');
    p.style.setProperty('--dy',dy+'px');
    p.style.setProperty('--rot',(Math.random()*720-360)+'deg');
    p.style.background=CONFETTI_COLORS[i%CONFETTI_COLORS.length];
    p.style.left='calc(50% + '+(Math.random()*40-20)+'px)';
    p.style.animationDelay=(Math.random()*0.12)+'s';
    host.appendChild(p);
  }
  setTimeout(()=>host.remove(),1400);
}


export function releasePendingBlob(){
  if(state.pendingObjectUrl)URL.revokeObjectURL(state.pendingObjectUrl);
  state.pendingObjectUrl=null;state.pendingBlob=null;state.pendingFilename=null;state.pendingNativeDownload=null;
  document.getElementById('saveDownloadLink')?.removeAttribute('href');
}


export function saveFile(){
  const extensions={mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
  const original=(state.pendingBlob.type||'').split(';')[0].toLowerCase();
  const type=(!original||original==='application/octet-stream')?(extensions[(state.pendingFilename||'').split('.').pop().toLowerCase()]||'application/octet-stream'):original;
  return new File([state.pendingBlob],state.pendingFilename,{type});
}


export function canShareSaveFile(){try{return !!(state.pendingBlob&&navigator.share&&navigator.canShare&&navigator.canShare({files:[saveFile()]}));}catch{return false;}}


export function canCopySaveFile(){try{return !!(state.pendingBlob&&navigator.clipboard?.write&&window.ClipboardItem&&(!ClipboardItem.supports||ClipboardItem.supports(saveFile().type)));}catch{return false;}}


export function configureSaveModal(){
  const link=document.getElementById('saveDownloadLink');
  link.href=state.pendingNativeDownload?state.pendingNativeDownload.download_url:state.pendingObjectUrl;
  link.download=state.pendingFilename;document.getElementById('saveFilename').textContent=state.pendingFilename;
  document.getElementById('saveShareButton').disabled=!canShareSaveFile();
  document.getElementById('saveCopyButton').disabled=!canCopySaveFile();
  document.getElementById('saveStatus').textContent='';
}


export function showSaveIssue(){openOverlay('saveOverlay');document.getElementById('saveStatus').textContent=t('saveRetryDownload');}


export function openSaveModal(blob,filename){
  releasePendingBlob();state.pendingBlob=blob;state.pendingFilename=filename;state.pendingObjectUrl=URL.createObjectURL(blob);configureSaveModal();
  // Sharing/clipboard and older Safari require a fresh tap after preparation.
  if(S.saveMethod==='download'&&navigator.userActivation?.isActive)saveAction('download');
  else openOverlay('saveOverlay');
}


export function openPreparedSaveModal(payload){
  releasePendingBlob();state.pendingNativeDownload=payload;state.pendingFilename=payload.filename||'download';configureSaveModal();
  openOverlay('saveOverlay');
}


export function releaseUsedSaveLater(url){setTimeout(()=>{if(url&&state.pendingObjectUrl===url)releasePendingBlob();},60000);}


export async function saveAction(type,event){
  if(!state.pendingBlob&&!state.pendingNativeDownload)return;
  if(type==='download'){
    // A real, connected anchor keeps Safari's download action on the user tap.
    if(!event){document.getElementById('saveDownloadLink').click();return;}
    if(state.pendingNativeDownload){
      const prepared=state.pendingNativeDownload;document.getElementById('saveStatus').textContent=t('downloading');
      // Let the anchor's navigation become a download before Safari polls status.
      try{await new Promise(resolve=>setTimeout(resolve,500));await waitForNativeTransfer(prepared.transfer_status_url);if(state.pendingNativeDownload===prepared){closeOverlay('saveOverlay',true);toast(t('downloaded'),'#3bba64');fireConfetti();}}
      catch{if(state.pendingNativeDownload===prepared)showSaveIssue();}
    }else{closeOverlay('saveOverlay',true);toast(t('downloaded'),'#3bba64');fireConfetti();releaseUsedSaveLater(state.pendingObjectUrl);}
    return;
  }
  const usedUrl=state.pendingObjectUrl;
  try{
    if(type==='share'){
      if(!canShareSaveFile()){showSaveIssue();return;}
      // Share the typed file itself; a title-only fallback can copy just its name.
      await navigator.share({files:[saveFile()]});
    }else if(type==='copy'){
      if(!canCopySaveFile()){showSaveIssue();return;}
      const file=saveFile();await navigator.clipboard.write([new ClipboardItem({[file.type]:file})]);
      toast(t('saveCopied'),'#3bba64');
    }else return;
    if(state.pendingObjectUrl===usedUrl){closeOverlay('saveOverlay',true);releaseUsedSaveLater(usedUrl);}
  }catch(error){if(error.name!=='AbortError'&&state.pendingObjectUrl===usedUrl)showSaveIssue();}
}
