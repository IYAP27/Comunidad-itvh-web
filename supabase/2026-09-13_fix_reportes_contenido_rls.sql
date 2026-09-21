-- ================================================================
-- Comunidad ITVH Web — corrección RLS de reportes_contenido
-- Compatible con la app móvil: esta tabla es exclusiva del sistema
-- global de reportes web; la app móvil mantiene la tabla `reportes`.
--
-- Puede ejecutarse aunque la migración 2026-09-12 ya se haya aplicado
-- parcialmente. No cambia tablas, columnas ni contratos existentes.
-- ================================================================

alter table public.reportes_contenido enable row level security;

-- Usuarios autenticados pueden crear únicamente reportes propios.
drop policy if exists "usuarios crean reportes de contenido"
  on public.reportes_contenido;
create policy "usuarios crean reportes de contenido"
on public.reportes_contenido
for insert
to authenticated
with check (
  auth.uid() = reportado_por
  and (autor_id is null or autor_id <> auth.uid())
);

-- El autor del reporte puede consultarlo. Los miembros de tabla_admins
-- pueden consultar todos los reportes para moderarlos.
drop policy if exists "usuario puede ver su reporte"
  on public.reportes_contenido;
create policy "usuario puede ver su reporte"
on public.reportes_contenido
for select
to authenticated
using (
  auth.uid() = reportado_por
  or exists (
    select 1
    from public.tabla_admins a
    where a.perfil_id = auth.uid()
  )
);

-- Solo administradores registrados pueden resolver/ignorar reportes.
drop policy if exists "admins moderan reportes de contenido"
  on public.reportes_contenido;
create policy "admins moderan reportes de contenido"
on public.reportes_contenido
for update
to authenticated
using (
  exists (
    select 1
    from public.tabla_admins a
    where a.perfil_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tabla_admins a
    where a.perfil_id = auth.uid()
  )
);
