import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {handleDuels} from '../supabase/functions/typing-api/duels.mjs';
const window={TypeI18n:{t:value=>value},addEventListener(){}};
vm.runInNewContext(readFileSync(new URL('../frontend/typing-badges.js',import.meta.url),'utf8'),{window,document:{addEventListener(){}},Number,Math});
const rated=mmr=>({mmr,wins:1,losses:0,draws:0});
test('typing loads badge dependencies before consumers and includes match history',()=>{
 const html=readFileSync(new URL('../frontend/typing.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script src="\/?([^"?]+)"[^>]*><\/script>/g)].map(match=>match[1]);
 const manifest=JSON.parse(readFileSync(new URL('../scripts/cache-assets-manifest.json',import.meta.url),'utf8'));
 const resource=name=>manifest[name].url.slice(1);
 assert.ok(scripts.includes(resource('typing-badges.js')));
 assert.ok(scripts.indexOf(resource('typing-badges.js'))<scripts.indexOf(resource('typing-online.js')));
 assert.ok(scripts.indexOf(resource('typing-badges.js'))<scripts.indexOf(resource('typing-duels.js')));
 assert.ok(scripts.includes(resource('typing-history.js')));
 for(const name of ['typing-online.js','typing-badges.js','typing-focus.css']){
  assert.match(manifest[name].url,/\/cache-assets\/typing-[\w-]+\.[a-f0-9]{12}\.(js|css)$/);
  assert.ok(html.includes(manifest[name].url));
 }
});
test('rank badges use exact 5k, 10k, 20k and 50k boundaries',()=>{
 assert.equal(window.TypeRanks.tier({mmr:50000,wins:0,losses:0,draws:0}).key,'unranked');
 for(const [points,key] of [[0,'bronze'],[4999,'bronze'],[5000,'silver'],[9999,'silver'],[10000,'gold'],[19999,'gold'],[20000,'amethyst'],[49999,'amethyst'],[50000,'summit']])assert.equal(window.TypeRanks.tier(rated(points)).key,key);
 assert.match(window.TypeRanks.markup(rated(50000)),/rank-badge--summit/);
 assert.notEqual(window.TypeRanks.markup(rated(20000)),window.TypeRanks.markup(rated(20000)),'SVG gradient IDs must be unique');
});
test('names and account tags cannot grant verified or developer badges',()=>{
 for(const fake of [{display_name:'boranseason',account_tag:'63666A70AA07'},{is_verified:'true',is_developer:'true'},{is_admin:true}])assert.equal(window.TypeBadges.markup(fake),'');
 const html=window.TypeBadges.markup({is_verified:true,is_developer:true});
 assert.equal((html.match(/data-account-badge=/g)||[]).length,2);
 assert.match(html,/aria-label="Geliştirici"/);assert.match(html,/aria-label="Onaylanmış hesap"/);
});
function context(room){
 const calls=[];
 return {calls,admin:{from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:room}),in:async()=>({data:[]})};},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='typing_match_history'?{stats:{total:0},results:[]}:false};}},rate:async()=>{},check:result=>result.data,fail(status,message){throw Object.assign(Error(message),{status});}};
}
test('match history always scopes RPCs to the authenticated player',async()=>{
 const ctx=context();
 await handleDuels('room-history',{}, {userId:'victim',offset:40},{id:'signed-in-user'},ctx);
 assert.deepEqual(ctx.calls[0],{name:'typing_match_history',args:{p_user:'signed-in-user',p_opponent:null,p_offset:40}});
 await assert.rejects(handleDuels('room-history',{}, {opponentId:'not-a-uuid'},{id:'signed-in-user'},ctx),error=>error.status===400);
});
test('rematch requests reject nonmembers and unfinished matches',async()=>{
 for(const [room,user,status] of [[{status:'finished',host_id:'host',guest_id:'guest'},'outsider',403],[{status:'waiting',host_id:'host',guest_id:'guest'},'host',409]]){
  const ctx=context(room);
  await assert.rejects(handleDuels('room-rematch',{}, {code:'ABCDEF1234',requested:true},{id:user},ctx),error=>error.status===status);
  assert.equal(ctx.calls.length,0);
 }
});
