-- Apply after the existing accounts, duels and profile schemas. No rating reset.
alter table public.typing_ratings drop constraint typing_ratings_mmr_check;
alter table public.typing_ratings add constraint typing_ratings_mmr_check check(mmr between 0 and 50000);

alter table public.typing_duels add column competitive boolean not null default false;
update public.typing_duels set competitive=true where rated;
alter table public.typing_duels add column finished_at timestamptz;
alter table public.typing_duels add column rematch_of uuid references public.typing_duels(id) on delete set null;
alter table public.typing_duels add column host_rematch boolean not null default false;
alter table public.typing_duels add column guest_rematch boolean not null default false;
alter table public.typing_duels add column rematch_room_code text references public.typing_duels(room_code) on delete set null;
create unique index typing_duels_one_rematch on public.typing_duels(rematch_of) where rematch_of is not null;

alter table public.typing_profiles add column is_verified boolean not null default false;
alter table public.typing_profiles add column is_developer boolean not null default false;
-- The legacy login is immutable and server-owned; display names are not identity.
update public.typing_profiles p set is_verified=true,is_developer=true
from public.typing_accounts a where a.user_id=p.user_id and a.username='boranseason';

create or replace function public.typing_match_radius(p_wait_seconds double precision)
returns integer language sql immutable security invoker set search_path='' as $$
 select least(1000,100+100*floor(greatest(0,coalesce(p_wait_seconds,0))/15))::integer;
$$;
revoke all on function public.typing_match_radius(double precision) from public,anon,authenticated;
grant execute on function public.typing_match_radius(double precision) to service_role;

create or replace function public.typing_matchmake(p_user uuid,p_duration integer,p_language text,p_difficulty text,p_target text,p_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare opponent uuid; room public.typing_duels; own_rating integer; joined_at timestamptz; own_radius integer;
begin
 if p_duration not in (30,60) or p_language not in ('tr','en') or p_difficulty not in ('easy','normal','hard') then raise exception 'Invalid settings'; end if;
 -- A player cannot race two requests against different settings queues.
 perform pg_advisory_xact_lock(hashtext('typing-player:'||p_user::text));
 perform pg_advisory_xact_lock(hashtext('typing-match:'||p_duration::text||p_language||p_difficulty));
 select * into room from public.typing_duels where (host_id=p_user or guest_id=p_user) and status in ('waiting','racing') and expires_at>now() order by created_at desc limit 1;
 if found then delete from public.typing_queue where user_id=p_user; return jsonb_build_object('roomCode',room.room_code); end if;
 insert into public.typing_ratings(user_id) values(p_user) on conflict do nothing;
 select mmr into own_rating from public.typing_ratings where user_id=p_user;
 -- Heartbeats preserve waiting time only while the same live search continues.
 insert into public.typing_queue as queued(user_id,duration,language,difficulty) values(p_user,p_duration,p_language,p_difficulty)
 on conflict(user_id) do update set
  created_at=case when queued.duration=excluded.duration and queued.language=excluded.language and queued.difficulty=excluded.difficulty and queued.last_seen>now()-interval '10 seconds' then queued.created_at else now() end,
  duration=excluded.duration,language=excluded.language,difficulty=excluded.difficulty,last_seen=now()
 returning created_at into joined_at;
 own_radius=public.typing_match_radius(extract(epoch from now()-joined_at)::double precision);
 select q.user_id into opponent from public.typing_queue q
 left join public.typing_ratings r on r.user_id=q.user_id
 where q.user_id<>p_user and q.duration=p_duration and q.language=p_language and q.difficulty=p_difficulty and q.last_seen>now()-interval '10 seconds'
 and abs(coalesce(r.mmr,1000)-own_rating)<=least(own_radius,public.typing_match_radius(extract(epoch from now()-q.created_at)::double precision))
 and not exists(select 1 from public.typing_duels d where (d.host_id=q.user_id or d.guest_id=q.user_id) and d.status in ('waiting','racing') and d.expires_at>now())
 order by abs(coalesce(r.mmr,1000)-own_rating),q.created_at,q.user_id limit 1 for update of q skip locked;
 if opponent is null then return jsonb_build_object('waiting',true,'ratingWindow',own_radius); end if;
 delete from public.typing_queue where user_id in (p_user,opponent);
 insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive)
 values(p_code,opponent,p_user,p_duration,p_language,p_difficulty,p_target,true,true) returning * into room;
 return jsonb_build_object('roomCode',room.room_code);
end;$$;
revoke all on function public.typing_matchmake(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.typing_matchmake(uuid,integer,text,text,text,text) to service_role;

create or replace function public.typing_settle_duel(p_code text,p_user uuid) returns jsonb
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
  update public.typing_ratings set mmr=greatest(0,least(50000,mmr+change)),wins=wins+case when outcome=1 then 1 else 0 end,losses=losses+case when outcome=0 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.host_id;
  update public.typing_ratings set mmr=greatest(0,least(50000,mmr-change)),wins=wins+case when outcome=0 then 1 else 0 end,losses=losses+case when outcome=1 then 1 else 0 end,draws=draws+case when outcome=0.5 then 1 else 0 end where user_id=room.guest_id;
 end if;
 update public.typing_duels set status='finished',finished_at=now(),target='',rated=room.rated,winner_id=case when outcome=1 then room.host_id when outcome=0 then room.guest_id else null end,
 host_result=coalesce(to_jsonb(a),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),guest_result=coalesce(to_jsonb(b),'{"wpm":0,"accuracy":0,"forfeit":true}'::jsonb),host_delta=case when room.rated then greatest(0,least(50000,ar+change))-ar else 0 end,guest_delta=case when room.rated then greatest(0,least(50000,br-change))-br else 0 end
 where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;

revoke all on function public.typing_settle_duel(text,uuid) from public,anon,authenticated;
grant execute on function public.typing_settle_duel(text,uuid) to service_role;

create or replace function public.typing_room_rematch(p_code text,p_user uuid,p_requested boolean,p_target text,p_next_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; next_room public.typing_duels;
begin
 if p_user is null then raise exception 'Room unavailable'; end if;
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) or room.guest_id is null then raise exception 'Room unavailable'; end if;
 if room.status<>'finished' then raise exception 'Finished match required'; end if;
 if room.rematch_room_code is not null then return to_jsonb(room); end if;
 if coalesce(room.finished_at,room.starts_at+make_interval(secs=>room.duration),room.created_at)<now()-interval '10 minutes' then raise exception 'Rematch expired'; end if;
 if exists(select 1 from public.typing_duels d where d.id<>room.id and d.status in ('waiting','racing') and d.expires_at>now() and (d.host_id in (room.host_id,room.guest_id) or d.guest_id in (room.host_id,room.guest_id))) then raise exception 'Player already in another room'; end if;
 if p_user=room.host_id then room.host_rematch=p_requested; else room.guest_rematch=p_requested; end if;
 if room.host_rematch and room.guest_rematch then
  perform pg_advisory_xact_lock(hashtext('typing-player:'||least(room.host_id,room.guest_id)::text));
  perform pg_advisory_xact_lock(hashtext('typing-player:'||greatest(room.host_id,room.guest_id)::text));
  -- Lock/remove queue entries before the second active-room check. A concurrent
  -- matcher either wins first or skips these rows; it cannot create a second room.
  delete from public.typing_queue where user_id in(room.host_id,room.guest_id);
  if exists(select 1 from public.typing_duels d where d.id<>room.id and d.status in ('waiting','racing') and d.expires_at>now() and (d.host_id in (room.host_id,room.guest_id) or d.guest_id in (room.host_id,room.guest_id))) then raise exception 'Player already in another room'; end if;
  insert into public.typing_duels(room_code,host_id,guest_id,duration,language,difficulty,target,rated,competitive,rematch_of)
  values(p_next_code,room.host_id,room.guest_id,room.duration,room.language,room.difficulty,p_target,room.competitive,room.competitive,room.id)
  returning * into next_room;
  room.rematch_room_code=next_room.room_code;
 end if;
 update public.typing_duels set host_rematch=room.host_rematch,guest_rematch=room.guest_rematch,rematch_room_code=room.rematch_room_code where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;
revoke all on function public.typing_room_rematch(text,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.typing_room_rematch(text,uuid,boolean,text,text) to service_role;

create or replace function public.typing_match_history(p_user uuid,p_opponent uuid,p_offset integer) returns jsonb
language sql stable security invoker set search_path='' as $$
 with matches as (
  select d.*,case when d.host_id=p_user then d.guest_id else d.host_id end as opponent_id,
   case when d.host_id=p_user then d.host_result else d.guest_result end as own_result,
   case when d.host_id=p_user then d.guest_result else d.host_result end as other_result,
   case when d.host_id=p_user then d.host_delta else d.guest_delta end as rating_delta
  from public.typing_duels d where d.status='finished' and p_user in (d.host_id,d.guest_id)
   and (p_opponent is null or p_opponent=case when d.host_id=p_user then d.guest_id else d.host_id end)
 ), summary as (
  select count(*) as total,count(*) filter(where winner_id=p_user) as wins,
   count(*) filter(where winner_id is not null and winner_id<>p_user) as losses,
   count(*) filter(where winner_id is null) as draws from matches
 ), page as (
  select m.*,p.display_name,p.account_tag,p.is_verified,p.is_developer
  from matches m join public.typing_profiles p on p.user_id=m.opponent_id
  order by coalesce(m.finished_at,m.starts_at+make_interval(secs=>m.duration),m.created_at) desc,m.id desc
  limit 20 offset greatest(0,least(10000,coalesce(p_offset,0)))
 )
 select jsonb_build_object('stats',(select to_jsonb(summary) from summary),'results',coalesce((select jsonb_agg(jsonb_build_object(
  'code',room_code,'date',coalesce(finished_at,starts_at+make_interval(secs=>duration),created_at),'competitive',competitive,'rated',rated,
  'duration',duration,'language',language,'difficulty',difficulty,'outcome',case when winner_id=p_user then 'win' when winner_id is null then 'draw' else 'loss' end,
  'wpm',coalesce((own_result->>'wpm')::integer,0),'accuracy',coalesce((own_result->>'accuracy')::integer,0),'opponentWpm',coalesce((other_result->>'wpm')::integer,0),
  'ratingDelta',rating_delta,'opponent',jsonb_build_object('user_id',opponent_id,'display_name',display_name,'account_tag',account_tag,'is_verified',is_verified,'is_developer',is_developer)
 )) from page),'[]'::jsonb),'hasMore',(select greatest(0,least(10000,coalesce(p_offset,0)))+20<least(total,10020) from summary));
$$;
revoke all on function public.typing_match_history(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.typing_match_history(uuid,uuid,integer) to service_role;
