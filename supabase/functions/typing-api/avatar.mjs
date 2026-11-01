async function cleanupAvatar(bucket,path){
 try{const result=await bucket.remove([path]);if(result.error)console.warn('Avatar cleanup failed');}
 catch{console.warn('Avatar cleanup failed');}
}
// A compare-and-set prevents stale requests from overwriting a newer avatar.
export async function changeAvatar(admin,userId,previous,next){
 const bucket=admin.storage.from('typing-avatars'),version=Number(previous.avatar_version??0);
 if(!Number.isSafeInteger(version)||version<0)throw new Error('Invalid avatar version');
 const path=next?userId+'/'+crypto.randomUUID()+'.'+next.ext:null;
 if(next){const uploaded=await bucket.upload(path,next.bytes,{contentType:next.mime,upsert:false,cacheControl:'3600'});if(uploaded.error)throw new Error('Avatar upload failed');}
 try{
  const updated=await admin.from('typing_profiles').update({avatar_path:path,avatar_version:Math.max(Date.now(),version+1)})
   .eq('user_id',userId).eq('avatar_version',version).select('user_id').maybeSingle();
  if(updated.error)throw new Error('Avatar update failed');
  if(!updated.data){const conflict=new Error('Avatar changed during request');conflict.code='avatar_conflict';throw conflict;}
 }catch(error){if(path)await cleanupAvatar(bucket,path);throw error;}
 if(previous.avatar_path?.startsWith(userId+'/')){
  // A cleanup failure must not turn an already committed update into a retry.
  await cleanupAvatar(bucket,previous.avatar_path);
 }
}
