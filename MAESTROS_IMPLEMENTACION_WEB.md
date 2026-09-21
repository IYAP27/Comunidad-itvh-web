# Maestros — implementación web

Actualización basada en la versión móvil Flutter de Referencias de maestros.

## Ajustes incluidos
- Catálogo de títulos alineado con móvil: Dr., Dra., Ing., Inga., Mtro., Mtra., Lic. y Profe.
- Verificación de duplicados por apellidos al salir de los campos y nuevamente antes de guardar.
- Mensajes visuales de verificación correcta/error.
- El promedio y total de evaluaciones se refrescan después de publicar una evaluación.
- Búsqueda ampliada a nombre, departamento, materias y semestres, ignorando acentos.
- Botón de actualización manual de la lista (equivalente práctico al pull-to-refresh móvil).
- Modales con botón cerrar y soporte para tecla Escape.
- Mensajes de error más claros para permisos, duplicados y problemas de conexión.
- Ajustes responsive del formulario para pantallas estrechas.

## Backend reutilizado
Se mantienen las mismas tablas/vista que la app móvil:
- maestros
- maestros_con_promedio
- evaluaciones

No se agregaron tablas ni políticas nuevas.
