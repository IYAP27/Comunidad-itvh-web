# Fix menú Feed v1.18.3

- Se elimina el popup global montado en `document.body`.
- El menú se inserta dentro de la propia tarjeta, justo debajo del header.
- Ya no depende de coordenadas del viewport, `position: fixed`, scroll ni transformaciones del layout.
- Se fuerza caché v1.18.3 para router, shell, feed y social.css.
