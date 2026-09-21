# Notificaciones Web v1

Implementado sobre `reportes-globales-v1` y alineado con `notificaciones.dart` de la app móvil.

## Incluye
- Centro de notificaciones sociales con filtros y Realtime.
- Badge de no leídas en la campana.
- Banner en vivo dentro de la web.
- Preferencia para activar/desactivar esos banners.
- Notificaciones nativas del navegador cuando la pestaña está en segundo plano (si el usuario concede permiso).
- Al tocar una notificación:
  - seguidor -> perfil público;
  - like/comentario/respuesta/mención/etiqueta -> publicación concreta;
  - like/comentario de historia -> historia concreta;
  - emprendedor verificado -> Marketplace > Publicar.
- "Leer todo" y marcado al salir, igual que móvil.

## Importante sobre Web Push
La notificación nativa implementada funciona cuando la web sigue abierta (aunque esté minimizada o en otra pestaña). Para recibir notificaciones con el navegador completamente cerrado hace falta configurar Web Push/Firebase para web, service worker y credenciales del proyecto. No se inventaron claves ni configuración que no existan en el proyecto.
