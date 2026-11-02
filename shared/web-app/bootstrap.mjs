// ZenithW bootstrap; built into the existing classic-script entry point.
import {renderHomeActivity} from './history.mjs';
import {applyLang, detectLang} from './language.mjs';
import {S, applyStUI, loadSt, setAccent, setTheme, showMobileSettingsHome} from './settings.mjs';
import {state} from './state.mjs';
import {closeOverlay, openOverlay} from './ui.mjs';


// ── INIT ──────────────────────────────────────────────
export function initializeApplication(){
(function init(){
  loadSt();
  try{const sl=localStorage.getItem('zw_lang');if(sl)state.LANG=sl;else state.LANG=detectLang();}catch(e){state.LANG=detectLang();}
  applyStUI();
  setTheme(S.theme||'dark');
  setAccent(S.accent||'default');
  applyLang(); // LAST — after all functions are defined
  renderHomeActivity();
  if(document.body.classList.contains('settings-page')&&window.matchMedia('(max-width:900px)').matches)showMobileSettingsHome();
  if(typeof resetCatTimer==='function')resetCatTimer();
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(S.theme==='auto')setTheme('auto');});
  // Bazı mobil tarayıcılar (özellikle iOS Safari) sayfayı geri/ileri
  // gezinmede bfcache'den eski DOM durumuyla geri getirebiliyor. Bu durumda
  // ayarlar sayfası en son açık kalan alt sekmeyle (ör. görünüm) geri gelip
  // kategori menüsünü atlıyordu. Sayfa bfcache'den geri geldiğinde mobilde
  // menüyü yeniden göster.
  window.addEventListener('pageshow',function(e){
    if(e.persisted&&document.body.classList.contains('settings-page')&&window.matchMedia('(max-width:900px)').matches){
      showMobileSettingsHome();
    }
  });
})();
}


// ── DESKTOP APP REMINDER ─────────────────────────────
// Same browser session: at most once. The checkbox stores a permanent opt-out.
export const DESKTOP_PROMO_SESSION_KEY='zw_desktop_promo_seen';


export const DESKTOP_PROMO_DISMISS_KEY='zw_desktop_promo_dismissed';


export function closeDesktopPromo(){
  closeOverlay('desktopPromo');
}


export function initDesktopPromo(){
  const promo=document.getElementById('desktopPromo');
  if(!promo)return;
  try{
    if(localStorage.getItem(DESKTOP_PROMO_DISMISS_KEY)==='1'||sessionStorage.getItem(DESKTOP_PROMO_SESSION_KEY)==='1')return;
  }catch(e){}
  document.getElementById('desktopPromoClose')?.addEventListener('click',closeDesktopPromo);
  promo.addEventListener('click',event=>{if(event.target===promo)closeDesktopPromo();});
  setTimeout(()=>{
    const editing=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
    if(document.hidden||editing||document.querySelector('.overlay.open'))return;
    promo.hidden=false;
    requestAnimationFrame(()=>{
      promo.classList.add('is-visible');
      openOverlay('desktopPromo');
    });
  },5000);
}


export function bindDesktopReminder(){
document.addEventListener('DOMContentLoaded',initDesktopPromo);
}
