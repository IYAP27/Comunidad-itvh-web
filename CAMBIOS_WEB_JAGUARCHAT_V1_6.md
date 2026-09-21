# Comunidad ITVH Web — JaguarChat v1.6

## Alcance
Refactor interno de notas de voz y seguridad de ciclo de vida de la conversación. No modifica base de datos, RLS, RPC, Edge Functions ni contratos usados por la app móvil.

## Cambios
- Nuevo `js/features/chat/conversacion-audio-recorder.js`.
- `MediaRecorder`, stream del micrófono, chunks y temporizador salen de `conversacion-screen.js`.
- La limpieza al desmontar ahora cancela una grabación en curso sin enviarla accidentalmente.
- Si el permiso de micrófono termina de resolverse después de desmontar el chat, el stream se cierra y no se inicia la grabación.
- Se centraliza `escapeHtml/escapeAttr` usando `js/core/html-utils.js`.
- `conversacion-screen.js` baja de 1321 a 1284 líneas en esta primera extracción.

## Compatibilidad móvil
Sin cambios en esquema, tablas, columnas, políticas, RPC, autenticación compartida o formato de mensajes.
