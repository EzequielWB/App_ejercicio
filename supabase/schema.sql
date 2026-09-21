-- ============================================================
-- Bitácora de Entrenamiento · esquema para Supabase
-- Ejecutar UNA VEZ en el SQL Editor de tu proyecto Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Contraseña (solo el hash bcrypt). Cambiá 'Ezequiel2014' si algún día querés otra.
create table if not exists public.app_secrets (
  id integer primary key default 1 check (id = 1),
  password_hash text not null
);

insert into public.app_secrets (password_hash)
values (crypt('Ezequiel2014', gen_salt('bf')))
on conflict (id) do nothing;

-- 2) Datos de la app: una sola fila con todo el estado en jsonb
create table if not exists public.app_data (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_data (data) values ('{}'::jsonb) on conflict (id) do nothing;

-- 3) Sesiones de login (token aleatorio)
create table if not exists public.app_sessions (
  token uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_used timestamptz not null default now()
);

-- 4) RLS: nadie toca las tablas directo, solo vía las funciones de abajo
alter table public.app_secrets   enable row level security;
alter table public.app_data      enable row level security;
alter table public.app_sessions  enable row level security;

revoke all on public.app_secrets   from anon, authenticated;
revoke all on public.app_data      from anon, authenticated;
revoke all on public.app_sessions  from anon, authenticated;

-- 5) Funciones RPC (security definer: solo con la contraseña correcta)

create or replace function public.app_login(p_password text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_token uuid;
begin
  select password_hash into v_hash from public.app_secrets where id = 1;
  if v_hash is null or crypt(p_password, v_hash) <> v_hash then
    return null;
  end if;
  delete from public.app_sessions where last_used < now() - interval '30 days';
  insert into public.app_sessions default values returning token into v_token;
  return v_token;
end $$;

create or replace function public.app_load(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
begin
  if not exists (select 1 from public.app_sessions where token = p_token) then
    return null;
  end if;
  update public.app_sessions set last_used = now() where token = p_token;
  select coalesce(data, '{}'::jsonb) into v_data from public.app_data where id = 1;
  return coalesce(v_data, '{}'::jsonb);
end $$;

create or replace function public.app_save(p_token uuid, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_sessions where token = p_token) then
    return false;
  end if;
  update public.app_sessions set last_used = now() where token = p_token;
  insert into public.app_data (id, data, updated_at)
  values (1, p_data, now())
  on conflict (id) do update
    set data = excluded.data, updated_at = now();
  return true;
end $$;

create or replace function public.app_logout(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.app_sessions where token = p_token;
end $$;

-- 6) Permisos
grant execute on function public.app_login(text)  to anon, authenticated;
grant execute on function public.app_load(uuid)   to anon, authenticated;
grant execute on function public.app_save(uuid, jsonb) to anon, authenticated;
grant execute on function public.app_logout(uuid) to anon, authenticated;