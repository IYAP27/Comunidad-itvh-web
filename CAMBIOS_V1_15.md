# Comunidad ITVH Web v1.15

## Insignias
- Corregida la consulta del panel admin: `insignias.creado_en` -> `insignias.otorgada_en`.
- El modal vuelve a listar insignias usando el esquema que ya consume `mi-perfil.js`.
- La fecha de otorgamiento se muestra junto al usuario.
- Al eliminar la última insignia, el modal muestra correctamente el estado vacío.

## Eliminación de cuenta (endurecimiento web)
- Se comprueba el error de `auth.getUser()`.
- Se comprueba explícitamente el resultado del DELETE sobre `perfiles`.
- Ya no se cierra sesión ni se informa éxito si la BD no confirmó la eliminación.
- Se evita doble click mientras la operación está en curso.
- Se muestra el error real en caso de fallo.
- No se intenta borrar Supabase Auth ni archivos R2 desde el navegador; eso sigue requiriendo backend/Edge Function con privilegios apropiados.

## Compatibilidad
- Sin cambios de tablas, columnas, RLS, RPC, Edge Functions ni app móvil.
