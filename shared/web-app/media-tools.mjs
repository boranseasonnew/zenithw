// ZenithW media-tools; built into the existing classic-script entry point.
import {MAX_TOOL_FILE_BYTES, fetchMediaJob, handoffPreparedDownload} from './api.mjs';
import {clearToolError, showPublicError} from './errors.mjs';
import {t} from './language.mjs';
import {openSaveModal} from './save.mjs';
import {state} from './state.mjs';
import {openOverlay, toast} from './ui.mjs';


// ── REMUX ─────────────────────────────────────────────
export function openRemux(){openOverlay('remuxOverlay');}


export function formatLocalFileSize(bytes){if(bytes<=0)return'0 bayt';if(bytes<1024)return bytes+' bayt';if(bytes<1024*1024)return(bytes/1024).toFixed(1)+' KB';return(bytes/1024/1024).toFixed(2)+' MB';}


export function validateToolFile(f){
  if(!f||f.size<=0){toast(t('errConversion'),'#ed4245');return false;}
  if(f.size>MAX_TOOL_FILE_BYTES){toast(t('errFileTooLarge'),'#ed4245');return false;}
  return true;
}


export function showSelectedToolFile(dropId,f){const drop=document.getElementById(dropId);if(!drop)return;const icon=drop.querySelector('.tool-drop-icon'),title=drop.querySelector('.drop-title'),sub=drop.querySelector('.drop-sub');if(icon){icon.classList.add('selected');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4L19 6"/></svg>';}if(title)title.textContent=f.name;if(sub)sub.textContent=formatLocalFileSize(f.size);}


export function resetRemuxDrop(){const drop=document.getElementById('remuxDrop');if(!drop)return;const icon=drop.querySelector('.tool-drop-icon'),title=drop.querySelector('.drop-title'),sub=drop.querySelector('.drop-sub');if(icon){icon.classList.remove('selected');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/></svg>';}if(title)title.textContent=t('remuxDropTitle');if(sub)sub.textContent=t('remuxDropSub');const input=document.getElementById('remuxFileInput');if(input)input.value='';state.remuxSourceFormat='';renderRemuxSignal();}


export function renderRemuxSignal(){const source=document.getElementById('remuxSourceType'),target=document.getElementById('remuxTargetType'),text=document.getElementById('remuxSignalText'),chosen=document.getElementById('remuxFormat')?.value||state.remuxSourceFormat;if(source)source.textContent=state.remuxSourceFormat?state.remuxSourceFormat.toUpperCase():t('remuxSourceDefault');if(target)target.textContent=chosen?chosen.toUpperCase():t('remuxTargetDefault');if(text)text.textContent=t('remuxSignalText');const button=document.getElementById('remuxStart');if(button)button.disabled=state.remuxBusy||!state.remuxFile;}


export function handleRemuxFile(inp){
  const f=inp.files[0];if(state.remuxBusy||!validateToolFile(f))return;
  const extension=f.name.split('.').pop().toLowerCase();
  if(!new Set(['mp4','webm','mkv','mov','avi','m4v','3gp','ts','wmv','mp3','m4a','aac','opus','ogg','flac','wav','aiff','wma']).has(extension)){toast(t('errConversion'),'#ed4245');return;}
  state.remuxFile=f;state.remuxSourceFormat=extension;clearToolError();renderRemuxSignal();showSelectedToolFile('remuxDrop',f);
}


export async function startRemux(){
  const inp={files:[state.remuxFile]};
  const f=inp.files[0];if(state.remuxBusy||!validateToolFile(f))return;
  const dot=f.name.lastIndexOf('.');
  const target=document.getElementById('remuxFormat')?.value||(dot>=0?f.name.slice(dot+1).toLowerCase():'');
  const allowed=new Set(['mp4','webm','mkv','mov','avi','m4v','3gp','ts','wmv','mp3','m4a','aac','opus','ogg','flac','wav','aiff','wma']);
  if(!allowed.has(target)){toast(t('errConversion'),'#ed4245');resetRemuxDrop();return;}
  clearToolError();state.remuxBusy=true;const select=document.getElementById('remuxFormat');if(select)select.disabled=true;renderRemuxSignal();showSelectedToolFile('remuxDrop',f);if(!window.ZenithLocalMedia?.isLocal())toast(t('uploading'),'#5b8def');
  try{
    const base=dot>0?f.name.slice(0,dot):f.name;
    const fd=new FormData();
    fd.append('file',f);fd.append('target_format',target);fd.append('mode','remux');
    fd.append('download_name',`remuxed_${base}.${target}`);
    const res=await fetchMediaJob(fd);
    if(res.localMedia){openSaveModal(res.localMedia.blob,res.localMedia.filename);toast(t('remuxDone'),'#3bba64');return;}
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){showPublicError(payload.error_code?payload:{error_code:'conversion_failed'},res.status,'',false);return;}
    if(!payload.download_url)throw new Error('Remuxed file was not prepared');
    await handoffPreparedDownload(payload,true);toast(t('remuxDone'),'#3bba64');
  }catch(e){if(!e.localMedia)showPublicError({error_code:e.name==='AbortError'?'request_timeout':'conversion_failed'},0,'',false);}
  finally{state.remuxBusy=false;if(select)select.disabled=false;renderRemuxSignal();}
}


export function handleRemuxDrop(e){e.preventDefault();document.getElementById('remuxDrop').classList.remove('drag');const f=e.dataTransfer.files[0];if(!f)return;handleRemuxFile({files:[f]});}


export function openConvert(){openOverlay('convOverlay');}


export function renderConvPreflight(){const card=document.getElementById('convPreflight');if(!card)return;if(!state.convFile){card.hidden=true;return;}const dot=state.convFile.name.lastIndexOf('.'),source=dot>=0?state.convFile.name.slice(dot+1).toUpperCase():t('convStepFile'),file=document.getElementById('convPreflightFile'),target=document.getElementById('convPreflightTarget'),text=document.getElementById('convPreflightText');if(file)file.textContent=source+' · '+formatLocalFileSize(state.convFile.size);if(target)target.textContent=state.convTargetFmt.toUpperCase();if(text)text.textContent=t('convPreflightText');card.hidden=false;}


export function setConvFmt(el){
  const format=el.tagName==='SELECT'?el.value:el.dataset.v;
  if(!['mp4','webm','mkv','mov','avi','m4v','3gp','ts','wmv','mp3','m4a','aac','opus','ogg','flac','wav','aiff','wma'].includes(format))return;
  document.querySelectorAll('.conv-modal .chip').forEach(c=>{c.classList.remove('active');c.setAttribute('aria-pressed','false');});
  if(el.tagName!=='SELECT'){el.classList.add('active');el.setAttribute('aria-pressed','true');}
  state.convTargetFmt=format;
  const preview=document.getElementById('convTargetPreview');if(preview)preview.textContent=format.toUpperCase();
  renderConvPreflight();_updateConvBtn();
}


export function selectConvFile(f){if(!validateToolFile(f)){state.convFile=null;renderConvPreflight();_updateConvBtn();return;}clearToolError();state.convFile=f;showSelectedToolFile('convDrop',f);renderConvPreflight();_updateConvBtn();}


export function handleConvFile(inp){selectConvFile(inp.files[0]);}


export function handleConvDrop(e){e.preventDefault();document.getElementById('convDrop').classList.remove('drag');selectConvFile(e.dataTransfer.files[0]);}


export function _updateConvBtn(){const btn=document.getElementById('convBtn'),txt=document.getElementById('convBtnTxt');if(!btn||!txt)return;if(state.convFile){btn.disabled=false;txt.textContent=t('convBtnReady').replace('{fmt}',state.convTargetFmt.toUpperCase());}else{btn.disabled=true;txt.textContent=t('convBtnSel');}}


export function updateConvBtn(){_updateConvBtn();}

// alias for legacy calls
export async function startConvert(){
  if(!state.convFile||state.convBusy)return;
  clearToolError();state.convBusy=true;
  const prog=document.getElementById('convProgress'),btn=document.getElementById('convBtn'),lbl=document.getElementById('convProgLabel'),pct=document.getElementById('convProgPct'),sub=document.getElementById('convProgSub');
  prog.classList.add('show');btn.disabled=true;lbl.textContent=t('uploading');pct.textContent='—';if(sub)sub.textContent='';
  try{
    const dot=state.convFile.name.lastIndexOf('.');
    const outputName=(dot>0?state.convFile.name.slice(0,dot):state.convFile.name)+'.'+state.convTargetFmt;
    const fd=new FormData();fd.append('file',state.convFile);fd.append('target_format',state.convTargetFmt);fd.append('mode','auto');fd.append('download_name',outputName);
    lbl.textContent=t('converting');
    const res=await fetchMediaJob(fd);
    if(res.localMedia){
      openSaveModal(res.localMedia.blob,res.localMedia.filename);
      lbl.textContent=t('convDoneLabel');pct.textContent='✓';btn.disabled=false;
      toast(t('convDone'),'#3bba64');return;
    }
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){lbl.textContent=t('errConversion');btn.disabled=false;showPublicError(payload.error_code?payload:{error_code:'conversion_failed'},res.status,'',false);return;}
    if(!payload.download_url)throw new Error('Converted file was not prepared');
    lbl.textContent=t('downloading');pct.textContent='90%';
    await handoffPreparedDownload(payload,true,(value,received,total)=>{pct.textContent=value+'%';if(sub)sub.textContent=formatLocalFileSize(received)+' / '+formatLocalFileSize(total);});
    lbl.textContent=t('convDoneLabel');pct.textContent='✓';
    toast(t('convDone'),'#3bba64');
    setTimeout(()=>{prog.classList.remove('show');btn.disabled=false;_updateConvBtn();},1500);
  }catch(e){btn.disabled=false;if(e.localMedia){prog.classList.remove('show');}else{lbl.textContent=e.name==='AbortError'?t('errTimeout'):t('errConversion');showPublicError({error_code:e.name==='AbortError'?'request_timeout':'conversion_failed'},0,'',false);}}
  finally{state.convBusy=false;}
}


export const overlayReturnFocus=new Map();


export const OVERLAY_FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
