# Comunidad ITVH Web — Seguridad v1.2

Cambios aplicados sin modificar el esquema compartido de Supabase ni código de la aplicación móvil.

## Panel administrativo
- Se agregó control web de permisos usando únicamente los niveles existentes `moderador` y `admin`.
- Un moderador puede suspender/reactivar, pero no expulsar usuarios, asignar insignias ni administrar otros administradores.
- Un admin conserva las operaciones de mayor privilegio.
- Se bloquea cambiar el estado de la propia cuenta desde el panel.
- Se bloquea quitarse los propios permisos administrativos.
- Se reforzaron las acciones sobre autores y contenido reportado.

> Estas validaciones mejoran la interfaz web, pero la seguridad definitiva sigue dependiendo de las políticas RLS de Supabase. No se modificaron para evitar afectar la aplicación móvil sin revisar antes su compatibilidad.

## Autenticación web
- La verificación de `estado_cuenta` ahora usa criterio fail-closed.
- Si no puede verificarse el estado de la cuenta, la sesión web se cierra en lugar de permitir acceso automáticamente.
- El login inmediato también valida errores de consulta antes de considerar la cuenta activa.
- Se unificó el mínimo de contraseña del registro web a 8 caracteres.

## Compatibilidad móvil
- No se renombraron columnas.
- No se agregaron ni eliminaron tablas.
- No se modificaron políticas RLS.
- No se cambió ninguna RPC compartida.
- No se modificó código Flutter/móvil.
