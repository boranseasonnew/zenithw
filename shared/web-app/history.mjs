// ZenithW history; built into the existing classic-script entry point.
import {onInput} from './input.mjs';
import {t} from './language.mjs';
import {fetchVideo} from './metadata.mjs';
import {state} from './state.mjs';
import {closeOverlay, escapeHtml, toast} from './ui.mjs';


// ── HISTORY (localStorage — kullanıcıya özel, sunucuda tutulmaz) ──
export const HISTORY_KEY='zw_history';


export const HISTORY_LIMIT=100;


export function getLocalHistory(){try{const r=localStorage.getItem(HISTORY_KEY);return r?JSON.parse(r):[];}catch(e){return [];}}


export function saveLocalHistory(h){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,HISTORY_LIMIT)));}catch(e){}}


export function addToLocalHistory(entry){
  const h=getLocalHistory();
  h.unshift({id:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)),timestamp:new Date().toISOString(),...entry});
  saveLocalHistory(h);
  renderHomeActivity();
}


export function renderHomeActivity(){
  const list=document.getElementById('homeActivityList');
  if(!list)return;
  const history=getLocalHistory().slice(0,2);
  if(!history.length){
    list.innerHTML=`<div class="home-activity-empty">${escapeHtml(t('homeActivityEmpty'))}</div>`;
    return;
  }
  list.innerHTML=history.map((item,hi)=>{
    const when=new Date(item.timestamp);
    const time=Number.isNaN(when.getTime())?'':when.toLocaleDateString(state.LANG==='tr'?'tr-TR':undefined,{day:'numeric',month:'short'});
    return `<button class="home-activity-item" type="button" onclick="reDownload(getLocalHistory()[${hi}]?.url)">
      <span class="home-activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v13M6.5 11.5 12 17l5.5-5.5"/><path d="M5 20h14"/></svg></span>
      <span class="home-activity-copy"><strong>${escapeHtml(item.title||'video')}</strong><small>${escapeHtml(String(item.format||'mp4').toUpperCase())}${item.platform?` · ${escapeHtml(item.platform)}`:''}${time?` · ${escapeHtml(time)}`:''}</small></span>
      <span class="home-activity-ready" aria-label="tamamlandı">✓</span>
    </button>`;
  }).join('');
}


export function loadHistory(){
  const list=document.getElementById('historyList');
  if(!list)return;
  const history=getLocalHistory();
  if(!history||history.length===0){
    list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:12px;">'+t('historyEmpty')+'</div>';
    return;
  }
  list.innerHTML=history.map((h,hi)=>`
    <div style="background:var(--chip-bg);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:10px;background:var(--border);padding:3px 6px;border-radius:4px;color:var(--text2);text-transform:uppercase;">${escapeHtml(h.platform||'')}</span>
        <span style="font-size:10px;background:var(--border);padding:3px 6px;border-radius:4px;color:var(--text2);">${escapeHtml(h.format||'')}</span>
        <span style="font-size:10px;color:var(--text3);margin-left:auto;">${new Date(h.timestamp).toLocaleDateString()}</span>
      </div>
      <div style="font-size:12px;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.title||'')}</div>
      <div style="display:flex;gap:8px;">
        <button data-hidx="${hi}" onclick="reDownload(getLocalHistory()[this.dataset.hidx]?.url)" style="background:var(--btn-bg);border:none;border-radius:6px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--btn-color);cursor:pointer;">${t('historyRedownload')}</button>
        <button data-hidx="${hi}" onclick="copyText(getLocalHistory()[this.dataset.hidx]?.url,this)" style="background:var(--chip-bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text2);cursor:pointer;">${t('historyCopyLink')}</button>
      </div>
    </div>
  `).join('');
}


export function clearHistory(){
  saveLocalHistory([]);
  loadHistory();
  renderHomeActivity();
  toast(t('historyClearedMsg'),'#3bba64');
}


export async function reDownload(url){
  closeOverlay('historyOverlay');
  document.getElementById('urlInput').value=url;
  onInput();
  fetchVideo();
}
