import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {handleDuels} from '../supabase/functions/typing-api/duels.mjs';
function ctx({isAdmin=false,rated=false,assisted=false,status='waiting'}={}){
 const room={id:'room',room_code:'ABCDEF1234',host_id:'admin',guest_id:'guest',status,rated,assist_user_id:assisted?'admin':null,expires_at:new Date(Date.now()+60000).toISOString(),host_result:status==='finished'?{wpm:120,accuracy:100,assisted:true,board_eligible:false}:null,winner_id:status==='finished'?'admin':null};
 const profiles=[{user_id:'admin',account_tag:'AAAAAAAAAAAA',display_name:'same'},{user_id:'guest',account_tag:'BBBBBBBBBBBB',display_name:'same'}],calls=[];
 const admin={from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:room}),in:async()=>({data:table==='typing_profiles'?profiles:[]})};},async rpc(name,args){calls.push({name,args});if(name==='typing_is_admin')return {data:isAdmin};if(name==='typing_room_assist'){room.assist_user_id=args.p_enabled?args.p_user:null;return {data:room};}throw Error(name);}};
 return {admin,calls,check(result){if(result.error)throw result.error;return result.data;},fail(status,message){throw Object.assign(Error(message),{status});},rate:async()=>{}};
}
test('private assist requires server-owned admin role and rejects ranked matches',async()=>{
 for(const configuration of [{isAdmin:false},{isAdmin:true,rated:true}]){
  const context=ctx(configuration);
  await assert.rejects(handleDuels('room-assist',{}, {code:'ABCDEF1234',enabled:true},{id:'admin'},context),error=>error.status===403);
  assert.equal(context.calls.filter(c=>c.name==='typing_room_assist').length,0);
 }
});
test('admin assist affects only its owner and stays out of opponent payloads',async()=>{
 const context=ctx({isAdmin:true});
 const own=await handleDuels('room-assist',{}, {code:'ABCDEF1234',enabled:true},{id:'admin'},context);
 assert.equal(own.assisted,true);assert.equal(own.rated,false);
 context.admin.rpc=async()=>({data:false});
 const guest=await handleDuels('room-state',{}, {code:'ABCDEF1234'},{id:'guest'},context);
 assert.equal(guest.assisted,false);assert.equal(guest.canAssist,false);assert.equal('assist_user_id' in guest,false);
});
test('finished room exposes WPM, accuracy and match points without internal assist fields',async()=>{
 const result=await handleDuels('room-state',{}, {code:'ABCDEF1234'},{id:'guest'},ctx({status:'finished',assisted:true}));
 assert.deepEqual(result.hostResult,{wpm:120,accuracy:100,characters:0});assert.equal(result.hostPoints,1);assert.equal(result.guestPoints,0);
});
function language(languages){
 const element={nodeType:1,lang:'',closest:()=>null,querySelectorAll:()=>[],hasAttribute:()=>false};
 const document={documentElement:element,getElementById:()=>null,createTreeWalker:()=>({nextNode:()=>false})};
 const window={};vm.runInNewContext(readFileSync(new URL('../frontend/typing-i18n.js',import.meta.url),'utf8'),{window,document,navigator:{languages},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}}});return window.TypeI18n;
}
test('browser language selects the whole UI independently of typing text',()=>{
 const english=language(['en-GB','tr-TR']);assert.equal(english.language,'en');assert.equal(english.locale,'en-gb');
 for(const [source,expected] of [['ayarlar','settings'],['şifreyi güncelle','update password'],['doğrulanmış testler','verified tests'],['30 saniye','30 seconds'],['Doğru tuş yardımı','Correct-key assist'],['Nya… hazır mısın?','Nya… ready?']])assert.equal(english.t(source),expected);
 const turkish=language(['tr-TR','en-US']);assert.equal(turkish.language,'tr');assert.equal(turkish.t('ayarlar'),'ayarlar');
 assert.equal(language(['de-DE']).language,'en');
});
test('joined result messages and metadata translate completely without consuming user text',()=>{
 const english=language(['en-US']);
 for(const [source,expected] of [
  ['Bu tur senin. Kazandın. · maç puanı 1–0','This round is yours. You won. · match score 1–0'],
  ['Berabere. +0 RP','Draw. +0 RP'],
  ['Doğrulandı. Sonucun dünya sıralamasına kaydedildi.','Verified. Your result was added to the world leaderboard.'],
  ['türkçe · zor','Turkish · hard'],['Altın rozet','Gold badge'],
  ['1 oyuncu','1 player'],['2 oyuncu','2 players'],
  ['constructor','constructor'],['#63666A70AA07','#63666A70AA07']
 ])assert.equal(english.t(source),expected);
});
test('typing owns its locale and protects account names from the translation observer',()=>{
 const html=readFileSync(new URL('../frontend/typing.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/<script[^>]+site-language[.]/);
 const i18n=readFileSync(new URL('../frontend/typing-i18n.js',import.meta.url),'utf8');
 assert.ok(i18n.includes('#word-track'));
 assert.ok(i18n.includes('#account-label'));
 assert.ok(i18n.includes('[data-player-name]'));
});
