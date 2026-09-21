-- ================================================================
-- Comunidad ITVH Web — sistema global de reportes
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
--
-- La tabla `reportes` existente se conserva para publicaciones sociales
-- porque la app móvil y sus triggers dependen de ella.
-- Esta tabla agrega moderación para otros módulos sin romper compatibilidad.
-- ================================================================

create table if not exists public.reportes_contenido (
  id uuid primary key default gen_random_uuid(),
  tipo_contenido text not null check (tipo_contenido in (
    'marketplace', 'objeto_perdido', 'evaluacion_maestro', 'perfil', 'comentario'
  )),
  contenido_id text not null,
  reportado_por uuid not null references public.perfiles(id) on delete cascade,
  autor_id uuid references public.perfiles(id) on delete set null,
  motivo text not null check (motivo in (
    'spam','acoso_bullying','contenido_inapropiado','desinformacion','violencia','otro'
  )),
  detalle text,
  metadata jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','resuelto','ignorado')),
  resuelto_por uuid references public.perfiles(id) on delete set null,
  resuelto_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (tipo_contenido, contenido_id, reportado_por)
);

create index if not exists idx_reportes_contenido_estado on public.reportes_contenido(estado, creado_en desc);
create index if not exists idx_reportes_contenido_tipo on public.reportes_contenido(tipo_contenido, contenido_id);
create index if not exists idx_reportes_contenido_autor on public.reportes_contenido(autor_id);

alter table public.reportes_contenido enable row level security;

drop policy if exists "usuarios crean reportes de contenido" on public.reportes_contenido;
create policy "usuarios crean reportes de contenido"
on public.reportes_contenido for insert
to authenticated
with check (auth.uid() = reportado_por and (autor_id is null or autor_id <> auth.uid()));

drop policy if exists "usuario puede ver su reporte" on public.reportes_contenido;
create policy "usuario puede ver su reporte"
on public.reportes_contenido for select
to authenticated
using (
  auth.uid() = reportado_por
  or exists (select 1 from public.tabla_admins a where a.perfil_id = auth.uid())
);

drop policy if exists "admins moderan reportes de contenido" on public.reportes_contenido;
create policy "admins moderan reportes de contenido"
on public.reportes_contenido for update
to authenticated
using (exists (select 1 from public.tabla_admins a where a.perfil_id = auth.uid()))
with check (exists (select 1 from public.tabla_admins a where a.perfil_id = auth.uid()));
