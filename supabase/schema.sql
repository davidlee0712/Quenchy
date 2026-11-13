-- Quenchie database setup.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run more than once.

-- ---------- tables ----------

-- Public-to-friends profile: name, friend code, goal, sharing switch.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Friend',
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  goal_ml int not null default 2000 check (goal_ml between 100 and 10000),
  sharing boolean not null default true,
  created_at timestamptz not null default now()
);

-- Private settings (age, sex, bottle size, saved drinks, reminders). Only the owner can read it.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per drink logged.
create table if not exists public.drinks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  ts timestamptz not null default now(),
  name text not null check (length(name) between 1 and 80),
  ml int not null check (ml between 1 and 5000),
  meal text not null check (meal in ('morning', 'afternoon', 'evening')),
  client_id text unique
);
create index if not exists drinks_user_day on public.drinks (user_id, day);

-- Friend links, stored in both directions.
create table if not exists public.friendships (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ---------- helpers ----------

create or replace function public.is_friend(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_id = auth.uid() and friend_id = other);
$$;

create or replace function public.add_friend(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select id into other from profiles where friend_code = upper(trim(code));
  if other is null then raise exception 'No one has that friend code. Check it and try again.'; end if;
  if other = auth.uid() then raise exception 'That is your own friend code.'; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), other) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (other, auth.uid()) on conflict do nothing;
  return other;
end $$;

create or replace function public.remove_friend(other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
  where (user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid());
end $$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row level security ----------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.drinks enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles: read own or friends" on public.profiles;
create policy "profiles: read own or friends" on public.profiles
  for select using (id = auth.uid() or public.is_friend(id));
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "settings: own only" on public.user_settings;
create policy "settings: own only" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "drinks: own" on public.drinks;
create policy "drinks: own" on public.drinks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "drinks: friends who share" on public.drinks;
create policy "drinks: friends who share" on public.drinks
  for select using (
    public.is_friend(user_id)
    and exists (select 1 from public.profiles p where p.id = drinks.user_id and p.sharing)
  );

drop policy if exists "friendships: see own" on public.friendships;
create policy "friendships: see own" on public.friendships
  for select using (user_id = auth.uid() or friend_id = auth.uid());

-- ---------- live updates ----------

do $$
begin
  begin alter publication supabase_realtime add table public.drinks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
end $$;
