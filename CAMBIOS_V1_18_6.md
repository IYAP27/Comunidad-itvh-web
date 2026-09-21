# Comunidad ITVH Web v1.18.6

Correcciones realizadas sobre el ZIP v1.18.4 original:

1. **Reportar en Inicio**: el botón `🚩 Reportar` ahora se muestra directamente en el encabezado de cada publicación ajena, sin depender del menú de tres puntos. Las publicaciones propias conservan la opción de eliminar.
2. **Marketplace claro/oscuro**: el CSS ahora usa las clases reales de `theme.js` (`html.tema-claro` y `html.tema-oscuro`) y fuerza fondos/tarjetas principales a respetar el tema.
3. **Feed global**: se eliminó el filtro `.in('autor_id', seguidos)`, por lo que el frontend solicita todas las publicaciones que las políticas RLS permitan ver.
4. **Caché**: se actualizó toda la cadena de imports dinámicos a `v1.18.6` (index → router → shell → feed/marketplace → submódulos), para evitar que GitHub Pages reutilice JS/CSS de v1.18.4.
