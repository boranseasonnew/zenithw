-- Synthetic fixtures, in-memory/local PostgreSQL only.
begin;
do $$begin assert current_setting('app.typing_local_test',true)='true','Local test runner required';end;$$;
do $test$
declare a uuid='11111111-1111-4111-8111-111111111111';b uuid='22222222-2222-4222-8222-222222222222';r jsonb; ca uuid; cb uuid; code text; mmr_before integer;
begin
 insert into typing_private.roles(user_id,is_admin) values(a,true) on conflict(user_id) do update set is_admin=true;
 insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,host_ready,guest_ready) values('SETTINGS01',a,b,30,'en','normal','old target',true,true);
 begin perform public.typing_room_settings('SETTINGS01',b,60,'tr','hard','new target');raise exception 'guest accepted';exception when raise_exception then assert sqlerrm='Private waiting host required';end;
 r=public.typing_room_settings('SETTINGS01',a,60,'tr','hard','new target');
 assert (r->>'duration')::integer=60 and r->>'language'='tr' and r->>'difficulty'='hard';
 assert not (r->>'host_ready')::boolean and not (r->>'guest_ready')::boolean;
 assert r->>'target'='new target';
 update public.typing_duels set competitive=true where room_code='SETTINGS01';
 begin perform public.typing_room_settings('SETTINGS01',a,30,'tr','easy','target');raise exception 'ranked accepted';exception when raise_exception then assert sqlerrm='Private waiting host required';end;
 update public.typing_duels set competitive=false where room_code='SETTINGS01';
 r=public.typing_room_ready('SETTINGS01',a,true);r=public.typing_room_ready('SETTINGS01',b,true);
 assert r->>'status'='racing';
 begin perform public.typing_room_settings('SETTINGS01',a,30,'tr','easy','target');raise exception 'running edit accepted';exception when raise_exception then assert sqlerrm='Private waiting host required';end;
 begin perform public.typing_room_assist('SETTINGS01',b,true);raise exception 'guest assist accepted';exception when raise_exception then assert sqlerrm='Admin required';end;
 r=public.typing_room_assist('SETTINGS01',a,true);assert (r->>'assist_used')::boolean;
 r=public.typing_room_assist('SETTINGS01',a,false);assert r->>'assist_user_id' is null and (r->>'assist_used')::boolean;
 assert (select assisted and not board_eligible from public.typing_challenges where id=(r->>'host_challenge')::uuid);
 update public.typing_duels set status='cancelled' where room_code='SETTINGS01';
 r=public.typing_rating_current(a);
 select mmr into mmr_before from public.typing_ratings where user_id=a;
 for i in 1..6 loop
  code='PRIVATE00'||i;
  if i=6 then
   update public.typing_duels set finished_at=now()-interval '25 hours' where private_rated;
   update public.typing_private_ratings set mmr=49999;
  end if;
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,board_eligible) values(a,30,'en','normal','fixture',now()-interval '50 seconds',false) returning id into ca;
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,board_eligible) values(b,30,'en','normal','fixture',now()-interval '50 seconds',false) returning id into cb;
  insert into public.typing_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters,board_eligible) values(ca,a,30,'en','normal',145,99,1,360,false),(cb,b,30,'en','normal',32,95,1,80,false);
  insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,status,starts_at,host_challenge,guest_challenge,assist_used) values(code,a,b,30,'en','normal','fixture','racing',now()-interval '50 seconds',ca,cb,i=1);
  r=public.typing_settle_duel(code,a);assert r->>'status'='finished';
  assert (r->>'private_rated')::boolean=(i between 2 and 4 or i=6),'assistance and repeat cap must exclude points';
  if i=2 then assert (r->>'host_private_delta')::integer=12 and (r->>'guest_private_delta')::integer=-12;end if;
  if i=6 then assert (r->>'host_private_delta')::integer=1 and (r->>'guest_private_delta')::integer=-12,'actual clamped deltas';end if;
  r=public.typing_settle_duel(code,b);
 end loop;
 assert (select wins=4 and mmr=50000 from public.typing_private_ratings where user_id=a),'idempotent settlement and 50k cap';
 assert (select mmr=mmr_before from public.typing_ratings where user_id=a),'private rooms never touch competitive Elo';
 assert (select count(*)=0 from public.typing_leaderboard(30,'en','normal')),'private scores never enter WPM board';
 -- Rematch keeps private classification and gets a fresh, unassisted round.
 r=public.typing_room_rematch('PRIVATE005',a,true,'fresh target','PRIVREM001');
 r=public.typing_room_rematch('PRIVATE005',b,true,'fresh target','PRIVREM001');
 assert r->>'rematch_room_code'='PRIVREM001';
 assert (select not competitive and not rated and not assist_used from public.typing_duels where room_code='PRIVREM001');
 -- The competitive season rollover must never reset private lifetime points.
 update public.typing_private_ratings set mmr=50000 where user_id=a;
 update public.typing_season_config set epoch=now()-interval '2592001 seconds';
 r=public.typing_roll_season();r=public.typing_private_rating_current(a);
 assert (r->>'mmr')::integer=50000 and (r->>'wins')::integer=4,'private Elo is permanent';
 assert not has_table_privilege('anon','public.typing_private_ratings','SELECT');
 assert not has_table_privilege('authenticated','public.typing_private_ratings','UPDATE');
 assert not has_function_privilege('anon','public.typing_private_rating_current(uuid)','EXECUTE');
 assert not has_function_privilege('authenticated','public.typing_room_settings(text,uuid,integer,text,text,text)','EXECUTE');
 assert not has_function_privilege('authenticated','public.typing_room_assist(text,uuid,boolean)','EXECUTE');
 assert not has_function_privilege('authenticated','public.typing_room_ready_pre_private(text,uuid,boolean)','EXECUTE');
 assert not has_function_privilege('authenticated','public.typing_settle_duel_pre_private(text,uuid)','EXECUTE');
end;$test$;
select 'Private room settings, live assist, lifetime Elo, isolation and ACL checks passed' as result;
rollback;
