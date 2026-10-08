'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',paste:'M9 5H6v17h14V5h-5M9 3h6v4H9z',arrow:'M5 12h14m-5-5 5 5-5 5',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',close:'m6 6 12 12M18 6 6 18',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',folder:'M3 7V5h6l2 2h10v13H3z',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',trim:'M4 3v13a4 4 0 0 0 4 4h13M3 4h13a4 4 0 0 1 4 4v13M8 8h8v8H8z',cookie:'M20 12a4 4 0 0 1-4-4 4 4 0 0 1-4-4c-5 0-9 4-9 9s4 9 9 9 9-4 9-9M8 12h.01M12 17h.01M7 17h.01',settings:'m9 3-.5 3-3 1-2-1.5-2 3L4 11v3l-2.5 2.5 2 3 3-1 2 1 .5 2.5h5l.5-2.5 2-1 3 1 2-3L19 14v-3l2.5-2.5-2-3-2 1.5-3-1L14 3zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',chevron:'m9 5 7 7-7 7'};
Object.assign(paths,{subtitles:'M3 6h18v12H3zM10 10H7v4h3M17 10h-3v4h3',code:'m8 6-6 6 6 6m8-12 6 6-6 6'});
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.link)+'"/></svg>';
$$('[data-icon]').forEach(n=>n.innerHTML=icon(n.dataset.icon));
const native=!!window.zenith, jobs=new Map(), QUEUE_KEY='zenith.desktop.queue.v4';
let settings={},tools={},media=null,mediaUrl='',kind='video',selection=null,tab='downloads',history=[],inspectId=0,starting=false,welcomeStep=0,pendingTrim=false,saveChain=Promise.resolve();
const t=(a,b)=>localText(a,settings.language||'tr',b);
const tr=key=>words[key]?.[Math.max(0,['tr','en','ru','de'].indexOf(settings.language||'tr'))]||words[key]?.[0]||key;
const errorText=e=>String(e?.message||e).replace(/^Error invoking remote method '[^']+': (?:Error: )?/,'');
function toast(value){$('#toast').textContent=value;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3400);}
const guarded=action=>async(...args)=>{try{await action(...args);}catch(e){toast(errorText(e));}};
const time=n=>{const x=Math.max(0,Math.floor(Number(n)||0));return (x>=3600?Math.floor(x/3600)+':'+String(Math.floor(x/60)%60).padStart(2,'0'):Math.floor(x/60))+':'+String(x%60).padStart(2,'0');};
const bytes=n=>n?(n/1048576).toFixed(n>104857600?0:1)+' MB':'';
function normalize(raw){const v=raw.trim();if(!v)throw Error(t('Bir bağlantı gir.','Enter a link.'));const u=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v)?v:'https://'+v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error(t('Geçerli bir bağlantı gir.','Enter a valid link.'));return u.href;}
const previewSettings={downloadFolder:'Downloads / Zenith',naming:'%(title)s [%(id)s].%(ext)s',language:'tr',videoQuality:'1080',videoContainer:'mp4',audioFormat:'mp3',audioQuality:'192',cookieMode:'none',cookieBrowser:'firefox',cookieLoginUrl:'https://www.youtube.com/',ytDlpChannel:'nightly',embedMetadata:true,embedChapters:true,advancedMode:false,onboardingComplete:true};
Object.assign(previewSettings,{videoCodec:'h264',subtitleLang:'tr,en',sponsorCategories:'sponsor,selfpromo,interaction',downloadArchive:true,concurrentFragments:4,retries:10,fragmentRetries:10,fileAccessRetries:3,aria2Connections:8,socketTimeout:20,speedLimit:'',throttleRate:'',proxyUrl:'',unavailableFragments:'skip',userAgent:'',refererUrl:'',playlistItems:'',extractorRetries:3,extractorArgs:'',sleepRequests:0,sleepInterval:0,maxSleepInterval:0,sleepSubtitles:0,fixupPolicy:'detect_or_warn',autoSubtitles:true,embedSubtitles:true,subtitleFormat:'best',playlistPolicy:'stop',sponsorAction:'remove',playlistRandom:false,playlistFolder:false,playlistNumber:false,lazyPlaylist:false,scriptBeforeEnabled:false,scriptAfterEnabled:false,scriptTimeout:60,scriptPolicy:'stop'});
const api=window.zenith||{settings:{get:async()=>previewSettings,save:async v=>Object.assign(previewSettings,v)},history:{get:async()=>[]},profiles:{list:async()=>[]},tools:async()=>({}),onDownload:()=>{},onCookiesUpdated:()=>{},onEngineUpdated:()=>{}};
const requireNative=()=>{if(!native)throw Error(t('Bu işlem masaüstü uygulamasında kullanılabilir.','Available in the desktop app.'));};
function shortFolder(){return String(settings.downloadFolder||'Zenith').replaceAll('\\','/').split('/').filter(Boolean).slice(-2).join(' / ');}
function syncSettings(){
 $$('.settings-panel input[id],.settings-panel select[id]').forEach(n=>{if(!(n.id in settings))return;n.type==='checkbox'?n.checked=!!settings[n.id]:n.value=settings[n.id]??'';});
 $$('[data-i18n]').forEach(n=>n.textContent=tr(n.dataset.i18n));document.documentElement.lang=settings.language||'tr';localizeUi(document.body,settings.language||'tr');
 document.documentElement.classList.toggle('reduced-motion',!!settings.reducedMotion);document.body.classList.toggle('advanced-mode',!!settings.advancedMode);document.body.classList.toggle('hide-help',!!settings.hideHelp);
 $('#folder-label').textContent=$('#media-folder').textContent=shortFolder();$('#folder-value').textContent=settings.downloadFolder;
 $('#quick-options').textContent=String(settings.videoContainer||'mp4').toUpperCase()+' · '+(settings.videoQuality||1080)+'p';$('#download-container').value=settings.videoContainer||'mp4';
 $('#browser-cookie-setting').classList.toggle('hidden-setting',settings.cookieMode!=='browser');
 $('#url').placeholder=t('Bir bağlantı yapıştır…','Paste a link…');$('#inspect').firstElementChild.textContent=t('Hazırla','Prepare');$('#command-note').textContent=t('Enter ile hazırla','Press Enter to prepare');$('#settings-heading').textContent=t('Ayarlar','Settings');$('#download').lastElementChild.textContent=t('İndir','Download');
 $$('.setting').forEach((row,i)=>{const label=row.querySelector('b'),field=row.querySelector('input,select');if(label&&field){label.id||='label-'+i;field.setAttribute('aria-labelledby',label.id);}});
 syncQuickIndicators();if(media)renderFormats();
}
async function save(values){saveChain=saveChain.catch(()=>{}).then(async()=>{settings=await api.settings.save(values);syncSettings();});return saveChain;}
function openSettings(id='general-settings'){
 if($('#url-options').matches(':popover-open'))$('#url-options').hidePopover();
 $('#settings-search').value='';$$('.settings-tabs button').forEach(n=>n.classList.toggle('active',n.dataset.tab===id));$$('.settings-panel').forEach(n=>{n.classList.toggle('active',n.id===id);n.hidden=false;});$$('.setting').forEach(n=>n.hidden=false);
 if(!$('#settings-dialog').open)$('#settings-dialog').showModal();
}
async function chooseFolder(){requireNative();const folder=await api.pickFolder();if(folder)await save({downloadFolder:folder});return folder;}
$$('[data-settings]').forEach(n=>n.onclick=()=>openSettings(n.dataset.settings));$$('.settings-tabs button').forEach(n=>n.onclick=()=>openSettings(n.dataset.tab));$$('.close-dialog').forEach(n=>n.onclick=()=>n.closest('dialog').close());
$('#settings-search').oninput=()=>{
 const query=$('#settings-search').value.trim().toLocaleLowerCase();
 $$('.settings-panel').forEach(panel=>{if(!query){panel.classList.toggle('active',panel.id===$('.settings-tabs .active')?.dataset.tab);panel.querySelectorAll('.setting').forEach(r=>r.hidden=false);return;}let matches=0;panel.querySelectorAll('.setting').forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase().includes(query);if(!row.hidden)matches++;});panel.classList.toggle('active',!!matches);});
};
const fields=['language','reducedMotion','ytDlpChannel','autoUpdateYtDlp','naming','playlist','downloadArchive','videoQuality','videoContainer','videoCodec','audioFormat','audioQuality','embedThumbnail','embedMetadata','embedChapters','subtitles','subtitleLang','sponsorBlock','sponsorCategories','ipMode','useAria2','aria2Connections','concurrentFragments','retries','fragmentRetries','fileAccessRetries','socketTimeout','speedLimit','throttleRate','proxyUrl','cookieMode','cookieBrowser','cookieLoginUrl','advancedMode','hideHelp','accurateTrim','keepFragments','unavailableFragments','userAgent','refererUrl','playlistItems'];
fields.push('playlistRandom','playlistFolder','playlistNumber','lazyPlaylist','scriptBeforeEnabled','scriptAfterEnabled','scriptTimeout','scriptPolicy');
fields.push('extractorRetries','extractorArgs','sleepRequests','sleepInterval','maxSleepInterval','sleepSubtitles','splitChapters','keepOriginal','fixupPolicy','writeInfoJson','writeDescription','writeThumbnail','autoSubtitles','embedSubtitles','subtitleFormat','playlistReverse','playlistPolicy','breakOnExisting','sponsorAction');
fields.forEach(id=>{const n=$('#'+id);if(!n)return;n.onchange=guarded(async()=>{try{await save({[id]:n.type==='checkbox'?n.checked:n.type==='number'?Number(n.value):n.value});$('#save-state').textContent=t('Kaydedildi','Saved');$('#save-state').classList.add('flash');setTimeout(()=>$('#save-state').classList.remove('flash'),800);if(['videoContainer','videoCodec'].includes(id)&&media)await analyze(true);}catch(e){syncSettings();throw e;}});});
async function refreshTools(){
 tools=await api.tools();$('#ytdlp-version').textContent=tools.ytDlpVersion||'—';$('#ffmpeg-version').textContent=tools.ffmpegVersion||'—';$('#aria2-version').textContent=tools.aria2Version||'—';
 $('#engine-state').innerHTML='<i></i>'+esc(native?(tools.ytDlp&&tools.ffmpeg?t('Yerel motor hazır','Local engine ready'):t('Motor eksik','Engine missing')):t('Arayüz önizlemesi','Interface preview'));
 $('#status-version').textContent=tools.ytDlpVersion?'yt-dlp '+tools.ytDlpVersion:'Zenith 4.0.1';
 $('#cookie-status').textContent=tools.sessionCookies?t('Yerel cookie dosyası hazır','Local cookie file ready'):tools.cookieCount?tools.cookieCount+' cookie':t('Henüz çerez yok','No cookies yet');
}
async function analyze(keepTrim=false){
 requireNative();const url=normalize($('#url').value);$('#url').value=url;const id=++inspectId,button=$('#inspect');button.disabled=true;$('#command-note').textContent=t('Bağlantı hazırlanıyor…','Preparing link…');
 try{const result=await api.inspect(url);if(id!==inspectId||normalize($('#url').value)!==url)return;
 media=result;mediaUrl=url;kind=$('#quick-kind').value;$('#media-heading').textContent=result.title||t('Medya','Media');$('#uploader').textContent=result.uploader||'';$('#media-duration').textContent=result.duration?time(result.duration):'';$('#thumb').src=/^https:\/\//.test(result.thumbnail||'')?result.thumbnail:'brand.png';$('#media-error').hidden=true;
 if(!keepTrim){$('#trim-enabled').checked=preTrim.enabled;$('#trim-start').value=preTrim.start;$('#trim-end').value=preTrim.end||(result.duration?time(result.duration):'');$('#trim-panel').hidden=!preTrim.enabled;pendingTrim=false;}
 renderFormats();setupTrimSliders();updateTrim();if(!$('#media-dialog').open)$('#media-dialog').showModal();
 }finally{if(id===inspectId){button.disabled=false;$('#command-note').textContent=t('Enter ile hazırla','Press Enter to prepare');}}
}
function renderFormats(){
 const preferred=Number(settings.videoQuality||1080);
 const videos=(settings.playlist?[8640,2160,1440,1080,720,480].map(height=>({id:'playlist-'+height,height,ext:settings.videoContainer,playlist:true})): [...(media?.formats||[])]).sort((a,b)=>Math.abs(a.height-preferred)-Math.abs(b.height-preferred));
 const items=kind==='audio'?[{id:'aac',label:'AAC',ext:'aac',detail:'AAC'},{id:'vorbis',label:'OGG',ext:'ogg',detail:'Vorbis'},{id:'alac',label:'ALAC',ext:'m4a',detail:'Lossless'},{id:'mp3',label:'MP3',ext:'mp3',detail:'192 / 320 kbps'},{id:'m4a',label:'M4A',ext:'m4a',detail:'AAC'},{id:'opus',label:'Opus',ext:'opus',detail:'Opus'},{id:'flac',label:'FLAC',ext:'flac',detail:'Lossless'},{id:'wav',label:'WAV',ext:'wav',detail:'PCM'}]:videos.slice(0,8).map(f=>({...f,label:f.height>=8640?t('En yüksek','Highest'):f.height+'p',detail:[f.ext?.toUpperCase(),f.fps?f.fps+' FPS':'',bytes(f.size)].filter(Boolean).join(' · ')}));
 if(!items.length&&kind==='video')items.push({id:'bv*+ba/b',label:t('En iyi','Best'),ext:settings.videoContainer,detail:t('Kaynak kalitesi','Source quality')});
 selection=items.find(f=>f.id===selection?.id)||items.find(f=>f.id===settings.audioFormat&&kind==='audio')||items[0];
 $('#quality-grid').innerHTML=items.map(f=>'<button class="quality '+(f.id===selection?.id?'selected':'')+'" data-format="'+esc(f.id)+'" aria-pressed="'+(f.id===selection?.id)+'"><b>'+esc(f.label)+'</b><span>'+esc(f.detail)+'</span></button>').join('');
 $$('[data-format]').forEach(n=>n.onclick=()=>{selection=items.find(f=>f.id===n.dataset.format);$$('[data-format]').forEach(x=>{x.classList.toggle('selected',x===n);x.setAttribute('aria-pressed',String(x===n));});});
 $('#kind-video').classList.toggle('selected',kind==='video');$('#kind-audio').classList.toggle('selected',kind==='audio');$('#download-container').hidden=kind==='audio';
}
function seconds(value){const parts=value.trim().split(':');if(parts.length>3||parts.some(p=>!/^\d+(?:\.\d+)?$/.test(p)))throw Error(t('Süreyi 00:30 biçiminde gir.','Use a time such as 00:30.'));if(parts.length>1&&parts.slice(1).some(p=>Number(p)>=60))throw Error(t('Dakika ve saniye 60’tan küçük olmalı.','Minutes and seconds must be below 60.'));return parts.reduce((total,x)=>total*60+Number(x),0);}
function trimValue(){
 if(!$('#trim-enabled').checked)return null;
 const start=seconds($('#trim-start').value),end=$('#trim-end').value.trim()?seconds($('#trim-end').value):null;
 if((end!==null&&end<=start)||start>(media?.duration||604800)||(end!==null&&media?.duration&&end>media.duration))throw Error(t('Bitiş başlangıçtan sonra ve video süresi içinde olmalı.','End must be after start and within the video duration.'));
 return {start,end};
}
function updateTrim(){try{const trim=trimValue(),total=media?.duration||1,start=trim?.start||0,end=trim?.end??total;$('#trim-selection').style.left=Math.min(100,start/total*100)+'%';$('#trim-selection').style.width=Math.max(0,Math.min(100,(end-start)/total*100))+'%';$('#trim-total').textContent=trim?time(end-start):t('Tam video','Full video');$('#trim-hint').textContent=t('Dakika:saniye veya saat:dakika:saniye','Minutes:seconds or hours:minutes:seconds');$('#trim-hint').classList.remove('inline-error');}catch(e){$('#trim-hint').textContent=errorText(e);$('#trim-hint').classList.add('inline-error');}}
async function start(){
 requireNative();if(!media||starting)return;
 if(normalize($('#url').value)!==mediaUrl)throw Error(t('Bağlantı değişti. Tekrar hazırla.','Link changed. Prepare it again.'));
 const trim=trimValue();starting=true;$('#download').disabled=true;$('#media-error').hidden=true;
 try{const result=await api.start({url:mediaUrl,title:media.title,thumbnail:media.thumbnail,kind,videoQuality:selection?.height||settings.videoQuality,format:kind==='video'&&!settings.playlist?selection?.id:'',formatExt:kind==='video'?selection?.ext:'',audioFormat:kind==='audio'?selection?.id:settings.audioFormat,trim});
 if(!jobs.has(result.id))jobs.set(result.id,{id:result.id,title:media.title,thumbnail:media.thumbnail,kind,percent:0,createdAt:Date.now(),detail:t('Hazırlanıyor','Preparing')});else Object.assign(jobs.get(result.id),{thumbnail:media.thumbnail,kind});
 $('#media-dialog').close();switchTab('downloads');renderJobs();persistJobs();
 }catch(e){$('#media-error').textContent=errorText(e);$('#media-error').hidden=false;}finally{starting=false;$('#download').disabled=false;}
}
function persistJobs(){try{localStorage.setItem(QUEUE_KEY,JSON.stringify([...jobs.values()].slice(-80)));}catch{}}
function restoreJobs(){try{const saved=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');if(Array.isArray(saved))saved.slice(-80).forEach(j=>{if(j&&typeof j.id==='string'&&typeof j.title==='string')jobs.set(j.id,{...j,done:true,failed:j.failed||!j.done,detail:!j.done?t('Uygulama kapatıldığında durdu','Stopped when the app closed'):j.detail});});}catch{}}
function switchTab(value){tab=value;$('#downloads-tab').setAttribute('aria-selected',value==='downloads');$('#history-tab').setAttribute('aria-selected',value==='history');$('#job-list').setAttribute('aria-labelledby',value==='downloads'?'downloads-tab':'history-tab');renderJobs();}
function renderJobs(){
 $('#queue-count').textContent=[...jobs.values()].filter(j=>!j.done).length;$('#history-count').textContent=history.length;
 const query=$('#search').value.trim().toLocaleLowerCase();
 const items=(tab==='history'?history.map(h=>({...h,done:true,percent:100,detail:h.warning?t('İsteğe bağlı işlem tamamlanamadı','Optional processing incomplete'):t('Kaydedildi','Saved')})):[...jobs.values()].reverse()).filter(j=>j.title?.toLocaleLowerCase().includes(query));
 $('#empty-state').hidden=items.length>0;$('#empty-state h1').textContent=query?t('Sonuç yok','No results'):tab==='history'?t('Geçmişin burada','Your history lives here'):t('Henüz indirme yok','No downloads yet');$('#empty-state p').textContent=tab==='history'?t('Tamamlanan dosyalar burada görünür.','Completed files appear here.'):t('Bağlantını yukarıya yapıştır.','Paste a link above.');
 $('#job-list').innerHTML=items.map(j=>'<article class="job" data-job="'+esc(j.id)+'"><img class="job-cover" src="'+esc(/^https:\/\//.test(j.thumbnail||'')?j.thumbnail:'brand.png')+'" alt="" loading="lazy" referrerpolicy="no-referrer"><div class="job-body"><h3>'+esc(j.title)+'</h3><div class="progress"><progress max="100" value="'+Math.max(0,Math.min(100,j.percent||0))+'"></progress><span class="percent">'+Math.floor(j.percent||0)+'%</span></div><p class="detail">'+esc(j.detail||t('Hazırlanıyor','Preparing'))+'</p><span class="job-meta">'+esc(new Date(j.createdAt||Date.now()).toLocaleDateString(settings.language||'tr'))+'</span></div><div class="job-actions">'+(!j.done?'<button data-cancel="'+esc(j.id)+'">'+esc(t('İptal','Cancel'))+'</button>':history.some(h=>h.id===j.id)?'<button data-open="'+esc(j.id)+'">'+esc(t('Aç','Open'))+'</button><button data-reveal="'+esc(j.id)+'">'+esc(t('Klasör','Folder'))+'</button>':'')+'</div></article>').join('');
 $$('[data-cancel]').forEach(n=>n.onclick=guarded(()=>api.cancel(n.dataset.cancel)));$$('[data-open]').forEach(n=>n.onclick=guarded(()=>api.history.open(n.dataset.open,false)));$$('[data-reveal]').forEach(n=>n.onclick=guarded(()=>api.history.open(n.dataset.reveal,true)));
 $('#status-summary').textContent=[...jobs.values()].some(j=>!j.done)?t('İndiriliyor','Downloading'):t('Hazır','Ready');
}
function paintProgress(j){if(tab!=='downloads')return;const row=$$('.job').find(n=>n.dataset.job===j.id);if(!row)return;row.querySelector('progress').value=j.percent||0;row.querySelector('.percent').textContent=Math.floor(j.percent||0)+'%';row.querySelector('.detail').textContent=j.detail||'';}
async function refreshHistory(){history=await api.history.get();renderJobs();}
async function refreshProfiles(){const profiles=await api.profiles.list();$('#profiles-list').innerHTML=profiles.map(p=>'<div class="profile-item"><span>'+esc(p.name)+'</span><button class="soft" data-profile="'+esc(p.id)+'">'+esc(t('Kullan','Use'))+'</button></div>').join('');$$('[data-profile]').forEach(n=>n.onclick=guarded(async()=>{requireNative();settings=await api.profiles.load(n.dataset.profile);$('#active-profile').textContent=profiles.find(p=>p.id===n.dataset.profile)?.name||t('Varsayılan','Default');syncSettings();toast(t('Profil seçildi','Profile selected'));}));}
function renderWelcome(){
 $$('.welcome-step i').forEach((n,i)=>n.classList.toggle('selected',i===welcomeStep));
 $('#welcome-title').textContent=[t('Kendi alanın.','Your space.'),t('Sana göre çalışsın.','Make it yours.'),t('İndirmeye hazırsın.','Ready to download.')][welcomeStep];
 $('#welcome-copy').textContent=[t('Dosyaların nereye kaydedilsin?','Where should your files go?'),t('Günlük kullanım için sade. İstediğinde daha fazlası.','Simple for everyday use. More when you need it.'),t('Araçlar bilgisayarında, işlemler yerel.','Your tools and downloads stay on your computer.')][welcomeStep];
 $('#welcome-content').innerHTML=welcomeStep===0?'<button class="welcome-folder" id="welcome-folder">'+icon('folder')+'<span>'+esc(shortFolder())+'</span></button>':welcomeStep===1?'<div class="setting"><div><b>'+esc(t('Gelişmiş mod','Advanced mode'))+'</b></div><label class="switch"><input id="welcome-advanced" aria-label="Gelişmiş mod" type="checkbox" '+(settings.advancedMode?'checked':'')+'></label></div><div class="setting"><div><b>'+esc(t('Açılışta yt-dlp güncelle','Update yt-dlp on startup'))+'</b></div><label class="switch"><input id="welcome-update" aria-label="Açılışta güncelle" type="checkbox" '+(settings.autoUpdateYtDlp?'checked':'')+'></label></div>':['ytDlp','ffmpeg','aria2'].map((key,i)=>'<div class="tool-check"><span>'+['yt-dlp','FFmpeg','aria2'][i]+'</span><b>'+esc(tools[key]?t('Hazır','Ready'):t('Bulunamadı','Missing'))+'</b></div>').join('');
 if(welcomeStep===0)$('#welcome-folder').onclick=guarded(async()=>{await chooseFolder();renderWelcome();});
 if(welcomeStep===1){$('#welcome-advanced').onchange=guarded(e=>save({advancedMode:e.target.checked}));$('#welcome-update').onchange=guarded(e=>save({autoUpdateYtDlp:e.target.checked}));}
 $('#welcome-next').textContent=welcomeStep===2?t('Uygulamayı aç','Open workspace'):t('Devam et','Continue');
}
$('#welcome-next').onclick=guarded(async()=>{if(welcomeStep<2){welcomeStep++;if(welcomeStep===2)await refreshTools();renderWelcome();}else{await save({onboardingComplete:true});$('#welcome-dialog').close();$('#url').focus();}});
$('#welcome-skip').onclick=guarded(async()=>{await save({onboardingComplete:true});$('#welcome-dialog').close();});$('#onboarding-open').onclick=()=>{welcomeStep=0;renderWelcome();$('#welcome-dialog').showModal();};
$('#url-form').onsubmit=guarded(async e=>{e.preventDefault();await analyze();});$('#url').oninput=()=>{inspectId++;$('#inspect').disabled=false;media=null;};
$('#paste').onclick=guarded(async()=>{$('#url').value=normalize(await navigator.clipboard.readText());$('#url').focus();media=null;inspectId++;});$('#quick-kind').onchange=()=>{kind=$('#quick-kind').value;};
$('#trim-quick').onclick=()=>openQuick('trim',$('#trim-quick'));$('#quick-options').onclick=()=>openQuick('format',$('#quick-options'));
$('#trim-toggle').onclick=()=>{$('#trim-panel').hidden=!$('#trim-panel').hidden;$('#trim-enabled').checked=!$('#trim-panel').hidden;updateTrim();};$('#trim-enabled').onchange=updateTrim;$('#trim-start').oninput=updateTrim;$('#trim-end').oninput=updateTrim;
$('#kind-video').onclick=()=>{kind='video';renderFormats();};$('#kind-audio').onclick=()=>{kind='audio';renderFormats();};$('#download-container').onchange=guarded(async e=>{await save({videoContainer:e.target.value});await analyze(true);});
$('#download').onclick=guarded(start);$('#open-folder').onclick=guarded(()=>{requireNative();return api.openDownloads();});$('#destination').onclick=$('#choose-folder').onclick=guarded(chooseFolder);
$('#downloads-tab').onclick=()=>switchTab('downloads');$('#history-tab').onclick=()=>switchTab('history');$('#search').oninput=renderJobs;
for(const value of ['list','grid'])$('#view-'+value).onclick=()=>{$('#job-list').classList.toggle('grid-view',value==='grid');['list','grid'].forEach(v=>{$('#view-'+v).classList.toggle('selected',v===value);$('#view-'+v).setAttribute('aria-pressed',String(v===value));});};
$('#update-ytdlp').onclick=guarded(async()=>{requireNative();const button=$('#update-ytdlp');button.disabled=true;$('#update-detail').textContent=t('Güncelleniyor…','Updating…');try{const result=await api.updateYtDlp(settings.ytDlpChannel);$('#update-detail').textContent=result.version||t('Güncel','Up to date');await refreshTools();}finally{button.disabled=false;}});
$('#open-cookie-login').onclick=guarded(async()=>{requireNative();const url=normalize($('#cookieLoginUrl').value);await save({cookieLoginUrl:url});await api.cookies.login(url);});$('#clear-cookies').onclick=guarded(async()=>{requireNative();await api.cookies.clear();settings=await api.settings.get();syncSettings();await refreshTools();});
$('#import-cookies').onclick=guarded(async()=>{requireNative();const result=await api.cookies.import();if(result){settings=await api.settings.get();syncSettings();await refreshTools();toast(t('Cookie dosyası hazır','Cookie file ready'));}});
$('#save-profile').onclick=guarded(async()=>{requireNative();await api.profiles.save($('#profile-name').value);await refreshProfiles();});
$('#export-settings').onclick=guarded(async()=>{requireNative();if(await api.settings.export())toast(t('Ayarlar dışa aktarıldı','Settings exported'));});$('#import-settings').onclick=guarded(async()=>{requireNative();const value=await api.settings.import();if(value){settings=value;syncSettings();toast(t('Ayarlar içe aktarıldı','Settings imported'));}});
api.onDownload(async e=>{
 let j=jobs.get(e.jobId);if(!j&&e.type==='started'){j={id:e.jobId,title:e.title,percent:0,createdAt:Date.now(),detail:t('Hazırlanıyor','Preparing')};jobs.set(j.id,j);renderJobs();}
 if(!j)return;if(e.type==='progress'){j.percent=Math.max(j.percent||0,Math.min(99,Number(e.percent)||0));j.detail=e.detail;paintProgress(j);}
 else if(['complete','failed','cancelled'].includes(e.type)){Object.assign(j,{done:true,failed:e.type==='failed',cancelled:e.type==='cancelled',percent:e.type==='complete'?100:j.percent,detail:e.detail});if(e.type==='complete')await refreshHistory();renderJobs();persistJobs();}
 else if(e.type==='cancelling'){j.detail=t('İptal ediliyor…','Cancelling…');paintProgress(j);}
});
api.onCookiesUpdated(guarded(async e=>{toast(e.message);settings=await api.settings.get();syncSettings();await refreshTools();}));api.onEngineUpdated(guarded(async e=>{toast(e.error||t('yt-dlp güncellendi','yt-dlp updated'));await refreshTools();}));
document.addEventListener('keydown',e=>{const editable=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);if(e.ctrlKey&&e.key===','){e.preventDefault();openSettings();}if(e.ctrlKey&&e.key.toLowerCase()==='l'){e.preventDefault();$('#url').focus();$('#url').select();}if(e.ctrlKey&&e.key.toLowerCase()==='v'&&!editable&&!$('dialog[open]')){e.preventDefault();$('#paste').click();}});
let quickSection='',selectedScripts={},preTrim={enabled:false,start:'00:00',end:''};
const quickMap={format:['Format ve kalite','video-settings'],subtitles:['Altyazı','subtitles-settings'],auth:['Oturum','auth-settings'],playlist:['Playlist','playlist-settings'],scripts:['Scripts','scripts-settings'],trim:['Video kırpma','postprocess-settings']};
function syncQuickIndicators(){
 $('#quick-format').textContent=$('#quick-kind').value==='audio'?'Yalnızca ses':Number(settings.videoQuality)>=8640?'En yüksek':(settings.videoQuality||1080)+'p';
 const flags={subtitles:settings.subtitles,playlist:settings.playlist,auth:settings.cookieMode!=='none',scripts:settings.scriptBeforeEnabled||settings.scriptAfterEnabled};
 $$('[data-quick]').forEach(n=>n.setAttribute('aria-pressed',String(!!flags[n.dataset.quick])));
 $('#trim-quick').setAttribute('aria-pressed',String(preTrim.enabled));
}
async function refreshScripts(){
 selectedScripts=native?await api.scripts.get():{};
 for(const phase of ['before','after'])$('#script-'+phase+'-path').textContent=selectedScripts[phase]||t('Dosya seçilmedi','No file selected');
}
function quickToggle(key,label,help=''){
 return '<div class="setting"><div><b>'+esc(t(label,label))+'</b><small>'+esc(t(help,help))+'</small></div><label class="switch"><input type="checkbox" data-key="'+key+'" aria-label="'+esc(t(label,label))+'" '+(settings[key]?'checked':'')+'></label></div>';
}
function quickSelect(key,label,options){
 return '<div class="setting column"><div><b>'+esc(t(label,label))+'</b></div><select data-key="'+key+'" aria-label="'+esc(t(label,label))+'">'+options.map(([v,text])=>'<option value="'+esc(v)+'" '+(String(settings[key])===String(v)?'selected':'')+'>'+esc(t(text,text))+'</option>').join('')+'</select></div>';
}
function renderQuick(){
 let html='';
 if(quickSection==='format'){
  html='<div class="setting"><div><b>Yalnızca ses indir</b><small>Videodan ses çıkar; tercihlerin korunur.</small></div><label class="switch"><input id="quick-audio" type="checkbox" aria-label="Yalnızca ses indir" '+($('#quick-kind').value==='audio'?'checked':'')+'></label></div>';
  html+=$('#quick-kind').value==='audio'?quickSelect('audioFormat','Ses dosyası',[['mp3','MP3'],['m4a','M4A'],['opus','Opus'],['flac','FLAC'],['wav','WAV'],['aac','AAC'],['vorbis','OGG'],['alac','ALAC']]):quickSelect('videoQuality','İndirme kalitesi',[[8640,'En yüksek kalite'],[2160,'4K · 2160p'],[1440,'2K · 1440p'],[1080,'Full HD · 1080p'],[720,'HD · 720p'],[480,'480p']])+quickSelect('videoContainer','Dosya türü',[['mp4','MP4'],['mkv','MKV'],['webm','WebM'],['mov','MOV'],['avi','AVI'],['flv','FLV']]);
 }else if(quickSection==='subtitles')html=quickToggle('subtitles','Altyazıları indir','Kapalı olduğunda altyazı tercihlerin korunur.')+quickToggle('autoSubtitles','Otomatik altyazıları da ekle')+quickToggle('embedSubtitles','Dosyaya göm');
 else if(quickSection==='auth')html=quickSelect('cookieMode','Cookie kaynağı',[['none','Kapalı'],['session','Yerel oturum / dosya'],['browser','Tarayıcı']])+(settings.cookieMode==='browser'?quickSelect('cookieBrowser','Tarayıcı',[['firefox','Firefox'],['chrome','Chrome'],['edge','Edge'],['brave','Brave']]):'<p class="privacy-note">Oturum açma ve cookie dosyası için ayrıntılı ayarlara geç.</p>');
 else if(quickSection==='playlist')html=quickToggle('playlist','Playlist indir','Bağlantı bir liste içeriyorsa seçili videoları indirir.')+quickSelect('playlistItems','Liste aralığı',[['','Tümü'],['1:5','İlk 5'],['1:10','İlk 10'],['1:25','İlk 25'],['1:50','İlk 50'],['1:100','İlk 100']])+quickToggle('playlistFolder','Ayrı klasöre kaydet')+quickToggle('playlistNumber','Sıra numarası ekle');
 else if(quickSection==='scripts')html=quickToggle('scriptBeforeEnabled','İndirmeden önce çalıştır',selectedScripts.before?'Seçili yerel .ps1 dosyası':'Önce ayrıntılı ayarlardan dosya seç.')+quickToggle('scriptAfterEnabled','Kaydedildikten sonra çalıştır',selectedScripts.after?'Seçili yerel .ps1 dosyası':'Önce ayrıntılı ayarlardan dosya seç.');
 else if(quickSection==='trim')html=quickToggle('accurateTrim','Hassas kırpma','Videoyu hazırla, başlangıç ve bitişi sürükleyerek seç.')+'<button id="prepare-trim" class="primary">'+esc(t('Videoyu hazırla','Prepare video'))+'</button>';
 $('#quick-body').innerHTML=html;
 $$('#quick-body [data-key]').forEach(n=>n.onchange=guarded(async()=>{try{await save({[n.dataset.key]:n.type==='checkbox'?n.checked:n.value});renderQuick();}catch(e){renderQuick();throw e;}}));
 if($('#quick-audio'))$('#quick-audio').onchange=e=>{$('#quick-kind').value=e.target.checked?'audio':'video';kind=$('#quick-kind').value;syncQuickIndicators();renderQuick();};
 if($('#prepare-trim'))$('#prepare-trim').onclick=guarded(async()=>{preTrim.enabled=true;$('#url-options').hidePopover();await analyze();});localizeUi($('#quick-body'),settings.language);
}
function openQuick(section,button){
 const pop=$('#url-options'),same=quickSection===section&&pop.matches(':popover-open');
 if(same){pop.hidePopover();return;}
 quickSection=section;$('#quick-heading').textContent=t(quickMap[section][0],quickMap[section][0]);renderQuick();
 const rect=button.getBoundingClientRect(),width=Math.min(460,innerWidth-36);
 pop.style.left=Math.max(18,Math.min(innerWidth-width-18,rect.right-width))+'px';
 pop.style.top=Math.min(rect.bottom+14,innerHeight-220)+'px';
 if(!pop.matches(':popover-open'))pop.showPopover();
}
$$('[data-quick]').forEach(n=>n.onclick=()=>openQuick(n.dataset.quick,n));
$('#quick-close').onclick=()=>$('#url-options').hidePopover();
$('#quick-details').onclick=()=>openSettings(quickMap[quickSection][1]);
for(const phase of ['before','after']){
 $('[data-script-pick="'+phase+'"]').onclick=guarded(async()=>{requireNative();if(await api.scripts.choose(phase))await refreshScripts();});
 $('[data-script-clear="'+phase+'"]').onclick=guarded(async()=>{requireNative();await api.scripts.clear(phase);settings=await api.settings.get();syncSettings();await refreshScripts();});
}
window.addEventListener('resize',()=>{if($('#url-options').matches(':popover-open'))$('#url-options').hidePopover();});

(async()=>{settings=await api.settings.get();syncSettings();restoreJobs();await refreshHistory();await refreshProfiles();await refreshScripts();await refreshTools();await launchSplash();if(!settings.onboardingComplete){renderWelcome();$('#welcome-dialog').showModal();}})().catch(e=>toast(errorText(e)));

function setupTrimSliders(){
 const total=media?.duration;if(!total)return;
 for(const phase of ['start','end']){
  const input=$('#trim-'+phase);input.hidden=true;
  let slider=$('#clip-'+phase);if(!slider){slider=document.createElement('input');slider.type='range';slider.id='clip-'+phase;input.after(slider);}
  slider.min='0';slider.max=String(total);slider.step='1';slider.value=String(phase==='start'?0:total);
  slider.setAttribute('aria-label',t(phase==='start'?'Başlangıç':'Bitiş',phase==='start'?'Start':'End'));
  let label=$('#clip-label-'+phase);if(!label){label=document.createElement('output');label.id='clip-label-'+phase;slider.after(label);}
  const paint=()=>{input.value=time(slider.value);label.textContent=time(slider.value);updateTrim();};slider.oninput=paint;paint();
 }
}
const launchStarted=performance.now();
async function launchSplash(){const layer=$('#launch-splash');const reduced=settings.reducedMotion||matchMedia('(prefers-reduced-motion:reduce)').matches;await new Promise(r=>setTimeout(r,Math.max(0,(reduced?200:1500)-(performance.now()-launchStarted))));layer.classList.add('finished');setTimeout(()=>layer.remove(),260);}
setTimeout(()=>$('#launch-splash')?.remove(),8000);
