# Comunidad ITVH Web — JaguarChat v1.9.1

## Corrección crítica del composer

- Restaurado el listener `submit` de `#conv-composer`, eliminado accidentalmente durante el refactor iniciado en v1.7.
- Vuelve a funcionar el envío con botón y Enter.
- Los emojis insertados en el textarea vuelven a enviarse como mensajes de texto.
- Se preservan respuesta, edición y contexto de objeto al enviar.
- Se agregó manejo de error para no perder el texto si el envío falla antes de crear el mensaje optimista.
- Se verificó que los stickers continúan enlazados a `ChatMediaService.enviarStickerExistente` y `ChatMediaService.enviarSticker`.
- No se modifican tablas, RLS, RPC, Edge Functions ni contratos con la app móvil.
