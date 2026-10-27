import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
// Optional local-only runner; PGLITE_MODULE may point to an existing PGlite install.
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 for(const path of ['supabase/typing-schema.sql','supabase/typing-duels-schema.sql','supabase/typing-profiles-schema.sql'])await db.exec(readFileSync(path,'utf8'));
 // Local, synthetic fixtures only. No network calls or production credentials.
 await db.exec(`insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');insert into public.typing_accounts(user_id,username,auth_email,recovery_hash) values('11111111-1111-4111-8111-111111111111','boranseason','owner@local.invalid','local-only'),('22222222-2222-4222-8222-222222222222','other_user','other@local.invalid','local-only');insert into public.typing_profiles(user_id,username,display_name) values('11111111-1111-4111-8111-111111111111','owner','owner'),('22222222-2222-4222-8222-222222222222','other','other');`);
 await db.exec(readFileSync('supabase/migrations/20261027172907_typing_ranked_matchmaking_and_badges.sql','utf8'));
 const badges=await db.query('select display_name,is_verified,is_developer from public.typing_profiles order by display_name');
 assert.deepEqual(badges.rows,[{display_name:'other',is_verified:false,is_developer:false},{display_name:'owner',is_verified:true,is_developer:true}]);
 const grants=await db.query(`select has_column_privilege('authenticated','public.typing_profiles','is_verified','UPDATE') as verified_update,has_column_privilege('authenticated','public.typing_profiles','is_developer','UPDATE') as developer_update,has_function_privilege('anon','public.typing_room_rematch(text,uuid,boolean,text,text)','EXECUTE') as rematch_execute,has_function_privilege('authenticated','public.typing_match_history(uuid,uuid,integer)','EXECUTE') as history_execute`);
 assert.deepEqual(grants.rows[0],{verified_update:false,developer_update:false,rematch_execute:false,history_execute:false});
 const results=await db.exec(readFileSync('supabase/tests/typing-ranked.sql','utf8'));
 console.log(results.at(-1).rows);
 console.log('Local PostgreSQL migration, exclusive badges and ACL checks passed.');
 await db.exec(readFileSync('supabase/migrations/20261027184503_typing_thirty_day_seasons.sql','utf8'));
 await db.exec("set app.typing_local_test='true'");
 console.log((await db.exec(readFileSync('supabase/tests/typing-seasons.sql','utf8'))).at(-1).rows);
} catch(error){console.error(error.message);if(error.where)console.error(error.where);process.exitCode=1;} finally {await db.close();}
