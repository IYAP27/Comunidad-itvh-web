# Comunidad ITVH Web — JaguarChat v1.9

## Cambios
- Se extrajo el renderizado/listeners de la lista de mensajes a `js/features/chat/conversacion-renderer.js`.
- `conversacion-screen.js` baja de 851 a ~679 líneas y queda más centrado en ciclo de vida/composer/conversación.
- Se corrigió el selector de mensajes citados usando `CSS.escape` para IDs dinámicos.
- La subida de documentos Office ahora prueba MIME alternativos compatibles cuando la Edge Function rechaza el MIME oficial.
  - DOCX/XLSX/PPTX prueban primero su MIME oficial y luego `application/zip` (OOXML es un contenedor ZIP).
  - DOC prueba MIME oficial y alias histórico.
- Si la Edge Function sigue rechazando Word, la UI muestra el error real del servidor en vez de un mensaje genérico.

## Compatibilidad móvil
No se modificaron tablas, columnas, RLS, RPC, Edge Functions, payloads de mensajes ni código móvil.
