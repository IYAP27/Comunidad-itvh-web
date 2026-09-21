# Comunidad ITVH Web — Storage/R2 v1.10

## Alcance
Endurecimiento defensivo del cliente web. No modifica Supabase, RLS, Edge Functions, tablas, columnas ni la aplicación móvil.

## Cambios
- Whitelist de buckets R2 conocidos antes de solicitar o eliminar objetos.
- Validación de rutas: sin rutas absolutas, `..`, backslashes, segmentos vacíos ni caracteres de control.
- Las subidas deben quedar bajo el prefijo del UUID del usuario autenticado.
- Whitelist de MIME por bucket para impedir combinaciones inesperadas desde errores del frontend.
- Normalización de MIME antes de generar la URL firmada y antes del PUT.
- Rechazo local de archivos vacíos.
- Validación de que la URL firmada devuelta por la Edge Function sea una URL HTTPS válida.
- Se conserva `sizeBytes` para que la Edge Function pueda aplicar su propio límite de tamaño.
- Se corrige liberación de `blob:` si falla la lectura de video al generar thumbnail.

## Compatibilidad
Todos los paths generados por la web ya siguen el formato `<userId>/...`, por lo que la validación es compatible con los flujos existentes. La validación de propiedad solo aplica a SUBIDAS. Los borrados no se restringen al usuario propietario en cliente porque el panel administrativo puede limpiar archivos de terceros; esa autorización debe seguir resolviéndose en la Edge Function.

## Nota de seguridad
Estas validaciones son defensa en profundidad. Un usuario puede modificar JavaScript desde DevTools, por lo que `generar-url-subida` y `eliminar-objeto-r2` deben validar nuevamente JWT, bucket, path, tamaño y permisos en servidor.
