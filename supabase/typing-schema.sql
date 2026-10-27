-- Auth credentials and challenge logs have no browser grants or policies.
create schema if not exists typing_private;
revoke all on schema typing_private from public, anon, authenticated;
grant usage on schema typing_private to service_role;
create table public.typing_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
 auth_email text unique not null,
 recovery_hash text not null,
 created_at timestamptz not null default now()
);
create table public.typing_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null,
 display_name text not null check (char_length(display_name) between 1 and 24),
 avatar_path text,
 avatar_version bigint not null default 0,
 created_at timestamptz not null default now()
);
create table public.typing_challenges (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 duration integer not null check (duration in (15,30,60,120)),
 language text not null check(language in ('tr','en')),
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 target text not null,
 events jsonb not null default '[]',
 next_seq integer not null default 0,
 created_at timestamptz not null default now(),
 started_at timestamptz,
 finished boolean not null default false,
 expires_at timestamptz not null default now()+interval '5 minutes'
);
create index typing_challenges_user on public.typing_challenges(user_id,created_at desc);
create table public.typing_scores (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid unique not null references public.typing_challenges(id) on delete cascade,
 user_id uuid not null references public.typing_profiles(user_id) on delete cascade,
 duration integer not null check(duration in (15,30,60,120)),
 language text not null check(language in ('tr','en')),
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 wpm integer not null check(wpm between 0 and 400),
 accuracy integer not null check(accuracy between 50 and 100),
 errors integer not null check(errors>=0),
 characters integer not null check(characters>=0),
 created_at timestamptz not null default now()
);
create index typing_scores_board on public.typing_scores(duration,language,difficulty,wpm desc,accuracy desc,created_at asc);
create index typing_scores_user on public.typing_scores(user_id,created_at desc);
create table public.typing_rate_limits (
 key_hash text not null, window_start bigint not null, hits integer not null,
 primary key(key_hash,window_start)
);
alter table public.typing_accounts enable row level security;
alter table public.typing_profiles enable row level security;
alter table public.typing_challenges enable row level security;
alter table public.typing_scores enable row level security;
alter table public.typing_rate_limits enable row level security;
revoke all on public.typing_accounts,public.typing_profiles,public.typing_challenges,public.typing_scores,public.typing_rate_limits from anon,authenticated;
grant all on public.typing_accounts,public.typing_profiles,public.typing_challenges,public.typing_scores,public.typing_rate_limits to service_role;
-- Public display data only. Account emails and recovery hashes are never public.
grant select on public.typing_profiles,public.typing_scores to anon,authenticated;
create policy profiles_public_read on public.typing_profiles for select to anon,authenticated using(true);
create policy scores_public_read on public.typing_scores for select to anon,authenticated using(true);
create function public.typing_rate_hit(p_key text,p_window bigint) returns integer language sql volatile set search_path='' as $$
 insert into public.typing_rate_limits(key_hash,window_start,hits) values(p_key,p_window,1)
 on conflict(key_hash,window_start) do update set hits=public.typing_rate_limits.hits+1 returning hits;
$$;
create function public.typing_leaderboard(p_duration integer,p_language text,p_difficulty text)
returns table(user_id uuid,username text,display_name text,avatar_path text,avatar_version bigint,wpm integer,accuracy integer,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select p.user_id,p.username,p.display_name,p.avatar_path,p.avatar_version,s.wpm,s.accuracy,s.created_at
 from (
  select distinct on (sc.user_id) sc.user_id,sc.wpm,sc.accuracy,sc.created_at
  from public.typing_scores sc where sc.duration=p_duration and sc.language=p_language and sc.difficulty=p_difficulty
  order by sc.user_id,sc.wpm desc,sc.accuracy desc,sc.created_at asc
 ) s join public.typing_profiles p on p.user_id=s.user_id
 order by s.wpm desc,s.accuracy desc,s.created_at asc limit 100;
$$;
create function public.typing_commit_score(p_challenge uuid,p_user uuid,p_wpm integer,p_accuracy integer,p_errors integer,p_characters integer)
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
 insert into public.typing_scores(challenge_id,user_id,duration,language,difficulty,wpm,accuracy,errors,characters)
 values(ch.id,ch.user_id,ch.duration,ch.language,ch.difficulty,p_wpm,p_accuracy,p_errors,p_characters) returning * into result;
 update public.typing_challenges set finished=true,events='[]',target='' where id=ch.id;
 return to_jsonb(result);
end; $$;
-- Definer code is isolated in a non-exposed schema and executable only by service_role.
create function typing_private.session_active(p_session uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user);
$$;
revoke all on function typing_private.session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function typing_private.session_active(uuid,uuid) to service_role;
create function public.typing_session_active(p_session uuid,p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$select typing_private.session_active(p_session,p_user);$$;
revoke all on function public.typing_rate_hit(text,bigint), public.typing_commit_score(uuid,uuid,integer,integer,integer,integer),public.typing_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.typing_rate_hit(text,bigint), public.typing_commit_score(uuid,uuid,integer,integer,integer,integer),public.typing_session_active(uuid,uuid) to service_role;
revoke all on function public.typing_leaderboard(integer,text,text) from public;
grant execute on function public.typing_leaderboard(integer,text,text) to anon,authenticated,service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('typing-avatars','typing-avatars',true,1048576,array['image/jpeg','image/png','image/webp']);
-- Uploads are handled by the authenticated Edge Function; browsers cannot write storage.
