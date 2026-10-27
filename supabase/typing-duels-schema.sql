create table public.typing_ratings (
 user_id uuid primary key references public.typing_profiles(user_id) on delete cascade,
 mmr integer not null default 1000 check(mmr between 0 and 10000),
 wins integer not null default 0,losses integer not null default 0,draws integer not null default 0
);
create table public.typing_duels (
 id uuid primary key default gen_random_uuid(),room_code text unique not null,
 host_id uuid not null references public.typing_profiles(user_id) on delete cascade,
 guest_id uuid references public.typing_profiles(user_id) on delete cascade,
 duration integer not null check(duration in (30,60)),language text not null check(language in ('tr','en')),
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 target text not null,rated boolean not null default false,
 status text not null default 'waiting' check(status in ('waiting','racing','finished','cancelled')),
 host_ready boolean not null default false,guest_ready boolean not null default false,
 host_challenge uuid references public.typing_challenges(id) on delete set null,
 guest_challenge uuid references public.typing_challenges(id) on delete set null,
 starts_at timestamptz,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '10 minutes',
 winner_id uuid references public.typing_profiles(user_id) on delete set null,
 host_result jsonb,guest_result jsonb,host_delta integer not null default 0,guest_delta integer not null default 0,
 check(guest_id is null or guest_id<>host_id)
);
create index typing_duels_host on public.typing_duels(host_id,created_at desc);
create index typing_duels_guest on public.typing_duels(guest_id,created_at desc);
create index typing_duels_winner on public.typing_duels(winner_id);
create index typing_duels_host_challenge on public.typing_duels(host_challenge);
create index typing_duels_guest_challenge on public.typing_duels(guest_challenge);
create table public.typing_queue (
 user_id uuid primary key references public.typing_profiles(user_id) on delete cascade,
 duration integer not null,language text not null,difficulty text not null,
 created_at timestamptz not null default now(),last_seen timestamptz not null default now()
);
alter table public.typing_ratings enable row level security;
alter table public.typing_duels enable row level security;
alter table public.typing_queue enable row level security;
revoke all on public.typing_ratings,public.typing_duels,public.typing_queue from anon,authenticated;
grant all on public.typing_ratings,public.typing_duels,public.typing_queue to service_role;
grant select on public.typing_ratings to anon,authenticated;
create policy ratings_public_read on public.typing_ratings for select to anon,authenticated using(true);
insert into public.typing_ratings(user_id) select user_id from public.typing_profiles;
create function public.typing_room_ready(p_code text,p_user uuid,p_ready boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; start_time timestamptz; host_test uuid; guest_test uuid;
begin
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) then raise exception 'Room unavailable'; end if;
 if room.status<>'waiting' or room.expires_at<now() then raise exception 'Room closed'; end if;
 if p_user=room.host_id then room.host_ready=p_ready; else room.guest_ready=p_ready; end if;
 if room.host_ready and room.guest_ready and room.guest_id is not null then
  start_time=now()+interval '5 seconds';
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,expires_at)
  values(room.host_id,room.duration,room.language,room.difficulty,room.target,start_time,start_time+make_interval(secs=>room.duration+30)) returning id into host_test;
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,expires_at)
  values(room.guest_id,room.duration,room.language,room.difficulty,room.target,start_time,start_time+make_interval(secs=>room.duration+30)) returning id into guest_test;
  update public.typing_duels set host_ready=true,guest_ready=true,status='racing',starts_at=start_time,host_challenge=host_test,guest_challenge=guest_test where id=room.id returning * into room;
 else
  update public.typing_duels set host_ready=room.host_ready,guest_ready=room.guest_ready where id=room.id returning * into room;
 end if;
 return to_jsonb(room);
end;$$;
create function public.typing_matchmake(p_user uuid,p_duration integer,p_language text,p_difficulty text,p_target text,p_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare opponent uuid; room public.typing_duels;
begin
 if p_duration not in (30,60) or p_language not in ('tr','en') or p_difficulty not in ('easy','normal','hard') then raise exception 'Invalid settings'; end if;
 perform pg_advisory_xact_lock(hashtext('typing-match:'||p_duration::text||p_language||p_difficulty));
 select * into room from public.typing_duels where (host_id=p_user or guest_id=p_user) and status in ('waiting','racing') and expires_at>now() order by created_at desc limit 1;
 if found then delete from public.typing_queue where user_id=p_user; return jsonb_build_object('roomCode',room.room_code); end if;
 select q.user_id into opponent from public.typing_queue q where q.user_id<>p_user and q.duration=p_duration and q.language=p_language and q.difficulty=p_difficulty and q.last_seen>now()-interval '10 seconds' order by q.created_at limit 1 for update skip locked;
 if opponent is null then
  insert into public.typing_queue(user_id,duration,language,difficulty) values(p_user,p_duration,p_language,p_difficulty)
  on conflict(user_id) do update set duration=excluded.duration,language=excluded.language,difficulty=excluded.difficulty,last_seen=now();
  return jsonb_build_object('waiting',true);
 end if;
 delete from public.typing_queue where user_id in (p_user,opponent);
 insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated)
 values(p_code,opponent,p_user,p_duration,p_language,p_difficulty,p_target,true) returning * into room;
 return jsonb_build_object('roomCode',room.room_code);
end;$$;
create function public.typing_settle_duel(p_code text,p_user uuid) returns jsonb
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
  select count(*) into previous_games from public.typing_duels d where d.status='finished' and d.rated and d.created_at>now()-interval '24 hours' and ((d.host_id=room.host_id and d.guest_id=room.guest_id) or (d.host_id=room.guest_id and d.guest_id=room.host_id));
  if previous_games>=3 then room.rated=false; end if;
 end if;
 if room.rated then
  insert into public.typing_ratings(user_id) values(room.host_id),(room.guest_id) on conflict do nothing;
  perform 1 from public.typing_ratings where user_id in (room.host_id,room.guest_id) order by user_id for update;
  select mmr into ar from public.typing_ratings where user_id=room.host_id;
  select mmr into br from public.typing_ratings where user_id=room.guest_id;
  change=round(24*(outcome-1/(1+power(10::numeric,(br-ar)::numeric/400))));
  update public.typing_ratings set mmr=greatest(0,least(10000,mmr+change)),wins=wins+case when outcome=1 then 1 else 0 end,losses=losses+case when outcome=0 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.host_id;
  update public.typing_ratings set mmr=greatest(0,least(10000,mmr-change)),wins=wins+case when outcome=0 then 1 else 0 end,losses=losses+case when outcome=1 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.guest_id;
 end if;
 update public.typing_duels set status='finished',target='',rated=room.rated,winner_id=case when outcome=1 then room.host_id when outcome=0 then room.guest_id else null end,
 host_result=coalesce(to_jsonb(a),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),guest_result=coalesce(to_jsonb(b),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),host_delta=coalesce(change,0),guest_delta=-coalesce(change,0)
 where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;
revoke all on function public.typing_room_ready(text,uuid,boolean),public.typing_matchmake(uuid,integer,text,text,text,text),public.typing_settle_duel(text,uuid) from public,anon,authenticated;
grant execute on function public.typing_room_ready(text,uuid,boolean),public.typing_matchmake(uuid,integer,text,text,text,text),public.typing_settle_duel(text,uuid) to service_role;
