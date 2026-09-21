# Comunidad ITVH Web — Seguridad v1.3

## Objetivo
Endurecer las acciones sensibles del panel administrativo sin modificar tablas, columnas, RLS, RPC, Edge Functions ni código de la aplicación móvil.

## Cambios
- Revalidación en tiempo real del rol administrativo antes de operaciones sensibles.
- Si el acceso administrativo fue revocado con el panel abierto, las siguientes operaciones se cancelan.
- Si no puede verificarse el permiso, la operación falla de forma cerrada.
- Revalidación añadida a:
  - cambio de estado de usuarios;
  - creación y revocación de administradores;
  - asignación y eliminación de insignias;
  - eliminación de publicaciones del Marketplace;
  - verificación/suspensión de emprendedores;
  - resolución e ignorado de reportes;
  - suspensión de autores reportados;
  - eliminación de contenido reportado.
- Un moderador no puede cambiar el estado de una cuenta administrativa.
- Se corrigió `_resolverReporteSinConfirmar` para no ignorar errores de Supabase.

## Compatibilidad móvil
No se modificó el esquema ni los contratos compartidos con la aplicación móvil.
