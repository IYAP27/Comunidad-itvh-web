# Comunidad ITVH Web — JaguarChat v1.8

## Cambios

- Se extrajeron las acciones contextuales de mensajes a `js/features/chat/conversacion-acciones.js`.
- El nuevo módulo maneja responder, reaccionar, copiar, reenviar, reintentar, editar y eliminar.
- `conversacion-screen.js` bajó de 978 a 851 líneas.
- Se corrigió el envío de documentos Word/Office desde navegador:
  - DOC/DOCX, XLS/XLSX y PPT/PPTX usan MIME normalizado por extensión permitida.
  - Evita que Windows/Chrome envíen `application/octet-stream` o `application/zip` para un DOCX válido.
  - Se agregó `accept` explícito al selector de documentos.
  - Se agregó validación web de extensiones permitidas antes de subir.
- No se modificaron tablas, columnas, RLS, RPC, Edge Functions ni contratos compartidos con la app móvil.
