# Comunidad ITVH Web v1.18.4

## Fix menú de publicaciones
- Se eliminó por completo el popup dinámico del botón de tres puntos.
- Cada publicación renderiza un `<details>` nativo dentro de su propio header.
- Las opciones se muestran dentro de la tarjeta, sin coordenadas globales ni `position: fixed`.
- Se versionaron `router.js`, `shell.js`, `feed.js`, `feed-post-renderer.js` y `social.css` con v1.18.4.
- Se eliminaron las referencias a `data-accion="opciones"` y al menú dinámico anterior.

## Acciones administrativas backend
- Nuevo cliente `js/admin/admin-actions-service.js`.
- Nueva Edge Function `supabase/functions/admin-acciones/index.ts`.
- Acciones soportadas inicialmente:
  - cambiar estado de usuario;
  - asignar admin/moderador;
  - revocar admin/moderador;
  - asignar insignia;
  - eliminar insignia;
  - resolver/ignorar reportes.
- La función revalida JWT y nivel administrativo en servidor.
- Usa `SUPABASE_SERVICE_ROLE_KEY` únicamente dentro de la Edge Function.
- El panel conserva fallback temporal a las operaciones actuales si la Edge Function todavía no está desplegada.
- La aplicación móvil no necesita cambios.

## Validación
- 106 archivos JavaScript validados con `node --check`.
- Sin cambios de esquema ni contratos móviles.
