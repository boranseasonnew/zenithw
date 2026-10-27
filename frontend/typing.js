(() => {
'use strict';
const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];
const STORE = 'zenith-type:v1';
const themes = ['dark','purple','light','kitty','pumpkin','witcher','ocean','rose'];
const defaults = {theme:'dark',duration:30,language:window.TypeI18n?.language||'tr',difficulty:'normal',effect:'glow',sound:false,zen:true,motion:false,name:'Sen',training:'weak',custom:'',ranked:true,autoSubmitVersion:2,smooth:true};
const wordLists = {
 tr: {
  easy:'bir bu ve o sen ben biz ile için var yok çok az iyi gün ay yıl su yol el göz ev ses söz gel git al ver aç yaz oku bak dur kal bul koş sağ sol üst alt ilk son yeni eski renk mor kuş kar yaz kış dal taş kum can ruh düş gece masa kedi kitap ışık oyun umut deniz güneş dünya zaman güzel küçük büyük sakin ritim odak'.split(' '),
  normal:'insan hayat zaman dünya güzel küçük büyük görmek bilmek olmak yapmak gelmek gitmek düşünce kelime akşam sabah yıldız bulut rüzgar yaprak orman doğa pencere anılar hayal özgür sevgi dostluk birlikte yolculuk hikaye müzik sessiz huzur akış klavye ekran parmak dikkat öğrenmek gelişmek çalışmak denemek başarmak gerçek anlam keşif merak cesaret devam başlangıç sonuç ritim renk ışık sokak bahçe çiçek şehir çocuk yemek kahve gülmek beklemek kalmak bakmak yaşamak hissetmek anlamak paylaşmak dinlemek sevmek uyanmak uyumak yürümek konuşmak sözcük özgürlük düşünmek yarın bugün dün bazen şimdi sonra önce hemen uzak yakın farklı kolay doğru yanlış hızlı yavaş güçlü nazik sıcak soğuk açık kapalı içinde dışında boyunca arasında yeniden her şey gibi kadar başka hangi neden nasıl belki çünkü ancak yine biraz fazla güzelce sakinlik odaklanmak'.split(' '),
  hard:'özgürleşebilmek sürdürülebilir sorumluluk çeşitlilik gökyüzündeki istatistik geliştirebilmek çözümlenmemiş gerçekleştirmek çağrıştırmak eşleştirmek doğruluk alışkanlık değişkenlik öngörülemeyen düşündüğümüzde bağımsızlık karakteristik şaşırtıcı gözlemlemek mükemmellik başlangıç başarısızlık süreç ölçüm verimlilik içgüdü algoritma eşzamanlı koordinasyon yetenek odaklanabilmek'.split(' ')
 },
 en: {
  easy:'the and you that was for are with his they one have this from but had not word what all were when your can said use each which she how their time will way about out many then them these some her would make like him into has look two more write see number day could go come did my sound know water than call first who may down side been now find'.split(' '),
  normal:'people world between follow practice simple thought through another little around morning evening window forest rhythm quiet gentle wonder journey dream river ocean light shadow coffee music story flower garden mountain keyboard create learn begin focus flow bright together remember believe discover become before after always never because something different important change enough without place again under every point through right still think great small keep home work life where should while those might both open start walk move turn help read write word sound space speed accuracy progress patience freedom adventure tomorrow yesterday'.split(' '),
  hard:'extraordinary responsibility synchronization accomplishment perseverance architecture intentionally breakthrough comprehensive characteristic accessibility uninterrupted consciousness constellation environmental opportunity philosophical sophisticated unconventional transformation enthusiastic experimentation continuously communication simultaneously meticulous acknowledgement'.split(' ')
 }
};
let state = {...defaults}, records = [], keyStats = {tr:{},en:{}}, storageAvailable = true;
try {
 const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
 if(raw && raw.version === 1) {
  const saved = raw.settings || {};
  if(saved.autoSubmitVersion!==2){saved.ranked=true;saved.autoSubmitVersion=2;}
  for(const key of Object.keys(defaults)) if(typeof saved[key] === typeof defaults[key]) state[key] = saved[key];
  if(!themes.includes(state.theme)) state.theme = 'dark';
  if(!['tr','en'].includes(state.language)) state.language='tr';
  if(!['easy','normal','hard'].includes(state.difficulty)) state.difficulty='normal';
  if(!['glow','pop','particles','none'].includes(state.effect)) state.effect='glow';
  if(!['weak','words','custom'].includes(state.training)) state.training='weak';
  state.duration = Math.max(10,Math.min(600,Math.round(state.duration)||30));
  state.name = state.name.slice(0,20).trim() || 'Sen'; state.custom=state.custom.slice(0,2000);
  records = Array.isArray(raw.records) ? raw.records.filter(r => r && Number.isFinite(r.wpm) && r.wpm>=0 && r.wpm<10000 && Number.isFinite(r.accuracy) && r.accuracy>=0 && r.accuracy<=100 && ['tr','en'].includes(r.language) && ['easy','normal','hard'].includes(r.difficulty) && Number.isFinite(r.duration) && r.duration>=10 && r.duration<=600 && Number.isFinite(new Date(r.date).getTime()) && typeof r.id==='string' && typeof r.name==='string').slice(-200) : [];
  for(const lang of ['tr','en']) for(const [key,value] of Object.entries(raw.keyStats?.[lang] || {})) {
   if(key.length===1 && /^[\p{L}\p{N}\p{P}]$/u.test(key) && Number.isFinite(value?.total) && Number.isFinite(value?.errors) && value.total>=0 && value.errors>=0 && value.errors<=value.total) keyStats[lang][key] = {total:value.total,errors:value.errors};
  }
 }
} catch { storageAvailable=false; }
let view='test', phase='ready', target='', typed='', chars=[], started=0, timer=null, attempts=0, hits=0, correct=0, samples=[], lastSample=0, scrollY=0, toastTimer, audio;
const input=$('typing-input'), track=$('word-track'), viewport=$('typing-viewport'), caret=$('caret');
let sessionKeys={}, sessionLanguage=state.language, tabRestart=false, lastResult=null;
let generation=0,rankedRun=null,flushTimer=null,rankingGeneration=0,caretAnimation=null,lastCaretLine=-1,countdownTimer=null;
const online=window.TypeOnline;
const locale=()=>state.language==='tr'?'tr-TR':'en-US';
const escapeHTML = value => String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300);}
function persist(){
 try{localStorage.setItem(STORE,JSON.stringify({version:1,settings:state,records,keyStats}));storageAvailable=true;}
 catch{storageAvailable=false;$('storage-note').textContent='Tarayıcı kalıcı kayda izin vermiyor. Bu oturumda yazabilirsin; rekorlarını Verilerini indir ile yedekle.';toast('Kalıcı depolama kullanılamıyor; veriler bu oturumda tutulacak.');}
}
function pick(list){const n=new Uint32Array(1);crypto.getRandomValues(n);return list[n[0]%list.length];}
function pool(){const lists=wordLists[state.language];return state.difficulty==='easy'?lists.easy:state.difficulty==='hard'?[...lists.normal,...lists.hard]:[...lists.easy,...lists.normal];}
function generateWords(count,training=false){
 const words=pool(), out=[];let previous='';
 for(let i=0;i<count;i++){
  let word=pick(words);if(word===previous)word=pick(words);previous=word;
  if(!training && state.difficulty==='hard'){
   if(i%6===0) word=word[0].toLocaleUpperCase(locale())+word.slice(1);
   if(i%7===4) word+=pick([',','.','!','?',':',';']);
   if(i%13===9) word=String(Math.floor(Math.random()*900)+100);
  }
  out.push(word);
 }
 return out.join(' ');
}
function weakKeys(){return Object.entries(keyStats[state.language]).filter(([,s])=>s.errors>0).sort((a,b)=>(b[1].errors/(b[1].total+4))-(a[1].errors/(a[1].total+4))).slice(0,5).map(([key])=>key);}
function trainingText(){
 if(state.training==='custom') return state.custom.trim() || (state.language==='tr'?'Kelimeler aksın, ritmini bul. Her gün biraz daha iyi.':'Find your rhythm. Every day is a new beginning.');
 if(state.training==='words') return generateWords(20,true);
 const keys=weakKeys();
 if(!keys.length)return generateWords(25,true);
 const candidates=[...new Set(Object.values(wordLists[state.language]).flat())].filter(w=>keys.some(k=>w.includes(k)));
 // Non-word keys (punctuation / numbers) still get deliberate practice.
 return Array.from({length:25},(_,i)=>{
  const key=keys[i%keys.length];
  const matching=candidates.filter(w=>w.includes(key));
  return matching.length?pick(matching):pick(wordLists[state.language].normal)+key;
 }).join(' ');
}
function appendText(text,extendTarget=true){
 const fragment=document.createDocumentFragment();
 for(const part of text.match(/\S+\s*|\s+/g)||[]){
  const word=document.createElement('span');word.className='word';
  for(const ch of part){const span=document.createElement('span');span.className='char'+(ch===' '?' space':'');span.textContent=ch;word.append(span);for(let unit=0;unit<ch.length;unit++)chars.push(span);}
  fragment.append(word);
 }
 track.append(fragment);if(extendTarget)target+=text;
}
function mergeSession(){
 if(rankedRun?.assisted){sessionKeys={};return;}
 const stats=keyStats[sessionLanguage];
 for(const [key,value] of Object.entries(sessionKeys)){const old=stats[key]||{total:0,errors:0};stats[key]={total:old.total+value.total,errors:old.errors+value.errors};}
 sessionKeys={};
}
function progress(value){value=Math.max(0,Math.min(100,value));$('progress-fill').style.width=value+'%';$('progress').setAttribute('aria-valuenow',String(Math.round(value)));}
async function reset(focus=false){
 clearInterval(countdownTimer);$('duel-countdown').hidden=true;$('duel-live').hidden=true;
 const ticket=++generation;
 if(rankedRun)rankedRun.cancelled=true;
 clearInterval(flushTimer);flushTimer=null;rankedRun=null;
 const hadActivity=attempts>0;mergeSession();if(hadActivity)persist();
 clearInterval(timer);timer=null;phase='ready';typed='';target='';chars=[];started=0;attempts=0;hits=0;correct=0;samples=[];lastSample=0;scrollY=0;lastCaretLine=-1;sessionLanguage=state.language;
 document.body.classList.remove('running');input.disabled=false;input.value='';track.replaceChildren();track.style.transform='translateY(0)';
 appendText(view==='training'?trainingText():generateWords(150));
 $('live-wpm').textContent='0';$('live-accuracy').textContent='100';$('live-time').textContent=view==='training'?'0':String(state.duration);$('time-unit').textContent='sn';
 $('status-text').textContent='yazmaya başla';progress(0);
 $('arena-caption').textContent=(state.language==='tr'?'türkçe':'english')+' · '+({easy:'kolay',normal:'normal',hard:'zor'}[state.difficulty]);
 $('session-mode').textContent=view==='training'?'antrenman':'yerel test';$('online-dot').hidden=true;
 viewport.classList.remove('unfocused');updateTraining();updateSummary();requestAnimationFrame(moveCaret);
 if(view==='test'&&state.ranked&&online?.signedIn&&[15,30,60,120].includes(state.duration)){
  phase='preparing';input.disabled=true;$('status-text').textContent='test hazırlanıyor…';
  try{
   const challenge=await online.request('challenge',{duration:state.duration,language:state.language,difficulty:state.difficulty});
   if(ticket!==generation)return;
   target=challenge.target;chars=[];track.replaceChildren();renderNextChunk();
   rankedRun={id:challenge.id,events:[],sent:0,failed:false,cancelled:false,flushing:null};
   $('session-mode').textContent='sıralamalı';$('online-dot').hidden=false;
  }catch(error){if(ticket!==generation)return;toast(error.message+' Yerel test açık.');}
  if(ticket!==generation)return;phase='ready';input.disabled=false;$('status-text').textContent='yazmaya başla';
 }
 $('accessible-prompt').textContent=target;
 requestAnimationFrame(moveCaret);if(focus)input.focus({preventScroll:true});
}
function markUnranked(message){
 if(!rankedRun||rankedRun.failed)return;rankedRun.failed=true;clearInterval(flushTimer);flushTimer=null;
 $('session-mode').textContent='yerel test';$('online-dot').hidden=true;
 if(message)toast(message);
}
function logKey(kind,char){
 if(!rankedRun||rankedRun.failed||rankedRun.cancelled)return;
 const event={s:rankedRun.events.length,t:Math.max(0,Math.min(state.duration*1000,Math.round(elapsed()*1000))),k:kind};
 if(kind==='i')event.c=char;rankedRun.events.push(event);
 if(rankedRun.events.length>12000)markUnranked('Vuruş sınırı aşıldı. Sonuç yalnızca yerel kaydedilecek.');
}
async function flushRun(run=rankedRun){
 if(!run||run.failed||run.cancelled)return;
 if(run.flushing)return run.flushing;
 run.flushing=(async()=>{
  if(run.startPromise)await run.startPromise;
  while(!run.failed&&!run.cancelled&&run.sent<run.events.length){
   const batch=run.events.slice(run.sent,run.sent+150);let success=false,lastError;
   for(let retry=0;retry<2;retry++){
    try{const result=await online.request('events',{id:run.id,events:batch});run.sent=result.nextSeq;success=true;break;}
    catch(error){lastError=error;if(error.status&&error.status<500)break;if(retry===0)await new Promise(resolve=>setTimeout(resolve,350));}
   }
   if(!success){if(run===rankedRun)markUnranked('Bağlantı doğrulanamadı. Sonuç yerel kaydedilecek.');else run.failed=true;throw lastError||Error('Vuruş kaydı gönderilemedi.');}
  }
 })().finally(()=>{run.flushing=null;});
 return run.flushing;
}

function renderNextChunk(){
 if(chars.length>=target.length)return;
 let end=target.indexOf(' ',chars.length+1000);if(end<0)end=target.length-1;
 appendText(target.slice(chars.length,end+1),false);
}
function moveCaret(){
 const current=chars[Math.min(typed.length,chars.length-1)];if(!current)return;
 const naturalTop=current.offsetTop,lineHeight=parseFloat(getComputedStyle(track).lineHeight);
 scrollY=Math.max(0,Math.floor(naturalTop/lineHeight)-1)*lineHeight;
 track.style.transform=`translateY(${-scrollY}px)`;
 const x=current.offsetLeft+(typed.length===chars.length?current.offsetWidth:0),y=naturalTop-scrollY;
 let from=getComputedStyle(caret).transform;if(from==='none')from=`translate3d(${x}px,${y}px,0)`;
 const newLine=lastCaretLine!==-1&&lastCaretLine!==naturalTop;
 if(newLine){const matrix=new DOMMatrixReadOnly(from);from=`translate3d(${x}px,${matrix.m42}px,0)`;}
 caretAnimation?.cancel();caret.style.left='0px';caret.style.top='0px';
 const to=`translate3d(${x}px,${y}px,0)`;caret.style.transform=to;
 if(lastCaretLine!==-1&&state.smooth)caretAnimation=caret.animate([{transform:from},{transform:to}],{duration:95,easing:'cubic-bezier(.2,.7,.25,1)'});
 lastCaretLine=naturalTop;
 const bounds=viewport.getBoundingClientRect();window.dispatchEvent(new CustomEvent('type:caret',{detail:{x:bounds.left+x,y:bounds.top+y}}));
}
function elapsed(){return started?Math.max(.001,(performance.now()-started)/1000):0;}
function metrics(seconds=elapsed()){
 return {wpm:seconds>0?Math.round(correct/5/(seconds/60)):0,accuracy:attempts?Math.round(hits/attempts*100):100};
}
function tick(){
 if(phase!=='running')return;
 const e=elapsed(), seconds=view==='test'?Math.min(state.duration,e):e, m=metrics(seconds);
 $('live-wpm').textContent=String(m.wpm);$('live-accuracy').textContent=String(m.accuracy);$('live-time').textContent=view==='test'?String(Math.max(0,Math.ceil(state.duration-e))):String(Math.floor(e));
 progress(view==='test'?e/state.duration*100:typed.length/target.length*100);
 if(Math.floor(e)>lastSample){lastSample=Math.floor(e);samples.push({time:seconds,wpm:m.wpm});}
 if(view==='test'&&e>=state.duration)finish();
}
function start(offset=0){phase='running';started=performance.now()-Math.max(0,offset);document.body.classList.add('running');$('status-text').textContent='';window.dispatchEvent(new Event('type:started'));timer=setInterval(tick,100);if(rankedRun)flushTimer=setInterval(()=>void flushRun().catch(()=>markUnranked('Bağlantı doğrulanamadı. Sonuç yerel kaydedilecek.')),900);}
function sound(wrong){
 if(!state.sound)return;
 try{
  audio ||= new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')void audio.resume().catch(()=>{});
  const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
  osc.type='triangle';osc.frequency.setValueAtTime(wrong?150:580+Math.random()*100,t);osc.frequency.exponentialRampToValueAtTime(80,t+.035);
  gain.gain.setValueAtTime(.024,t);gain.gain.exponentialRampToValueAtTime(.001,t+.045);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.05);
 }catch{}
}
function animateKey(index,wrong){
 const span=chars[index];if(!span)return;
 if(state.effect!=='none'&&!state.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  span.classList.remove('just-typed');void span.offsetWidth;span.classList.add('just-typed');
  if(state.effect==='particles'){
   const rect=span.getBoundingClientRect(),bounds=viewport.getBoundingClientRect();
   for(let i=0;i<3;i++){const dot=document.createElement('i');dot.className='effect-particle'+(wrong?' error':'');dot.style.left=(rect.left-bounds.left+rect.width/2)+'px';dot.style.top=(rect.top-bounds.top+10)+'px';dot.style.setProperty('--dx',(Math.random()*36-18)+'px');dot.style.setProperty('--dy',(-10-Math.random()*25)+'px');viewport.append(dot);setTimeout(()=>dot.remove(),600);}
  }
 }
 sound(wrong);
}
async function onInput(event){
 if(event.isComposing)return;
 if(['preparing','starting','countdown'].includes(phase))return;
 if(phase==='done'){input.value=typed;return;}
 if(phase==='running'&&view==='test'&&elapsed()>=state.duration){input.value=typed;finish();return;}
 const next=input.value.replace(/[\r\n]/g,'').normalize('NFC');
 let prefix=0;while(prefix<typed.length&&prefix<next.length&&typed[prefix]===next[prefix])prefix++;
 // The field is append/backspace only; selections are restored to its end.
 if(prefix<typed.length&&next.length>prefix&&prefix!==typed.length){input.value=typed;input.setSelectionRange(typed.length,typed.length);return;}
 if(next.length>target.length&&view==='test'&&!rankedRun)appendText(' '+generateWords(150));
 const value=next.slice(0,target.length);
 if(!value.length&&phase==='ready'){input.value='';return;}
 if(phase==='ready'){
  if(rankedRun&&!rankedRun.failed&&!rankedRun.prestarted){
   const run=rankedRun,ticket=generation;
   // Starting the online clock must never block local input or drop fast keystrokes.
   run.startPromise=online.request('start',{id:run.id}).then(()=>{
    run.finishAfter=performance.now()+state.duration*1000;return true;
   }).catch(error=>{if(ticket===generation)markUnranked(error.message+' Yerel test açık.');run.failed=true;return false;});
  }
  start();
 }
 const oldLength=typed.length;
 for(let i=prefix;i<oldLength;i++){
  logKey('b');
  if(typed[i]===target[i])correct--;
  chars[i].classList.remove('correct','wrong','just-typed');
 }
 for(let i=prefix;i<value.length;i++){
  const expected=target[i],isCorrect=value[i]===expected;
  logKey('i',value[i]);attempts++;if(isCorrect){hits++;correct++;}
  const key=expected.toLocaleLowerCase(locale());
  if(key!==' '){const entry=sessionKeys[key]||{total:0,errors:0};entry.total++;if(!isCorrect)entry.errors++;sessionKeys[key]=entry;}
  chars[i].classList.add(isCorrect?'correct':'wrong');
 }
 typed=value;input.value=value;input.setSelectionRange(value.length,value.length);
 if(rankedRun&&chars.length-value.length<300)renderNextChunk();
 if(value.length>oldLength){animateKey(value.length-1,value.at(-1)!==target[value.length-1]);if(value.at(-1)===' '){const span=chars[value.length-1];span.classList.remove('just-space');void span.offsetWidth;span.classList.add('just-space');}}
 if(view==='test'&&!rankedRun&&target.length-typed.length<300)appendText(' '+generateWords(100));
 moveCaret();tick();
 if(view==='training'&&typed.length===target.length)finish();
}
async function finish(){
 if(phase!=='running')return;
 const isTraining=view==='training', seconds=isTraining?elapsed():state.duration;
 const finishedRun=rankedRun,ticket=generation;clearInterval(flushTimer);flushTimer=null;$('result-retry').disabled=!!finishedRun?.duel;
 phase='done';clearInterval(timer);timer=null;input.disabled=true;document.body.classList.remove('running');
 const m=metrics(seconds), errors=attempts-hits;
 if(!finishedRun?.assisted)mergeSession();else sessionKeys={};
 const previous=records.filter(r=>r.duration===state.duration&&r.language===state.language&&r.difficulty===state.difficulty).sort(sortRecords);
 let position=null;
 if(!isTraining&&!finishedRun?.duel){
  const record={id:window.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2),name:state.name,wpm:m.wpm,accuracy:m.accuracy,duration:state.duration,language:state.language,difficulty:state.difficulty,date:new Date().toISOString(),characters:typed.length,errors};
  records.push(record);records=records.slice(-200);
  position=records.filter(r=>r.duration===state.duration&&r.language===state.language&&r.difficulty===state.difficulty).sort(sortRecords).findIndex(r=>r.id===record.id)+1;
 }
 persist();lastResult={...m,seconds,errors,isTraining,position};
 $('result-label').textContent=isTraining?'antrenman tamamlandı':position===1?'yeni zirven burada':'test tamamlandı';
 $('result-wpm').textContent=String(m.wpm);$('result-accuracy').textContent=m.accuracy+'%';$('result-time').textContent=(isTraining?seconds.toFixed(1):seconds)+'s';$('result-errors').textContent=String(errors);
 $('status-text').textContent='tamamlandı';progress(100);
 $('live-wpm').textContent=String(m.wpm);$('live-accuracy').textContent=String(m.accuracy);$('live-time').textContent=isTraining?String(Math.floor(seconds)):'0';
 let message;
 if(isTraining)message='Bir adım daha attın. '+(m.accuracy===100?'Kusursuz doğruluk, tertemiz bir tur.':'Önce doğruluk; hız çalıştıkça gelir.');
 else if(position!==null&&position<=3){const badges=['altın','gümüş','bronz'];message=`<strong>${position}. sıra · ${badges[position-1]} rozet!</strong> `+(previous.length&&m.wpm>previous[0].wpm?`Önceki en iyi hızını ${m.wpm-previous[0].wpm} wpm geçtin.`:'Bu ayarlardaki kişisel podyumunda yerini aldın.');}
 else message=m.accuracy>=95?'Güzel bir akış. Aynı ritmi koru, bir sonraki zirve yakın.':'Biraz yavaşla, doğru tuşlara odaklan. Zayıf tuşlar antrenmanı bunun için burada.';
 if(!storageAvailable)message+=' Kalıcı kayıt kapalı; yedeğini indirmeyi unutma.';
 $('result-message').innerHTML=message;
 drawChart(seconds,m.wpm);updateSummary();$('result-dialog').showModal();window.dispatchEvent(new Event('type:finished'));
 if(finishedRun&&!finishedRun.failed&&!isTraining){
  $('result-message').textContent='Sonuç doğrulanıyor…';
  try{
   await flushRun(finishedRun);if(finishedRun.failed)throw Error('Vuruş kaydı doğrulanamadı.');
   if(finishedRun.finishAfter>performance.now())await new Promise(resolve=>setTimeout(resolve,finishedRun.finishAfter-performance.now()+40));
   const result=await online.request('finish',{id:finishedRun.id});if(ticket!==generation)return;
   $('result-wpm').textContent=String(result.score.wpm);$('result-accuracy').textContent=result.score.accuracy+'%';
   $('result-message').innerHTML=finishedRun.duel?'<strong>Doğrulandı.</strong> Rakibin sonucu bekleniyor.':'<strong>Doğrulandı.</strong> Sonucun dünya sıralamasına kaydedildi.';
   if(finishedRun.duel)window.dispatchEvent(new CustomEvent('type:duel-submitted',{detail:{code:finishedRun.duel}}));
   const local=records.at(-1);if(local&&!finishedRun.duel){local.verified=true;persist();}
  }catch(error){if(ticket!==generation)return;$('result-message').textContent=error.message+' Sonuç yalnızca yerel kaydedildi.';}
 }else if(state.ranked&&!isTraining)$('result-message').textContent='Yerel sonuç. Bu test dünya sıralamasına eklenmedi.';
}
function drawChart(seconds,wpm){
 const data=[{time:0,wpm:0},...samples.filter(s=>s.time<seconds),{time:seconds,wpm}];
 const max=Math.max(20,...data.map(s=>s.wpm))*1.1;
 const points=data.map(s=>`${(s.time/seconds*440).toFixed(1)},${(78-s.wpm/max*65).toFixed(1)}`);
 const path='M'+points.join(' L');
 $('result-chart').innerHTML='<line x1="0" y1="78" x2="440" y2="78"/><line x1="0" y1="40" x2="440" y2="40"/>'+`<path class="area" d="${path} L440,78 L0,78 Z"/><path d="${path}"/>`;
}
function sortRecords(a,b){return b.wpm-a.wpm||b.accuracy-a.accuracy||new Date(a.date)-new Date(b.date);}
function dayKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function streak(){
 const days=new Set(records.map(r=>dayKey(new Date(r.date)))),date=new Date();let count=0;
 if(!days.has(dayKey(date)))date.setDate(date.getDate()-1);
 while(days.has(dayKey(date))){count++;date.setDate(date.getDate()-1);}return count;
}
function updateSummary(){
 $('total-tests').textContent=String(records.length);
 $('average-wpm').textContent=records.length?String(Math.round(records.reduce((a,r)=>a+r.wpm,0)/records.length)):'—';
 $('streak-count').textContent=String(streak());
}

function refreshDurationFilter(){
 const selected=$('rank-duration').value;
 const durations=[...new Set([15,30,60,120,state.duration,...records.map(r=>r.duration)])].sort((a,b)=>a-b);
 $('rank-duration').replaceChildren(...durations.map(d=>new Option(d+' saniye',String(d))));
 $('rank-duration').value=durations.includes(Number(selected))?selected:String(state.duration);
}
async function renderRanking(){
 const ticket=++rankingGeneration;updateSummary();
 const global=$('rank-scope').value==='global',duration=Number($('rank-duration').value),language=$('rank-language').value,difficulty=$('rank-difficulty').value;
 let runs=[];$('ranking-status').textContent=global?'yükleniyor…':'';
 $('rank-explanation').textContent=global?'Her oyuncunun en iyi doğrulanmış sonucu.':'Son 200 yerel test. Antrenmanlar dahil değil.';
 if(global){
  if(![15,30,60,120].includes(duration)){$('ranking-status').textContent='Bu süre yalnızca yerel.';}
  else try{const result=await online.request('leaderboard',{duration,language,difficulty},false);if(ticket!==rankingGeneration)return;runs=result.entries.map(r=>({...r,name:r.display_name,date:r.created_at}));$('ranking-status').textContent='';}catch(error){if(ticket!==rankingGeneration)return;$('ranking-status').textContent=error.message;}
 }else runs=records.filter(r=>r.duration===duration&&r.language===language&&r.difficulty===difficulty).sort(sortRecords);
 if(ticket!==rankingGeneration)return;
 const avatar=r=>r&&global&&online.avatarURL(r)?'<img class="rank-avatar" src="'+escapeHTML(online.avatarURL(r))+'" alt="" loading="lazy">':'';
 const labels=['Altın','Gümüş','Bronz'],colors=['gold','','bronze'];
 $('podium').innerHTML=[0,1,2].map(i=>{const r=runs[i];return `<div class="podium-card ${i===0?'first':''}"><span class="medal ${colors[i]}" aria-label="${labels[i]} rozet"><svg><use href="#i-medal"/></svg><b>${i+1}</b></span><h3>${r?r.wpm:'—'} <small>wpm</small></h3>${avatar(r)}<p>${r&&global?'<button class="profile-link" data-profile="'+escapeHTML(r.account_tag)+'">'+escapeHTML(r.name)+'<small>#'+escapeHTML(r.account_tag)+'</small></button>':r?'<span data-player-name>'+escapeHTML(r.name)+'</span>':labels[i]}<br>${r?r.accuracy+'% doğruluk':'—'}</p></div>`;}).join('');
 $('rank-rows').innerHTML=runs.slice(0,global?100:20).map((r,i)=>`<tr><td>${i<3?'<span class="accent">'+(i+1)+'</span>':i+1}</td><td><span class="rank-profile">${avatar(r)}${global?'<button class="profile-link" data-profile="'+escapeHTML(r.account_tag)+'">'+escapeHTML(r.name)+'<small>#'+escapeHTML(r.account_tag)+'</small></button>':'<span data-player-name>'+escapeHTML(r.name)+'</span>'}</span></td><td>${r.wpm}</td><td>${r.accuracy}%</td><td>${new Date(r.date).toLocaleString(window.TypeI18n?.locale||'tr-TR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td></tr>`).join('');
 $('rank-empty').hidden=runs.length>0;
}

function updateTraining(){
 const weak=weakKeys();
 $('custom-editor').hidden=state.training!=='custom';
 $$('.training-card').forEach(b=>{const active=b.dataset.training===state.training;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('training-note').innerHTML=state.training==='custom'?'Kendi metnini uygula, ardından aşağıdaki alana yazmaya başla.':state.training==='words'?'20 kelime. Kronometre bilgi için çalışır; süre sınırı yok.':weak.length?'Bu turda odaklandığın tuşlar: <span class="key">'+weak.map(escapeHTML).join(' · ')+'</span>':'Önce birkaç test yap. Hataların biriktikçe bu alan sana özel şekillenir.';
}
function switchView(next,focus=false){
 generation++;if(rankedRun)rankedRun.cancelled=true;clearInterval(flushTimer);flushTimer=null;clearInterval(countdownTimer);countdownTimer=null;
 if(!['test','training','ranking','duel'].includes(next))next='test';
 const hadActivity=attempts>0;mergeSession();if(hadActivity)persist();clearInterval(timer);timer=null;phase='ready';attempts=0;document.body.classList.remove('running');
 view=next;
 $('typing-page').hidden=view==='ranking'||view==='duel';$('ranking-page').hidden=view!=='ranking';$('duel-page').hidden=view!=='duel';$('test-controls').hidden=false;$('training-tools').hidden=view!=='training';
 $$('.nav-button').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 if(view==='ranking'){
  refreshDurationFilter();$('rank-duration').value=String(state.duration);$('rank-language').value=state.language;$('rank-difficulty').value=state.difficulty;renderRanking();
 }else if(view!=='duel'){
  reset(focus);
 }
 if(!location.hash.startsWith('#room=')&&!location.hash.startsWith('#profile=')&&location.hash!=='#'+view)history.replaceState(null,'','#'+view);
 window.dispatchEvent(new CustomEvent('type:view',{detail:view}));
}
function applyTheme(){
 document.documentElement.dataset.theme=state.theme;
 $$('.theme-choice').forEach(button=>{const active=button.dataset.theme===state.theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
function applySettings(){
 applyTheme();document.body.dataset.effect=state.effect;document.body.classList.toggle('smooth-caret',state.smooth);$('smooth-toggle').checked=state.smooth;document.body.classList.remove('zen');document.body.classList.toggle('reduce-motion',state.motion);
 $('profile-name').value=state.name;if(!online?.signedIn){$('avatar').textContent=state.name[0].toLocaleUpperCase('tr-TR');$('avatar').setAttribute('aria-label',state.name+' · '+(window.TypeI18n?.t('yerel profil')||'yerel profil'));}
 $('effect-select').value=state.effect;$('sound-toggle').checked=state.sound;$('motion-toggle').checked=state.motion;$('ranked-toggle').checked=state.ranked;
 $('language').value=state.language;$('custom-text').value=state.custom;
 $$('#difficulty-options button').forEach(b=>{const a=b.dataset.difficulty===state.difficulty;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
 const standard=[15,30,60,120].includes(state.duration);
 $$('#time-options button').forEach(b=>{const a=standard?Number(b.dataset.time)===state.duration:b.dataset.time==='custom';b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
 $('custom-time').hidden=standard;if(!standard)$('custom-time').value=String(state.duration);
}
function closeDialogs(){for(const d of $$('dialog[open]'))d.close();}
function prepareReset(){closeDialogs();reset(true);}
input.addEventListener('input',onInput);
input.addEventListener('compositionend',()=>onInput({isComposing:false}));
input.addEventListener('beforeinput',event=>{
 if(rankedRun?.duel&&rankedRun.assisted&&phase==='running'&&event.inputType==='insertText'&&!event.isComposing){event.preventDefault();if(typed.length<target.length){input.value=typed+target[typed.length];void onInput({isComposing:false});}return;}
 if(['insertFromPaste','insertFromDrop','insertLineBreak','insertParagraph'].includes(event.inputType))event.preventDefault();});
input.addEventListener('paste',event=>{event.preventDefault();toast('Burada iş parmaklarında. Yapıştırma testte kapalı.');});
input.addEventListener('drop',event=>event.preventDefault());
input.addEventListener('focus',()=>{viewport.classList.remove('unfocused');if(phase==='running')document.body.classList.add('running');requestAnimationFrame(moveCaret);});
input.addEventListener('blur',()=>{if(phase!=='done')viewport.classList.add('unfocused');});
input.addEventListener('pointerup',()=>input.setSelectionRange(input.value.length,input.value.length));
input.addEventListener('keydown',event=>{
 if(event.isComposing||event.keyCode===229)return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter'].includes(event.key))event.preventDefault();
 if(event.key==='Escape'){document.body.classList.remove('running');input.blur();event.preventDefault();}
 if(event.key==='Tab'){event.preventDefault();tabRestart=true;$('restart').focus({preventScroll:true});}
});
document.addEventListener('keydown',event=>{
 if(event.isComposing||event.keyCode===229)return;
 if(event.key==='Enter'&&tabRestart&&document.activeElement===$('restart')){event.preventDefault();tabRestart=false;prepareReset();}
 else if(event.key!=='Tab')tabRestart=false;
});
$('restart').addEventListener('click',prepareReset);
for(const button of $$('.nav-button'))button.addEventListener('click',()=>switchView(button.dataset.view));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('test');});
window.addEventListener('hashchange',()=>switchView(location.hash.startsWith('#room=')?'duel':location.hash.slice(1)));
$('time-options').addEventListener('click',event=>{
 const button=event.target.closest('[data-time]');if(!button)return;
 state.duration=button.dataset.time==='custom'?Math.max(10,Math.min(600,Number($('custom-time').value)||45)):Number(button.dataset.time);
 persist();applySettings();reset();
 if(button.dataset.time==='custom'){$('custom-time').hidden=false;$('custom-time').focus();}
});
$('custom-time').addEventListener('change',()=>{state.duration=Math.max(10,Math.min(600,Math.round(Number($('custom-time').value))||45));persist();applySettings();reset();});
$('difficulty-options').addEventListener('click',event=>{const button=event.target.closest('[data-difficulty]');if(button){state.difficulty=button.dataset.difficulty;persist();applySettings();reset();}});
$('language').addEventListener('change',()=>{state.language=$('language').value;persist();reset();});
$('theme-choices').addEventListener('click',event=>{const button=event.target.closest('[data-theme]');if(button){state.theme=button.dataset.theme;applyTheme();persist();}});
for(const button of $$('.training-card'))button.addEventListener('click',()=>{state.training=button.dataset.training;persist();reset();});
$('apply-custom').addEventListener('click',()=>{
 const text=$('custom-text').value.replace(/\s+/g,' ').normalize('NFC').trim();
 if(text.length<10||text.length>2000){toast('Metnin 10–2000 karakter arasında olsun.');return;}
 // Prevent a single unbreakable string from overflowing the practice area.
 if(text.split(' ').some(word=>word.length>40)){toast('Tek bir kelime en fazla 40 karakter olabilir.');return;}
 state.custom=text;persist();reset(true);toast('Metnin hazır. İlk harfle başlayabilirsin.');
});

$('rank-start').addEventListener('click',()=>switchView('test',true));
for(const id of ['rank-duration','rank-language','rank-difficulty','rank-scope'])$(id).addEventListener('change',renderRanking);
function closeDialog(dialog){
 if(!dialog.open)return;dialog.classList.add('closing');
 setTimeout(()=>{dialog.classList.remove('closing');dialog.close();},170);
}
$('open-settings').addEventListener('click',()=>{$('settings-dialog').showModal();$('open-settings').setAttribute('aria-expanded','true');});
$('settings-dialog').addEventListener('close',()=>{$('open-settings').setAttribute('aria-expanded','false');if(phase==='ready'&&view!=='ranking')void reset();});
$('open-about').addEventListener('click',()=>$('about-dialog').showModal());
for(const button of $$('[data-close]'))button.addEventListener('click',()=>closeDialog(button.closest('dialog')));
for(const dialog of $$('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);}});
$('profile-name').addEventListener('change',()=>{state.name=$('profile-name').value.trim().slice(0,20)||'Sen';persist();applySettings();});
$('effect-select').addEventListener('change',()=>{state.effect=$('effect-select').value;persist();applySettings();});
for(const [id,key] of [['sound-toggle','sound'],['motion-toggle','motion'],['smooth-toggle','smooth']])$(id).addEventListener('change',()=>{state[key]=$(id).checked;persist();applySettings();});
$('result-retry').addEventListener('click',prepareReset);
$('result-train').addEventListener('click',()=>{closeDialogs();state.training='weak';persist();switchView('training',true);});
$('export-scores').addEventListener('click',()=>{
 const content=JSON.stringify({version:1,exportedAt:new Date().toISOString(),settings:state,records,keyStats},null,2);
 const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='zenith-type-'+dayKey(new Date())+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Rekorların ve ayarların indirildi.');
});
window.addEventListener('resize',()=>requestAnimationFrame(moveCaret));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='running'&&rankedRun)markUnranked('Sekme değişti. Sonuç yerel kaydedilecek.');if(!document.hidden){tick();requestAnimationFrame(moveCaret);}});
window.addEventListener('pagehide',()=>{mergeSession();persist();});
async function loadDuel(data){
 state.duration=data.duration;state.language=data.language;state.difficulty=data.difficulty;
 const previousRanked=state.ranked;state.ranked=false;await reset();state.ranked=previousRanked;
 view='test';$('typing-page').hidden=false;$('ranking-page').hidden=true;$('duel-page').hidden=true;$('training-tools').hidden=true;
 generation++;clearInterval(countdownTimer);$('duel-live').hidden=false;
 target=data.target;chars=[];track.replaceChildren();renderNextChunk();$('accessible-prompt').textContent=target;
 rankedRun={id:data.myChallenge,events:[],sent:0,failed:false,cancelled:false,flushing:null,prestarted:true,duel:data.code,assisted:data.assisted===true};
 $('session-mode').textContent='düello';$('online-dot').hidden=false;phase='countdown';input.disabled=true;
 const countdown=$('duel-countdown');countdown.hidden=false;
 const update=()=>{
  const remaining=new Date(data.startsAt).getTime()-(Date.now()+data.clockOffset);
  countdown.textContent=remaining>0?String(Math.ceil(remaining/1000)):'';
  if(remaining<=0){clearInterval(countdownTimer);countdownTimer=null;countdown.hidden=true;input.disabled=false;input.focus({preventScroll:true});start(-remaining);moveCaret();}
 };
 update();if(phase==='countdown')countdownTimer=setInterval(update,50);
 requestAnimationFrame(moveCaret);
}
window.TypeTest={loadDuel,showView:switchView,reset:prepareReset,get running(){return phase==='running';}};
window.addEventListener('type:toast',event=>toast(event.detail));
window.addEventListener('type:auth',()=>{applySettings();if(phase==='ready'&&view==='test')void reset();});
$('ranked-toggle').addEventListener('change',()=>{
 if($('ranked-toggle').checked&&!online.signedIn){$('ranked-toggle').checked=false;closeDialogs();online.openLogin();return;}
 state.ranked=$('ranked-toggle').checked;persist();void reset();
});
applySettings();switchView(location.hash.startsWith('#room=')?'duel':location.hash.slice(1)||'test');
if(!storageAvailable){$('storage-note').textContent='Tarayıcı kalıcı depolamayı kullanamadı. Bu oturumda çalışabilirsin; rekorlarını dışa aktarabilirsin.';toast('Kalıcı kayıt şu an kullanılamıyor. Veriler bu oturumda tutulacak.');}
})();
