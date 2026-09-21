// ═════════════════════════════════════════════════════════════════
// marketplace-feed.js
//
// Feed de publicaciones del Marketplace:
//   • Barra de búsqueda con vidrio esmerilado
//   • Carrusel de categorías (fichas de puesto)
//   • Feed paginado de publicaciones
//   • Opción de contactar emprendedor
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlMarketplace } from '../../core/url-helper.js';
import { abrirConversacion } from '../chat/conversacion-screen.js?v=1.9.3';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

const POSTS_PAGE_SIZE = 15;

let _contenedor = null;
let _publicaciones = [];
let _categorias = [];
let _categoriaSeleccionada = null;
let _busqueda = '';
let _cargando = true;
let _searchController = null;

export async function render(contenedor) {
  destruir();
  _contenedor = contenedor;
  _publicaciones = [];
  _categorias = [];
  _categoriaSeleccionada = null;
  _busqueda = '';
  _cargando = true;

  contenedor.innerHTML = `
    <div class="marketplace-feed">
      <div class="marketplace-feed-header">
        <div class="marketplace-search-box">
          <svg class="marketplace-search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
          </svg>
          <input 
            type="text" 
            id="marketplace-search-input" 
            class="marketplace-search-input" 
            placeholder="Buscar publicaciones..."
            aria-label="Buscar publicaciones"
          />
          <button type="button" id="marketplace-search-clear" class="marketplace-search-clear" hidden aria-label="Limpiar búsqueda">✕</button>
        </div>
      </div>

      <div class="marketplace-categorias-container">
        <div class="marketplace-categorias-scroll" id="marketplace-categorias"></div>
      </div>

      <div class="marketplace-feed-lista" id="marketplace-feed-lista">
        <div class="marketplace-cargando">Cargando publicaciones...</div>
      </div>
    </div>
  `;

  _wireEventos();
  await _cargarDatos();
}

export function destruir() {
  _contenedor = null;
}

// ─────────────────────────────────────────────────────────────────
// Cargar datos
// ─────────────────────────────────────────────────────────────────
async function _cargarDatos() {
  try {
    _cargando = true;
    _renderPublicaciones();

    await Promise.all([
      _cargarCategorias(),
      _cargarPublicaciones(),
    ]);

    // ── FIX: antes se llamaba _actualizarUI(), que solo re-renderiza
    // cuando _cargando === true (justo al revés de lo necesario aquí).
    // Además, _cargarPublicaciones() ya había llamado internamente a
    // _renderPublicaciones() mientras _cargando aún era `true`, así
    // que esa llamada se limitaba a repintar el mensaje "Cargando...",
    // descartando los datos recién obtenidos. El feed solo se veía si
    // otra acción (clic en categoría) volvía a llamar
    // _renderPublicaciones() con _cargando ya en `false`.
    // Ahora se fuerza el render final explícitamente aquí.
    _cargando = false;
    _renderPublicaciones();
  } catch (e) {
    console.error('Error cargando datos del marketplace:', e);
    _cargando = false;
    _mostrarError(e.message);
  }
}

async function _cargarCategorias() {
  const { data, error } = await supabase
    .from('marketplace_categorias')
    .select('id, nombre, emoji, slug')
    .order('nombre');

  if (error) throw error;
  _categorias = data || [];
  _renderCategorias();
}

async function _cargarPublicaciones() {
  let query = supabase
    .from('marketplace_publicaciones')
    .select(`
      id, titulo, descripcion, precio, tipo, creado_en, expira_en, total_visualizaciones, total_contactos,
      categoria_id,
      marketplace_categorias!left ( nombre, emoji ),
      marketplace_imagenes!left ( r2_url, orden ),
      emprendedores!left (
        id, nombre_negocio, estado, total_contactos, total_visualizaciones,
        perfiles!left ( id, nombre, nombre_usuario, cdn_foto_perfil )
      )
    `)
    .eq('esta_activa', true)
    .gt('expira_en', new Date().toISOString())
    .order('creado_en', { ascending: false });

  // Filtrar por categoría
  if (_categoriaSeleccionada) {
    query = query.eq('categoria_id', _categoriaSeleccionada);
  }

  // Filtrar por búsqueda
  if (_busqueda) {
    query = query.ilike('titulo', `%${_busqueda}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  _publicaciones = data || [];
  _renderPublicaciones();
}

// ─────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────
function _renderCategorias() {
  const container = _contenedor?.querySelector('#marketplace-categorias');
  if (!container) return;

  const html = `
    <button class="marketplace-ficha-categoria ${!_categoriaSeleccionada ? 'activa' : ''}" data-categoria="">
      <div class="marketplace-ficha-emoji">🛒</div>
      <div class="marketplace-ficha-nombre">Todas</div>
    </button>
    ${_categorias.map(cat => `
      <button class="marketplace-ficha-categoria ${_categoriaSeleccionada === cat.id ? 'activa' : ''}" data-categoria="${_escapeAttr(cat.id)}">
        <div class="marketplace-ficha-emoji">${cat.emoji || '📦'}</div>
        <div class="marketplace-ficha-nombre">${cat.nombre}</div>
      </button>
    `).join('')}
  `;

  container.innerHTML = html;

  // Eventos de categorías
  container.querySelectorAll('.marketplace-ficha-categoria').forEach(btn => {
    btn.addEventListener('click', async () => {
      _categoriaSeleccionada = btn.dataset.categoria || null;
      await _cargarPublicaciones();
    });
  });
}

function _renderPublicaciones() {
  const container = _contenedor?.querySelector('#marketplace-feed-lista');
  if (!container) return;

  if (_cargando) {
    container.innerHTML = '<div class="marketplace-cargando">Cargando publicaciones...</div>';
    return;
  }

  if (_publicaciones.length === 0) {
    container.innerHTML = `
      <div class="marketplace-empty-state">
        <div class="marketplace-empty-icon">📭</div>
        <p class="marketplace-empty-text">
          ${_busqueda ? 'No hay publicaciones que coincidan con tu búsqueda' : 'No hay publicaciones disponibles'}
        </p>
      </div>
    `;
    return;
  }

  const html = _publicaciones.map(pub => _renderPublicacionCard(pub)).join('');
  container.innerHTML = html;

  // Eventos de publicaciones
  container.querySelectorAll('.marketplace-pub-card').forEach((card, idx) => {
    const pub = _publicaciones[idx];
    
    card.querySelector('.marketplace-pub-contactar')?.addEventListener('click', () => {
      _contactarEmprendedor(pub);
    });

    card.querySelector('.marketplace-pub-nombre-negocio')?.addEventListener('click', () => {
      _verPerfilEmprendedor(pub);
    });

    card.querySelector('.marketplace-pub-imagen-container')?.addEventListener('click', () => {
      _abrirDetallePublicacion(pub);
    });
    card.querySelector('.marketplace-pub-titulo')?.addEventListener('click', () => {
      _abrirDetallePublicacion(pub);
    });
  });
}

function _renderPublicacionCard(pub) {
  const emprendedor = pub.emprendedores;
  const perfil = emprendedor?.perfiles;
  const categoria = pub.marketplace_categorias;
  const imagenes = (pub.marketplace_imagenes || []).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const primeraImagen = imagenes.length > 0 ? resolverUrlMarketplace({ r2_url: imagenes[0]?.r2_url }) : null;
  const precio = pub.precio ? `$${parseFloat(pub.precio).toFixed(2)} MXN` : 'Contactar';
  const tiempoPublicado = _formatearTiempo(pub.creado_en);
  const tiempoExpira = _formatearExpira(pub.expira_en);

  return `
    <div class="marketplace-pub-card">
      <div class="marketplace-pub-imagen-container">
        ${primeraImagen ? `
          <img src="${_escapeAttr(primeraImagen)}" alt="${_escapeAttr(pub.titulo || 'Publicación')}" class="marketplace-pub-imagen" />
        ` : `
          <div class="marketplace-pub-imagen-placeholder">📦</div>
        `}
        <div class="marketplace-pub-categoria-badge">${categoria?.emoji || '📦'} ${categoria?.nombre || 'Sin categoría'}</div>
        <div class="marketplace-pub-expira-badge">${tiempoExpira}</div>
      </div>

      <div class="marketplace-pub-contenido">
        <div class="marketplace-pub-header">
          <h3 class="marketplace-pub-titulo">${_escapeHtml(pub.titulo)}</h3>
          <div class="marketplace-pub-precio">${precio}</div>
        </div>

        <p class="marketplace-pub-descripcion">${_escapeHtml(pub.descripcion || '').substring(0, 100)}${(pub.descripcion || '').length > 100 ? '...' : ''}</p>

        <div class="marketplace-pub-footer">
          <div class="marketplace-pub-emprendedor">
            ${perfil?.cdn_foto_perfil ? `
              <img src="${_escapeAttr(perfil.cdn_foto_perfil)}" alt="" class="marketplace-pub-avatar" />
            ` : `
              <div class="marketplace-pub-avatar-placeholder">${perfil?.nombre?.charAt(0) || '👤'}</div>
            `}
            <div class="marketplace-pub-info-emprendedor">
              <div class="marketplace-pub-nombre-negocio">${_escapeHtml(emprendedor?.nombre_negocio || 'Emprendedor')}</div>
              <div class="marketplace-pub-tiempo">${tiempoPublicado}</div>
            </div>
          </div>
          <button type="button" class="marketplace-pub-contactar" aria-label="Contactar emprendedor">
            📬 Contactar
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────────
async function _contactarEmprendedor(pub) {
  const emprendedor = pub.emprendedores;
  const perfil = emprendedor?.perfiles;

  if (!perfil?.id) {
    alert('No se pudo obtener la información del emprendedor');
    return;
  }

  const usuarioActualObj = usuarioActual();
  if (!usuarioActualObj || usuarioActualObj.id === perfil.id) {
    alert('No puedes contactarte a ti mismo');
    return;
  }

  const imagenes = [...(pub.marketplace_imagenes || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const imagenUrl = imagenes[0]?.r2_url ? resolverUrlMarketplace(imagenes[0]) : null;
  const precio = pub.precio != null ? `$${Number(pub.precio).toFixed(2)} MXN` : null;

  // Igual que en Flutter: abre JaguarChat con una tarjeta contextual de Marketplace.
  abrirConversacion({
    otroUsuarioId: perfil.id,
    otroNombre: perfil.nombre || 'Emprendedor',
    otroNombreUsuario: perfil.nombre_usuario || null,
    otroAvatarUrl: perfil.cdn_foto_perfil || null,
    contextoObjeto: {
      id: pub.id,
      descripcion: pub.titulo || 'Publicación',
      imagenUrl,
      lugar: precio,
      tipo: 'marketplace',
    },
  });

  // Contadores de contacto: son métricas, por eso un fallo aquí no bloquea el chat.
  Promise.allSettled([
    supabase.from('marketplace_publicaciones').update({ total_contactos: Number(pub.total_contactos || 0) + 1 }).eq('id', pub.id),
    supabase.from('emprendedores').update({ total_contactos: Number(emprendedor.total_contactos || 0) + 1 }).eq('id', emprendedor.id),
  ]);
}


async function _abrirDetallePublicacion(pub) {
  try {
    const { abrirDetallePublicacion } = await import('./marketplace-publicacion-detalle.js');
    abrirDetallePublicacion(pub, {
      onContactar: () => _contactarEmprendedor(pub),
      onVerEmprendedor: () => _verPerfilEmprendedor(pub),
    });
    // Una apertura cuenta como visualización. Si la política RLS no permite
    // actualizar el contador, la vista sigue abriendo con normalidad.
    const nuevas = Number(pub.total_visualizaciones || 0) + 1;
    pub.total_visualizaciones = nuevas;
    supabase.from('marketplace_publicaciones').update({ total_visualizaciones: nuevas }).eq('id', pub.id).then(() => {});
  } catch (e) {
    console.error('No se pudo abrir el detalle de Marketplace:', e);
  }
}

// ── FIX: antes esto era un alert() placeholder con un TODO, aunque
// marketplace-home.js ya exportaba `irAlPerfilEmprendedor` con toda
// la lógica lista (abre marketplace-perfil-publico.js en un modal).
// Solo faltaba conectar este botón con esa función.
async function _verPerfilEmprendedor(pub) {
  const emprendedor = pub.emprendedores;
  if (!emprendedor?.id) return;

  try {
    const { irAlPerfilEmprendedor } = await import('./marketplace-home.js');
    await irAlPerfilEmprendedor(emprendedor.id);
  } catch (e) {
    console.error('Error abriendo perfil público:', e);
  }
}

function _mostrarError(mensaje) {
  const container = _contenedor?.querySelector('#marketplace-feed-lista');
  if (!container) return;

  container.innerHTML = `
    <div class="marketplace-error">
      <p>Error: ${_escapeHtml(mensaje)}</p>
      <button type="button" id="btn-reintentar-feed" class="marketplace-btn-reintentar">Reintentar</button>
    </div>
  `;

  container.querySelector('#btn-reintentar-feed')?.addEventListener('click', () => _cargarDatos());
}

// ─────────────────────────────────────────────────────────────────
// Eventos
// ─────────────────────────────────────────────────────────────────
function _wireEventos() {
  const searchInput = _contenedor?.querySelector('#marketplace-search-input');
  const searchClear = _contenedor?.querySelector('#marketplace-search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      _busqueda = e.target.value.trim();
      searchClear.hidden = !_busqueda;
      await _cargarPublicaciones();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', async () => {
      _busqueda = '';
      if (searchInput) searchInput.value = '';
      searchClear.hidden = true;
      await _cargarPublicaciones();
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────
function _formatearTiempo(fecha) {
  const d = new Date(fecha);
  const ahora = new Date();
  const diff = ahora - d;

  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'Hace poco';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;

  return d.toLocaleDateString('es-MX');
}

function _formatearExpira(fecha) {
  const expira = new Date(fecha);
  const ahora = new Date();
  const diff = expira - ahora;

  if (diff < 0) return 'Expirada';

  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (horas < 1) return `${Math.floor(diff / 60000)}m`;
  if (horas < 24) return `${horas}h`;
  return `${dias}d`;
}


