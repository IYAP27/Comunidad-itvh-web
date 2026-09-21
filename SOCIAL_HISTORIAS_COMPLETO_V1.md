# Social + Historias completo v1

Cambios principales de esta versión web:

- Publicaciones propias: opción real para eliminar desde el menú `•••`, incluyendo limpieza best-effort de medios en R2.
- Buscador de usuarios: navegación a perfil público ya conectada con el módulo Perfil.
- Historias públicas: like real usando `reacciones_historias`.
- Historias públicas: comentarios reales usando `comentarios_historias`.
- Historias propias: hoja de Actividad combinando vistas y likes, con acceso al perfil de cada usuario.
- Historias: autoavance para imágenes y avance al terminar videos.
- Historias: navegación por teclado (flechas, Escape y espacio para pausar/reanudar autoavance).
- Historias: eliminación de historia con limpieza best-effort de R2.
- Historias con música: conserva reproducción de preview cuando la metadata existe.
- Responsive: hojas inferiores de comentarios/actividad adaptadas a móvil y escritorio.

No requiere migraciones nuevas en Supabase; utiliza las tablas que ya usa la app móvil (`historia_vistas`, `reacciones_historias`, `comentarios_historias`).
