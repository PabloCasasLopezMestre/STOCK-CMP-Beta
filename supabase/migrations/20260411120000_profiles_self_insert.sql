-- Perfiles que faltan: el trigger a veces no corre (usuario previo al SQL, etc.)
-- 1) Rellenar auth.users sin fila en profiles (ejecutar en SQL Editor; seguro repetir)
insert into public.profiles (id, handle, display_name)
select u.id,
  'u_' || substr(replace(u.id::text, '-', ''), 1, 12),
  'Inversor'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2) Permitir que el cliente cree su propio perfil si aún no existe
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

grant insert on public.profiles to authenticated;
