-- Comunidad ITVH Web — Auditoría administrativa persistente
-- Aditivo: crea una tabla nueva exclusiva del panel web.
-- No modifica tablas, columnas ni políticas consumidas por la app móvil.

create table if not exists public.auditoria_admin (
  id uuid primary key default gen_random_uuid(),
  admin_perfil_id uuid not null,
  admin_nivel text null,
  accion text not null,
  objetivo_tipo text null,
  objetivo_id text null,
  motivo text null,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists auditoria_admin_creado_en_idx
  on public.auditoria_admin (creado_en desc);

create index if not exists auditoria_admin_admin_perfil_id_idx
  on public.auditoria_admin (admin_perfil_id, creado_en desc);

create index if not exists auditoria_admin_accion_idx
  on public.auditoria_admin (accion, creado_en desc);

alter table public.auditoria_admin enable row level security;

-- La auditoría es inmutable desde clientes: no se conceden UPDATE ni DELETE.
revoke all on table public.auditoria_admin from anon;
revoke update, delete on table public.auditoria_admin from authenticated;
grant select, insert on table public.auditoria_admin to authenticated;

drop policy if exists "admins registran su propia auditoria" on public.auditoria_admin;
create policy "admins registran su propia auditoria"
on public.auditoria_admin
for insert
to authenticated
with check (
  admin_perfil_id = auth.uid()
  and exists (
    select 1
    from public.tabla_admins a
    where a.perfil_id = auth.uid()
  )
);

drop policy if exists "admins consultan auditoria" on public.auditoria_admin;
create policy "admins consultan auditoria"
on public.auditoria_admin
for select
to authenticated
using (
  exists (
    select 1
    from public.tabla_admins a
    where a.perfil_id = auth.uid()
      and lower(coalesce(a.nivel, '')) = 'admin'
  )
);

-- Guarda el nivel real del actor desde tabla_admins, ignorando cualquier
-- valor que intente enviar el cliente.
create or replace function public.auditoria_admin_set_nivel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.creado_en := now();

  select a.nivel
    into new.admin_nivel
  from public.tabla_admins a
  where a.perfil_id = new.admin_perfil_id
  limit 1;

  return new;
end;
$$;

drop trigger if exists trg_auditoria_admin_set_nivel on public.auditoria_admin;
create trigger trg_auditoria_admin_set_nivel
before insert on public.auditoria_admin
for each row
execute function public.auditoria_admin_set_nivel();
