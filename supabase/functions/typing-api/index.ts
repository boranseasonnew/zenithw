import { createClient } from 'npm:@supabase/supabase-js@2.102.0';
import { username, password, options, randomWords, validateBatch, replay, readBoundedBody, rateLimitAddress } from './core.mjs';
import { wordLists } from './words.mjs';
import { handleDuels } from './duels.mjs';
const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const authClient = () => createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
const fail = (status:number,message:string):never => { throw new HttpError(status,message); };
const json = (value:unknown,status=200) => new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const hex = (bytes:Uint8Array) => [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const randomCode = () => hex(crypto.getRandomValues(new Uint8Array(24))).toUpperCase().match(/.{1,6}/g)!.join('-');
const digest = async (value:string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
function check<T>(result:{data:T,error:unknown}):T { if(result.error)throw new Error('database operation failed'); return result.data; }
async function rate(req:Request,action:string,limit:number,period=60,identity=''){
 const ip = rateLimitAddress(req.headers);
 // Retain only a keyed digest, never raw IPs. Both account and IP limits apply.
 const identities = identity ? [ip,identity] : [ip];
 for(const item of identities){
  const key = await digest(secret+':typing:'+action+':'+item);
  const count = check(await admin.rpc('typing_rate_hit',{p_key:key,p_window:Math.floor(Date.now()/1000/period)*period}));
  if(Number(count)>limit)fail(429,'Çok fazla deneme. Biraz bekle.');
 }
}
async function requireUser(req:Request){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)fail(401,'Giriş yapmalısın.');
 const {data,error}=await admin.auth.getUser(token!);
 if(error||!data.user)fail(401,'Oturumun sona erdi. Tekrar giriş yap.');
 let claims:Record<string,unknown>;
 try{claims=JSON.parse(atob(token!.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{fail(401,'Geçersiz oturum.');}
 if(typeof claims!.session_id!=='string')fail(401,'Geçersiz oturum.');
 const active=check(await admin.rpc('typing_session_active',{p_session:claims!.session_id,p_user:data.user!.id}));
 if(!active)fail(401,'Oturumun sona erdi.');
 const account=check(await admin.from('typing_accounts').select('user_id,username,auth_email').eq('user_id',data.user!.id).maybeSingle());
 if(!account)fail(403,'Bu uygulama için kayıt oluşturmalısın.');
 return {user:data.user!,account,token:token!};
}
const publicFields='user_id,username,display_name,account_tag,avatar_path,avatar_version,created_at,is_verified,is_developer';
async function profile(id:string){const data=check(await admin.from('typing_profiles').select(publicFields).eq('user_id',id).single());return {...data,is_admin:check(await admin.rpc('typing_is_admin',{p_user:id}))};}
async function loginAccount(value:unknown){
 const name=String(value||'').trim().replace(/^#/,'');
 if(/^[A-Fa-f0-9]{12}$/.test(name)){
  const p=check(await admin.from('typing_profiles').select('user_id').eq('account_tag',name.toUpperCase()).maybeSingle());
  return p?check(await admin.from('typing_accounts').select('auth_email,user_id').eq('user_id',p.user_id).maybeSingle()):null;
 }
 // Preserve existing accounts' unique login names. New duplicate nicknames use their account tag.
 if(!/^[A-Za-z0-9_]{3,20}$/.test(name))return null;
 return check(await admin.from('typing_accounts').select('auth_email,user_id').eq('username',name.toLowerCase()).maybeSingle());
}
async function signIn(email:string,pass:string){
 const {data,error}=await authClient().auth.signInWithPassword({email,password:pass});
 if(error||!data.session)fail(401,'Kullanıcı adı veya şifre yanlış.');
 return data.session;
}
function cleanDisplay(value:unknown){const v=String(value||'').normalize('NFC').replace(/[\x00-\x1f\x7f]/g,'').trim();if(!v||v.length>24)fail(400,'Görünen ad 1–24 karakter olmalı.');return v;}
async function getChallenge(id:string,user:string){
 if(!/^[0-9a-f-]{36}$/.test(id))fail(400,'Geçersiz test.');
 const row=check(await admin.from('typing_challenges').select('*').eq('id',id).eq('user_id',user).maybeSingle());
 if(!row)fail(404,'Test bulunamadı.');
 return row;
}
async function handler(req:Request){
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Yalnızca POST desteklenir.'},405);
 try{
  const action=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  const length=Number(req.headers.get('content-length')||0);if(length>1500000)fail(413,'Dosya çok büyük.');
  if(action==='avatar'){
   const {user}=await requireUser(req);await rate(req,'avatar',8,60,user.id);
   if(!req.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data'))fail(400,'Geçersiz dosya isteği.');
   const bytesBody=await readBoundedBody(req,1100000);
   const boundedRequest=new Request(req.url,{method:'POST',headers:req.headers,body:bytesBody});
   const form=await boundedRequest.formData(), file=form.get('file');
   if(!(file instanceof File)||file.size>1048576||file.size<12)fail(400,'En fazla 1 MB PNG, JPG veya WebP yükle.');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
   const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
   if(!png&&!jpg&&!webp)fail(400,'PNG, JPG veya WebP görseli seç.');
   const ext=png?'png':jpg?'jpg':'webp',mime=png?'image/png':jpg?'image/jpeg':'image/webp';
   const path=user.id+'/'+crypto.randomUUID()+'.'+ext, previous=await profile(user.id);
   check(await admin.storage.from('typing-avatars').upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'3600'}));
   const updated=await admin.from('typing_profiles').update({avatar_path:path,avatar_version:Date.now()}).eq('user_id',user.id);
   if(updated.error){await admin.storage.from('typing-avatars').remove([path]);throw new Error('avatar update failed');}
   if(previous.avatar_path)await admin.storage.from('typing-avatars').remove([previous.avatar_path]);
   return json({profile:await profile(user.id)});
  }
  // Limit JSON even when the caller omits Content-Length.
  const raw=new TextDecoder().decode(await readBoundedBody(req,200000));
  let body:Record<string,any>;try{body=JSON.parse(raw||'{}');}catch{fail(400,'Geçersiz istek.');}
  if(!body!||typeof body!=='object'||Array.isArray(body))fail(400,'Geçersiz istek.');
  if(action==='register'){
   const nickname=cleanDisplay(body.username),name='u_'+crypto.randomUUID().replace(/-/g,'').slice(0,16),pass=password(body.password);await rate(req,'register',5,3600);
   const email=crypto.randomUUID()+'@accounts.zenith-type.invalid',code=randomCode();
   const {data,error}=await admin.auth.admin.createUser({email,password:pass,email_confirm:true});
   if(error||!data.user)fail(400,'Hesap oluşturulamadı. Daha sonra tekrar dene.');
   try{
    check(await admin.from('typing_accounts').insert({user_id:data.user.id,username:name,auth_email:email,recovery_hash:await digest(code.replace(/-/g,''))}));
    check(await admin.from('typing_profiles').insert({user_id:data.user.id,username:nickname,display_name:nickname}));
   }catch{await admin.auth.admin.deleteUser(data.user.id);fail(409,'Hesap oluşturulamadı. Kullanıcı adı alınmış olabilir.');}
   return json({session:await signIn(email,pass),profile:await profile(data.user.id),recoveryCode:code});
  }
  if(action==='login'){
   const name=String(body.username||'').trim().slice(0,64);if(typeof body.password!=='string')fail(400,'Şifreni yaz.');await rate(req,'login',12,60,name.toLowerCase());
   const account=await loginAccount(name);
   if(!account)fail(401,'Kullanıcı adı veya şifre yanlış.');
   return json({session:await signIn(account.auth_email,body.password),profile:await profile(account.user_id)});
  }
  if(action==='recover'){
   const name=String(body.username||'').trim().slice(0,64),pass=password(body.password);await rate(req,'recover',5,3600,name.toLowerCase());
   const code=String(body.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
   if(!/^[A-F0-9]{48}$/.test(code))fail(400,'Kurtarma bilgileri geçersiz.');
   const oldHash=await digest(code),nextCode=randomCode(),nextHash=await digest(nextCode.replace(/-/g,''));
   const found=await loginAccount(name);if(!found)fail(400,'Kurtarma bilgileri geçersiz.');
   const account=check(await admin.from('typing_accounts').update({recovery_hash:nextHash}).eq('user_id',found.user_id).eq('recovery_hash',oldHash).select('user_id,auth_email').maybeSingle());
   if(!account)fail(400,'Kurtarma bilgileri geçersiz.');
   const changed=await admin.auth.admin.updateUserById(account.user_id,{password:pass});
   if(changed.error){await admin.from('typing_accounts').update({recovery_hash:oldHash}).eq('user_id',account.user_id).eq('recovery_hash',nextHash);fail(400,'Şifre güncellenemedi.');}
   const session=await signIn(account.auth_email,pass);check(await admin.auth.admin.signOut(session.access_token,'global'));
   return json({recoveryCode:nextCode});
  }
  if(action==='leaderboard'){
   const opts=options(body);await rate(req,'leaderboard',120);
   const entries=check(await admin.rpc('typing_leaderboard',{p_duration:opts.duration,p_language:opts.language,p_difficulty:opts.difficulty}));
   const badges=entries.length?check(await admin.from('typing_profiles').select('user_id,is_verified,is_developer').in('user_id',entries.map(entry=>entry.user_id))):[];
   return json({entries:entries.map(entry=>({...entry,...badges.find(profile=>profile.user_id===entry.user_id)}))});
  }
  if(action==='profile-public'){
   await rate(req,'profile-public',90);
   const tag=String(body.tag||'').toUpperCase();if(!/^[A-F0-9]{12}$/.test(tag))fail(400,'Hesap kodu geçersiz.');
   const p=check(await admin.from('typing_profiles').select(publicFields).eq('account_tag',tag).maybeSingle());if(!p)fail(404,'Profil bulunamadı.');
   const offset=Math.max(0,Math.min(10000,Math.floor(Number(body.offset)||0)));
   const stats=check(await admin.rpc('typing_public_stats',{p_user:p.user_id}));
   const results=check(await admin.from('typing_scores').select('id,wpm,accuracy,errors,characters,duration,language,difficulty,created_at').eq('user_id',p.user_id).eq('board_eligible',true).order('created_at',{ascending:false}).order('id').range(offset,offset+19));
   const rating=check(await admin.from('typing_ratings').select('mmr,wins,losses,draws').eq('user_id',p.user_id).maybeSingle());
   return json({profile:p,stats,results,rating,hasMore:offset+results.length<Number(stats.tests)});
  }
  if(action==='profiles-search'){
   await rate(req,'profiles-search',40);
   const query=String(body.query||'').normalize('NFC').trim().slice(0,24);if(query.length<2)fail(400,'En az 2 karakter yaz.');
   let lookup=admin.from('typing_profiles').select(publicFields);
   if(/^[A-Fa-f0-9]{12}$/.test(query.replace(/^#/,'')))lookup=lookup.eq('account_tag',query.replace(/^#/,'').toUpperCase());
   else lookup=lookup.ilike('display_name','%'+query.replace(/[\\%_]/g,'\\$&')+'%');
   return json({profiles:check(await lookup.order('created_at').limit(20))});
  }
  const {user,account,token}=await requireUser(req);
  if(action?.startsWith('room-')||['rating','matchmake','queue-cancel'].includes(action||''))return json(await handleDuels(action,req,body,user,{admin,check,fail,rate}));
  if(action==='avatar-remove'){
   await rate(req,'avatar-remove',8,60,user.id);const previous=await profile(user.id);
   if(previous.avatar_path)check(await admin.storage.from('typing-avatars').remove([previous.avatar_path]));
   check(await admin.from('typing_profiles').update({avatar_path:null,avatar_version:Date.now()}).eq('user_id',user.id));
   return json({profile:await profile(user.id)});
  }
  if(action==='me')return json({profile:await profile(user.id)});
  if(action==='profile'){
   await rate(req,'profile',15,60,user.id);check(await admin.from('typing_profiles').update({display_name:cleanDisplay(body.displayName),username:cleanDisplay(body.displayName)}).eq('user_id',user.id));
   return json({profile:await profile(user.id)});
  }
  if(action==='password'){
   await rate(req,'password',5,300,user.id);const pass=password(body.password);
   if(typeof body.currentPassword!=='string')fail(400,'Mevcut şifreni yaz.');
   const verified=await signIn(account.auth_email,body.currentPassword);
   const changed=await admin.auth.admin.updateUserById(user.id,{password:pass});if(changed.error)fail(400,'Şifre güncellenemedi.');
   // Password changes can already revoke the verification session. Use the new
   // authenticated session to revoke others, then return that live session.
   const fresh=await signIn(account.auth_email,pass);
   check(await admin.auth.admin.signOut(fresh.access_token,'others'));
   return json({session:fresh});
  }
  if(action==='challenge'){
   const opts=options(body);await rate(req,'challenge',8,60,user.id);
   const now=new Date();
   await admin.from('typing_challenges').delete().eq('user_id',user.id).eq('finished',false).lt('expires_at',now.toISOString());
   const text=randomWords(wordLists,opts.language,opts.difficulty);
   const row=check(await admin.from('typing_challenges').insert({user_id:user.id,...opts,target:text}).select('id,target,duration,expires_at').single());
   return json(row);
  }
  if(action==='start'){
   await rate(req,'start',8,60,user.id);const row=await getChallenge(String(body.id),user.id);
   if(row.finished||row.started_at||Date.now()>new Date(row.expires_at).getTime())fail(409,'Bu test artık kullanılamaz. Yeni bir test başlat.');
   const started=new Date().toISOString();
   const updated=check(await admin.from('typing_challenges').update({started_at:started}).eq('id',row.id).is('started_at',null).eq('finished',false).select('id,started_at,duration').maybeSingle());
   if(!updated)fail(409,'Test zaten başlatıldı.');return json(updated);
  }
  if(action==='events'){
   await rate(req,'events',180,60,user.id);const row=await getChallenge(String(body.id),user.id);
   if(row.finished||!row.started_at)fail(409,'Test açık değil.');
   const elapsed=Date.now()-new Date(row.started_at).getTime();if(elapsed<0)fail(409,'Geri sayım sürüyor.');if(elapsed>row.duration*1000+12000)fail(409,'Testin süresi doldu.');
   const events=body.events;
   if(!Array.isArray(events)||!events.length||events.length>150)fail(400,'Geçersiz vuruş paketi.');
   // Safe idempotency after an acknowledged request gets lost in transit.
   if(events[0]?.s<row.next_seq){
    const stored=row.events.slice(events[0].s,events[0].s+events.length);
    if(stored.length===events.length&&stored.every((e,i)=>e.s===events[i].s&&e.t===events[i].t&&e.k===events[i].k&&e.c===events[i].c))return json({nextSeq:row.next_seq});
    fail(409,'Vuruş kaydı uyuşmuyor.');
   }
   const clean=validateBatch(row.events,events,elapsed,row.duration);
   const updated=check(await admin.from('typing_challenges').update({events:[...row.events,...clean],next_seq:row.next_seq+clean.length}).eq('id',row.id).eq('next_seq',row.next_seq).eq('finished',false).select('next_seq').maybeSingle());
   if(!updated)fail(409,'Vuruş kaydı değişti.');return json({nextSeq:updated.next_seq});
  }
  if(action==='finish'){
   await rate(req,'finish',15,60,user.id);const row=await getChallenge(String(body.id),user.id);
   if(row.finished){const score=check(await admin.from('typing_scores').select('wpm,accuracy,errors,characters').eq('challenge_id',row.id).single());return json({score});}
   if(!row.started_at||Date.now()<new Date(row.started_at).getTime()+row.duration*1000)fail(400,'Süre tamamlanmadı.');
   const result=replay(row.target,row.events,row.duration);
   const score=check(await admin.rpc('typing_commit_score',{p_challenge:row.id,p_user:user.id,p_wpm:result.wpm,p_accuracy:result.accuracy,p_errors:result.errors,p_characters:result.characters}));
   return json({score});
  }
  if(action==='logout'){check(await admin.auth.admin.signOut(token,'local'));return json({ok:true});}
  fail(404,'İşlem bulunamadı.');
 }catch(error){
  if(error?.code==='payload_too_large')return json({error:'İstek çok büyük.'},413);
  if(error instanceof HttpError)return json({error:error.message},error.status);
  if(error instanceof Error&&/Kullanıcı adı|Şifre|Geçersiz|Vuruş|Olağandışı|doğrulanamadı|koşullarını|sınırı/.test(error.message))return json({error:error.message},400);
  // Do not log credentials, tokens, IP addresses or submitted text.
  console.error('typing-api request failed');return json({error:'İşlem tamamlanamadı. Tekrar dene.'},500);
 }
}
Deno.serve(handler);
