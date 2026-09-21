# Comunidad ITVH Web v1.18.7

Corrección de los tres puntos reportados:

1. Reportar publicaciones: se conserva el menú `•••` y las publicaciones ajenas muestran `🚩 Reportar publicación`. Además `feed-v1.18.7.js` inyecta un botón de respaldo si el renderer no lo incluye.
2. Marketplace: el tema oscuro/claro se sincroniza desde `themeNotifier` y las variables del Marketplace se aplican inline al contenedor, además de reglas CSS específicas.
3. Feed: la consulta principal ya no filtra por `seguidores`; solicita todas las publicaciones visibles por RLS.
4. Cache busting real: los archivos críticos usan nombres nuevos `*-v1.18.7.*`, no solo query strings, para evitar cargar JS/CSS anteriores desde caché.
