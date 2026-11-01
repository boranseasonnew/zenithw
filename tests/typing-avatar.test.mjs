import test from 'node:test';
import assert from 'node:assert/strict';
import {changeAvatar} from '../supabase/functions/typing-api/avatar.mjs';
function fixture(){
 const row={user_id:'user',avatar_version:7,avatar_path:'user/old.png'},files=new Set([row.avatar_path]),removed=[];
 const admin={storage:{from:()=>({upload:async(path)=>{files.add(path);return {error:null};},remove:async(paths)=>{removed.push(...paths);paths.forEach(path=>files.delete(path));return {error:null};}})},from:()=>{
  const filters={};let updates;
  const query={update(value){updates=value;return query;},eq(key,value){filters[key]=value;return query;},select(){return query;},async maybeSingle(){
   if(Object.entries(filters).some(([key,value])=>row[key]!==value))return {data:null,error:null};
   Object.assign(row,updates);return {data:{user_id:row.user_id},error:null};
  }};return query;
 }};return {row,files,removed,admin};
}
const image={bytes:new Uint8Array(12),ext:'png',mime:'image/png'};
test('concurrent avatar uploads keep only the winner and remove the unreferenced upload',async()=>{
 const {admin,row,files,removed}=fixture(),previous={...row};
 const result=await Promise.allSettled([changeAvatar(admin,'user',previous,image),changeAvatar(admin,'user',previous,image)]);
 assert.equal(result.filter(item=>item.status==='fulfilled').length,1);
 assert.equal(result.find(item=>item.status==='rejected').reason.code,'avatar_conflict');
 assert.deepEqual([...files],[row.avatar_path]);assert.ok(row.avatar_version>previous.avatar_version);
 assert.equal(removed.filter(path=>path==='user/old.png').length,1);
});
test('stale avatar removal cannot delete or clear a newer image',async()=>{
 const {admin,row,files}=fixture(),previous={...row};await changeAvatar(admin,'user',previous,image);const current=row.avatar_path;
 await assert.rejects(changeAvatar(admin,'user',previous,null),{code:'avatar_conflict'});
 assert.equal(row.avatar_path,current);assert.deepEqual([...files],[current]);
});
test('failed profile writes clean up the new upload and keep the original avatar',async()=>{
 const {admin,row,files}=fixture(),previous={...row};admin.from=()=>{throw Error('database unavailable');};
 await assert.rejects(changeAvatar(admin,'user',previous,image),/database unavailable/);
 assert.deepEqual([...files],['user/old.png']);assert.equal(row.avatar_path,previous.avatar_path);
});
test('storage cleanup errors do not turn a committed avatar update into a retry',async(t)=>{
 const warnings=[];t.mock.method(console,'warn',value=>warnings.push(value));
 const {admin,row}=fixture(),previous={...row},from=admin.storage.from;
 admin.storage.from=()=>({...from(),remove:async()=>({error:{message:'private storage details'}})});
 await changeAvatar(admin,'user',previous,image);
 assert.notEqual(row.avatar_path,previous.avatar_path);
 assert.deepEqual(warnings,['Avatar cleanup failed']);
});
test('rollback cleanup failure preserves the original conflict error',async(t)=>{
 t.mock.method(console,'warn',()=>{});
 const {admin,row}=fixture(),previous={...row},from=admin.storage.from;
 await changeAvatar(admin,'user',previous,image);
 admin.storage.from=()=>({...from(),remove:async()=>{throw Error('storage unavailable');}});
 await assert.rejects(changeAvatar(admin,'user',previous,image),{code:'avatar_conflict'});
});
