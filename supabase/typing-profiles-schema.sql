-- Apply after typing-schema.sql and typing-duels-schema.sql.
-- Public nicknames may repeat; immutable account tags disambiguate login and profiles.
alter table public.typing_profiles drop constraint if exists typing_profiles_username_key;
alter table public.typing_profiles add column account_tag text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
alter table public.typing_profiles add constraint typing_profiles_account_tag_key unique(account_tag);
alter table public.typing_profiles add constraint typing_profiles_account_tag_format check(account_tag ~ '^[A-F0-9]{12}$');
alter table public.typing_challenges add column board_eligible boolean not null default true;
alter table public.typing_challenges add column assisted boolean not null default false;
alter table public.typing_scores add column board_eligible boolean not null default true;
alter table public.typing_scores add column assisted boolean not null default false;
alter table public.typing_scores add constraint typing_scores_assistance_unranked check(not assisted or not board_eligible);
alter table public.typing_duels add column assist_user_id uuid references auth.users(id) on delete set null;
alter table public.typing_duels add constraint typing_duels_assistance_private check(assist_user_id is null or (not rated and (assist_user_id=host_id or coalesce(assist_user_id=guest_id,false))));
update public.typing_challenges c set board_eligible=false from public.typing_duels d where c.id in (d.host_challenge,d.guest_challenge);
update public.typing_scores s set board_eligible=false from public.typing_duels d where s.challenge_id in (d.host_challenge,d.guest_challenge);
alter policy scores_public_read on public.typing_scores using(board_eligible);
create table typing_private.roles(user_id uuid primary key references auth.users(id) on delete cascade,is_admin boolean not null default false);
alter table typing_private.roles enable row level security;
revoke all on typing_private.roles from public,anon,authenticated;
grant select,insert,update,delete on typing_private.roles to service_role;
create function public.typing_is_admin(p_user uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from typing_private.roles where user_id=p_user and is_admin);
$$;
revoke all on function public.typing_is_admin(uuid) from public,anon,authenticated;
grant execute on function public.typing_is_admin(uuid) to service_role;
-- This targets the existing unique login, not a user-editable nickname.
insert into typing_private.roles(user_id,is_admin) select user_id,true from public.typing_accounts where username='boranseason'
on conflict(user_id) do update set is_admin=true;
drop function public.typing_leaderboard(integer,text,text);
create or replace function public.typing_leaderboard(p_duration integer,p_language text,p_difficulty text)
returns table(user_id uuid,username text,display_name text,avatar_path text,avatar_version bigint,account_tag text,wpm integer,accuracy integer,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select p.user_id,p.username,p.display_name,p.avatar_path,p.avatar_version,p.account_tag,s.wpm,s.accuracy,s.created_at
 from (
  select distinct on (sc.user_id) sc.user_id,sc.wpm,sc.accuracy,sc.created_at
  from public.typing_scores sc where sc.board_eligible and sc.duration=p_duration and sc.language=p_language and sc.difficulty=p_difficulty
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
 insert into public.typing_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters,board_eligible,assisted)
 values(ch.id,ch.user_id,ch.duration,ch.language,ch.difficulty,p_wpm,p_accuracy,p_errors,p_characters,ch.board_eligible and not ch.assisted,ch.assisted) returning * into result;
 update public.typing_challenges set finished=true,events='[]',target='' where id=ch.id;
 return to_jsonb(result);
end; $$;
create or replace function public.typing_room_ready(p_code text,p_user uuid,p_ready boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels; start_time timestamptz; host_test uuid; guest_test uuid;
begin
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) then raise exception 'Room unavailable'; end if;
 if room.status<>'waiting' or room.expires_at<now() then raise exception 'Room closed'; end if;
 if p_user=room.host_id then room.host_ready=p_ready; else room.guest_ready=p_ready; end if;
 if room.host_ready and room.guest_ready and room.guest_id is not null then
  start_time=now()+interval '5 seconds';
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,expires_at,board_eligible,assisted)
  values(room.host_id,room.duration,room.language,room.difficulty,room.target,start_time,start_time+make_interval(secs=>room.duration+30),false,coalesce(room.assist_user_id=room.host_id,false)) returning id into host_test;
  insert into public.typing_challenges(user_id,duration,language,difficulty,target,started_at,expires_at,board_eligible,assisted)
  values(room.guest_id,room.duration,room.language,room.difficulty,room.target,start_time,start_time+make_interval(secs=>room.duration+30),false,coalesce(room.assist_user_id=room.guest_id,false)) returning id into guest_test;
  update public.typing_duels set host_ready=true,guest_ready=true,status='racing',starts_at=start_time,host_challenge=host_test,guest_challenge=guest_test where id=room.id returning * into room;
 else
  update public.typing_duels set host_ready=room.host_ready,guest_ready=room.guest_ready where id=room.id returning * into room;
 end if;
 return to_jsonb(room);
end;$$;

create function public.typing_room_assist(p_code text,p_user uuid,p_enabled boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare room public.typing_duels;
begin
 if not public.typing_is_admin(p_user) then raise exception 'Admin required'; end if;
 select * into room from public.typing_duels where room_code=p_code for update;
 if not found or p_user not in (room.host_id,coalesce(room.guest_id,room.host_id)) or room.rated or room.status<>'waiting' or room.expires_at<now() then raise exception 'Private waiting room required'; end if;
 update public.typing_duels set assist_user_id=case when p_enabled then p_user else null end,host_ready=false,guest_ready=false where id=room.id returning * into room;
 return to_jsonb(room);
end;$$;
revoke all on function public.typing_room_assist(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.typing_room_assist(text,uuid,boolean) to service_role;
create function public.typing_public_stats(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('tests',count(*),'bestWpm',coalesce(max(wpm),0),'averageWpm',coalesce(round(avg(wpm)),0),'accuracy',coalesce(round(avg(accuracy)),0))
 from public.typing_scores where user_id=p_user and board_eligible;
$$;
revoke all on function public.typing_public_stats(uuid) from public,anon,authenticated;
grant execute on function public.typing_public_stats(uuid) to service_role;
