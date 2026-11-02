// ZenithW queue; built into the existing classic-script entry point.
import {API, cancelBackendJob, ensureSocket, handoffPreparedDownload, scheduleSocketDisconnect} from './api.mjs';
import {fetchBulkVideos} from './bulk.mjs';
import {addToLocalHistory} from './history.mjs';
import {onInput} from './input.mjs';
import {t} from './language.mjs';
import {fetchVideo} from './metadata.mjs';
import {S, buildFilename, getPlatformName} from './settings.mjs';
import {state} from './state.mjs';
import {closeOverlay, escapeHtml, openOverlay, safeThumbHtml, toast} from './ui.mjs';

export function renderPlaylist(d,sourceUrl){
  state.playlistItems=d.items||[];
  state.playlistTitle=d.playlist_title||'Playlist';
  state.playlistSelected=new Set(state.playlistItems.map((_,i)=>i)); // varsayılan: hepsi seçili

  document.getElementById('plTitle').textContent=state.playlistTitle;
  document.getElementById('plMeta').textContent=state.playlistItems.length+' video';

  const list=document.getElementById('plList');
  list.innerHTML=state.playlistItems.map((it,i)=>{
    const m=Math.floor((it.duration||0)/60),s=String((it.duration||0)%60).padStart(2,'0');
    const dur=it.duration?m+':'+s:'';
    return `<div class="pl-item sel" data-idx="${i}" onclick="togglePlaylistItem(${i})">
      <div class="pl-item-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="pl-item-thumb">${safeThumbHtml(it.thumbnail)}</div>
      <div class="pl-item-info"><div class="pl-item-title">${(i+1)+'. '+escapeHtml(it.title||'video')}</div>${dur?`<div class="pl-item-dur">${dur}</div>`:''}</div>
    </div>`;
  }).join('');

  updatePlaylistSelCount();
  document.getElementById('playlistCard').classList.add('show');
}


export function togglePlaylistItem(i){
  const el=document.querySelector(`.pl-item[data-idx="${i}"]`);
  if(state.playlistSelected.has(i)){state.playlistSelected.delete(i);el.classList.remove('sel');}
  else{state.playlistSelected.add(i);el.classList.add('sel');}
  updatePlaylistSelCount();
}


export function toggleSelectAllPlaylist(){
  const allSelected=state.playlistSelected.size===state.playlistItems.length;
  if(allSelected){state.playlistSelected.clear();}
  else{state.playlistSelected=new Set(state.playlistItems.map((_,i)=>i));}
  document.querySelectorAll('.pl-item').forEach((el,i)=>el.classList.toggle('sel',state.playlistSelected.has(i)));
  updatePlaylistSelCount();
}


export function updatePlaylistSelCount(){
  const n=state.playlistSelected.size;
  document.getElementById('plDlBtnTxt').textContent=`seçilenleri indir (${n})`;
  document.getElementById('plDlBtn').disabled=(n===0);
  document.getElementById('plSelAllBtn').textContent=(n===state.playlistItems.length&&n>0)?'seçimi kaldır':'tümünü seç';
}


export function openPlaylistDlModal(){
  if(state.playlistSelected.size===0)return;
  // Playlist indirmeleri tek tek video indirme modalını kullanarak,
  // mevcut format/kalite ayarlarıyla sırayla kuyruğa alınır.
  openPlaylistQueueModal();
}


// Kuyruk durumu localStorage'a yazılır ki sekme kapanır/yenilenirse
// (ya da "durdur"a basılırsa) kaldığın yerden devam edebilesin.
export const QUEUE_STATE_KEY='zw_queue_state';


export function saveQueueState(selectedIdx,doneIdx,errIdx,fmt,mode,title,items){
  try{
    localStorage.setItem(QUEUE_STATE_KEY,JSON.stringify({
      playlistTitle:title,items,selectedIdx,doneIdx,errIdx,fmt,mode,savedAt:Date.now()
    }));
  }catch(e){}
}


export function clearQueueState(){try{localStorage.removeItem(QUEUE_STATE_KEY);}catch(e){}}


export function loadQueueState(){
  try{
    const raw=localStorage.getItem(QUEUE_STATE_KEY);
    if(!raw)return null;
    const st=JSON.parse(raw);
    // 24 saatten eski kayıtlara güvenme — linkler bu sürede süresi dolmuş olabilir
    if(!st.savedAt||Date.now()-st.savedAt>24*60*60*1000){clearQueueState();return null;}
    if(!st.items||!st.items.length||!st.selectedIdx||!st.selectedIdx.length)return null;
    if((st.doneIdx||[]).length>=st.selectedIdx.length)return null; // zaten tamamlanmış
    return st;
  }catch(e){return null;}
}


export function hideQueueResumeHint(){
  const el=document.getElementById('queueResumeHint');
  if(el)el.classList.remove('show');
}


export function checkQueueResume(){
  const st=loadQueueState();
  const el=document.getElementById('queueResumeHint');
  if(!el)return;
  if(!st||state.plQueueRunning){el.classList.remove('show');return;}
  const done=(st.doneIdx||[]).length,total=st.selectedIdx.length;
  document.getElementById('queueResumeTxt').textContent=t('queueResumeTpl').replace('{done}',done).replace('{total}',total);
  el.classList.add('show');
}


export function discardQueue(){
  clearQueueState();
  hideQueueResumeHint();
}


export function resumeQueue(){
  const st=loadQueueState();
  if(!st){hideQueueResumeHint();return;}
  state.playlistItems=st.items;
  state.playlistTitle=st.playlistTitle||state.playlistTitle;
  const fullIdx=st.selectedIdx;
  const doneArr=st.doneIdx||[],errArr=st.errIdx||[];

  const list=document.getElementById('plQueueList');
  list.innerHTML=fullIdx.map(i=>{
    const it=state.playlistItems[i]||{};
    const isDone=doneArr.includes(i),isErr=errArr.includes(i);
    const statusTxt=isDone?t('plQueueItemDone'):(isErr?t('plQueueItemErr'):t('plQueueQueued'));
    const statusCls=isDone?'done':(isErr?'err':'');
    return `<div class="pl-queue-item" id="plq-${i}">
      <div class="pl-queue-title">${escapeHtml(it.title||'video')}</div>
      <div class="pl-queue-status ${statusCls}" id="plq-status-${i}">${statusTxt}</div>
    </div>`;
  }).join('');

  document.getElementById('plQueueProgress').textContent=`${doneArr.length} / ${fullIdx.length} ${t('plQueueCompletedWord')}`;
  if(!S.keepQueueClosed)openOverlay('plQueueOverlay');

  state.plQueueStopRequested=false;
  hideQueueResumeHint();
  runPlaylistQueue(fullIdx,doneArr,st.fmt);
}


export function openPlaylistQueueModal(){
  const selectedIdx=[...state.playlistSelected].sort((a,b)=>a-b);
  if(selectedIdx.length===0)return;

  const list=document.getElementById('plQueueList');
  list.innerHTML=selectedIdx.map(i=>{
    const it=state.playlistItems[i];
    return `<div class="pl-queue-item" id="plq-${i}">
      <div class="pl-queue-title">${escapeHtml(it.title||'video')}</div>
      <div class="pl-queue-status" id="plq-status-${i}">${t('plQueueQueued')}</div>
    </div>`;
  }).join('');

  document.getElementById('plQueueProgress').textContent=`0 / ${selectedIdx.length} ${t('plQueueCompletedWord')}`;
  if(!S.keepQueueClosed)openOverlay('plQueueOverlay');

  state.plQueueStopRequested=false;
  hideQueueResumeHint();
  runPlaylistQueue(selectedIdx,[]);
}


export async function runPlaylistQueue(fullSelectedIdx,alreadyDone,fmtOverride){
  if(state.plQueueRunning)return;
  state.plQueueRunning=true;
  await ensureSocket();
  alreadyDone=alreadyDone||[];
  const doneSet=new Set(alreadyDone);
  const errSet=new Set();
  const total=fullSelectedIdx.length;
  const isAudio=fmtOverride?fmtOverride.mode==='audio':(state.DL_MODE==='audio');
  const isMute=fmtOverride?fmtOverride.mode==='mute':(state.DL_MODE==='mute');
  const f=fmtOverride||{quality:S.quality,codec:S.codec,vfmt:S.vfmt,afmt:S.afmt,audioQ:S.audioQ,metadata:S.metadata,mode:state.DL_MODE};
  const fmt=isAudio?f.afmt:f.vfmt;

  saveQueueState(fullSelectedIdx,[...doneSet],[...errSet],f,f.mode,state.playlistTitle,state.playlistItems);

  for(const i of fullSelectedIdx){
    if(doneSet.has(i))continue; // resume'de zaten tamamlanmışsa tekrar indirme
    if(state.plQueueStopRequested)break;
    const it=state.playlistItems[i];
    const statusEl=document.getElementById(`plq-status-${i}`);
    if(statusEl){statusEl.classList.remove('err');statusEl.textContent=t('plQueueDownloadingItem');}
    let dId=null;
    try{
      dId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
      const controller=new AbortController();
      state.plQueueActiveJob={downloadId:dId,controller};
      state.activeProgressJobId=dId;
      const filename=buildFilename(S.fnfTemplate||'{title}.{ext}',{title:it.title,uploader:'',url:it.url},fmt);
      const preferredSub=S.subtitleLang&&S.subtitleLang!=='auto'?S.subtitleLang:'tr';
      const res=await fetch(API+'/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:it.url,quality:f.quality,format:fmt,codec:f.codec,audioQ:f.audioQ,metadata:f.metadata,sid:state.socketId,download_id:dId,download_name:filename,audio_only:isAudio,mute:isMute,sponsorblock:!!S.sponsorblock,subtitles:!!S.subtitles,sub_langs:[preferredSub,'en']}),signal:controller.signal});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok){
        errSet.add(i);
        if(statusEl){statusEl.textContent=t('plQueueItemErr');statusEl.classList.add('err');}
      }else{
        if(!payload.download_url)throw new Error('Download file was not prepared');
        await handoffPreparedDownload(payload,false,(pct,received,total)=>{
          if(statusEl&&total>0)statusEl.textContent=`${Math.min(100,pct)}%`;
        },controller.signal);
        addToLocalHistory({url:it.url,title:it.title||'video',platform:getPlatformName(it.url||''),format:fmt});
        doneSet.add(i);errSet.delete(i);
        if(statusEl){statusEl.textContent=t('plQueueItemDone');statusEl.classList.remove('err');statusEl.classList.add('done');}
      }
    }catch(e){
      if(!state.plQueueStopRequested){
        errSet.add(i);
        if(statusEl){statusEl.textContent=t('plQueueItemErr');statusEl.classList.add('err');}
      }
    }finally{
      state.plQueueActiveJob=null;
      if(state.activeProgressJobId&&state.activeProgressJobId===dId)state.activeProgressJobId=null;
    }
    document.getElementById('plQueueProgress').textContent=`${doneSet.size} / ${total} ${t('plQueueCompletedWord')}`;
    saveQueueState(fullSelectedIdx,[...doneSet],[...errSet],f,f.mode,state.playlistTitle,state.playlistItems);
  }

  state.plQueueRunning=false;
  if(state.plQueueStopRequested){
    // Kasıtlı durdurma — kayıt silinmiyor, kullanıcı istediğinde "devam et" ile kaldığı yerden sürdürebilir.
    toast(t('plQueueStoppedMsg'),'#f59e0b');
  }else{
    toast(t('plQueueDoneMsg'),'#3bba64');
    clearQueueState();
  }
  const plqct=document.getElementById('plQueueCancelTxt');if(plqct)plqct.textContent=t('plQueueCloseBtn');
  checkQueueResume();
  scheduleSocketDisconnect();
}


export async function cancelPlaylistQueue(){
  if(state.plQueueRunning){
    state.plQueueStopRequested=true;
    toast(t('plQueueStoppingMsg'),'#f59e0b');
    await cancelBackendJob(state.plQueueActiveJob);
  }else{
    closePlaylistQueue();
  }
}


export function closePlaylistQueue(){
  if(state.plQueueRunning){
    state.plQueueStopRequested=true;
    cancelBackendJob(state.plQueueActiveJob);
  }
  closeOverlay('plQueueOverlay');
  const plqct2=document.getElementById('plQueueCancelTxt');if(plqct2)plqct2.textContent=t('plQueueStopBtn');
}


export function bindDownloadControls(){
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('urlInput').addEventListener('keydown',e=>{if(e.key==='Enter')fetchVideo();});
  document.getElementById('urlInput').addEventListener('paste',()=>setTimeout(()=>{const v=document.getElementById('urlInput').value;onInput();if(v.startsWith('http'))fetchVideo();},80));
  document.getElementById('urlTextarea').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fetchBulkVideos();}
  });
  const youtubeAppOverlay=document.getElementById('youtubeAppOverlay');
  document.getElementById('youtubeAppClose')?.addEventListener('click',()=>closeOverlay('youtubeAppOverlay'));
  youtubeAppOverlay?.addEventListener('click',e=>{if(e.target===youtubeAppOverlay)closeOverlay('youtubeAppOverlay');});
  checkQueueResume();
});
}
