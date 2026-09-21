# Marketplace Web - Documentación de Integración

## 📋 Descripción General

Se ha implementado una réplica web del módulo Marketplace de Flutter para la plataforma Comunidad ITVH. El Marketplace permite que los emprendedores publiciten productos y servicios, mientras que otros usuarios pueden explorar, buscar y contactar a los emprendedores.

## 📁 Estructura de Archivos

```
comunidad-itvh-web/
├── js/features/marketplace/
│   ├── marketplace-home.js          # Contenedor principal (3 pestañas)
│   ├── marketplace-feed.js          # Feed de publicaciones
│   ├── marketplace-publicar.js      # Formulario para crear publicaciones
│   ├── marketplace-mi-negocio.js    # Panel privado del emprendedor
│   └── marketplace-perfil-publico.js # Perfil público del emprendedor
└── css/
    └── marketplace.css              # Estilos del Marketplace
```

## 🎯 Funcionalidades Implementadas

### 1. **Marketplace Home** (`marketplace-home.js`)
- Contenedor principal con 3 pestañas:
  - 📱 **Inicio** - Feed de publicaciones
  - ➕ **Publicar** - Formulario de nuevas publicaciones  
  - 🏪 **Mi Negocio** - Panel privado del emprendedor
- Navegación entre pestañas con sincronización de estado
- Manejo de ciclo de vida de módulos

### 2. **Feed de Publicaciones** (`marketplace-feed.js`)
- Búsqueda en tiempo real de publicaciones
- Filtro por categorías con interfaz visual (fichas de puesto)
- Listado paginado de publicaciones
- Información de emprendedor con opción de contactar
- Visualización de tiempo de publicación y caducidad
- Soporte para imágenes de publicaciones

**Base de datos utilizada:**
- `marketplace_publicaciones` - Información de publicaciones
- `marketplace_categorias` - Categorías disponibles
- `marketplace_imagenes` - Imágenes de publicaciones
- `emprendedores` - Información del emprendedor
- `perfiles` - Datos de usuario (nombre, foto)

### 3. **Formulario de Publicación** (`marketplace-publicar.js`)
- Verificación de estado de emprendedor (verificado/pendiente/suspendido)
- Selector de tipo (Producto/Servicio)
- Campos: Título, Descripción, Precio, Categoría
- Carga de fotos (máximo 3)
- Subida a R2 (Cloudflare)
- Creación de registros en BD
- Validación de formulario

**Flujo:**
1. Verificar estado del emprendedor
2. Cargar categorías
3. Recolectar datos del formulario
4. Crear publicación en BD
5. Subir fotos a R2
6. Guardar rutas de imágenes en BD

### 4. **Panel Privado** (`marketplace-mi-negocio.js`)
- Información del negocio del usuario actual
- Estadísticas (visualizaciones, contactos, calificación)
- Listado de publicaciones activas
- Opciones para editar y eliminar publicaciones
- Botón para crear nueva publicación

**Datos mostrados:**
- Nombre del negocio
- Avatar y propietario
- Estado de verificación
- Descripción del negocio
- Estadísticas de desempeño

### 5. **Perfil Público del Emprendedor** (`marketplace-perfil-publico.js`)
- Visualización pública de negocio
- Galería de publicaciones
- Calificaciones y opiniones (valoraciones)
- Información del emprendedor
- Botón de contacto

## 🔄 Flujo de Datos

```
Router (shell.js)
    ↓
marketplace-home.js (coordinador)
    ├─ marketplace-feed.js
    │   ├─ Supabase: marketplace_publicaciones
    │   ├─ Supabase: marketplace_categorias
    │   ├─ Supabase: marketplace_imagenes
    │   └─ Supabase: emprendedores
    │
    ├─ marketplace-publicar.js
    │   ├─ Verificar: emprendedores
    │   ├─ Cargar: marketplace_categorias
    │   ├─ Crear: marketplace_publicaciones
    │   ├─ Subir: R2 (itvh-marketplace)
    │   └─ Guardar: marketplace_imagenes
    │
    ├─ marketplace-mi-negocio.js
    │   ├─ Cargar: emprendedores (perfil actual)
    │   └─ Listar: marketplace_publicaciones
    │
    └─ marketplace-perfil-publico.js
        ├─ Cargar: emprendedores (específico)
        ├─ Listar: marketplace_publicaciones
        └─ Mostrar: marketplace_valoraciones
```

## 🗄️ Tablas de Base de Datos Necesarias

### marketplace_publicaciones
```sql
- id (UUID, PK)
- emprendedor_id (UUID, FK emprendedores)
- titulo (text)
- descripcion (text)
- precio (numeric)
- tipo (enum: 'producto', 'servicio')
- categoria_id (UUID, FK marketplace_categorias)
- esta_activa (boolean)
- total_visualizaciones (integer)
- total_contactos (integer)
- creado_en (timestamp)
- expira_en (timestamp)
```

### marketplace_categorias
```sql
- id (UUID, PK)
- nombre (text)
- emoji (text)
- slug (text)
```

### marketplace_imagenes
```sql
- id (UUID, PK)
- publicacion_id (UUID, FK marketplace_publicaciones)
- r2_url (text)
- r2_path (text)
- orden (integer)
```

### marketplace_valoraciones
```sql
- id (UUID, PK)
- emprendedor_id (UUID, FK emprendedores)
- autor_id (UUID, FK perfiles)
- promedio (numeric)
- atencion (numeric)
- amabilidad (numeric)
- rapidez (numeric)
- cumplimiento (numeric)
- experiencia (numeric)
- comentario (text)
- conversacion_id (UUID) -- pseudo-conversación
- creado_en (timestamp)
```

### emprendedores
```sql
- id (UUID, PK)
- perfil_id (UUID, FK perfiles)
- nombre_negocio (text)
- descripcion (text)
- estado (enum: 'sin_solicitud', 'pendiente', 'verificado', 'suspendido')
- calificacion_promedio (numeric)
- total_valoraciones (integer)
- total_contactos (integer)
- total_visualizaciones (integer)
- creado_en (timestamp)
```

## 🎨 Estilos y Temas

El archivo `marketplace.css` incluye:
- Variables de color (`--marketplace-accent`, `--marketplace-bg`, etc.)
- Soporte para tema oscuro (`[data-theme="dark"]`)
- Componentes reutilizables
- Diseño responsivo (mobile-first)
- Animaciones y transiciones suaves

## 🔐 Autenticación y Autorización

- Las acciones requieren usuario autenticado (verificado en `usuarioActual()`)
- Solo emprendedores verificados pueden publicar
- Solo el propietario puede editar/eliminar sus publicaciones
- Perfil público es visible para todos

## 📦 Dependencias Externas

```javascript
// Supabase
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';

// Storage R2
import { subirImagenMarketplace } from '../../core/storage-r2.js';

// URL helpers
import { resolverUrlMarketplace } from '../../core/url-helper.js';
```

## 🚀 Integración en shell.js

El marketplace ya está registrado en el shell:

```javascript
const TABS = [
  { id: 'comunidad', label: 'Comunidad', modulo: '../social/feed.js' },
  { id: 'perfil',    label: 'Mi Perfil', modulo: '../perfil/mi-perfil.js' },
  { id: 'market',    label: 'Market',    modulo: '../marketplace/marketplace-home.js' },
  { id: 'jaguares',  label: 'Jaguares',  modulo: '../chat/jaguar-chat.js' },
  { id: 'ubicatec',  label: 'UbicaTec',  modulo: '../mapa/ubicatecnm.js' },
];
```

## 📝 Próximas Mejoras

### Funcionalidades Pendientes:
1. **Editar Publicación** - Modal/pantalla para editar publicaciones existentes
2. **Editar Perfil de Negocio** - Permitir actualizar datos del emprendedor
3. **Sistema de Valoraciones** - Interfaz para calificar emprendedores
4. **Chat Integrado** - Enlace directo al módulo Jaguar Chat
5. **Búsqueda Avanzada** - Filtros adicionales (precio rango, ubicación, etc.)
6. **Galería Expandida** - Visor de fotos tipo carrusel
7. **Historial de Compras** - Tracking de contactos realizados
8. **Notificaciones** - Alertas de nuevos contactos/mensajes

### Mejoras UI/UX:
1. Indicador de carga durante operaciones
2. Mensajes de confirmación más visuales
3. Drag & drop para subir fotos
4. Carrusel de imágenes mejorado
5. Visualización de trending/populares
6. Sistema de favoritos

### Optimización de Rendimiento:
1. Lazy loading de imágenes
2. Caching de publicaciones
3. Paginación en lugar de cargar todas
4. Compresión de imágenes antes de subir
5. WebP para formato moderno

## 🧪 Testing Recomendado

### Manual Testing:
1. **Feed:**
   - Buscar publicaciones por título
   - Filtrar por categoría
   - Verificar tiempo de publicación
   - Contactar emprendedor

2. **Publicar:**
   - Intentar sin verificación (mostrar mensaje)
   - Verificar validaciones
   - Subir fotos (1, 2, 3 fotos)
   - Verificar limpieza de datos

3. **Mi Negocio:**
   - Ver estadísticas correctas
   - Listar publicaciones
   - Editar publicación
   - Eliminar con confirmación

4. **Perfil Público:**
   - Ver galería de emprendedor
   - Ver valoraciones
   - Contactar desde perfil

## 💡 Notas de Desarrollo

1. **Rutas de Imágenes:** Las imágenes se guardan en R2 con estructura: `marketplace/{publicacionId}/{orden}`

2. **Timestamps:** Se usa ISO 8601 para todas las fechas

3. **Moneda:** Precios en MXN (dólares mexicanos)

4. **Idioma:** Interfaz completamente en español

5. **Estilos:** Usa CSS puro sin frameworks, basado en variables CSS

6. **Responsivo:** Optimizado para móvil (375px) hasta desktop (1920px)

## 📞 Contacto y Soporte

Para preguntas o bugs, contactar al equipo de desarrollo de Comunidad ITVH.
