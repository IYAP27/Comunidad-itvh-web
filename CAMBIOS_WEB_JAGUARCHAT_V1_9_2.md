# JaguarChat v1.9.2 - Fix responder mensajes

- Se restauraron los imports `esMedia` y `textoPreview` en `conversacion-screen.js`.
- Corrige `ReferenceError: esMedia is not defined` al usar Responder.
- El preview de respuestas vuelve a soportar texto, imagen, video, audio, documento y sticker.
- No se modifican tablas, RLS, RPC, Edge Functions ni contratos compartidos con la app móvil.
