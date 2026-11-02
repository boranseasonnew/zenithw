// ZenithW ui; built into the existing classic-script entry point.
import {DESKTOP_PROMO_DISMISS_KEY, DESKTOP_PROMO_SESSION_KEY} from './bootstrap.mjs';
import {loadHistory} from './history.mjs';
import {OVERLAY_FOCUSABLE, overlayReturnFocus} from './media-tools.mjs';
import {closePlaylistQueue} from './queue.mjs';
import {releasePendingBlob} from './save.mjs';
import {state} from './state.mjs';


// ── XSS güvenliği: uzak sitelerden gelen title/thumbnail/url innerHTML'e
// basılmadan önce escape edilmeli, çünkü bu değerler kullanıcının
// yapıştırdığı URL'nin ait olduğu uzak sayfanın metadata'sından geliyor.
export function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}


export function safeThumbHtml(url,fallback){
  if(fallback===undefined)fallback='🎬';
  if(!url)return fallback;
  try{
    const u=new URL(url,location.href);
    if(u.protocol!=='http:'&&u.protocol!=='https:')return fallback;
  }catch(e){return fallback;}
  return `<img src="${escapeHtml(url)}" loading="lazy" decoding="async" width="160" height="90" referrerpolicy="no-referrer">`;
}


export function syncModalBackground(){
  document.querySelectorAll('[data-modal-background]').forEach(child=>{
    child.inert=false;
    const previous=child.getAttribute('data-modal-previous-aria');
    if(previous==='__none__')child.removeAttribute('aria-hidden');
    else child.setAttribute('aria-hidden',previous);
    child.removeAttribute('data-modal-previous-aria');
    child.removeAttribute('data-modal-background');
  });
  const overlays=[...document.querySelectorAll('.overlay')];
  const openOverlays=overlays.filter(overlay=>overlay.classList.contains('open'));
  const activeOverlay=openOverlays[openOverlays.length-1]||null;
  overlays.forEach(overlay=>{overlay.inert=overlay!==activeOverlay;});
  if(!activeOverlay)return;
  let current=activeOverlay;
  while(current&&current!==document.body){
    const parent=current.parentElement;if(!parent)break;
    [...parent.children].forEach(sibling=>{
      if(sibling!==current&&!sibling.matches('script')){
        sibling.inert=true;
        sibling.setAttribute('data-modal-previous-aria',sibling.getAttribute('aria-hidden')??'__none__');
        sibling.setAttribute('aria-hidden','true');sibling.setAttribute('data-modal-background','');
      }
    });
    current=parent;
  }
}


export function lockPageScroll(){
  if(document.documentElement.classList.contains('modal-open'))return;
  state.pageScrollLockY=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${state.pageScrollLockY}px`;
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
}


export function unlockPageScrollIfIdle(){
  if(document.querySelector('.overlay.open'))return;
  const restoreY=state.pageScrollLockY;
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  document.body.style.top='';
  window.scrollTo(0,restoreY);
}


export function openOverlay(id,trigger){
  const overlay=document.getElementById(id);if(!overlay)return;
  const active=trigger||document.activeElement;
  if(active&&active!==document.body)overlayReturnFocus.set(id,active);
  overlay.inert=false;overlay.setAttribute('aria-hidden','false');overlay.classList.add('open');syncModalBackground();lockPageScroll();
  requestAnimationFrame(()=>{
    const target=overlay.querySelector('[autofocus],'+OVERLAY_FOCUSABLE);
    if(target)target.focus({preventScroll:true});
  });
}


export function handleOverlay(e,id){if(e.target===document.getElementById(id)){if(id==='plQueueOverlay'){closePlaylistQueue();}else{closeOverlay(id);}}}


export function closeOverlay(id,preservePending){
  const overlay=document.getElementById(id);if(!overlay)return;
  const wasOpen=overlay.classList.contains('open');
  if(id==='desktopPromo'){
    try{
      sessionStorage.setItem(DESKTOP_PROMO_SESSION_KEY,'1');
      if(document.getElementById('desktopPromoNever')?.checked)localStorage.setItem(DESKTOP_PROMO_DISMISS_KEY,'1');
    }catch(e){}
    overlay.classList.remove('is-visible');
    setTimeout(()=>{if(!overlay.classList.contains('open'))overlay.hidden=true;},240);
  }
  overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');overlay.inert=true;syncModalBackground();
  unlockPageScrollIfIdle();
  if(id==='servicesOverlay'){const chip=document.getElementById('servicesChip');if(chip){chip.classList.remove('open');chip.setAttribute('aria-expanded','false');}}
  if(id==='saveOverlay'&&!preservePending)releasePendingBlob();
  const previous=overlayReturnFocus.get(id);overlayReturnFocus.delete(id);
  if(wasOpen&&previous&&document.contains(previous)&&!document.querySelector('.overlay.open'))requestAnimationFrame(()=>previous.focus({preventScroll:true}));
}


export function openDonate(){openOverlay('donOverlay');}


export function openHistory(){openOverlay('historyOverlay');loadHistory();}


export function bindModalKeyboard(){
document.addEventListener('keydown',e=>{
  const overlays=[...document.querySelectorAll('.overlay.open')];
  const activeOverlay=overlays[overlays.length-1];
  if(e.key==='Escape'&&activeOverlay){e.preventDefault();if(activeOverlay.id==='plQueueOverlay')closePlaylistQueue();else closeOverlay(activeOverlay.id);return;}
  if(e.key==='Tab'&&activeOverlay){
    const focusable=[...activeOverlay.querySelectorAll(OVERLAY_FOCUSABLE)].filter(el=>el.offsetParent!==null);
    if(!focusable.length){e.preventDefault();return;}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
}


export function bindModalState(){
document.addEventListener('DOMContentLoaded',()=>{
  const overlays=[...document.querySelectorAll('.overlay')];
  overlays.forEach(overlay=>{
    overlay.setAttribute('aria-hidden','true');overlay.inert=true;
    const dialog=overlay.firstElementChild;
    if(dialog&&!dialog.hasAttribute('role'))dialog.setAttribute('role','dialog');
    if(dialog&&!dialog.hasAttribute('aria-modal'))dialog.setAttribute('aria-modal','true');
  });
  syncModalBackground();
});
}


// ── UTILS ─────────────────────────────────────────────
export function toast(msg,color){const el=document.getElementById('toast');document.getElementById('toastTxt').textContent=msg;document.getElementById('toastDot').style.background=color||'#e8e8e8';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}


export function copyText(txt,btn){navigator.clipboard.writeText(txt).then(()=>{const o=btn.textContent;btn.textContent='✓';setTimeout(()=>btn.textContent=o,2000);});}


export function scrollToTop(){
  if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();
  document.body.classList.remove('url-editing','modal-open');
  document.documentElement.classList.remove('modal-open');
  window.scrollTo({top:0,behavior:'smooth'});
}


export function toggleAccordion(el){el.classList.toggle('open');}


// ── MICRO-INTERACTION: click ripple (runs only on interaction) ──
export function bindClickRipple(){
(function(){
  const RIPPLE_SEL='.action-btn,.vc-dl,.pl-dl-btn,.url-go-btn,.dl-btn,.save-btn,.bar-btn,.mode-btn,.btn-paste,.chip,.theme-btn';
  document.addEventListener('click',e=>{
    const el=e.target.closest(RIPPLE_SEL);
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const d=Math.max(rect.width,rect.height);
    const r=document.createElement('span');
    r.className='ripple';
    r.style.width=r.style.height=d+'px';
    r.style.left=(e.clientX-rect.left-d/2)+'px';
    r.style.top=(e.clientY-rect.top-d/2)+'px';
    if(getComputedStyle(el).position==='static')el.style.position='relative';
    el.style.overflow=el.style.overflow||'hidden';
    el.appendChild(r);
    setTimeout(()=>r.remove(),650);
  });
})();
}
