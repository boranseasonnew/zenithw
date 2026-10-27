(() => {
'use strict';
const $=id=>document.getElementById(id),api=window.TypeOnline,t=value=>window.TypeI18n?.t(value)||value;
let opponent=null,recordKey='',recordGeneration=0,scope=null,offset=0,generation=0,loading=false;
let profile=null,profileOffset=0,profileGeneration=0,profileLoading=false;
const summary=stats=>`${stats.wins} ${t('galibiyet')} · ${stats.losses} ${t('mağlubiyet')} · ${stats.draws} ${t('beraberlik')}`;
window.addEventListener('type:room',event=>{
 const room=event.detail;opponent=room.host?.user_id===api.profile?.user_id?room.guest:room.host;
 $('open-opponent-history').hidden=!opponent;
 if(!opponent){recordGeneration++;$('duel-record').textContent='';recordKey='';return;}
 const key=room.code+':'+room.status;if(key===recordKey)return;recordKey=key;
 const ticket=++recordGeneration;
 void api.request('room-history',{opponentId:opponent.user_id}).then(data=>{if(ticket===recordGeneration)$('duel-record').textContent=t('Aranızdaki maçlar: ')+summary(data.stats);}).catch(()=>{if(ticket===recordGeneration)$('duel-record').textContent=t('Maç geçmişi yüklenemedi.');});
});
function cell(value){const td=document.createElement('td');td.textContent=value;return td;}
function resultRow(result){
 const row=document.createElement('tr'),player=document.createElement('td'),link=document.createElement('button'),badges=document.createElement('span');
 link.type='button';link.className='profile-link';link.dataset.profile=result.opponent.account_tag;link.textContent=result.opponent.display_name+' #'+result.opponent.account_tag;window.TypeBadges.render(badges,result.opponent);player.append(link,badges);
 row.append(cell(new Date(result.date).toLocaleString(window.TypeI18n.locale,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})),player,
  cell(t(result.competitive?'dereceli':'özel oda')+' · '+result.duration+'s'),cell(t({win:'galibiyet',loss:'mağlubiyet',draw:'beraberlik'}[result.outcome])),cell(result.wpm+' / '+result.opponentWpm),cell(result.competitive&&Number.isFinite(result.ratingDelta)?(result.ratingDelta>=0?'+':'')+result.ratingDelta:'—'));
 return row;
}
function clearProfile(){profileGeneration++;profileOffset=0;profileLoading=false;$('profile-duels-rows').replaceChildren();$('profile-duels-summary').textContent='';$('profile-duels-status').textContent='';$('profile-duels-more').hidden=true;}
async function loadProfile(reset=false){
 if(!profile||profileLoading&&!reset)return;
 if(reset)clearProfile();
 $('profile-duels').hidden=false;
 const viewer=api.profile,own=profile.user_id===viewer?.user_id;
 $('profile-duels-title').textContent=t(own?'düello geçmişi':'aranızdaki düellolar');
 if(!api.signedIn){$('profile-duels-status').textContent=t('Düello geçmişini görmek için giriş yap.');return;}
 profileLoading=true;const ticket=++profileGeneration;
 $('profile-duels-more').disabled=true;$('profile-duels-status').textContent=t('yükleniyor…');
 try{
  const data=await api.request('room-history',{opponentId:own?null:profile.user_id,offset:profileOffset});
  if(ticket!==profileGeneration)return;
  $('profile-duels-summary').textContent=summary(own?data.stats:{...data.stats,wins:data.stats.losses,losses:data.stats.wins});
  for(const result of data.results){
   const viewed=own?result:{...result,outcome:{win:'loss',loss:'win',draw:'draw'}[result.outcome],wpm:result.opponentWpm,opponentWpm:result.wpm,ratingDelta:result.opponentRatingDelta,opponent:viewer};
   $('profile-duels-rows').append(resultRow(viewed));
  }
  profileOffset+=data.results.length;$('profile-duels-more').hidden=!data.hasMore;
  $('profile-duels-status').textContent=data.stats.total?'':t('Henüz tamamlanmış düello yok.');
 }catch(error){if(ticket===profileGeneration)$('profile-duels-status').textContent=t(error.message);}
 finally{if(ticket===profileGeneration){profileLoading=false;$('profile-duels-more').disabled=false;}}
}
window.addEventListener('type:profile-opening',()=>{profile=null;clearProfile();$('profile-duels').hidden=true;});
window.addEventListener('type:profile-loaded',event=>{profile=event.detail;void loadProfile(true);});
$('profile-duels-more').addEventListener('click',()=>void loadProfile());
async function load(reset=false){
 if(loading&&!reset)return;loading=true;const ticket=++generation;
 $('match-history-more').disabled=true;$('match-history-status').textContent=t('yükleniyor…');
 try{
  const data=await api.request('room-history',{opponentId:scope,offset:reset?0:offset});if(ticket!==generation)return;
  if(reset){offset=0;$('match-history-rows').replaceChildren();}
  $('match-history-summary').textContent=summary(data.stats);
  for(const result of data.results)$('match-history-rows').append(resultRow(result));
  offset+=data.results.length;$('match-history-more').hidden=!data.hasMore;
  $('match-history-status').textContent=data.stats.total?'':t('Henüz tamamlanmış düello yok.');
 }catch(error){if(ticket===generation)$('match-history-status').textContent=t(error.message);}
 finally{if(ticket===generation){loading=false;$('match-history-more').disabled=false;}}
}
function open(against=null){
 if(!api.signedIn){api.openLogin();return;}
 scope=against;offset=0;$('match-history-rows').replaceChildren();$('match-history-more').hidden=true;
 $('match-history-title').textContent=t(against?'geçmiş karşılaşmalar':'maç geçmişi');
 if(!$('match-history-dialog').open)$('match-history-dialog').showModal();void load(true);
}
$('open-match-history').addEventListener('click',()=>open());
$('open-opponent-history').addEventListener('click',()=>{if(opponent)open(opponent.user_id);});
$('match-history-more').addEventListener('click',()=>void load());
window.addEventListener('type:auth',()=>{recordKey='';recordGeneration++;generation++;loading=false;$('match-history-dialog').close();$('match-history-rows').replaceChildren();clearProfile();if(profile&&$('public-profile-dialog').open)void loadProfile(true);});
if(window.TypeProfiles?.profile){profile=window.TypeProfiles.profile;void loadProfile(true);}
})();
