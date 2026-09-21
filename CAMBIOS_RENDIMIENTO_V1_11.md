# Comunidad ITVH Web — Rendimiento v1.11

## Optimización de assets
- Conversión de fotografías grandes JPG/JPEG/PNG a WebP.
- Reducción de resolución máxima de fondos e imágenes históricas.
- Galería con imágenes principales optimizadas y thumbnails dedicados de 260x260.
- Miniaturas con `loading="lazy"` y `decoding="async"`.
- Imágenes históricas fuera del hero con carga diferida.
- Reducción de `sws_logo` e icono de Instagram, que estaban sobredimensionados para su uso real.
- Eliminación de originales pesados una vez actualizadas todas las referencias.

## Rendimiento móvil
- `background-attachment: fixed` se desactiva en pantallas <= 768px y dispositivos táctiles/coarse para reducir repintados.

## Resultado
- Assets antes: ~20.61 MB.
- Assets después: ~4.54 MB.
- Reducción aproximada: 78%.

## Compatibilidad
No se modificaron tablas, columnas, RLS, RPC, Edge Functions, Auth, contratos de datos ni aplicación móvil.
