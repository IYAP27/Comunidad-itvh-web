# Corrección de rutas para GitHub Pages

Se corrigieron rutas absolutas que apuntaban a `/assets/...` y `/css/...`, las cuales funcionaban en la raíz de un dominio pero se rompían al publicar el proyecto en `https://iyap27.github.io/Comunidad-itvh-web/`.

Cambios principales:
- JavaScript/HTML: `/assets/...` -> `assets/...`
- CSS: `/assets/...` -> `../assets/...`
- CSS dinámico de admin: `/css/admin.css` -> `css/admin.css`
- `manifest.json`: `start_url` de `/` a `./`

Esto mantiene compatibilidad con GitHub Pages y con ejecución local desde la raíz del proyecto.
