# JaguarChat Web — cierre funcional (septiembre 2026)

Esta versión integra una tanda grande de funciones de paridad con la app móvil:

- Pegar imágenes/capturas con Ctrl+V en el composer.
- Presencia en línea dentro de la conversación y en la lista de chats.
- Vista rápida de perfil al tocar avatar/nombre.
- Panel de emojis.
- Stickers recientes persistidos en localStorage.
- Subir stickers WEBP/PNG/GIF y reenviar stickers ya subidos.
- Copiar mensajes de texto.
- Reenviar mensajes a otro usuario.
- Notas de voz con MediaRecorder + envío a R2 + reproductor en burbuja.
- Menú de chat: fijar, silenciar, archivar y eliminar conversación local.
- Reintento de mensajes fallidos y estado entregado.
- Notificaciones del navegador (se activan desde JaguarChat > Ajustes).
- Ajustes con archivados + Google Drive backup/restauración de la versión anterior.

## Notas

- "Última vez" no se muestra porque tanto móvil como web usan Supabase Realtime Presence, que solo mantiene estado en línea actual y no persiste last_seen.
- El estado "leído por la otra persona" requiere un evento/tabla remota de recibos de lectura. El esquema actual permite mostrar enviando / entregado / fallido y reintentar.
- Las notas de voz priorizan audio/mp4 cuando el navegador lo soporta; Chrome normalmente usa WebM/Opus. storage-r2 conserva el MIME real.
- Las notificaciones no fuerzan el prompt: el usuario debe activarlas desde Ajustes de JaguarChat.
