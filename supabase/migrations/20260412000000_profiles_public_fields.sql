-- Campos extra para perfiles visibles en Comunidad (ejecutar en SQL Editor)
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists country text;

comment on column public.profiles.bio is 'Biografía corta, opcional';
comment on column public.profiles.avatar_url is 'URL de imagen de perfil';
comment on column public.profiles.country is 'País o ciudad (texto libre)';
