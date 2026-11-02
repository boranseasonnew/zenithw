// ZenithW settings; built into the existing classic-script entry point.
import {HISTORY_KEY} from './history.mjs';
import {t} from './language.mjs';
import {renderDownloadPlan} from './progress.mjs';
import {QUEUE_STATE_KEY, hideQueueResumeHint} from './queue.mjs';
import {state} from './state.mjs';
import {openOverlay, toast} from './ui.mjs';


// ── SETTINGS ─────────────────────────────────────────
export const DEFAULT_SETTINGS={quality:'1080',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'256',downloadProfile:'custom',youtubeAdaptiveQuality:true,metadata:true,sponsorblock:false,subtitles:false,theme:'dark',fnfTemplate:'{title}.{ext}',filenameStyle:'basic',accent:'default',reduceMotion:false,reduceTransparency:false,keepQueueClosed:false,subtitleLang:'tr',saveMethod:'ask'};


export const S={...DEFAULT_SETTINGS};


export const DOWNLOAD_PROFILES={
  minimal:{quality:'480',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'128'},
  standard:{quality:'1080',codec:'h264',vfmt:'mp4',afmt:'mp3',audioQ:'192'},
  quality:{quality:'2160',codec:'av1',vfmt:'webm',afmt:'opus',audioQ:'192'}
};


export const PROFILE_FIELDS=['quality','codec','vfmt','afmt','audioQ'];


export function profileNameKey(name){return 'profile'+name.charAt(0).toUpperCase()+name.slice(1);}


export function activeDownloadProfile(){return Object.keys(DOWNLOAD_PROFILES).find(name=>PROFILE_FIELDS.every(key=>S[key]===DOWNLOAD_PROFILES[name][key]))||'custom';}


export function renderDownloadProfileUI(){
  const active=activeDownloadProfile();
  S.downloadProfile=active;
  document.querySelectorAll('[data-profile]').forEach(card=>{const selected=card.dataset.profile===active;card.classList.toggle('active',selected);card.setAttribute('aria-pressed',String(selected));});
  const status=document.getElementById('downloadProfileStatus');
  if(status)status.textContent=active==='custom'?t('profileCustom'):t('profileActive').replace('{name}',t(profileNameKey(active)));
}


export function applyDownloadProfile(name){
  const profile=DOWNLOAD_PROFILES[name];
  if(!profile)return;
  Object.assign(S,profile,{downloadProfile:name});
  saveSt();applyStUI();
  toast(t('profileApplied').replace('{name}',t(profileNameKey(name))),'#5b8def');
}


export function saveSt(){try{localStorage.setItem('zw_s',JSON.stringify(S));}catch(e){}}


export function cleanSettings(raw){
  const clean={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return clean;
  Object.keys(DEFAULT_SETTINGS).forEach(key=>{const value=raw[key],sample=DEFAULT_SETTINGS[key];if(typeof value===typeof sample)clean[key]=value;});
  if(clean.fnfTemplate)clean.fnfTemplate=clean.fnfTemplate.slice(0,180);
  if(clean.saveMethod&&!['ask','download','share','copy'].includes(clean.saveMethod))clean.saveMethod='ask';
  return clean;
}


export function loadSt(){try{const r=localStorage.getItem('zw_s');if(r)Object.assign(S,cleanSettings(JSON.parse(r)));}catch(e){}}


export function applyAccessibilityPrefs(){
  document.documentElement.classList.toggle('zw-reduce-motion',!!S.reduceMotion);
  document.documentElement.classList.toggle('zw-reduce-transparency',!!S.reduceTransparency);
}


export function applyStUI(){
  document.querySelectorAll('#stQChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.quality));
  document.querySelectorAll('#stCodecChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.codec));
  document.querySelectorAll('#stVFmtChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.vfmt));
  document.querySelectorAll('#stAFmtChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.afmt));
  document.querySelectorAll('#stAQChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===S.audioQ));
  document.querySelectorAll('#stAccentChips .accent-option').forEach(option=>{
    const selected=option.dataset.v===(S.accent||'default');
    option.classList.toggle('active',selected);
    option.setAttribute('aria-pressed',String(selected));
  });
  const tm=document.getElementById('togMetadata');if(tm){tm.classList.toggle('on',!!S.metadata);tm.setAttribute('aria-checked',String(!!S.metadata));}
  const tsb=document.getElementById('togSponsorblock');if(tsb){tsb.classList.toggle('on',!!S.sponsorblock);tsb.setAttribute('aria-checked',String(!!S.sponsorblock));}
  const tsu=document.getElementById('togSubtitles');if(tsu){tsu.classList.toggle('on',!!S.subtitles);tsu.setAttribute('aria-checked',String(!!S.subtitles));}
  ['ReduceMotion','ReduceTransparency','KeepQueueClosed','YoutubeAdaptiveQuality'].forEach(name=>{const key=name.charAt(0).toLowerCase()+name.slice(1),el=document.getElementById('tog'+name);if(el){el.classList.toggle('on',!!S[key]);el.setAttribute('aria-checked',String(!!S[key]));}});
  const subLang=document.getElementById('subtitleLangSelect');if(subLang)subLang.value=S.subtitleLang||'tr';
  document.querySelectorAll('#saveMethodChips .chip').forEach(c=>{const selected=c.dataset.v===(S.saveMethod||'ask');c.classList.toggle('active',selected);c.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('#filenameStyleChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===(S.filenameStyle||'basic')));
  ['Auto','Light','Dark'].forEach(n=>{const b=document.getElementById('theme'+n);if(b)b.classList.toggle('active',S.theme===n.toLowerCase());});
  const fi=document.getElementById('fnfInput');if(fi){fi.value=S.fnfTemplate||'{title}.{ext}';updateFnfPreview();}
  renderDownloadProfileUI();
  renderDownloadPlan();
  applyAccessibilityPrefs();
}


// ── THEME ─────────────────────────────────────────────
export function setTheme(th){
  if(!['auto','light','dark'].includes(th))th='dark';
  S.theme=th;saveSt();
  ['Auto','Light','Dark'].forEach(n=>{const b=document.getElementById('theme'+n);if(b)b.classList.toggle('active',th===n.toLowerCase());});
  let isLight;
  if(th==='auto'){isLight=!window.matchMedia('(prefers-color-scheme:dark)').matches;}
  else{isLight=(th==='light');}
  document.body.classList.toggle('light',isLight);
  // html arkaplanini da senkron tut: iOS rubber-band sirasinda
  // html'in arkaplani gorunur oluyor, body.light'taki --bg'yi
  // miras alamadigi icin ayrica isaretliyoruz.
  document.documentElement.classList.toggle('light',isLight);
  syncBrowserThemeColor(isLight);
}


export function setAccent(acc){
  const themes=['default','purple'];
  if(!themes.includes(acc))acc='default';
  S.accent=acc;saveSt();
  document.querySelectorAll('#stAccentChips .accent-option').forEach(option=>{
    const selected=option.dataset.v===acc;
    option.classList.toggle('active',selected);
    option.setAttribute('aria-pressed',String(selected));
  });
  document.body.classList.remove('theme-default','theme-purple','theme-gray','theme-pink','theme-cobalt');
  document.body.classList.add('theme-'+acc);
  syncBrowserThemeColor(document.body.classList.contains('light'));
}


export function syncBrowserThemeColor(isLight){
  const dark={default:'#07090d',purple:'#0b0410',gray:'#080808',pink:'#0f0509',cobalt:'#040a16'};
  const light={default:'#eef6fb',purple:'#f7f1fb',gray:'#f3f3f3',pink:'#fff2f7',cobalt:'#eef4ff'};
  const palette=isLight?light:dark;
  const color=palette[S.accent]||palette.default;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',color);
}


// ── FILENAME ──────────────────────────────────────────
export function buildFilename(tpl,info,fmt){const now=new Date(),date=now.getFullYear()+'-'+(now.getMonth()+1).toString().padStart(2,'0')+'-'+now.getDate().toString().padStart(2,'0');return tpl.replace(/{title}/g,(info.title||'video').replace(/[<>:"/\\|?*]/g,'_')).replace(/{artist}/g,(info.uploader||'unknown').replace(/[<>:"/\\|?*]/g,'_')).replace(/{date}/g,date).replace(/{platform}/g,getPlatformName(info.url||'')).replace(/{ext}/g,fmt||'mp4');}


export function getPlatformName(url){if(url.includes('youtube')||url.includes('youtu.be'))return'youtube';if(url.includes('tiktok'))return'tiktok';if(url.includes('instagram'))return'instagram';if(url.includes('twitter')||url.includes('x.com'))return'twitter';if(url.includes('soundcloud'))return'soundcloud';return'video';}


export function updateFnfPreview(){const tpl=document.getElementById('fnfInput').value||'{title}.{ext}';S.fnfTemplate=tpl;saveSt();const el=document.getElementById('fnfPreview');if(el)el.textContent='Örnek: '+buildFilename(tpl,{title:'video_başlığı',uploader:'sanatçı',url:''},S.afmt||'mp3');}


export function insertFnfTag(tag){const inp=document.getElementById('fnfInput');const pos=inp.selectionStart||inp.value.length;inp.value=inp.value.slice(0,pos)+tag+inp.value.slice(inp.selectionEnd||pos);inp.focus();updateFnfPreview();}


export function setFnfTemplate(tpl){document.getElementById('fnfInput').value=tpl;updateFnfPreview();}


export const FILENAME_STYLES={classic:'{title}.{ext}',basic:'{artist} - {title}.{ext}',pretty:'{title} · {artist}.{ext}',nerdy:'[{platform}] {date} - {title}.{ext}'};


export function setFilenameStyle(el){
  const style=el.dataset.v||'basic';
  S.filenameStyle=style;saveSt();
  setFnfTemplate(FILENAME_STYLES[style]||FILENAME_STYLES.basic);
  document.querySelectorAll('#filenameStyleChips .chip').forEach(c=>c.classList.toggle('active',c===el));
}


// ── SETTINGS UI ───────────────────────────────────────
export function openSettings(){openOverlay('stOverlay');}


export function stTab(el){
  document.querySelectorAll('.st-nav-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});document.querySelectorAll('.st-page').forEach(p=>p.classList.remove('active'));el.classList.add('active');el.setAttribute('aria-selected','true');const pg=document.getElementById('stPage'+el.dataset.page.charAt(0).toUpperCase()+el.dataset.page.slice(1));if(pg)pg.classList.add('active');const content=document.querySelector('.st-content');if(content)content.scrollTop=0;
  if(window.matchMedia('(max-width:900px)').matches&&document.body.classList.contains('settings-page')){document.body.classList.remove('mobile-settings-index');const title=document.getElementById('mobileSettingsTitle'),label=el.querySelector('span');if(title&&label)title.textContent=label.textContent;window.scrollTo({top:0,behavior:'auto'});}
}


export function showMobileSettingsHome(){if(!document.body.classList.contains('settings-page'))return;document.body.classList.add('mobile-settings-index');const title=document.getElementById('mobileSettingsTitle');if(title)title.textContent=t('stModalTitle');window.scrollTo({top:0,behavior:'auto'});}


export function stChip(el,key){el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');S[key]=el.dataset.v;if(PROFILE_FIELDS.includes(key))S.downloadProfile='custom';saveSt();applyStUI();}


export function stToggle(key){S[key]=!S[key];const tog=document.getElementById('tog'+key.charAt(0).toUpperCase()+key.slice(1));if(tog){tog.classList.toggle('on',S[key]);tog.setAttribute('aria-checked',String(!!S[key]));}saveSt();applyAccessibilityPrefs();}


export function setSettingValue(key,value){if(Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS,key)){S[key]=value;saveSt();}}


export function setChoice(el,key){setSettingValue(key,el.dataset.v);el.parentElement.querySelectorAll('.chip').forEach(c=>{c.classList.toggle('active',c===el);if(key==='saveMethod')c.setAttribute('aria-pressed',String(c===el));});}


export function exportSettings(){
  const blob=new Blob([JSON.stringify({app:'ZenithW',version:1,settings:S},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zenithw-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(state.LANG==='tr'?'ayarlar dışa aktarıldı':'settings exported','#3bba64');
}


export async function importSettings(file){
  if(!file||file.size>100000){toast(state.LANG==='tr'?'geçersiz ayar dosyası':'invalid settings file','#ed4245');return;}
  try{const parsed=JSON.parse(await file.text()),incoming=parsed&&parsed.settings?parsed.settings:parsed;Object.assign(S,DEFAULT_SETTINGS,cleanSettings(incoming));saveSt();applyStUI();setTheme(S.theme);setAccent(S.accent);toast(state.LANG==='tr'?'ayarlar içe aktarıldı':'settings imported','#3bba64');}catch(e){toast(state.LANG==='tr'?'ayar dosyası okunamadı':'could not read settings file','#ed4245');}
}


export function resetSettings(){Object.assign(S,DEFAULT_SETTINGS);saveSt();applyStUI();setTheme(S.theme);setAccent(S.accent);toast(state.LANG==='tr'?'ayarlar sıfırlandı':'settings reset','#f59e0b');}


export function clearZenithLocalData(){try{localStorage.removeItem(HISTORY_KEY);localStorage.removeItem(QUEUE_STATE_KEY);}catch(e){}hideQueueResumeHint();toast(state.LANG==='tr'?'geçmiş ve kuyruk temizlendi':'history and queue cleared','#3bba64');}
