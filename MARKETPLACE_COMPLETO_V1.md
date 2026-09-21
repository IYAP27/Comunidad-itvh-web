# Marketplace web — completo v1

Esta versión parte de `comunidad-itvh-web-perfil-completo-v1` y mantiene JaguarChat, Maestros y Perfil.

## Implementado / corregido

- Solicitud real para ser Emprendedor Verificado:
  - nombre del negocio
  - descripción
  - inserción en `emprendedores` con estado `pendiente`
  - cambio inmediato a la pantalla de solicitud pendiente
- Feed de Marketplace:
  - búsqueda
  - categorías
  - publicaciones activas/no expiradas
  - detalle de publicación al tocar foto o título
  - galería de hasta las imágenes disponibles
  - acceso al perfil público del negocio
- Integración con JaguarChat:
  - el botón Contactar abre una conversación real
  - adjunta contexto `marketplace` con ID, título, primera imagen y precio
  - funciona tanto desde el feed como desde el perfil del negocio
- Perfil público del emprendedor:
  - publicaciones
  - opiniones
  - calificación del negocio
  - editar la valoración propia
  - cinco criterios: atención, amabilidad, rapidez, cumplimiento y experiencia
  - recálculo de promedio y total de valoraciones
- Mi Negocio:
  - se conserva edición del perfil comercial
  - edición de publicaciones
  - eliminación con limpieza de R2
  - estadísticas existentes
- Crear publicación:
  - límite de 6 activas
  - máximo 3 fotos
  - producto/servicio
  - categoría, título, descripción y precio
  - vigencia de 24 horas
- Responsive:
  - detalle como modal de dos columnas en escritorio
  - detalle/solicitud/calificación tipo bottom sheet en móvil

## Nota sobre reportes

La app móvil proporcionada no implementa un flujo de reporte específico para `marketplace_publicaciones`. El sistema actual de `reportes` está ligado a `publicaciones` sociales (`publicacion_id`, trigger de publicaciones, etc.). Por eso no se inventó una inserción incompatible para Marketplace. Cuando se haga el sistema global de reportes se debe definir/confirmar el esquema de reporte para Marketplace y conectarlo al Panel Admin.
