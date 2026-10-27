(() => {
'use strict';
const $=id=>document.getElementById(id),api=window.TypeOnline,dialog=$('public-profile-dialog');
let currentProfile=null,currentTag=null,offset=0,loading=false,generation=0,searchGeneration=0;
const formatDate=value=>new Date(value).toLocaleString(window.TypeI18n?.locale||'tr-TR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
function face(element,profile){element.replaceChildren();const url=api.avatarURL(profile);if(url){const image=new Image();image.src=url;image.alt='';element.append(image);}else element.textContent=profile.display_name[0]||'?';}
function stat(label,value){const item=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('small');number.textContent=value;caption.textContent=label;item.append(number,caption);return item;}
async function loadMore(reset=false){
 if(loading&&!reset)return;loading=true;const ticket=++generation,tag=currentTag;
 $('public-profile-more').disabled=true;$('public-profile-status').textContent='yükleniyor…';
 try{
  const data=await api.request('profile-public',{tag,offset:reset?0:offset},false);if(ticket!==generation)return;
  if(reset){offset=0;$('public-profile-history').replaceChildren();}
  $('public-profile-name').textContent=data.profile.display_name;$('public-profile-tag').textContent='#'+data.profile.account_tag;face($('public-profile-avatar'),data.profile);
  window.TypeBadges.render($('public-profile-badges'),data.profile);
  if(reset){currentProfile=data.profile;window.dispatchEvent(new CustomEvent('type:profile-loaded',{detail:data.profile}));}
  const pr=data.privateRating;
  $('public-profile-private-rating').textContent=pr?(window.TypeI18n?.t('Özel oda Elo')||'Özel oda Elo')+': '+pr.mmr.toLocaleString(window.TypeI18n?.locale||'tr-TR')+' · '+pr.wins+' '+(window.TypeI18n?.t('galibiyet')||'galibiyet')+' · '+pr.losses+' '+(window.TypeI18n?.t('mağlubiyet')||'mağlubiyet')+' · '+pr.draws+' '+(window.TypeI18n?.t('beraberlik')||'beraberlik'):'';
  const s=data.stats;$('public-profile-stats').replaceChildren(stat('en iyi wpm',s.bestWpm),stat('ortalama wpm',s.averageWpm),stat('doğruluk',s.accuracy+'%'),stat('testler',s.tests));
  for(const result of data.results){const row=document.createElement('tr');for(const value of [result.wpm,result.accuracy+'%',result.duration+'s · '+result.language+' · '+(window.TypeI18n?.t({easy:'kolay',normal:'normal',hard:'zor'}[result.difficulty]||result.difficulty)||result.difficulty),formatDate(result.created_at)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('public-profile-history').append(row);}
  offset+=data.results.length;$('public-profile-more').hidden=!data.hasMore;
  $('public-profile-status').textContent=s.tests?'Yalnızca doğrulanmış bireysel testler. Özel oda maçları dahil değil.':'Henüz doğrulanmış test yok.';
 }catch(error){if(ticket===generation){$('public-profile-status').textContent=error.message;$('public-profile-more').hidden=true;}}
 finally{if(ticket===generation){loading=false;$('public-profile-more').disabled=false;}}
}
function openProfile(tag){
 if(!/^[A-F0-9]{12}$/i.test(tag||''))return;
 currentProfile=null;$('public-profile-private-rating').textContent='';$('match-history-dialog').close();
 window.dispatchEvent(new CustomEvent('type:profile-opening'));
 currentTag=tag.toUpperCase();offset=0;$('public-profile-name').textContent=window.TypeI18n?.t('oyuncu')||'oyuncu';$('public-profile-tag').textContent='#'+currentTag;$('public-profile-stats').replaceChildren();$('public-profile-history').replaceChildren();$('public-profile-more').hidden=true;
 if(!dialog.open)dialog.showModal();void loadMore(true);
 window.TypeBadges.render($('public-profile-badges'),null);
}
document.addEventListener('click',event=>{if(event.target.closest('[data-account-badge]'))return;const element=event.target.closest('[data-profile]');if(element?.dataset.profile)openProfile(element.dataset.profile);});
document.addEventListener('keydown',event=>{if(!event.isComposing&&event.keyCode!==229&&(event.key==='Enter'||event.key===' ')&&event.target.matches('[data-profile][role="button"]')){event.preventDefault();openProfile(event.target.dataset.profile);}});
$('public-profile-more').addEventListener('click',()=>void loadMore());
$('copy-profile-link').addEventListener('click',async()=>{const url=new URL(location.href);url.hash='profile='+currentTag;try{await navigator.clipboard.writeText(url.href);$('public-profile-status').textContent='Profil linki kopyalandı.';}catch{$('public-profile-status').textContent=url.href;}});
$('profile-search-form').addEventListener('submit',async event=>{
 event.preventDefault();const ticket=++searchGeneration,query=$('profile-search-input').value.trim();$('profile-search-results').replaceChildren();$('profile-search-status').textContent='aranıyor…';
 try{const data=await api.request('profiles-search',{query},false);if(ticket!==searchGeneration)return;
  for(const profile of data.profiles){const card=document.createElement('div'),name=document.createElement('button'),tag=document.createElement('small'),avatar=document.createElement('span'),badges=document.createElement('span');name.type='button';name.className='profile-link';card.className='profile-search-card';name.dataset.profile=profile.account_tag;avatar.className='room-player-avatar';face(avatar,profile);name.textContent=profile.display_name;tag.textContent='#'+profile.account_tag;window.TypeBadges.render(badges,profile);card.append(avatar,name,tag,badges);$('profile-search-results').append(card);}
  $('profile-search-status').textContent=data.profiles.length?data.profiles.length+' oyuncu':'Oyuncu bulunamadı.';
 }catch(error){if(ticket===searchGeneration)$('profile-search-status').textContent=error.message;}
});
window.TypeProfiles={open:openProfile,get profile(){return currentProfile;}};
const checkLink=()=>{if(location.hash.startsWith('#profile='))openProfile(location.hash.slice(9));};window.addEventListener('hashchange',checkLink);checkLink();
})();
