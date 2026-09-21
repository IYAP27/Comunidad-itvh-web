# Comunidad ITVH Web — v1.17 RLS

## Corrección aplicada

La migración `2026-09-12_reportes_globales.sql` consultaba `tabla_admins.usuario_id`, mientras el esquema usado por el proyecto identifica al perfil administrativo con `tabla_admins.perfil_id`.

Se corrigió la migración original y se agregó un parche idempotente:

- `supabase/2026-09-13_fix_reportes_contenido_rls.sql`

El parche no cambia tablas ni columnas. Únicamente reconstruye las tres políticas RLS de `reportes_contenido` con `perfil_id`.

## Compatibilidad móvil

`reportes_contenido` fue añadida para los reportes globales de la web. La app móvil conserva la tabla existente `reportes`, por lo que este cambio no modifica su contrato.

## Auditoría de tablas compartidas

Se agregó `supabase/2026-09-13_auditoria_rls_lectura.sql`. Es un script de solo lectura para obtener el estado RLS y las políticas reales de las tablas compartidas. No deben endurecerse `perfiles`, `tabla_admins`, `publicaciones`, Marketplace, etc. a ciegas porque podrían romper la app móvil.
