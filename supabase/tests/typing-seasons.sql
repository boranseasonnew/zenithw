-- Local PostgreSQL/PGlite only; never run fixtures against the production database.
begin;
do $$begin assert current_setting('app.typing_local_test',true)='true','Local test runner required';end;$$;
do $test$
declare
 a uuid='11111111-1111-4111-8111-111111111111';b uuid='22222222-2222-4222-8222-222222222222';
 ca uuid=gen_random_uuid();cb uuid=gen_random_uuid();late uuid=gen_random_uuid();fresh uuid=gen_random_uuid();anchor timestamptz;result jsonb;total integer;
begin
 select epoch into anchor from public.typing_season_config;
 assert public.typing_season_number(anchor)=0;
 assert public.typing_season_number(anchor+interval '2592000 seconds'-interval '1 millisecond')=0;
 assert public.typing_season_number(anchor+interval '2592000 seconds')=1;
 assert public.typing_season_number(anchor+interval '5184000 seconds')=2;
 insert into public.typing_ratings(user_id,mmr,wins) values(a,5000,3),(b,9000,5) on conflict(user_id) do update set mmr=excluded.mmr,wins=excluded.wins;
 insert into public.typing_challenges(id,user_id,duration,language,difficulty,target,started_at,board_eligible) values
 (ca,a,30,'en','normal','fixture',now()-interval '50 seconds',false),(cb,b,30,'en','normal','fixture',now()-interval '50 seconds',false),(late,a,30,'en','normal','fixture',now()-interval '40 seconds',true);
 insert into public.typing_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters,board_eligible) values
 (ca,a,30,'en','normal',145,99,1,360,true),(cb,b,30,'en','normal',32,95,1,80,false);
 insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,status,rated,competitive,starts_at,host_challenge,guest_challenge)
 values('OLDSEASON1',a,b,30,'en','normal','fixture','racing',true,true,now()-interval '50 seconds',ca,cb);
 insert into public.typing_queue(user_id,duration,language,difficulty) values(a,30,'en','normal');
 assert (select count(*)=1 from public.typing_leaderboard(30,'en','normal')),'first season preserves existing scores';
 result=public.typing_roll_season();
 assert (select mmr=5000 from public.typing_ratings where user_id=a),'initial rollout does not reset live ratings';
 update public.typing_season_config set epoch=now()-interval '2592001 seconds';
 result=public.typing_roll_season();assert (result->>'id')::integer=1;
 assert (select bool_and(mmr=1000 and wins=0 and losses=0 and draws=0 and season_id=1) from public.typing_ratings),'ratings reset to 1000';
 assert (select mmr=5000 and wins=3 from public.typing_rating_seasons where user_id=a and season_id=0),'old rating archived';
 assert (select count(*)=0 from public.typing_queue),'old queue removed';
 assert (select count(*)=0 from public.typing_leaderboard(30,'en','normal')),'old WPM standings disappear';
 assert (select count(*)=2 from public.typing_scores),'scores are preserved';
 result=public.typing_commit_score(late,a,200,99,1,500);
 assert (result->>'season_id')::integer=0,'test created before rollover stays in its original season';
 assert (select count(*)=0 from public.typing_leaderboard(30,'en','normal')),'late test cannot top the new board';
 result=public.typing_settle_duel('OLDSEASON1',a);
 assert result->>'status'='finished' and not (result->>'rated')::boolean and (result->>'host_delta')::integer=0,'late duel awards no new-season Elo';
 assert (select mmr=1000 and wins=0 from public.typing_ratings where user_id=a),'old victory cannot inflate new season';
 assert (select count(*)=1 from public.typing_duels where status='finished'),'match history preserved';
 insert into public.typing_challenges(id,user_id,duration,language,difficulty,target,started_at,board_eligible) values(fresh,a,30,'en','normal','fixture',now()-interval '40 seconds',true);
 result=public.typing_commit_score(fresh,a,100,98,1,250);assert (result->>'season_id')::integer=1;
 assert (select count(*)=1 and max(wpm)=100 from public.typing_leaderboard(30,'en','normal')),'fresh score enters new season';
 update public.typing_ratings set mmr=1020 where user_id=a;
 result=public.typing_rating_current(a);assert (result->'rating'->>'mmr')::integer=1020,'repeat read does not reset again';
 assert (select count(*)=2 from public.typing_rating_seasons),'one archive row per player and season';
 update public.typing_season_config set epoch=now()-interval '10368001 seconds';
 result=public.typing_roll_season();assert (result->>'id')::integer=4;
 assert (select mmr=1000 and season_id=4 from public.typing_ratings where user_id=a),'skipped seasons reset directly to current';
 assert (select mmr=1020 from public.typing_rating_seasons where user_id=a and season_id=1),'skipped season preserves last actual results';
 assert not has_table_privilege('anon','public.typing_season_config','update');
 assert not has_table_privilege('authenticated','public.typing_rating_seasons','select');
 assert not has_function_privilege('anon','public.typing_roll_season()','execute');
 assert not has_function_privilege('anon','public.typing_matchmake_pre_seasons(uuid,integer,text,text,text,text)','execute');
 assert not has_function_privilege('authenticated','public.typing_settle_duel_pre_seasons(text,uuid)','execute');
 assert not has_function_privilege('authenticated','public.typing_rating_current(uuid)','execute');
end;$test$;
rollback;
select '30-day boundary, rating archive/reset, late results, skipped seasons and access checks passed' as result;
