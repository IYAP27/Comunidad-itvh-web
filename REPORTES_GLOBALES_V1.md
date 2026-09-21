# Sistema global de reportes — Web v1

Esta versión mantiene compatibilidad con la app móvil:

- **Publicaciones sociales:** usa la tabla existente `reportes` y conserva el trigger que incrementa `total_reportes` / suspende automáticamente cuando corresponda.
- **Marketplace, Cosas Perdidas y evaluaciones de Maestros:** usan la nueva tabla `reportes_contenido`.
- Se evita que un usuario reporte su propio contenido.
- Hay restricción única para evitar reportar dos veces el mismo contenido.
- Los motivos son los mismos de la app móvil: spam, acoso/bullying, contenido inapropiado, desinformación, violencia y otro.
- La UI de reporte es reutilizable y está preparada para añadir perfiles/comentarios después sin duplicar lógica.

## Paso necesario en Supabase

Ejecuta una sola vez en **Supabase > SQL Editor**:

`supabase/2026-09-12_reportes_globales.sql`

No modifica ni reemplaza la tabla `reportes` actual. Solo crea `reportes_contenido` y sus políticas RLS.

El futuro Panel Admin podrá unir `reportes` + `reportes_contenido` en una sola bandeja de moderación.
