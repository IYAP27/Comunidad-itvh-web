# Cambios v1.16 — Seguridad del login web

- El login web ahora acepta únicamente correo institucional ITVH.
- Se eliminó la consulta pública `nombre_usuario -> email` sobre `perfiles`.
- Se valida localmente el formato `l########@villahermosa.tecnm.mx`.
- No se modificó Supabase Auth, RLS, tablas, RPC, Edge Functions ni la app móvil.
- Se corrigió el texto/minlength del registro para reflejar el mínimo real de 8 caracteres.

## Compatibilidad

La app móvil conserva su flujo actual. Si en el futuro se desea recuperar login web por nombre de usuario sin exponer correos, debe implementarse mediante una Edge Function/RPC segura que no devuelva el correo al cliente.
