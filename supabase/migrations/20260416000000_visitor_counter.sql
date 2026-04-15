-- Visitor counter table
-- Tracks daily unique visits and total historical visits

create table if not exists public.visitor_stats (
  id text primary key default 'global',
  total_visits bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_daily (
  day date primary key default current_date,
  visits bigint not null default 0
);

-- Allow anonymous reads and inserts/updates
alter table public.visitor_stats enable row level security;
alter table public.visitor_daily enable row level security;

drop policy if exists "visitor_stats_select" on public.visitor_stats;
create policy "visitor_stats_select" on public.visitor_stats for select using (true);

drop policy if exists "visitor_stats_upsert" on public.visitor_stats;
create policy "visitor_stats_upsert" on public.visitor_stats for all using (true) with check (true);

drop policy if exists "visitor_daily_select" on public.visitor_daily;
create policy "visitor_daily_select" on public.visitor_daily for select using (true);

drop policy if exists "visitor_daily_upsert" on public.visitor_daily;
create policy "visitor_daily_upsert" on public.visitor_daily for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.visitor_stats to anon, authenticated;
grant select, insert, update on public.visitor_daily to anon, authenticated;

-- Seed the global row
insert into public.visitor_stats (id, total_visits) values ('global', 0) on conflict (id) do nothing;
