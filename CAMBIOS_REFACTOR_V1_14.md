# Comunidad ITVH Web — Refactor v1.14

## Alcance
Refactor conservador de Mi Perfil y Feed. No modifica tablas, RLS, RPC, Edge Functions, Auth ni contratos compartidos con la aplicación móvil.

## Cambios
- Nuevo `js/features/perfil/mi-perfil-renderer.js` para el HTML puro del perfil, grid y tarjetas de publicaciones.
- Nuevo `js/features/social/feed-post-renderer.js` para el HTML puro de tarjetas del Feed.
- `mi-perfil.js`: 657 -> 456 líneas.
- `feed.js`: 642 -> 550 líneas.
- Consultas secundarias del perfil (seguidores, seguidos, insignias, destacadas y estado de follow) ahora fallan de forma aislada y usan valores seguros de respaldo.
- Metadatos secundarios de publicaciones del perfil (reacciones/comentarios) ya no impiden mostrar los posts si fallan.
- Metadatos secundarios del Feed (reacciones/comentarios/etiquetas) ya no impiden mostrar publicaciones ante un fallo parcial.
- Renderizado y acceso a datos quedan más separados para facilitar pruebas y mantenimiento.

## Compatibilidad móvil
No se modificaron nombres de tablas/columnas, payloads, tipos de mensajes, funciones SQL ni almacenamiento compartido.
