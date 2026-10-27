-- Preserve the first season's existing records. The first 30-day interval starts now.
create table public.typing_season_config (
 singleton boolean primary key default true check(singleton),
 epoch timestamptz not null default now(),
 active_season bigint not null default 0 check(active_season>=0)
);
insert into public.typing_season_config(singleton) values(true);
alter table public.typing_season_config enable row level security;
revoke all on public.typing_season_config from anon,authenticated;
grant select on public.typing_season_config to anon,authenticated;
grant all on public.typing_season_config to service_role;
create policy typing_season_clock_read on public.typing_season_config for select to anon,authenticated using(true);

create function public.typing_season_number(p_at timestamptz default now()) returns bigint
language sql stable security invoker set search_path='' as $$
 select greatest(0,floor(extract(epoch from (p_at-epoch))/2592000))::bigint from public.typing_season_config where singleton;
$$;
create function public.typing_season_info() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',public.typing_season_number(),'startsAt',epoch+public.typing_season_number()*interval '2592000 seconds','endsAt',epoch+(public.typing_season_number()+1)*interval '2592000 seconds','serverNow',now()) from public.typing_season_config where singleton;
$$;
revoke all on function public.typing_season_number(timestamptz),public.typing_season_info() from public;
grant execute on function public.typing_season_number(timestamptz),public.typing_season_info() to anon,authenticated,service_role;

alter table public.typing_ratings add column season_id bigint not null default 0;
alter table public.typing_scores add column season_id bigint not null default 0;
alter table public.typing_challenges add column season_id bigint not null default 0;
alter table public.typing_duels add column season_id bigint not null default 0;
alter table public.typing_queue add column season_id bigint not null default 0;
alter table public.typing_ratings alter column season_id set default public.typing_season_number();
alter table public.typing_scores alter column season_id set default public.typing_season_number();
alter table public.typing_challenges alter column season_id set default public.typing_season_number();
alter table public.typing_duels alter column season_id set default public.typing_season_number();
alter table public.typing_queue alter column season_id set default public.typing_season_number();
create index typing_scores_season_board on public.typing_scores(season_id,duration,language,difficulty,wpm desc,accuracy desc,created_at) where board_eligible;

create table public.typing_rating_seasons (
 user_id uuid not null references public.typing_profiles(user_id) on delete cascade,
 season_id bigint not null,mmr integer not null check(mmr between 0 and 50000),
 wins integer not null,losses integer not null,draws integer not null,
 archived_at timestamptz not null default now(),primary key(user_id,season_id)
);
alter table public.typing_rating_seasons enable row level security;
revoke all on public.typing_rating_seasons from anon,authenticated;
grant all on public.typing_rating_seasons to service_role;

-- Serialize season-sensitive transactions so a late settlement cannot write into
-- a freshly reset rating. No browser-supplied date or season can trigger a reset.
create function public.typing_roll_season() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare current_season bigint; stored_season bigint;
begin
 perform pg_advisory_xact_lock(hashtext('typing-season-transition'));
 select active_season into stored_season from public.typing_season_config where singleton for update;
 current_season=public.typing_season_number();
 if current_season>stored_season then
  insert into public.typing_rating_seasons(user_id,season_id,mmr,wins,losses,draws)
  select user_id,season_id,mmr,wins,losses,draws from public.typing_ratings where season_id<current_season on conflict do nothing;
  update public.typing_ratings set mmr=1000,wins=0,losses=0,draws=0,season_id=current_season where season_id<current_season;
  delete from public.typing_queue where season_id<current_season;
  update public.typing_season_config set active_season=current_season where singleton;
 end if;
 return public.typing_season_info();
end;$$;
revoke all on function public.typing_roll_season() from public,anon,authenticated;
grant execute on function public.typing_roll_season() to service_role;

create function public.typing_rating_current(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare season jsonb; rating public.typing_ratings;
begin
 season=public.typing_roll_season();
 insert into public.typing_ratings(user_id) values(p_user) on conflict do nothing;
 select * into rating from public.typing_ratings where user_id=p_user;
 return jsonb_build_object('rating',jsonb_build_object('mmr',rating.mmr,'wins',rating.wins,'losses',rating.losses,'draws',rating.draws),'season',season);
end;$$;
revoke all on function public.typing_rating_current(uuid) from public,anon,authenticated;
grant execute on function public.typing_rating_current(uuid) to service_role;

create or replace function public.typing_leaderboard(p_duration integer,p_language text,p_difficulty text)
returns table(user_id uuid,username text,display_name text,avatar_path text,avatar_version bigint,account_tag text,wpm integer,accuracy integer,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select p.user_id,p.username,p.display_name,p.avatar_path,p.avatar_version,p.account_tag,s.wpm,s.accuracy,s.created_at
 from (
  select distinct on (sc.user_id) sc.user_id,sc.wpm,sc.accuracy,sc.created_at
  from public.typing_scores sc where sc.season_id=public.typing_season_number() and sc.board_eligible and sc.duration=p_duration and sc.language=p_language and sc.difficulty=p_difficulty
  order by sc.user_id,sc.wpm desc,sc.accuracy desc,sc.created_at asc
 ) s join public.typing_profiles p on p.user_id=s.user_id
 order by s.wpm desc,s.accuracy desc,s.created_at asc limit 100;
$$;

revoke all on function public.typing_leaderboard(integer,text,text) from public;
grant execute on function public.typing_leaderboard(integer,text,text) to anon,authenticated,service_role;
create or replace function public.typing_commit_score(p_challenge uuid,p_user uuid,p_wpm integer,p_accuracy integer,p_errors integer,p_characters integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ch public.typing_challenges; result public.typing_scores;
begin
 select * into ch from public.typing_challenges where id=p_challenge and user_id=p_user for update;
 if not found then raise exception 'Unknown challenge'; end if;
 if ch.finished then
  select * into result from public.typing_scores where challenge_id=p_challenge;
  return to_jsonb(result);
 end if;
 if ch.started_at is null or now()<ch.started_at+make_interval(secs=>ch.duration) or now()>ch.started_at+make_interval(secs=>ch.duration+12) then raise exception 'Invalid finish time'; end if;
 insert into public.typing_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters,board_eligible,assisted,season_id)
 values(ch.id,ch.user_id,ch.duration,ch.language,ch.difficulty,p_wpm,p_accuracy,p_errors,p_characters,ch.board_eligible and not ch.assisted,ch.assisted,ch.season_id) returning * into result;
 update public.typing_challenges set finished=true,events='[]',target='' where id=ch.id;
 return to_jsonb(result);
end; $$;

create function public.typing_season_board(p_duration integer,p_language text,p_difficulty text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare season jsonb; entries jsonb;
begin
 season=public.typing_roll_season();
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into entries from public.typing_leaderboard(p_duration,p_language,p_difficulty) r;
 return jsonb_build_object('entries',entries,'season',season);
end;$$;
revoke all on function public.typing_season_board(integer,text,text) from public,anon,authenticated;
grant execute on function public.typing_season_board(integer,text,text) to service_role;

alter function public.typing_matchmake(uuid,integer,text,text,text,text) rename to typing_matchmake_pre_seasons;
create function public.typing_matchmake(p_user uuid,p_duration integer,p_language text,p_difficulty text,p_target text,p_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 perform public.typing_roll_season();
 return public.typing_matchmake_pre_seasons(p_user,p_duration,p_language,p_difficulty,p_target,p_code);
end;$$;
revoke all on function public.typing_matchmake(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.typing_matchmake(uuid,integer,text,text,text,text) to service_role;

alter function public.typing_settle_duel(text,uuid) rename to typing_settle_duel_pre_seasons;
create function public.typing_settle_duel(p_code text,p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 perform public.typing_roll_season();
 -- A match created in a finished season cannot award points in the new one.
 update public.typing_duels set rated=false where room_code=p_code and p_user in(host_id,guest_id) and status='racing' and rated and season_id<>public.typing_season_number();
 return public.typing_settle_duel_pre_seasons(p_code,p_user);
end;$$;
revoke all on function public.typing_settle_duel(text,uuid) from public,anon,authenticated;
grant execute on function public.typing_settle_duel(text,uuid) to service_role;
create or replace function public.typing_settle_duel_pre_seasons(p_code text,p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; a public.typing_scores; b public.typing_scores; ar integer; br integer; outcome numeric; change integer; previous_games integer;
begin
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) then raise exception 'Room unavailable'; end if;
 if room.status<>'racing' or now()<room.starts_at+make_interval(secs=>room.duration) then return to_jsonb(room); end if;
 select * into a from public.typing_scores where challenge_id=room.host_challenge;
 select * into b from public.typing_scores where challenge_id=room.guest_challenge;
 if (a.id is null or b.id is null) and now()<room.starts_at+make_interval(secs=>room.duration+12) then return to_jsonb(room); end if;
 if a.id is null and b.id is null then update public.typing_duels set status='cancelled',target='' where id=room.id returning * into room;return to_jsonb(room);end if;
 outcome=case when a.id is null then 0 when b.id is null then 1 when a.wpm>b.wpm then 1 when a.wpm<b.wpm then 0 when a.accuracy>b.accuracy then 1 when a.accuracy<b.accuracy then 0 else 0.5 end;
 if room.rated then
  -- Avoid repeated pairing being used as an unlimited source of rating points.
  select count(*) into previous_games from public.typing_duels d where d.season_id=public.typing_season_number() and d.status='finished' and d.rated and d.created_at>now()-interval '24 hours' and ((d.host_id=room.host_id and d.guest_id=room.guest_id) or (d.host_id=room.guest_id and d.guest_id=room.host_id));
  if previous_games>=3 then room.rated=false; end if;
 end if;
 if room.rated then
  insert into public.typing_ratings(user_id) values(room.host_id),(room.guest_id) on conflict do nothing;
  perform 1 from public.typing_ratings where user_id in (room.host_id,room.guest_id) order by user_id for update;
  select mmr into ar from public.typing_ratings where user_id=room.host_id;
  select mmr into br from public.typing_ratings where user_id=room.guest_id;
  change=round(24*(outcome-1/(1+power(10::numeric,(br-ar)::numeric/400))));
  update public.typing_ratings set mmr=greatest(0,least(50000,mmr+change)),wins=wins+case when outcome=1 then 1 else 0 end,losses=losses+case when outcome=0 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.host_id;
  update public.typing_ratings set mmr=greatest(0,least(50000,mmr-change)),wins=wins+case when outcome=0 then 1 else 0 end,losses=losses+case when outcome=1 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.guest_id;
 end if;
 update public.typing_duels set status='finished',finished_at=now(),target='',rated=room.rated,winner_id=case when outcome=1 then room.host_id when outcome=0 then room.guest_id else null end,
 host_result=coalesce(to_jsonb(a),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),guest_result=coalesce(to_jsonb(b),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),host_delta=case when room.rated then greatest(0,least(50000,ar+change))-ar else 0 end,guest_delta=case when room.rated then greatest(0,least(50000,br-change))-br else 0 end
 where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;

revoke all on function public.typing_settle_duel_pre_seasons(text,uuid) from public,anon,authenticated;
grant execute on function public.typing_settle_duel_pre_seasons(text,uuid) to service_role;
