# Comunidad ITVH Web — Seguridad v1.5

## Alcance
Cambios exclusivos del frontend web. No se modificaron tablas, columnas, RLS, RPC, Edge Functions ni contratos compartidos con la aplicación móvil.

## Cambios
- Nuevo `js/core/html-utils.js` con `escapeHtml`, `escapeAttr` y `errorMessage` para centralizar sanitización.
- Notificaciones: URLs de avatar/miniatura y valores `data-*` dinámicos ahora se escapan antes del render HTML.
- Buscador de usuarios: avatar e identificadores `data-uid` ahora se escapan.
- Marketplace: los módulos principales migraron a las utilidades compartidas de escape.
- Marketplace editar publicación: URLs existentes de imágenes y categorías dinámicas ahora se escapan en atributos.
- Marketplace feed/perfil/mi negocio: identificadores dinámicos en atributos se escapan de forma consistente.
- Se eliminaron helpers locales duplicados en los módulos migrados.
- Se comprobó la sintaxis de todos los archivos JavaScript del proyecto.

## Compatibilidad móvil
Sin cambios de esquema o comportamiento compartido con la app móvil.
