# Comunidad ITVH Web v1.18.1 — Fix menú de publicaciones

- Se corrigió el menú de los tres puntos del Feed que aparecía al final del documento/esquina inferior.
- El menú ya no depende de los estilos inyectados por `reportes-ui.js`.
- Se creó estilo propio `.feed-opciones-menu` en `css/social.css`.
- El menú se posiciona respecto al botón de tres puntos y decide abrir arriba o abajo según el espacio disponible.
- Se limita horizontalmente al viewport.
- Se incrementó el z-index para que no quede detrás de cards/sidebar.
- El menú se cierra al hacer click fuera, scroll o resize.
- No hay cambios de base de datos, RLS, RPC, Edge Functions ni aplicación móvil.
