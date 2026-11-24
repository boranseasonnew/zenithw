// ZenithW bootstrap; built into the existing classic-script entry point.
import {renderHomeActivity} from './history.mjs';
import {applyLang, detectLang} from './language.mjs';
import {S, applyStUI, loadSt, setAccent, setTheme, showMobileSettingsHome} from './settings.mjs';
import {state} from './state.mjs';


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
  if(document.body.classList.contains('settings-page')){
    const returnPath=new URLSearchParams(location.search).get('return')||'';
    const tab=(location.hash.slice(1)||returnPath.split('#')[1]||'').toLowerCase();
    if(tab==='video'||tab==='audio'){
      const button=document.querySelector(`.st-nav-btn[data-page="${tab}"]`);
      if(button){document.body.classList.remove('mobile-settings-index');button.click();}
    }
  }
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


// App links remain available from the Downloads page; no timed promo interrupts the home page.
