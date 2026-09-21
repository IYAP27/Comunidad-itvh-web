# Panel Admin Web v1

Implementado a partir del PanelAdmin de la app Flutter.

Incluye:
- Verificación doble de administrador con `tabla_admins`.
- Dashboard con 6 métricas y badge de reportes pendientes.
- Usuarios: búsqueda, filtros, abrir perfil, suspender, expulsar, reactivar, hacer/quitar admin.
- Insignias: fijas, personalizadas, visor global y revocación.
- Marketplace: moderación de publicaciones y estados de emprendedores.
- Reportes sociales existentes (`reportes`) y reportes globales web (`reportes_contenido`).
- Moderación: ver, ignorar, resolver, suspender autor y eliminar contenido reportado.
- Limpieza best-effort de archivos R2 al borrar publicaciones/objetos.

`reportes_contenido` requiere que se haya ejecutado la migración `supabase/2026-09-12_reportes_globales.sql`.
