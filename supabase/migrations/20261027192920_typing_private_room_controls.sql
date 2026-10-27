-- Private-room points are separate from the competitive ladder. No backfill.
create table public.typing_private_ratings (
 user_id uuid primary key references public.typing_profiles(user_id) on delete cascade,
 mmr integer not null default 1000 check(mmr between 0 and 50000),
 wins integer not null default 0,losses integer not null default 0,draws integer not null default 0
);
alter table public.typing_private_ratings enable row level security;
revoke all on public.typing_private_ratings from public,anon,authenticated;
grant all on public.typing_private_ratings to service_role;
alter table public.typing_duels add column assist_used boolean not null default false;
alter table public.typing_duels add column private_rated boolean not null default false;
alter table public.typing_duels add column host_private_delta integer not null default 0;
alter table public.typing_duels add column guest_private_delta integer not null default 0;

create function public.typing_private_rating_current(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare rating public.typing_private_ratings;
begin
 insert into public.typing_private_ratings(user_id) values(p_user) on conflict do nothing;
 select * into rating from public.typing_private_ratings where user_id=p_user;
 return jsonb_build_object('mmr',rating.mmr,'wins',rating.wins,'losses',rating.losses,'draws',rating.draws);
end;$$;

create function public.typing_room_settings(p_code text,p_user uuid,p_duration integer,p_language text,p_difficulty text,p_target text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels;
begin
 if p_user is null or p_duration is null or p_language is null or p_difficulty is null or p_duration not in (30,60) or p_language not in ('tr','en') or p_difficulty not in ('easy','normal','hard') or length(coalesce(p_target,''))<1 then raise exception 'Invalid settings';end if;
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or room.host_id<>p_user or room.competitive or room.rated or room.status<>'waiting' or room.expires_at<now() then raise exception 'Private waiting host required';end if;
 if (room.duration,room.language,room.difficulty) is distinct from (p_duration,p_language,p_difficulty) then
  update public.typing_duels set duration=p_duration,language=p_language,difficulty=p_difficulty,target=p_target,host_ready=false,guest_ready=false where id=room.id returning * into room;
 end if;
 return to_jsonb(room);
end;$$;

create or replace function public.typing_room_assist(p_code text,p_user uuid,p_enabled boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; challenge uuid;
begin
 if p_user is null or not public.typing_is_admin(p_user) then raise exception 'Admin required';end if;
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) or room.competitive or room.rated or room.status not in ('waiting','racing') then raise exception 'Private active room required';end if;
 if (room.status='waiting' and room.expires_at<now()) or (room.status='racing' and now()>=room.starts_at+make_interval(secs=>room.duration)) then raise exception 'Room closed';end if;
 if room.status='racing' and p_enabled then
  challenge=case when room.host_id=p_user then room.host_challenge else room.guest_challenge end;
  -- Sticky evidence: disabling assist cannot turn an assisted run into a clean one.
  update public.typing_challenges set assisted=true,board_eligible=false where id=challenge;
 end if;
 update public.typing_duels set assist_user_id=case when p_enabled then p_user else null end,
  assist_used=assist_used or (status='racing' and p_enabled),
  host_ready=case when status='waiting' then false else host_ready end,
  guest_ready=case when status='waiting' then false else guest_ready end
 where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;

-- Keep starting challenges and sticky assist evidence in the same transaction.
alter function public.typing_room_ready(text,uuid,boolean) rename to typing_room_ready_pre_private;
create function public.typing_room_ready(p_code text,p_user uuid,p_ready boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result=public.typing_room_ready_pre_private(p_code,p_user,p_ready);
 if result->>'status'='racing' and result->>'assist_user_id' is not null then
  update public.typing_duels set assist_used=true where room_code=p_code returning to_jsonb(typing_duels) into result;
 end if;
 return result;
end;$$;

alter function public.typing_settle_duel(text,uuid) rename to typing_settle_duel_pre_private;
create function public.typing_settle_duel(p_code text,p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; result jsonb; ar integer;br integer;outcome numeric;change integer;previous_games integer;
begin
 -- Same lock order as competitive season settlement, then room, then ratings.
 perform public.typing_roll_season();
 select * into room from public.typing_duels where room_code=p_code for update;
 if p_user is null or not found or p_user not in(room.host_id,coalesce(room.guest_id,room.host_id)) then raise exception 'Room unavailable';end if;
 result=public.typing_settle_duel_pre_private(p_code,p_user);
 if room.status<>'racing' or result->>'status'<>'finished' or room.competitive or room.rated or room.assist_used or room.assist_user_id is not null then return result;end if;
 if exists(select 1 from public.typing_challenges where id in(room.host_challenge,room.guest_challenge) and assisted) then return result;end if;
 select count(*) into previous_games from public.typing_duels d where d.private_rated and d.status='finished' and d.finished_at>now()-interval '24 hours' and ((d.host_id=room.host_id and d.guest_id=room.guest_id) or (d.host_id=room.guest_id and d.guest_id=room.host_id));
 if previous_games>=3 then return result;end if;
 perform public.typing_private_rating_current(least(room.host_id,room.guest_id));
 perform public.typing_private_rating_current(greatest(room.host_id,room.guest_id));
 perform 1 from public.typing_private_ratings where user_id in(room.host_id,room.guest_id) order by user_id for update;
 select mmr into ar from public.typing_private_ratings where user_id=room.host_id;
 select mmr into br from public.typing_private_ratings where user_id=room.guest_id;
 outcome=case when result->>'winner_id'=room.host_id::text then 1 when result->>'winner_id'=room.guest_id::text then 0 else 0.5 end;
 change=round(24*(outcome-1/(1+power(10::numeric,(br-ar)::numeric/400))));
 update public.typing_private_ratings set mmr=greatest(0,least(50000,mmr+change)),wins=wins+(outcome=1)::integer,losses=losses+(outcome=0)::integer,draws=draws+(outcome=0.5)::integer where user_id=room.host_id;
 update public.typing_private_ratings set mmr=greatest(0,least(50000,mmr-change)),wins=wins+(outcome=0)::integer,losses=losses+(outcome=1)::integer,draws=draws+(outcome=0.5)::integer where user_id=room.guest_id;
 update public.typing_duels set private_rated=true,host_private_delta=greatest(0,least(50000,ar+change))-ar,guest_private_delta=greatest(0,least(50000,br-change))-br where id=room.id returning to_jsonb(typing_duels) into result;
 return result;
end;$$;

revoke all on function public.typing_private_rating_current(uuid),public.typing_room_settings(text,uuid,integer,text,text,text),public.typing_room_assist(text,uuid,boolean),public.typing_room_ready(text,uuid,boolean),public.typing_room_ready_pre_private(text,uuid,boolean),public.typing_settle_duel(text,uuid),public.typing_settle_duel_pre_private(text,uuid) from public,anon,authenticated;
grant execute on function public.typing_private_rating_current(uuid),public.typing_room_settings(text,uuid,integer,text,text,text),public.typing_room_assist(text,uuid,boolean),public.typing_room_ready(text,uuid,boolean),public.typing_room_ready_pre_private(text,uuid,boolean),public.typing_settle_duel(text,uuid),public.typing_settle_duel_pre_private(text,uuid) to service_role;
