# Comunidad ITVH Web — Limpieza v1.12

## Cambios
- Eliminados imports sin uso (`supabase` y `usuarioActual`) en `marketplace-home.js`.
- Eliminada la función muerta `_requiereNivel()` de `panel-admin.js`; las acciones sensibles ya usan `_revalidarNivel()`.
- Centralizados `escapeHtml` y `escapeAttr` en `js/core/html-utils.js`.
- Eliminadas las implementaciones locales duplicadas de sanitización en mapa, perfil, social, historias y JaguarChat.
- La sanitización de atributos queda más consistente al escapar tanto comillas dobles como simples.

## Compatibilidad
No se modificaron tablas, columnas, RLS, RPC, Edge Functions, tipos de mensaje ni contratos compartidos con la app móvil.
