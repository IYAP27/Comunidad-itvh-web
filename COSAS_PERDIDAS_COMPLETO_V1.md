# Cosas Perdidas completo v1 — Web

Implementación alineada con `CosasPerdidasPrincipal.dart` de la app móvil.

## Incluido
- Reportes activos desde `objetos_perdidos`, ordenados por fecha y limitados a los no expirados.
- Caducidad automática de 7 días (la base de datos sigue siendo la fuente de verdad).
- Publicación con descripción (máx. 300), lugar opcional e imagen opcional.
- Compresión de imagen en navegador antes de R2 mediante el servicio compartido.
- Validación de tipo/tamaño y mensajes de error de subida.
- Eliminación del reporte propio y limpieza de imagen en R2.
- Búsqueda local por descripción, lugar, autor o usuario.
- Filtro `Todos / Mis reportes`.
- Pantalla/modal de detalle equivalente a `DetalleObjetoPerdidoScreen`.
- `Contactar` abre JaguarChat con `contextoObjeto` (id, descripción, imagen y lugar).
- La tarjeta contextual enviada en el chat se puede pulsar para volver a abrir el detalle.
- Responsive de escritorio, tablet y móvil.

## Decisión de paridad con la app móvil
La app móvil actual no maneja tipos `perdido/encontrado` ni estados `recuperado/resuelto`.
El propio archivo Dart indica que el autor elimina el reporte cuando ya no lo necesita. Por eso
no se agregaron columnas inventadas ni cambios de esquema en Supabase.
