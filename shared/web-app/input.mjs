// ZenithW input; built into the existing classic-script entry point.
import {YOUTUBE_WEB_ENABLED} from './api.mjs';
import {fetchBulkVideos} from './bulk.mjs';
import {t} from './language.mjs';
import {fetchVideo} from './metadata.mjs';
import {openDlModal} from './progress.mjs';
import {state} from './state.mjs';
import {closeOverlay, openOverlay} from './ui.mjs';


// ── MOBILE URL EDITING PERFORMANCE ──
// visualViewport'un resize/scroll olaylarında alt menüyü her karede taşımak,
// Android tarayıcının klavye ve adres çubuğu animasyonuyla yarışıyordu. URL
// alanı düzenlenirken sabit menüyü geçici olarak kompozisyondan çıkarıyoruz;
// klavye kapanınca tek bir durum değişikliğiyle geri geliyor.
export function bindMobileUrlEditing(){
(function(){
  const touchDevice=window.matchMedia('(hover:none) and (pointer:coarse)');
  const isUrlEditor=el=>el?.id==='urlInput'||el?.id==='urlTextarea';
  function syncUrlEditingState(){
    document.body.classList.toggle('url-editing',touchDevice.matches&&isUrlEditor(document.activeElement));
  }
  document.addEventListener('focusin',syncUrlEditingState);
  document.addEventListener('focusout',()=>setTimeout(syncUrlEditingState,0));
})();
}


export function setMode(m){state.DL_MODE=m;['Auto','Audio','Mute'].forEach(n=>{const b=document.getElementById('mode'+n);if(b)b.classList.toggle('active',n.toLowerCase()===m);});if(state.videoInfo.url)openDlModal();}


export function toggleBulkMode(){
  state.BULK_MODE=!state.BULK_MODE;
  const form=document.querySelector('.url-form');
  const toggle=document.getElementById('bulkToggle');
  const goBtn=document.querySelector('.url-go-btn');
  form.classList.toggle('bulk-mode',state.BULK_MODE);
  toggle.classList.toggle('active',state.BULK_MODE);
  if(state.BULK_MODE){
    goBtn.onclick=fetchBulkVideos;
    goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v13M5 16l7 5 7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }else{
    goBtn.onclick=fetchVideo;
    goBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>';
  }
}


// ── SERVICES ──────────────────────────────────────────
export function toggleServices(){
  const o=document.getElementById('servicesOverlay');
  const isOpen=o.classList.contains('open');
  const c=document.getElementById('servicesChip');
  if(isOpen){closeOverlay('servicesOverlay');c.classList.remove('open');c.setAttribute('aria-expanded','false');}
  else{openOverlay('servicesOverlay',c);c.classList.add('open');c.setAttribute('aria-expanded','true');}
}


// ── MORE MENU ─────────────────────────────────────────
export function toggleMoreMenu(){const b=document.getElementById('moreBtn'),p=document.getElementById('morePopup'),o=p.classList.contains('open');p.classList.toggle('open',!o);b.classList.toggle('active',!o);}


export function bindMoreMenuDismissal(){
document.addEventListener('click',e=>{const b=document.getElementById('moreBtn'),p=document.getElementById('morePopup');if(b&&p&&!b.contains(e.target)&&!p.contains(e.target)){p.classList.remove('open');b.classList.remove('active');}});
}


export function fireRadar(){
  const ring=document.getElementById('radarRing');
  if(!ring)return;
  ring.classList.remove('fire');
  void ring.offsetWidth; // restart animation
  ring.classList.add('fire');
}


// ── URL ───────────────────────────────────────────────
export function isYT(u){try{const h=new URL(u).hostname.toLowerCase();return h==='youtube.com'||h.endsWith('.youtube.com')||h==='youtu.be'||h.endsWith('.youtu.be');}catch(e){return false;}}


export function shouldRouteYoutubeToApps(url){return !YOUTUBE_WEB_ENABLED&&isYT(url);}


export function showYoutubeAppRequired(){
  const close=document.getElementById('youtubeAppClose');
  if(close)close.setAttribute('aria-label',t('youtubeAppCloseLabel'));
  openOverlay('youtubeAppOverlay');
}


export function handleYoutubeAppRequired(payload){
  if(payload&&payload.error_code==='youtube_app_required'){showYoutubeAppRequired();return true;}
  return false;
}


export function isValidUrl(u){try{const p=new URL(u);return p.protocol==='http:'||p.protocol==='https:';}catch(e){return false;}}


export function onInput(){
  if(state.infoController){state.infoController.abort();state.infoController=null;}
  state.infoSequence++;
  const v=document.getElementById('urlInput').value;
  document.getElementById('urlClear').classList.toggle('vis',v.length>0);
  document.getElementById('errorWrap').classList.remove('show');
  document.getElementById('playlistCard').classList.remove('show');
  hideQR();state.videoInfo={};
  document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  const trimmed=v.trim();
  if(trimmed&&isValidUrl(trimmed)&&trimmed!==state.lastRadarUrl){state.lastRadarUrl=trimmed;fireRadar();}
  if(!trimmed)state.lastRadarUrl='';
}


export function clearUrl(){document.getElementById('urlInput').value='';document.getElementById('urlTextarea').value='';onInput();document.getElementById('urlInput').focus();}


export async function pasteAndFetch(){try{const tx=await navigator.clipboard.readText();if(tx){document.getElementById('urlInput').value=tx;onInput();if(tx.startsWith('http'))fetchVideo();}}catch(e){document.getElementById('urlInput').focus();}}


export function _looksLikeVideoLink(s){
  if(!s||s.length>600)return false;
  s=s.trim();
  if(!/^https?:\/\//i.test(s))return false;
  if(/\s/.test(s))return false; // toplu link listesi değil, tek link olsun
  return true;
}


export async function checkClipboardForLink(){
  try{
    if(document.getElementById('bulkToggle').classList.contains('active'))return;
    const ai=document.activeElement;
    if(ai&&(ai.id==='urlInput'||ai.id==='urlTextarea'))return; // kullanıcı zaten yazıyor
    if(document.getElementById('urlInput').value.trim())return; // kutuda zaten bir şey var
    if(!navigator.clipboard||!navigator.clipboard.readText)return;
    const perm=navigator.permissions&&navigator.permissions.query?await navigator.permissions.query({name:'clipboard-read'}).catch(()=>null):null;
    if(perm&&perm.state==='denied')return;
    const tx=await navigator.clipboard.readText();
    if(!_looksLikeVideoLink(tx))return;
    let dismissed=[];try{dismissed=JSON.parse(sessionStorage.getItem('zw_clip_dismissed')||'[]');}catch(e){}
    if(dismissed.includes(tx))return;
    state._clipHintUrl=tx;
    let host='';try{host=new URL(tx).hostname.replace(/^www\./,'');}catch(e){}
    document.getElementById('clipHintTxt').textContent=t('clipHintTxt').replace('{host}',host||'link');
    document.getElementById('clipHint').classList.add('show');
  }catch(e){/* izin yok ya da okunamadı — sessizce vazgeç */}
}


export function useClipboardHint(){
  if(!state._clipHintUrl)return;
  document.getElementById('urlInput').value=state._clipHintUrl;
  onInput();
  document.getElementById('clipHint').classList.remove('show');
  fetchVideo();
}


export function dismissClipboardHint(){
  document.getElementById('clipHint').classList.remove('show');
  if(state._clipHintUrl){
    try{
      const d=JSON.parse(sessionStorage.getItem('zw_clip_dismissed')||'[]');
      d.push(state._clipHintUrl);
      sessionStorage.setItem('zw_clip_dismissed',JSON.stringify(d.slice(-10)));
    }catch(e){}
  }
  state._clipHintUrl='';
}


export function bindClipboardVisibility(){
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkClipboardForLink();});
}


export function bindClipboardFocus(){
window.addEventListener('focus',checkClipboardForLink);
}


export function showYtErr(){const p=document.getElementById('ytPopup');p.classList.add('show');if(state.ytErrTimer)clearTimeout(state.ytErrTimer);state.ytErrTimer=setTimeout(()=>p.classList.remove('show'),4500);}


// ── QR ────────────────────────────────────────────────
// URL'leri üçüncü taraf bir QR servisine göndermemek için otomatik QR üretimi
// kapalıdır. Yerel bir QR üretici eklendiğinde bu fonksiyon yeniden açılabilir.
export function showQR(){hideQR();}


export function hideQR(){document.getElementById('qrWrap').classList.remove('show');}
