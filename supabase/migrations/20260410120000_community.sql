-- STOCK-CMP Comunidad — ejecutar en Supabase SQL Editor o: supabase db push
-- Requiere: Authentication → Providers → habilitar "Anonymous sign-ins"

-- Perfiles (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Crear fila en profiles al registrarse (incl. usuarios anónimos)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'u_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data->>'full_name', 'Inversor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ideas / publicaciones
create table if not exists public.community_ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  sentiment text not null check (sentiment in ('bullish', 'bearish', 'neutral')),
  tickers text[] not null default '{}',
  chart_url text,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint community_ideas_body_len check (char_length(body) between 1 and 500),
  constraint community_ideas_tickers_len check (
    array_length(tickers, 1) is null or array_length(tickers, 1) between 1 and 5
  )
);

create index if not exists community_ideas_created_at_idx on public.community_ideas (created_at desc);
create index if not exists community_ideas_like_count_idx on public.community_ideas (like_count desc);

alter table public.community_ideas enable row level security;

drop policy if exists "community_ideas_select_all" on public.community_ideas;
create policy "community_ideas_select_all"
  on public.community_ideas for select
  using (true);

drop policy if exists "community_ideas_insert_own" on public.community_ideas;
create policy "community_ideas_insert_own"
  on public.community_ideas for insert
  with check (auth.uid() = author_id);

-- Likes
create table if not exists public.community_idea_likes (
  idea_id uuid not null references public.community_ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.community_idea_likes enable row level security;

drop policy if exists "community_likes_select_all" on public.community_idea_likes;
create policy "community_likes_select_all"
  on public.community_idea_likes for select
  using (true);

drop policy if exists "community_likes_insert_own" on public.community_idea_likes;
create policy "community_likes_insert_own"
  on public.community_idea_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_likes_delete_own" on public.community_idea_likes;
create policy "community_likes_delete_own"
  on public.community_idea_likes for delete
  using (auth.uid() = user_id);

-- Mantener like_count en ideas
create or replace function public.community_sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_ideas set like_count = like_count + 1 where id = new.idea_id;
  elsif tg_op = 'DELETE' then
    update public.community_ideas set like_count = greatest(0, like_count - 1) where id = old.idea_id;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_community_like_sync on public.community_idea_likes;
create trigger tr_community_like_sync
  after insert or delete on public.community_idea_likes
  for each row execute function public.community_sync_like_count();

-- API: lectura pública del feed; escritura solo autenticado (anon incluido)
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select on public.community_ideas to anon, authenticated;
grant insert on public.community_ideas to authenticated;
grant select, insert, delete on public.community_idea_likes to authenticated;
