(() => {
'use strict';
const api=window.TypeOnline,$=id=>document.getElementById(id),t=value=>window.TypeI18n?.t(value)||value;
// Enable only after the production migration and matching API are deployed.
if(window.ZENITH_TYPE_CONFIG?.seasonsEnabled!==true){$('season-clock').hidden=true;return;}
let current=null,receivedAt=0,serverAt=0,timer=null,loading=false,nextSync=0,expiredSeason=null;
const monotonic=()=>performance.now();
function sync(season){
 if(!season||!Number.isSafeInteger(season.id)||season.id<0)return;
 const starts=Date.parse(season.startsAt),ends=Date.parse(season.endsAt),server=Date.parse(season.serverNow);
 if(!Number.isFinite(starts)||!Number.isFinite(ends)||!Number.isFinite(server)||ends-starts!==2592000000)return;
 if(current&&(season.id<current.id||season.id===current.id&&server<serverAt))return;
 const first=!current,changed=!!current&&season.id!==current.id;
 current={...season,starts,ends};serverAt=server;receivedAt=monotonic();nextSync=receivedAt+60000;
 $('season-clock').dataset.state='active';
 $('season-label').textContent=t('Sezon')+' '+(season.id+1);
 $('season-clock').title=t('WPM ve Elo her 30 günde bir sıfırlanır.')+' '+new Date(ends).toLocaleString(window.TypeI18n?.locale);
 tick();
 if(first||changed)window.dispatchEvent(new CustomEvent('type:season',{detail:{season:current,changed}}));
}
async function refresh(){
 if(loading)return;loading=true;nextSync=monotonic()+10000;
 try{const data=await api.request('season',{},false);sync(data.season);}
 catch{if(!current){$('season-clock').dataset.state='error';$('season-remaining').textContent=t('Sezon bilgisi alınamadı.');}}
 finally{loading=false;}
}
function tick(){
 if(document.hidden)return;
 if(current){
  const seconds=Math.max(0,Math.ceil((current.ends-serverAt-(monotonic()-receivedAt))/1000));
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),remaining=seconds%60;
  $('season-remaining').textContent=days+' '+t('gün')+' '+[hours,minutes,remaining].map(value=>String(value).padStart(2,'0')).join(':');
  $('season-remaining').dateTime='P'+days+'DT'+hours+'H'+minutes+'M'+remaining+'S';
  if(seconds===0&&expiredSeason!==current.id){expiredSeason=current.id;nextSync=0;}
 }
 if(monotonic()>=nextSync)void refresh();
}
function resume(){clearInterval(timer);timer=null;if(document.hidden)return;tick();timer=setInterval(tick,1000);void refresh();}
window.TypeSeason={sync,refresh,contains(date){if(!current||current.id===0)return true;const time=Date.parse(date);return Number.isFinite(time)&&time>=current.starts&&time<current.ends;},get current(){return current;}};
document.addEventListener('visibilitychange',resume);resume();
})();
