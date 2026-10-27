(() => {
'use strict';
const $=id=>document.getElementById(id),api=window.TypeOnline,test=window.TypeTest;
let active=null,pendingCode=null,pollTimer=null,queueTimer=null,polling=false,searching=false,startedCode=null,joining=false,view='test';
const toast=message=>window.dispatchEvent(new CustomEvent('type:toast',{detail:message}));
const opts=()=>({duration:Number($('duel-duration').value),language:$('duel-language').value,difficulty:$('duel-difficulty').value});
const league=rating=>{
 const games=rating.wins+rating.losses+rating.draws;
 if(!games)return 'derecesiz';
 return rating.mmr>=1800?'usta':rating.mmr>=1600?'elmas':rating.mmr>=1400?'platin':rating.mmr>=1200?'altın':rating.mmr>=1000?'gümüş':'bronz';
};
async function refreshRating(){
 if(!api.signedIn){$('league-name').textContent='derecesiz';$('league-mmr').textContent='—';return;}
 try{const data=await api.request('rating');$('league-name').textContent=league(data.rating);$('league-mmr').textContent=data.rating.mmr+' rp';$('league-chip').dataset.league=league(data.rating);}catch{}
}
function face(el,profile){
 el.replaceChildren();if(!profile){el.textContent='?';return;}
 const url=api.avatarURL(profile);if(url){const image=new Image();image.src=url;image.alt='';el.append(image);}else el.textContent=profile.display_name[0].toLocaleUpperCase('tr-TR');
}
function showRoom(room,clockOffset=0){
 active={...room,clockOffset};pendingCode=room.code;
 $('room-assist-row').hidden=!room.canAssist;$('room-assist-toggle').checked=room.assisted===true;
 $('duel-home').hidden=true;$('duel-room').hidden=false;$('room-code-label').textContent=room.code;$('room-kind').textContent=room.rated?'dereceli düello':'özel oda';
 const link=new URL(location.href);link.hash='room='+room.code;
 const fileMode=location.protocol==='file:';$('room-invite').value=fileMode?room.code:link.href;$('copy-invite').textContent=fileMode?'kodu kopyala':'daveti kopyala';
 $('host-name').textContent=room.host?room.host.display_name+' #'+room.host.account_tag:'—';$('guest-name').textContent=room.guest?room.guest.display_name+' #'+room.guest.account_tag:(window.TypeI18n?.t('arkadaşın bekleniyor')||'arkadaşın bekleniyor');
 for(const side of ['host','guest']){const name=$(side+'-name');name.dataset.profile=room[side]?.account_tag||'';name.tabIndex=room[side]?0:-1;name.setAttribute('role','button');}face($('host-avatar'),room.host);face($('guest-avatar'),room.guest);
 $('host-ready').textContent=room.hostReady?'hazır':'bekliyor';$('guest-ready').textContent=room.guest?(room.guestReady?'hazır':'bekliyor'):'—';
 $('host-player').classList.toggle('ready',room.hostReady);$('guest-player').classList.toggle('ready',room.guestReady);
 const mine=room.host?.user_id===api.profile?.user_id,isReady=mine?room.hostReady:room.guestReady;
 $('room-ready').textContent=isReady?'hazır değilim':'hazırım';$('room-ready').hidden=room.status!=='waiting';$('room-ready').disabled=!room.guest;
 $('room-again').hidden=!['finished','cancelled'].includes(room.status);
 $('room-status').textContent=room.status==='waiting'?(room.guest?'İki oyuncu hazır olunca başlar.':'Oda kodunu veya davetini paylaş.'):room.status==='racing'?'Düello devam ediyor.':room.status==='cancelled'?'Düello tamamlanamadı.':'Düello tamamlandı.';
 $('host-score').hidden=room.status!=='finished';$('guest-score').hidden=room.status!=='finished';
 if(room.status==='finished'){
  $('host-score').textContent=(room.hostResult?.wpm||0)+' wpm · '+(room.hostResult?.accuracy||0)+'%';$('guest-score').textContent=(room.guestResult?.wpm||0)+' wpm · '+(room.guestResult?.accuracy||0)+'%';
  const draw=!room.winnerId,won=room.winnerId===api.profile?.user_id,delta=mine?room.hostDelta:room.guestDelta;
  $('duel-outcome').hidden=false;$('duel-outcome').textContent=(draw?'Berabere.':won?'Bu tur senin. Kazandın.':'Bu tur rakibinin. Bir sonraki turda görüşürüz.')+(room.rated?' '+(delta>=0?'+':'')+delta+' RP':' · maç puanı '+room.hostPoints+'–'+room.guestPoints);
 }else $('duel-outcome').hidden=true;
 updateLive(room);
}
function updateLive(room){
 const mine=room.host?.user_id===api.profile?.user_id;
 $('duel-live-me').textContent=api.profile?.display_name||(window.TypeI18n?.t('sen')||'sen');$('duel-live-opponent').textContent=(mine?room.guest:room.host)?.display_name||(window.TypeI18n?.t('rakip')||'rakip');
 $('duel-live-my-wpm').textContent=String((mine?room.hostLive:room.guestLive)?.wpm||0);$('duel-live-their-wpm').textContent=String((mine?room.guestLive:room.hostLive)?.wpm||0);
}
async function pollRoom(){
 if(!active||polling||!api.signedIn)return;polling=true;
 try{
  const before=Date.now(),room=await api.request('room-state',{code:active.code});const clockOffset=room.serverNow+(Date.now()-before)/2-Date.now();
  showRoom(room,clockOffset);
  if(room.status==='racing'&&startedCode!==room.code){startedCode=room.code;await test.loadDuel({...room,clockOffset});}
  if(['finished','cancelled'].includes(room.status)){
   clearInterval(pollTimer);pollTimer=null;
   if(startedCode===room.code){document.querySelectorAll('dialog[open]').forEach(d=>d.close());test.showView('duel');history.replaceState(null,'','#room='+room.code);}
   void refreshRating();
  }
 }catch(error){$('duel-error').textContent=error.message;if(error.status===401){clearInterval(pollTimer);pollTimer=null;}}
 finally{polling=false;}
}
function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(()=>void pollRoom(),1500);void pollRoom();}
async function enterRoom(code){
 if(joining)return;
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
  try{const data=await api.request('matchmake',opts());if(data.roomCode){stopSearch();await enterRoom(data.roomCode);}}
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
$('room-assist-toggle').addEventListener('change',async()=>{
 if(!active)return;const toggle=$('room-assist-toggle');toggle.disabled=true;
 try{showRoom(await api.request('room-assist',{code:active.code,enabled:toggle.checked}),active.clockOffset);}catch(error){toggle.checked=active.assisted===true;$('duel-error').textContent=error.message;}finally{toggle.disabled=false;}
});
$('room-ready').addEventListener('click',async()=>{
 if(!active)return;$('room-ready').disabled=true;
 const mine=active.host.user_id===api.profile?.user_id,ready=!(mine?active.hostReady:active.guestReady);
 try{const before=Date.now(),room=await api.request('room-ready',{code:active.code,ready});showRoom(room,room.serverNow+(Date.now()-before)/2-Date.now());await pollRoom();}catch(error){$('duel-error').textContent=error.message;}finally{$('room-ready').disabled=!active?.guest;}
});
$('leave-room').addEventListener('click',async()=>{
 if(!active)return;
 try{await api.request('room-leave',{code:active.code});clearInterval(pollTimer);pollTimer=null;active=null;pendingCode=null;startedCode=null;history.replaceState(null,'','#duel');$('duel-room').hidden=true;$('duel-home').hidden=false;$('duel-error').textContent='';test.showView('duel');}catch(error){$('duel-error').textContent=error.message;}
});
$('room-again').addEventListener('click',()=>{clearInterval(pollTimer);active=null;pendingCode=null;startedCode=null;history.replaceState(null,'','#duel');$('duel-room').hidden=true;$('duel-home').hidden=false;$('duel-error').textContent='';});
window.addEventListener('type:view',event=>{view=event.detail;if(view==='duel')void refreshRating();if(view!=='duel'&&searching){stopSearch();void api.request('queue-cancel').catch(()=>{});}});
window.addEventListener('type:auth',()=>{void refreshRating();if(pendingCode&&api.signedIn&&!active)void enterRoom(pendingCode);if(!api.signedIn){clearInterval(pollTimer);stopSearch();active=null;$('duel-room').hidden=true;$('duel-home').hidden=false;}});
window.addEventListener('type:duel-submitted',()=>void pollRoom());
const checkInvite=()=>{if(location.hash.startsWith('#room='))void enterRoom(location.hash.slice(6));};
window.addEventListener('hashchange',checkInvite);
Promise.resolve(api.ready).finally(checkInvite);
void refreshRating();
})();
