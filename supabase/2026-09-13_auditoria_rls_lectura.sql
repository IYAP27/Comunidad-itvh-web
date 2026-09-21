-- ================================================================
-- Comunidad ITVH — auditoría RLS SOLO LECTURA
-- No modifica la base de datos.
--
-- Ejecutar en Supabase > SQL Editor para revisar las políticas de las
-- tablas que usa el panel web antes de endurecer tablas compartidas con
-- la app móvil.
-- ================================================================

select
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
from pg_tables
where schemaname = 'public'
  and tablename in (
    'perfiles',
    'tabla_admins',
    'insignias',
    'publicaciones',
    'reportes',
    'reportes_contenido',
    'auditoria_admin',
    'marketplace_publicaciones',
    'emprendedores',
    'evaluaciones',
    'objetos_perdidos'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'perfiles',
    'tabla_admins',
    'insignias',
    'publicaciones',
    'reportes',
    'reportes_contenido',
    'auditoria_admin',
    'marketplace_publicaciones',
    'emprendedores',
    'evaluaciones',
    'objetos_perdidos'
  )
order by tablename, policyname;
