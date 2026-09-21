# Comunidad ITVH Web — Refactor y manejo de errores v1.13

## Cambios

- Se extrajo Google Identity Services, Google Drive y el backup cifrado de JaguarChat a `js/features/chat/chat-google-backup-service.js`.
- `ajustes-chat-screen.js` conserva únicamente UI, archivados, notificaciones y orquestación de ajustes.
- El formato de backup v2 compatible con móvil se conserva sin cambios: JSON -> gzip -> AES-256-CBC.
- El feed ahora carga avatar, historias y publicaciones de forma aislada mediante `Promise.allSettled`.
- Un fallo de Historias ya no impide renderizar publicaciones.
- Se añadió estado de error y reintento exclusivo para el carrusel de Historias.
- La suscripción realtime del feed solo se activa si el contenedor renderizado sigue siendo el actual.

## Compatibilidad móvil

No se modificaron tablas, columnas, RLS, RPC, Edge Functions, payloads ni el formato de backup compartido con la aplicación móvil.
