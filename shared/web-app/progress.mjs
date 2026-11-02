// ZenithW progress; built into the existing classic-script entry point.
import {isYT} from './input.mjs';
import {t} from './language.mjs';
import {S, activeDownloadProfile, getPlatformName, profileNameKey} from './settings.mjs';
import {state} from './state.mjs';
import {openOverlay, safeThumbHtml} from './ui.mjs';


// ── DL MODAL ─────────────────────────────────────────
export function openDlModal(){
  if(!state.videoInfo.url)return;
  const th=document.getElementById('dlThumb');th.innerHTML=safeThumbHtml(state.videoInfo.thumbnail);
  document.getElementById('dlVTitle').textContent=state.videoInfo.title||'video';
  const m=Math.floor((state.videoInfo.duration||0)/60),s=String((state.videoInfo.duration||0)%60).padStart(2,'0');
  document.getElementById('dlVMeta').textContent=(state.videoInfo.uploader||'')+(state.videoInfo.duration?' · '+m+':'+s:'');
  const durationBadge=document.getElementById('dlDurationBadge');
  if(durationBadge){durationBadge.textContent=state.videoInfo.duration?m+':'+s:'';durationBadge.hidden=!state.videoInfo.duration;}
  const progressTitle=document.getElementById('dlProgressTitle');
  if(progressTitle)progressTitle.textContent=t('dlProgressTitle');
  document.getElementById('dlAnalysisTitle').textContent=t('dlAnalysisTitle');
  document.getElementById('dlAnalysisDesc').textContent=t('dlAnalysisDesc');
  document.getElementById('dlThumbActionTxt').textContent=t('dlThumbActionTxt');
  document.getElementById('dlSettingsTxt').textContent=t('dlSettingsTxt');
  renderDownloadPlan();
  resetProgress();openOverlay('dlOverlay');
}


export function progressMediaMeta(metrics={}){
  const platform=getPlatformName(state.videoInfo.url||'')||'Media';
  const format=(state.DL_MODE==='audio'?(S.afmt||'mp3'):(S.vfmt||'mp4')).toUpperCase();
  let quality='';
  if(state.DL_MODE==='audio')quality=(S.audioQ||'192')+' kbps';
  else if(metrics.actual_height)quality=metrics.actual_height+'p';
  else quality=(S.quality==='9999'?'MAX':(S.quality||'1080')+'p');
  return [platform,quality,format].filter(Boolean).join(' · ');
}


export function renderDownloadPlan(){
  const card=document.getElementById('dlPlanCard');
  if(!card)return;
  const isAudio=state.DL_MODE==='audio';
  const label=document.getElementById('dlPlanLabel'),title=document.getElementById('dlPlanTitle'),text=document.getElementById('dlPlanText');
  if(label)label.textContent=t(isAudio?'dlPlanAudio':'dlPlanVideo');
  if(isAudio){
    if(title)title.textContent=(S.afmt||'mp3').toUpperCase()+' · '+(S.audioQ||'192')+' kbps';
    if(text)text.textContent=t('dlPlanFallback');
    return;
  }
  const profile=activeDownloadProfile();
  if(title)title.textContent=profile==='custom'?t('profileCustom'):t(profileNameKey(profile));
  const quality=S.quality==='9999'?'MAX':(S.quality||'1080')+'p';
  const adaptive=S.youtubeAdaptiveQuality&&typeof isYT==='function'&&isYT(state.videoInfo.url||'');
  if(text)text.textContent=quality+' · '+(S.codec||'h264').toUpperCase()+' · '+(S.vfmt||'mp4').toUpperCase()+' — '+(adaptive?t('dlPlanAdaptive'):t('dlPlanFallback'));
}


export function formatProgressBytes(bytes){
  const value=Number(bytes||0);
  if(!Number.isFinite(value)||value<=0)return '';
  return (value/1024/1024).toFixed(value<10*1024*1024?1:0)+' MB';
}


export function setProgress(pct,label,speed,done,metrics={}){
  pct=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  document.querySelector('.dl-modal-sheet')?.classList.add('progress-active');
  document.getElementById('dlProgWrap').classList.add('show');
  document.getElementById('dlBarFill').style.width=pct+'%';
  document.getElementById('dlProgPct').textContent=pct+'%';
  document.getElementById('dlProgLabel').textContent=label;
  const progressMeta=document.getElementById('dlProgressMeta');
  if(progressMeta)progressMeta.textContent=progressMediaMeta(metrics);
  const eta=String(metrics.eta||'').trim();
  document.getElementById('dlProgSpeed').textContent=[speed,eta].filter(Boolean).join(' · ');
  const current=document.getElementById('dlProgCurrent'),total=document.getElementById('dlProgTotal');
  if(current)current.textContent=formatProgressBytes(metrics.downloaded_bytes)||'0 MB';
  if(total)total.textContent=formatProgressBytes(metrics.total_bytes)||'';
  const badge=document.getElementById('dlQualityBadge');
  if(badge&&metrics.actual_height){
    const dimensions=(metrics.actual_width?metrics.actual_width+' × ':'')+metrics.actual_height;
    badge.textContent=(metrics.quality_verified?t('dlQualityVerified'):'Selected quality')+': '+dimensions;
    badge.hidden=false;
    badge.classList.toggle('unverified',metrics.quality_verified===false);
  }
  if(done){document.getElementById('dlProgIcon').classList.add('done');document.getElementById('dlProgIcon').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';document.getElementById('dlCancel').classList.remove('vis');}
}


export function resetProgress(){
  document.querySelector('.dl-modal-sheet')?.classList.remove('progress-active');
  document.getElementById('dlProgWrap').classList.remove('show');
  document.getElementById('dlBarFill').style.width='0%';
  document.getElementById('dlProgPct').textContent='0%';
  document.getElementById('dlProgLabel').textContent='';
  const progressMeta=document.getElementById('dlProgressMeta');
  if(progressMeta)progressMeta.textContent=progressMediaMeta();
  document.getElementById('dlProgSpeed').textContent='';
  const current=document.getElementById('dlProgCurrent'),total=document.getElementById('dlProgTotal'),badge=document.getElementById('dlQualityBadge');
  if(current)current.textContent='0 MB';
  if(total)total.textContent='';
  if(badge){badge.hidden=true;badge.textContent='';badge.classList.remove('unverified');}
  document.getElementById('dlProgIcon').classList.remove('done');
  document.getElementById('dlProgIcon').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.getElementById('dlBtn').disabled=false;
  const dbt=document.getElementById('dlBtnTxt');if(dbt)dbt.textContent=t('dlBtn');
  document.getElementById('dlCancel').classList.remove('vis');
  document.getElementById('dlCancel').disabled=false;
}
