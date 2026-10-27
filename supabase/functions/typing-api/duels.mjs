import { randomWords, replay } from './core.mjs';
import { wordLists } from './words.mjs';
export async function handleDuels(action,req,body,user,ctx){
 const {admin,check,fail,rate}=ctx;
 const code=String(body.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const newCode=()=>[...crypto.getRandomValues(new Uint8Array(5))].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
 const settings=()=>{if(![30,60].includes(body.duration)||!['tr','en'].includes(body.language)||!['easy','normal','hard'].includes(body.difficulty))fail(400,'Düello ayarları geçersiz.');return {duration:body.duration,language:body.language,difficulty:body.difficulty};};
 const getRoom=async()=>{
  if(!/^[A-Z0-9]{10}$/.test(code))fail(400,'Oda kodu geçersiz.');
  const row=check(await admin.from('typing_duels').select('*').eq('room_code',code).maybeSingle());
  if(!row)fail(404,'Oda bulunamadı.');return row;
 };
 const isMember=room=>room.host_id===user.id||room.guest_id===user.id;
 const roomView=async room=>{
  const ids=[room.host_id,room.guest_id].filter(Boolean);
  const profiles=check(await admin.from('typing_profiles').select('user_id,username,display_name,account_tag,avatar_path,avatar_version').in('user_id',ids));
  const tests=[room.host_challenge,room.guest_challenge].filter(Boolean);
  const challenges=tests.length?check(await admin.from('typing_challenges').select('id,target,events,started_at,duration,finished').in('id',tests)):[];
  const finishedScores=tests.length?check(await admin.from('typing_scores').select('challenge_id,wpm,accuracy,characters').in('challenge_id',tests)):[];
  const live=id=>{
   const test=challenges.find(c=>c.id===id);if(!test)return {wpm:0,characters:0,accuracy:100};
   const score=(id===room.host_challenge?room.host_result:room.guest_result)||finishedScores.find(s=>s.challenge_id===id);if(score)return {wpm:score.wpm,accuracy:score.accuracy,characters:score.characters||0};
   let value='',hits=0,attempts=0,correct=0;
   for(const event of test.events){if(event.k==='b')value=value.slice(0,-1);else{if(event.c===test.target[value.length])hits++;attempts++;value+=event.c;}}
   for(let i=0;i<value.length;i++)if(value[i]===test.target[i])correct++;
   const elapsed=Math.max(1,Math.min(test.duration,(Date.now()-new Date(test.started_at).getTime())/1000));
   return {wpm:Math.round(correct/5/(elapsed/60)),characters:value.length,accuracy:attempts?Math.round(hits/attempts*100):100};
  };
  const mine=user.id===room.host_id?room.host_challenge:room.guest_challenge;
  const resultView=result=>result?{wpm:result.wpm,accuracy:result.accuracy,characters:result.characters||0,...(result.forfeit?{forfeit:true}:{})}:null;
  const canAssist=!room.rated&&room.status==='waiting'&&check(await admin.rpc('typing_is_admin',{p_user:user.id}));
  const hostPoints=room.status==='finished'?(room.winner_id===room.host_id?1:room.winner_id?0:0.5):0;
  const guestPoints=room.status==='finished'?(room.winner_id===room.guest_id?1:room.winner_id?0:0.5):0;
  return {hostPoints,guestPoints,canAssist,assisted:room.assist_user_id===user.id,code:room.room_code,status:room.status,rated:room.rated,duration:room.duration,language:room.language,difficulty:room.difficulty,host:profiles.find(p=>p.user_id===room.host_id),guest:profiles.find(p=>p.user_id===room.guest_id)||null,hostReady:room.host_ready,guestReady:room.guest_ready,startsAt:room.starts_at,serverNow:Date.now(),myChallenge:mine,target:room.status==='racing'?room.target:null,winnerId:room.winner_id,hostResult:resultView(room.host_result),guestResult:resultView(room.guest_result),hostDelta:room.host_delta,guestDelta:room.guest_delta,hostLive:live(room.host_challenge),guestLive:live(room.guest_challenge)};
 };
 if(action==='rating'){
  await rate(req,'rating',60,60,user.id);
  check(await admin.from('typing_ratings').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true}));
  return {rating:check(await admin.from('typing_ratings').select('mmr,wins,losses,draws').eq('user_id',user.id).single())};
 }
 if(action==='matchmake'){
  const opts=settings();await rate(req,'matchmake',90,60,user.id);
  return check(await admin.rpc('typing_matchmake',{p_user:user.id,p_duration:opts.duration,p_language:opts.language,p_difficulty:opts.difficulty,p_target:randomWords(wordLists,opts.language,opts.difficulty),p_code:newCode()}));
 }
 if(action==='queue-cancel'){check(await admin.from('typing_queue').delete().eq('user_id',user.id));return {ok:true};}
 if(action==='room-create'){
  const opts=settings();await rate(req,'room-create',5,60,user.id);
  const existing=check(await admin.from('typing_duels').select('room_code').or('host_id.eq.'+user.id+',guest_id.eq.'+user.id).in('status',['waiting','racing']).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle());
  if(existing)return {code:existing.room_code};
  check(await admin.from('typing_queue').delete().eq('user_id',user.id));
  const row=check(await admin.from('typing_duels').insert({room_code:newCode(),host_id:user.id,...opts,target:randomWords(wordLists,opts.language,opts.difficulty),rated:false}).select('room_code').single());
  return {code:row.room_code};
 }
 if(action==='room-join'){
  await rate(req,'room-join',15,60,user.id);const room=await getRoom();
  if(isMember(room))return roomView(room);
  if(room.status!=='waiting'||room.guest_id||Date.now()>new Date(room.expires_at).getTime())fail(409,'Oda dolu veya kapanmış.');
  const active=check(await admin.from('typing_duels').select('id').or('host_id.eq.'+user.id+',guest_id.eq.'+user.id).in('status',['waiting','racing']).gt('expires_at',new Date().toISOString()).limit(1).maybeSingle());
  if(active)fail(409,'Önce açık olan odandan ayrıl.');
  const joined=check(await admin.from('typing_duels').update({guest_id:user.id}).eq('id',room.id).is('guest_id',null).eq('status','waiting').select('*').maybeSingle());
  if(!joined)fail(409,'Oda doldu.');check(await admin.from('typing_queue').delete().eq('user_id',user.id));return roomView(joined);
 }
 if(action==='room-state'){
  await rate(req,'room-state',180,60,user.id);let room=await getRoom();if(!isMember(room))fail(403,'Bu odaya önce katılmalısın.');
  if(room.status==='racing'&&Date.now()>=new Date(room.starts_at).getTime()+room.duration*1000)room=check(await admin.rpc('typing_settle_duel',{p_code:code,p_user:user.id}));
  if(room.status==='waiting'&&Date.now()>new Date(room.expires_at).getTime()){check(await admin.from('typing_duels').update({status:'cancelled',target:''}).eq('id',room.id));room.status='cancelled';}
  return roomView(room);
 }
 if(action==='room-assist'){
  await rate(req,'room-assist',15,60,user.id);
  if(!check(await admin.rpc('typing_is_admin',{p_user:user.id})))fail(403,'Bu ayar sana açık değil.');
  const room=await getRoom();if(!isMember(room)||room.rated||room.status!=='waiting')fail(403,'Yalnızca bekleyen özel odada kullanılabilir.');
  return roomView(check(await admin.rpc('typing_room_assist',{p_code:code,p_user:user.id,p_enabled:body.enabled===true})));
 }
 if(action==='room-ready'){
  await rate(req,'room-ready',15,60,user.id);const room=await getRoom();if(!isMember(room))fail(403,'Bu odaya katılmalısın.');
  if(room.status!=='waiting')return roomView(room);
  const updated=check(await admin.rpc('typing_room_ready',{p_code:code,p_user:user.id,p_ready:body.ready===true}));return roomView(updated);
 }
 if(action==='room-leave'){
  const room=await getRoom();if(!isMember(room))fail(403,'Bu oda sana ait değil.');
  if(room.status==='waiting'){
   if(room.host_id===user.id||room.rated)check(await admin.from('typing_duels').update({status:'cancelled',target:''}).eq('id',room.id).eq('status','waiting'));
   else check(await admin.from('typing_duels').update({guest_id:null,guest_ready:false,host_ready:false,assist_user_id:room.assist_user_id===user.id?null:room.assist_user_id}).eq('id',room.id).eq('status','waiting').eq('guest_id',user.id));
  }
  // A running match remains open until its server deadline; leaving cannot erase a loss.
  return {ok:true};
 }
 fail(404,'Düello işlemi bulunamadı.');
}
