-- Tabla user_data: portafolio, alertas de precio y preferencias por usuario
-- Separada de profiles para no mezclar datos de comunidad con datos de trading

create table public.user_data (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  portfolio    jsonb not null default '{}',
  price_alerts jsonb not null default '[]',
  preferences  jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);

-- Habilitar Row Level Security
alter table public.user_data enable row level security;

-- Política SELECT: cada usuario solo puede leer su propia fila
create policy "user_data_select_own"
  on public.user_data
  for select
  to authenticated
  using (user_id = auth.uid());

-- Política INSERT: cada usuario solo puede insertar su propia fila
create policy "user_data_insert_own"
  on public.user_data
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Política UPDATE: cada usuario solo puede actualizar su propia fila
create policy "user_data_update_own"
  on public.user_data
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
