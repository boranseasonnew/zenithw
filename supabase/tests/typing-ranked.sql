-- Integration tests use only temporary copies, never real accounts or scores.
begin;
create temp table rank_profiles (like public.typing_profiles including all);
create temp table rank_ratings (like public.typing_ratings including all);
create temp table rank_queue (like public.typing_queue including all);
create temp table rank_duels (like public.typing_duels including all);
create temp table rank_scores (like public.typing_scores including all);
do $copy_functions$
declare definition text; routine regprocedure;
begin
 foreach routine in array array['public.typing_matchmake(uuid,integer,text,text,text,text)'::regprocedure,'public.typing_settle_duel(text,uuid)'::regprocedure,'public.typing_room_rematch(text,uuid,boolean,text,text)'::regprocedure,'public.typing_match_history(uuid,uuid,integer)'::regprocedure] loop
  definition=pg_get_functiondef(routine);
  definition=replace(definition,'FUNCTION public.','FUNCTION pg_temp.');
  definition=replace(definition,'public.typing_profiles','pg_temp.rank_profiles');
  definition=replace(definition,'public.typing_ratings','pg_temp.rank_ratings');
  definition=replace(definition,'public.typing_queue','pg_temp.rank_queue');
  definition=replace(definition,'public.typing_duels','pg_temp.rank_duels');
  definition=replace(definition,'public.typing_scores','pg_temp.rank_scores');
  execute definition;
 end loop;
end;$copy_functions$;
do $test_ranked$
declare
 a uuid='00000000-0000-4000-8000-000000000001'; b uuid='00000000-0000-4000-8000-000000000002';
 c uuid='00000000-0000-4000-8000-000000000003'; d uuid='00000000-0000-4000-8000-000000000004';
 ca uuid=gen_random_uuid(); cb uuid=gen_random_uuid(); source_room uuid; value jsonb; rejected boolean; before_time timestamptz;
begin
 assert public.typing_match_radius(0)=100 and public.typing_match_radius(14.9)=100 and public.typing_match_radius(15)=200 and public.typing_match_radius(135)=1000 and public.typing_match_radius(99999)=1000,'rating windows';
 insert into pg_temp.rank_profiles(user_id,username,display_name) values(a,'test_a','A'),(b,'test_b','B'),(c,'test_c','C'),(d,'test_d','D');
 insert into pg_temp.rank_ratings(user_id,mmr) values(a,1000),(b,1050),(c,1010),(d,50000);
 insert into pg_temp.rank_queue(user_id,duration,language,difficulty,created_at,last_seen) values
 (b,30,'en','normal',now()-interval '60 seconds',now()),(c,30,'en','normal',now(),now()),(d,30,'en','normal',now()-interval '1 hour',now());
 value=pg_temp.typing_matchmake(a,30,'en','normal','text','CLOSE00001');
 assert (select host_id=c and guest_id=a from pg_temp.rank_duels where room_code=value->>'roomCode'),'closest opponent wins over older waiters';
 perform pg_temp.typing_matchmake(a,30,'en','normal','text','CLOSE00002');
 assert (select count(*)=1 from pg_temp.rank_duels),'same player cannot get two active rooms';
 truncate pg_temp.rank_queue,pg_temp.rank_duels;
 insert into pg_temp.rank_queue(user_id,duration,language,difficulty,created_at,last_seen) values(d,30,'en','normal',now()-interval '1 hour',now());
 value=pg_temp.typing_matchmake(a,30,'en','normal','text','DISTANT001');
 assert (value->>'waiting')::boolean and (select count(*)=0 from pg_temp.rank_duels),'50k cannot pull a fresh 1k player';
 truncate pg_temp.rank_queue,pg_temp.rank_duels;
 update pg_temp.rank_ratings set mmr=1250 where user_id=b;
 insert into pg_temp.rank_queue(user_id,duration,language,difficulty,created_at,last_seen) values(a,30,'en','normal',now()-interval '30 seconds',now()),(b,30,'en','normal',now(),now());
 value=pg_temp.typing_matchmake(a,30,'en','normal','text','WAITBOTH01');
 assert (value->>'waiting')::boolean,'both players must accept the distance through waiting';
 update pg_temp.rank_queue set created_at=now()-interval '30 seconds' where user_id=b;
 value=pg_temp.typing_matchmake(a,30,'en','normal','text','WAITBOTH02');
 assert value ? 'roomCode','waited pair matches at expanded distance';
 truncate pg_temp.rank_queue,pg_temp.rank_duels;
 insert into pg_temp.rank_queue(user_id,duration,language,difficulty,created_at,last_seen) values(a,30,'en','normal',now()-interval '5 minutes',now()-interval '11 seconds');
 value=pg_temp.typing_matchmake(a,30,'en','normal','text','RESET00001');
 assert (value->>'ratingWindow')::integer=100 and (select created_at=now() from pg_temp.rank_queue where user_id=a),'stale search resets waiting time';
 update pg_temp.rank_queue set created_at=now()-interval '5 minutes';
 value=pg_temp.typing_matchmake(a,60,'en','normal','text','RESET00002');
 assert (value->>'ratingWindow')::integer=100,'changing settings resets waiting time';
 truncate pg_temp.rank_queue,pg_temp.rank_duels;
 insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,finished_at)
 values('SOURCE0001',a,b,30,'en','normal','',true,true,'finished',now()) returning id into source_room;
 value=pg_temp.typing_room_rematch('SOURCE0001',a,true,'fresh target','REMATCH001');
 assert (value->>'host_rematch')::boolean and (select count(*)=1 from pg_temp.rank_duels),'one request is not a rematch';
 rejected=false;begin perform pg_temp.typing_room_rematch('SOURCE0001',c,true,'bad','REMATCHBAD');exception when raise_exception then rejected=true;end;
 assert rejected,'third party cannot request rematch';
 value=pg_temp.typing_room_rematch('SOURCE0001',b,true,'fresh target','REMATCH001');
 assert value->>'rematch_room_code'='REMATCH001','mutual rematch created';
 assert (select rated and competitive and status='waiting' and assist_user_id is null and rematch_of=source_room from pg_temp.rank_duels where room_code='REMATCH001'),'ranked rematch keeps mode but not assistance';
 perform pg_temp.typing_room_rematch('SOURCE0001',a,true,'ignored','REMATCH002');
 assert (select count(*)=2 from pg_temp.rank_duels),'rematch requests are idempotent';
 truncate pg_temp.rank_duels,pg_temp.rank_scores;
 update pg_temp.rank_ratings set mmr=49999,wins=0,losses=0,draws=0 where user_id in(a,b);
 insert into pg_temp.rank_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters,board_eligible) values(ca,a,30,'en','normal',100,100,0,250,false),(cb,b,30,'en','normal',80,100,0,200,false);
 insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,starts_at,host_challenge,guest_challenge)
 values('CAP0000001',a,b,30,'en','normal','text',true,true,'racing',now()-interval '45 seconds',ca,cb);
 value=pg_temp.typing_settle_duel('CAP0000001',a);
 assert (select mmr=50000 from pg_temp.rank_ratings where user_id=a),'50k ceiling';
 assert (value->>'host_delta')::integer=1 and (value->>'guest_delta')::integer=-12,'displayed Elo delta is actual clamped change';
 perform pg_temp.typing_settle_duel('CAP0000001',a);
 assert (select wins=1 from pg_temp.rank_ratings where user_id=a),'settlement is idempotent';
 rejected=false;begin update pg_temp.rank_ratings set mmr=50001 where user_id=a;exception when check_violation then rejected=true;end;
 assert rejected,'DB rejects values above ceiling';
 insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,winner_id) values
 ('LIMIT00001',a,b,30,'en','normal','',true,true,'finished',a),('LIMIT00002',b,a,30,'en','normal','',true,true,'finished',b);
 insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,starts_at,host_challenge,guest_challenge)
 values('LIMIT00004',a,b,30,'en','normal','text',true,true,'racing',now()-interval '45 seconds',ca,cb);
 value=pg_temp.typing_settle_duel('LIMIT00004',a);
 assert not(value->>'rated')::boolean and (value->>'host_delta')::integer=0 and (value->>'guest_delta')::integer=0,'fourth match against same opponent cannot farm Elo';
 assert (select mmr=50000 and wins=1 from pg_temp.rank_ratings where user_id=a),'repeat limit preserves rating and counts';
 perform pg_temp.typing_room_rematch('LIMIT00004',a,true,'new text','LIMITNEXT1');
 perform pg_temp.typing_room_rematch('LIMIT00004',b,true,'new text','LIMITNEXT1');
 assert (select competitive and rated from pg_temp.rank_duels where room_code='LIMITNEXT1'),'competitive mode persists after a capped rematch';
 truncate pg_temp.rank_duels;
 insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,winner_id,finished_at) values
 ('HISTORY001',a,b,30,'en','normal','',true,true,'finished',a,now()),
 ('HISTORY002',b,a,30,'en','normal','',true,true,'finished',b,now()-interval '1 minute'),
 ('HISTORY003',a,b,30,'en','normal','',false,false,'finished',null,now()-interval '2 minutes'),
 ('HISTORY004',a,c,30,'en','normal','',false,false,'finished',a,now()-interval '3 minutes'),
 ('HISTORY005',a,b,30,'en','normal','text',true,true,'racing',null,null);
 value=pg_temp.typing_match_history(a,b,0);
 assert value->'stats'='{"total":3,"wins":1,"losses":1,"draws":1}'::jsonb,'head-to-head includes both sides and draws, excludes unfinished';
 assert jsonb_array_length(value->'results')=3 and not(value::text like '%assist%'),'history does not expose assist state';
 value=pg_temp.typing_match_history(a,null,0);assert (value->'stats'->>'total')::integer=4,'all history stays scoped to its player';
 value=pg_temp.typing_match_history(d,null,0);assert (value->'stats'->>'total')::integer=0,'outsider history does not leak other matches';
 for i in 1..21 loop
  insert into pg_temp.rank_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,status,finished_at)
  values('PAGE'||lpad(i::text,6,'0'),a,b,30,'en','normal','',false,false,'finished',now()-interval '1 hour'-make_interval(secs=>i));
 end loop;
 value=pg_temp.typing_match_history(a,b,0);assert jsonb_array_length(value->'results')=20 and (value->>'hasMore')::boolean,'history first page';
 value=pg_temp.typing_match_history(a,b,20);assert jsonb_array_length(value->'results')=4 and not(value->>'hasMore')::boolean,'history final page';
end;$test_ranked$;
rollback;
select 'ranked matchmaking, cap, rematch and private history tests passed; all fixture data rolled back' as result;
