# Comunidad ITVH Web — JaguarChat v1.7

## Objetivo
Refactorizar adjuntos y multimedia de la conversación web sin modificar esquema de base de datos, contratos de mensajes ni código de la aplicación móvil.

## Cambios
- Nuevo `js/features/chat/conversacion-adjuntos.js` para foto/video, documentos, pegado desde portapapeles, emojis y stickers.
- Nuevo `js/features/chat/conversacion-media.js` para render de imagen/video/audio/sticker/documento, visor de imágenes, reproducción inline y preview previo al envío.
- `conversacion-screen.js` baja de 1284 a 978 líneas.
- El cierre/desmontaje de la conversación ahora también destruye el controlador de adjuntos y cierra previews locales abiertos.
- Se revocan correctamente las URLs `blob:` de previews al cerrar/enviar para evitar retención innecesaria de memoria.
- El visor de imágenes y el reproductor inline se construyen con DOM en lugar de interpolar la URL mediante `innerHTML`.
- Se conserva el formato actual de mensajes y las llamadas existentes a `ChatMediaService`.

## Compatibilidad móvil
No se modificaron tablas, columnas, RLS, RPC, Edge Functions, tipos de mensaje, payloads compartidos ni código móvil.
