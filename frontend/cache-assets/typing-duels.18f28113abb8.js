(() => {
'use strict';
const $=id=>document.getElementById(id),api=window.TypeOnline,test=window.TypeTest;
let mutation=false,roomGeneration=0,settingsKey='';
let active=null,pendingCode=null,pollTimer=null,queueTimer=null,polling=false,searching=false,startedCode=null,joining=false,view='test',rematchDeadline=0,settledCode=null;
const toast=message=>window.dispatchEvent(new CustomEvent('type:toast',{detail:message}));
const opts=()=>({duration:Number($('duel-duration').value),language:$('duel-language').value,difficulty:$('duel-difficulty').value});
for(const rank of window.TypeRanks.tiers){const item=document.createElement('span');item.className='league-tier';item.innerHTML=window.TypeRanks.markup(rank.key)+'<span>'+window.TypeI18n.t(rank.label)+'<small>'+rank.minimum.toLocaleString(window.TypeI18n.locale)+'</small></span>';$('league-track').append(item);}
function showRating(rating){
 const rank=window.TypeRanks.tier(rating);$('league-name').textContent=rank.label;
 $('league-mmr').textContent=rating?rating.mmr.toLocaleString(window.TypeI18n?.locale||'tr-TR')+' Elo':'—';
 $('league-chip').dataset.league=rank.key;$('league-badge').innerHTML=window.TypeRanks.markup(rating);
}
async function refreshRating(){
 if(!api.signedIn){showRating(null);return;}
 try{const data=await api.request('rating');window.TypeSeason?.sync(data.season);showRating(data.rating);}catch{}
}
function face(el,profile){
 el.replaceChildren();if(!profile){el.textContent='?';return;}
 const url=api.avatarURL(profile);if(url){const image=new Image();image.src=url;image.alt='';el.append(image);}else el.textContent=profile.display_name[0].toLocaleUpperCase('tr-TR');
}
window.addEventListener('type:season',event=>{if(event.detail.changed)void refreshRating();});
function showRoom(room,clockOffset=0){
 if(active?.code!==room.code)rematchDeadline=0;
 active={...room,clockOffset};pendingCode=room.code;
 const key=room.code+':'+room.duration+':'+room.language+':'+room.difficulty;
 if(key!==settingsKey){settingsKey=key;$('room-duration').value=String(room.duration);$('room-language').value=room.language;$('room-difficulty').value=room.difficulty;}
 $('room-settings-form').hidden=!room.canEditSettings;
 $('room-settings-summary').textContent=room.duration+'s · '+room.language+' · '+(window.TypeI18n?.t({easy:'kolay',normal:'normal',hard:'zor'}[room.difficulty])||room.difficulty);
 $('duel-assist-button').hidden=!room.canAssist||room.status!=='racing';$('duel-assist-button').setAttribute('aria-pressed',String(room.assisted===true));
 $('duel-assist-button').textContent=window.TypeI18n?.t(room.assisted?'Doğru tuş yardımı: açık':'Doğru tuş yardımı: kapalı')||(room.assisted?'Doğru tuş yardımı: açık':'Doğru tuş yardımı: kapalı');
 $('room-assist-row').hidden=!room.canAssist;$('room-assist-toggle').checked=room.assisted===true;
 $('duel-home').hidden=true;$('duel-room').hidden=false;$('room-code-label').textContent=room.code;$('room-kind').textContent=room.competitive?'dereceli düello':'özel oda';
 const link=new URL(location.href);link.hash='room='+room.code;
 const fileMode=location.protocol==='file:';$('room-invite').value=fileMode?room.code:link.href;$('copy-invite').textContent=fileMode?'kodu kopyala':'daveti kopyala';
 $('host-name').textContent=room.host?room.host.display_name+' #'+room.host.account_tag:'—';$('guest-name').textContent=room.guest?room.guest.display_name+' #'+room.guest.account_tag:(window.TypeI18n?.t('arkadaşın bekleniyor')||'arkadaşın bekleniyor');
 for(const side of ['host','guest']){const name=$(side+'-name');name.dataset.profile=room[side]?.account_tag||'';name.tabIndex=room[side]?0:-1;name.setAttribute('role','button');window.TypeBadges.render($(side+'-badges'),room[side]);}face($('host-avatar'),room.host);face($('guest-avatar'),room.guest);
 $('host-ready').textContent=room.hostReady?'hazır':'bekliyor';$('guest-ready').textContent=room.guest?(room.guestReady?'hazır':'bekliyor'):'—';
 $('host-player').classList.toggle('ready',room.hostReady);$('guest-player').classList.toggle('ready',room.guestReady);
 const mine=room.host?.user_id===api.profile?.user_id,isReady=mine?room.hostReady:room.guestReady;
 $('room-ready').textContent=isReady?'hazır değilim':'hazırım';$('room-ready').hidden=room.status!=='waiting';$('room-ready').disabled=!room.guest;
 $('room-again').hidden=!['finished','cancelled'].includes(room.status);
 $('room-rematch').hidden=room.status!=='finished';$('room-rematch').textContent=room.rematchRequestedByMe?'tekrar maç isteğini iptal et':room.rematchRequestedByOpponent?'rakip tekrar oynamak istiyor · kabul et':'tekrar oyna';
 $('room-status').textContent=room.status==='waiting'?(room.guest?'İki oyuncu hazır olunca başlar.':'Oda kodunu veya davetini paylaş.'):room.status==='racing'?'Düello devam ediyor.':room.status==='cancelled'?'Düello tamamlanamadı.':'Düello tamamlandı.';
 $('host-score').hidden=room.status!=='finished';$('guest-score').hidden=room.status!=='finished';
 if(room.status==='finished'){
  $('host-score').textContent=(room.hostResult?.wpm||0)+' wpm · '+(room.hostResult?.accuracy||0)+'%';$('guest-score').textContent=(room.guestResult?.wpm||0)+' wpm · '+(room.guestResult?.accuracy||0)+'%';
  const draw=!room.winnerId,won=room.winnerId===api.profile?.user_id,delta=mine?room.hostDelta:room.guestDelta;
  $('duel-outcome').hidden=false;$('duel-outcome').textContent=(draw?'Berabere.':won?'Bu tur senin. Kazandın.':'Bu tur rakibinin. Bir sonraki turda görüşürüz.')+(room.rated?' '+(delta>=0?'+':'')+delta+' RP':room.privateRated?' '+((mine?room.hostPrivateDelta:room.guestPrivateDelta)>=0?'+':'')+(mine?room.hostPrivateDelta:room.guestPrivateDelta)+' '+(window.TypeI18n?.t('Özel oda Elo')||'Özel oda Elo'):' · maç puanı '+room.hostPoints+'–'+room.guestPoints);
 }else $('duel-outcome').hidden=true;
 updateLive(room);
 window.dispatchEvent(new CustomEvent('type:room',{detail:room}));
}
function updateLive(room){
 const mine=room.host?.user_id===api.profile?.user_id;
 $('duel-live-me').textContent=api.profile?.display_name||(window.TypeI18n?.t('sen')||'sen');$('duel-live-opponent').textContent=(mine?room.guest:room.host)?.display_name||(window.TypeI18n?.t('rakip')||'rakip');
 $('duel-live-my-wpm').textContent=String((mine?room.hostLive:room.guestLive)?.wpm||0);$('duel-live-their-wpm').textContent=String((mine?room.guestLive:room.hostLive)?.wpm||0);
}
async function pollRoom(){
 if(!active||polling||mutation||!api.signedIn)return;polling=true;const ticket=roomGeneration;
 try{
  const before=Date.now(),room=await api.request('room-state',{code:active.code});const clockOffset=room.serverNow+(Date.now()-before)/2-Date.now();
  if(ticket!==roomGeneration||!active||active.code!==room.code)return;
  showRoom(room,clockOffset);
  if(room.status==='finished'&&room.rematchCode){clearInterval(pollTimer);pollTimer=null;await enterRoom(room.rematchCode);return;}
  if(room.status==='racing'&&startedCode!==room.code){startedCode=room.code;await test.loadDuel({...room,clockOffset});}
  if(['finished','cancelled'].includes(room.status)){
   if(room.status==='cancelled'){clearInterval(pollTimer);pollTimer=null;}
   else {rematchDeadline ||= Date.now()+600000;if(Date.now()>rematchDeadline){clearInterval(pollTimer);pollTimer=null;}}
   if(settledCode!==room.code){settledCode=room.code;if(startedCode===room.code){document.querySelectorAll('dialog[open]').forEach(d=>d.close());test.showView('duel');history.replaceState(null,'','#room='+room.code);}void refreshRating();}
  }
 }catch(error){$('duel-error').textContent=error.message;if(error.status===401){clearInterval(pollTimer);pollTimer=null;}}
 finally{polling=false;}
}
function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(()=>void pollRoom(),1500);void pollRoom();}
async function enterRoom(code){
 if(joining)return;roomGeneration++;
 pendingCode=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!/^[A-Z0-9]{10}$/.test(pendingCode)){$('duel-error').textContent='10 karakterlik oda kodunu yaz.';return;}
 if(!api.signedIn){test.showView('duel');api.openLogin();return;}
 joining=true;$('duel-error').textContent='';
 try{
  const before=Date.now(),room=await api.request('room-join',{code:pendingCode});showRoom(room,room.serverNow+(Date.now()-before)/2-Date.now());
  history.replaceState(null,'','#room='+room.code);test.showView('duel');startPolling();
 }catch(error){$('duel-error').textContent=error.message;}
 finally{joining=false;}
}
function stopSearch(){searching=false;clearInterval(queueTimer);queueTimer=null;$('find-match').disabled=false;$('find-match').textContent='eşleşme ara';$('cancel-match').hidden=true;$('queue-status').textContent='';}
async function findMatch(){
 if(!api.signedIn){api.openLogin();return;}
 if(searching)return;searching=true;$('duel-error').textContent='';$('find-match').disabled=true;$('find-match').textContent='rakip aranıyor…';$('cancel-match').hidden=false;$('queue-status').textContent='Bir oyuncu daha arıyor olmalı.';
 const search=async()=>{
  if(!searching)return;
  try{const data=await api.request('matchmake',opts());if(data.roomCode){stopSearch();await enterRoom(data.roomCode);}else if(data.ratingWindow)$('queue-status').textContent=window.TypeI18n?.t('Yakın puanlı rakip aranıyor. Aralık: ±')+data.ratingWindow+' Elo';}
  catch(error){$('duel-error').textContent=error.message;stopSearch();}
 };
 await search();if(searching)queueTimer=setInterval(()=>void search(),2200);
}
$('find-match').addEventListener('click',()=>void findMatch());
$('cancel-match').addEventListener('click',()=>{stopSearch();void api.request('queue-cancel').catch(()=>{});});
$('create-room').addEventListener('click',async()=>{
 if(!api.signedIn){api.openLogin();return;}
 $('create-room').disabled=true;$('duel-error').textContent='';
 try{if(searching){stopSearch();await api.request('queue-cancel');}const data=await api.request('room-create',opts());await enterRoom(data.code);}catch(error){$('duel-error').textContent=error.message;}finally{$('create-room').disabled=false;}
});
$('join-room-form').addEventListener('submit',event=>{event.preventDefault();void enterRoom($('room-code-input').value);});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('room-invite').value);toast('Davet kopyalandı.');}catch{$('room-invite').select();toast('Ctrl+C ile kopyalayabilirsin.');}});
async function changeAssist(enabled,fromGame=false){
 if(!active||mutation)return;
 const code=active.code;mutation=true;roomGeneration++;
 $('room-assist-toggle').disabled=true;$('duel-assist-button').disabled=true;
 try{const room=await api.request('room-assist',{code,enabled});if(active?.code===code){showRoom(room,active.clockOffset);$('duel-assist-status').textContent='';}}
 catch(error){if(active?.code===code){$('room-assist-toggle').checked=active.assisted===true;$('duel-error').textContent=error.message;$('duel-assist-status').hidden=false;$('duel-assist-status').textContent=error.message;}}
 finally{mutation=false;$('room-assist-toggle').disabled=false;$('duel-assist-button').disabled=false;if(fromGame)test.focusInput();}
}
$('room-assist-toggle').addEventListener('change',()=>void changeAssist($('room-assist-toggle').checked));
$('duel-assist-button').addEventListener('click',()=>void changeAssist(!active?.assisted,true));
$('room-settings-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!active||mutation)return;
 const code=active.code;mutation=true;roomGeneration++;$('room-settings-save').disabled=true;$('room-ready').disabled=true;$('duel-error').textContent='';
 try{const room=await api.request('room-settings',{code,duration:Number($('room-duration').value),language:$('room-language').value,difficulty:$('room-difficulty').value});if(active?.code===code){showRoom(room,active.clockOffset);toast('Oda ayarları güncellendi.');}}
 catch(error){if(active?.code===code)$('duel-error').textContent=error.message;}
 finally{mutation=false;$('room-settings-save').disabled=false;$('room-ready').disabled=!active?.guest;}
});
$('room-ready').addEventListener('click',async()=>{
 if(!active||mutation)return;$('room-ready').disabled=true;
 const mine=active.host.user_id===api.profile?.user_id,ready=!(mine?active.hostReady:active.guestReady);
 try{const before=Date.now(),room=await api.request('room-ready',{code:active.code,ready});showRoom(room,room.serverNow+(Date.now()-before)/2-Date.now());await pollRoom();}catch(error){$('duel-error').textContent=error.message;}finally{$('room-ready').disabled=!active?.guest;}
});
$('room-rematch').addEventListener('click',async()=>{
 if(!active||active.status!=='finished')return;
 const button=$('room-rematch');button.disabled=true;
 try{const room=await api.request('room-rematch',{code:active.code,requested:!active.rematchRequestedByMe});showRoom(room,active.clockOffset);if(room.rematchCode)await enterRoom(room.rematchCode);else startPolling();}
 catch(error){$('duel-error').textContent=error.message;}
 finally{button.disabled=false;}
});
$('leave-room').addEventListener('click',async()=>{
 if(!active)return;
 try{await api.request('room-leave',{code:active.code});clearInterval(pollTimer);pollTimer=null;roomGeneration++;active=null;pendingCode=null;startedCode=null;history.replaceState(null,'','#duel');$('duel-room').hidden=true;$('duel-home').hidden=false;$('duel-error').textContent='';test.showView('duel');}catch(error){$('duel-error').textContent=error.message;}
});
$('room-again').addEventListener('click',()=>{clearInterval(pollTimer);roomGeneration++;active=null;pendingCode=null;startedCode=null;history.replaceState(null,'','#duel');$('duel-room').hidden=true;$('duel-home').hidden=false;$('duel-error').textContent='';});
window.addEventListener('type:view',event=>{view=event.detail;if(view==='duel')void refreshRating();if(view!=='duel'&&searching){stopSearch();void api.request('queue-cancel').catch(()=>{});}});
window.addEventListener('type:auth',()=>{void refreshRating();if(pendingCode&&api.signedIn&&!active)void enterRoom(pendingCode);if(!api.signedIn){clearInterval(pollTimer);stopSearch();roomGeneration++;active=null;$('duel-assist-button').hidden=true;$('duel-room').hidden=true;$('duel-home').hidden=false;}});
window.addEventListener('type:duel-submitted',()=>void pollRoom());
const checkInvite=()=>{if(location.hash.startsWith('#room='))void enterRoom(location.hash.slice(6));};
window.addEventListener('hashchange',checkInvite);
Promise.resolve(api.ready).finally(checkInvite);
void refreshRating();
})();
