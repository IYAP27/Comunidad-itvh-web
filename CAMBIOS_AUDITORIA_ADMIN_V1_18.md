# Comunidad ITVH Web — v1.18 Auditoría administrativa

## Qué cambia

- Nueva tabla aditiva `public.auditoria_admin` exclusiva del panel web.
- RLS: cualquier moderador/admin autenticado puede registrar únicamente acciones propias.
- Solo usuarios con nivel `admin` pueden consultar el historial completo.
- Los clientes autenticados no pueden actualizar ni borrar registros de auditoría.
- El nivel administrativo y la fecha se fijan en base de datos mediante trigger.
- Nueva pestaña **Auditoría** en el Panel Admin (solo nivel `admin`).
- Registro de cambios de estado de usuarios, roles administrativos, insignias, Marketplace, emprendedores y reportes.
- Suspender o expulsar desde la gestión de usuarios ahora exige un motivo.

## Activación

Ejecutar en Supabase SQL Editor:

`supabase/2026-09-13_auditoria_admin.sql`

La migración crea únicamente una tabla nueva, índices, RLS y un trigger asociados a esa tabla.
No modifica las tablas ni contratos utilizados por la aplicación móvil.

## Limitación actual

El registro se envía desde el cliente web después de completar cada operación. Esto aporta trazabilidad operativa, pero no es todavía una auditoría transaccional imposible de omitir. Cuando las acciones administrativas críticas se migren a Edge Functions/RPC, el registro deberá ejecutarse en el mismo backend/flujo autorizado.
