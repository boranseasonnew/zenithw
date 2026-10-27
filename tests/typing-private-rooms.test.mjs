import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDuels} from '../supabase/functions/typing-api/duels.mjs';

function fixture(changes={}){
 const room={id:'room',room_code:'PRIVATE001',host_id:'owner',guest_id:'guest',status:'waiting',duration:30,language:'tr',difficulty:'normal',rated:false,competitive:false,expires_at:new Date(Date.now()+600000).toISOString(),...changes};
 const calls=[];
 const profiles=[{user_id:'owner',display_name:'Owner'},{user_id:'guest',display_name:'Guest'}];
 return {room,calls,rate:async()=>{},fail(status,message){throw Object.assign(Error(message),{status});},check(result){if(result.error)throw result.error;return result.data;},admin:{from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:room}),in:async()=>({data:table==='typing_profiles'?profiles:[]})};},async rpc(name,args){calls.push({name,args});if(name==='typing_is_admin')return {data:args.p_user==='owner'};if(name==='typing_room_settings'){Object.assign(room,{duration:args.p_duration,language:args.p_language,difficulty:args.p_difficulty,host_ready:false,guest_ready:false});}if(name==='typing_room_assist')room.assist_user_id=args.p_enabled?args.p_user:null;return {data:room};}}};
}
const settings={code:'PRIVATE001',duration:60,language:'en',difficulty:'hard',userId:'spoofed'};
test('only the authenticated private-room host can change waiting settings',async()=>{
 const ctx=fixture({host_ready:true,guest_ready:true});
 const result=await handleDuels('room-settings',{},settings,{id:'owner'},ctx);
 assert.equal(result.duration,60);assert.equal(result.difficulty,'hard');assert.equal(result.canEditSettings,true);
 assert.equal(result.hostReady,false);assert.equal(result.guestReady,false);
 assert.equal(ctx.calls[0].args.p_user,'owner');assert.ok(ctx.calls[0].args.p_target.length>100);
 for(const [changes,user,status] of [[{},'guest',403],[{},'outsider',403],[{status:'racing'},'owner',409],[{competitive:true,rated:false},'owner',409]]){
  const other=fixture(changes);await assert.rejects(handleDuels('room-settings',{},settings,{id:user},other),error=>error.status===status);assert.equal(other.calls.length,0);
 }
});
test('room settings reject invalid durations and language before an RPC',async()=>{
 for(const patch of [{duration:0},{duration:120},{language:'xx'},{difficulty:'script'}]){
  const ctx=fixture();await assert.rejects(handleDuels('room-settings',{}, {...settings,...patch},{id:'owner'},ctx),error=>error.status===400);assert.equal(ctx.calls.length,0);
 }
});
test('server-owned assist can toggle during racing and remains unavailable to guests and ranked players',async()=>{
 const ctx=fixture({status:'racing',host_private_delta:12,guest_private_delta:-12});
 const result=await handleDuels('room-assist',{}, {code:'PRIVATE001',enabled:true},{id:'owner'},ctx);
 assert.equal(result.canAssist,true);assert.equal(result.assisted,true);assert.equal(result.canEditSettings,false);
 for(const [changes,user] of [[{status:'racing'},'guest'],[{status:'racing',competitive:true},'owner'],[{status:'finished'},'owner']]){
  const other=fixture(changes);await assert.rejects(handleDuels('room-assist',{}, {code:'PRIVATE001',enabled:true},{id:user},other),error=>error.status===403);
  assert.equal(other.calls.filter(c=>c.name==='typing_room_assist').length,0);
 }
});
test('concurrent room start is returned as a conflict instead of claiming settings were saved',async()=>{
 const ctx=fixture();ctx.admin.rpc=async()=>({error:{code:'P0001'}});
 await assert.rejects(handleDuels('room-settings',{},settings,{id:'owner'},ctx),error=>error.status===409);
});
test('private result payload keeps separate deltas and never changes ranked classification',async()=>{
 const ctx=fixture({status:'finished',private_rated:true,host_private_delta:1,guest_private_delta:-12,host_delta:0,guest_delta:0});
 const result=await handleDuels('room-state',{}, {code:'PRIVATE001'},{id:'guest'},ctx);
 assert.equal(result.privateRated,true);assert.equal(result.hostPrivateDelta,1);assert.equal(result.guestPrivateDelta,-12);assert.equal(result.rated,false);assert.equal(result.competitive,false);assert.equal(result.hostDelta,0);
});
