# Comunidad ITVH Web — Seguridad v1.4

## Alcance
Endurecimiento XSS del frontend sin modificar base de datos, RLS, RPC, Edge Functions ni aplicación móvil.

## Cambios
- Historias / selector de música:
  - errores del servicio ahora se muestran con `textContent`;
  - URLs de artwork se escapan antes de insertarse como atributo;
  - helper `_esc` ahora protege comillas dobles y simples.
- Marketplace:
  - errores de renderizado ya no interpolan `e.message` mediante `innerHTML`;
  - URLs de avatar/publicaciones y textos usados en atributos se escapan;
  - se añadió `_escapeAttr` en los módulos afectados.
- Se verificó que no queden interpolaciones directas de `e.message`/`String(e)` dentro de `innerHTML` en `js/`.

## Compatibilidad
No se cambiaron tablas, columnas, políticas RLS, contratos de datos ni código de la app móvil.
