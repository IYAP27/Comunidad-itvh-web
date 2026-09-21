// ═════════════════════════════════════════════════════════════════
// marketplace-mi-negocio.js
//
// Panel privado del emprendedor en el Marketplace:
//   • Estado de verificación
//   • Estadísticas (visualizaciones, contactos, calificación)
//   • Mis publicaciones activas (editar/eliminar)
//   • Botón para crear nueva publicación
//   • Perfil del negocio
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlMarketplace } from '../../core/url-helper.js';
import { eliminarDeR2 } from '../../core/storage-r2.js';
import { BUCKETS } from '../../core/r2-config.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _contenedor = null;
let _cargando = true;
let _emprendedor = null;
let _publicaciones = [];
let _onIrAPublicar = null;

export async function render(contenedor, onIrAPublicar) {
  destruir();
  _contenedor = contenedor;
  _onIrAPublicar = onIrAPublicar;
  _cargando = true;

  contenedor.innerHTML = '<div class="marketplace-cargando">Cargando tu negocio...</div>';

  try {
    await _cargarDatos();
    _renderContenido();
  } catch (e) {
    console.error('Error cargando mi negocio:', e);
    _mostrarError(e.message);
  }
}

export function destruir() {
  _contenedor = null;
}

// ─────────────────────────────────────────────────────────────────
// Cargar datos
// ─────────────────────────────────────────────────────────────────
async function _cargarDatos() {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('No autenticado');

  // Cargar emprendedor
  const { data: empData, error: empError } = await supabase
    .from('emprendedores')
    .select(`
      id, nombre_negocio, descripcion, estado,
      calificacion_promedio, total_valoraciones,
      total_contactos, total_visualizaciones, creado_en,
      perfiles!left ( nombre, cdn_foto_perfil, carrera )
    `)
    .eq('perfil_id', uid)
    .maybeSingle();

  if (empError) throw empError;

  if (!empData) {
    throw new Error('No eres emprendedor aún');
  }

  _emprendedor = empData;

  // Cargar publicaciones
  const { data: pubData, error: pubError } = await supabase
    .from('marketplace_publicaciones')
    .select(`
      id, titulo, descripcion, precio, tipo,
      creado_en, expira_en, esta_activa,
      total_visualizaciones, total_contactos,
      marketplace_categorias!left ( nombre, emoji ),
      marketplace_imagenes!left ( id, r2_url, r2_path, orden )
    `)
    .eq('emprendedor_id', empData.id)
    .eq('esta_activa', true)
    .gt('expira_en', new Date().toISOString())
    .order('creado_en', { ascending: false });

  if (pubError) throw pubError;

  _publicaciones = pubData || [];
  _cargando = false;
}

// ─────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────
function _renderContenido() {
  if (!_emprendedor) {
    _contenedor.innerHTML = '<div class="marketplace-error"><p>Error: Emprendedor no encontrado</p></div>';
    return;
  }

  const estado = _emprendedor.estado || 'sin_solicitud';
  const perfil = _emprendedor.perfiles;

  let badgeClass = 'marketplace-estado-badge';
  let badgeIcon = '❌';
  let badgeTexto = 'Sin verificar';

  if (estado === 'verificado') {
    badgeClass += ' verificado';
    badgeIcon = '✅';
    badgeTexto = 'Verificado';
  } else if (estado === 'pendiente') {
    badgeClass += ' pendiente';
    badgeIcon = '⏳';
    badgeTexto = 'Pendiente';
  } else if (estado === 'suspendido') {
    badgeClass += ' suspendido';
    badgeIcon = '🚫';
    badgeTexto = 'Suspendido';
  }

  _contenedor.innerHTML = `
    <div class="marketplace-mi-negocio">
      <!-- Header del negocio -->
      <div class="marketplace-negocio-header">
        <div class="marketplace-negocio-info">
          <div class="marketplace-negocio-avatar">
            ${perfil?.cdn_foto_perfil ? `
              <img src="${_escapeAttr(perfil.cdn_foto_perfil)}" alt="" />
            ` : `
              <div class="marketplace-avatar-placeholder">${perfil?.nombre?.charAt(0) || '👤'}</div>
            `}
          </div>
          <div class="marketplace-negocio-datos">
            <h2 class="marketplace-negocio-nombre">${_escapeHtml(_emprendedor.nombre_negocio)}</h2>
            <p class="marketplace-negocio-propietario">por ${_escapeHtml(perfil?.nombre || 'Usuario')}</p>
            <div class="${badgeClass}">
              <span class="marketplace-badge-icon">${badgeIcon}</span>
              <span class="marketplace-badge-texto">${badgeTexto}</span>
            </div>
          </div>
        </div>
        <button type="button" id="btn-editar-perfil" class="marketplace-btn-editar" aria-label="Editar perfil">
          ✏️ Editar
        </button>
      </div>

      <!-- Descripción -->
      ${_emprendedor.descripcion ? `
        <div class="marketplace-negocio-descripcion">
          <p>${_escapeHtml(_emprendedor.descripcion)}</p>
        </div>
      ` : ''}

      <!-- Estadísticas -->
      <div class="marketplace-estadisticas">
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.total_visualizaciones || 0}</div>
          <div class="marketplace-stat-label">Visualizaciones</div>
        </div>
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.total_contactos || 0}</div>
          <div class="marketplace-stat-label">Contactos</div>
        </div>
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.calificacion_promedio ? _emprendedor.calificacion_promedio.toFixed(1) : 'N/A'}</div>
          <div class="marketplace-stat-label">Calificación (${_emprendedor.total_valoraciones || 0})</div>
        </div>
      </div>

      <!-- Publicaciones -->
      <div class="marketplace-mis-publicaciones">
        <div class="marketplace-publicaciones-header">
          <h3 class="marketplace-publicaciones-titulo">Mis Publicaciones (${_publicaciones.length})</h3>
          <button type="button" id="btn-crear-pub" class="marketplace-btn-principal">
            + Crear Nueva
          </button>
        </div>

        <div class="marketplace-publicaciones-lista" id="marketplace-publicaciones-lista">
          ${_renderPublicaciones()}
        </div>
      </div>
    </div>
  `;

  _wireEventos();
}

function _renderPublicaciones() {
  if (_publicaciones.length === 0) {
    return `
      <div class="marketplace-sin-publicaciones">
        <p>Aún no tienes publicaciones</p>
        <p class="marketplace-sin-pub-texto">
          ${_emprendedor?.estado === 'verificado' ? 
            'Crea tu primera publicación para comenzar a vender' :
            'Debes estar verificado para publicar'
          }
        </p>
      </div>
    `;
  }

  return _publicaciones.map(pub => `
    <div class="marketplace-pub-item">
      <div class="marketplace-pub-item-imagen">
        ${_getImagenPrincipal(pub) ? `
          <img src="${_escapeAttr(_getImagenPrincipal(pub) || '')}" alt="${_escapeAttr(pub.titulo || 'Publicación')}" />
        ` : `
          <div class="marketplace-pub-imagen-placeholder">📦</div>
        `}
      </div>
      <div class="marketplace-pub-item-info">
        <div class="marketplace-pub-item-header">
          <h4 class="marketplace-pub-item-titulo">${_escapeHtml(pub.titulo)}</h4>
          <div class="marketplace-pub-item-precio">$${parseFloat(pub.precio).toFixed(2)}</div>
        </div>
        <p class="marketplace-pub-item-categoria">
          ${pub.marketplace_categorias?.emoji || '📦'} ${_escapeHtml(pub.marketplace_categorias?.nombre || 'Sin categoría')}
        </p>
        <div class="marketplace-pub-item-stats">
          <span>👁️ ${pub.total_visualizaciones || 0}</span>
          <span>📬 ${pub.total_contactos || 0}</span>
        </div>
        <div class="marketplace-pub-item-acciones">
          <button type="button" class="marketplace-pub-editar" data-pub-id="${_escapeAttr(pub.id)}" aria-label="Editar">
            ✏️ Editar
          </button>
          <button type="button" class="marketplace-pub-eliminar" data-pub-id="${_escapeAttr(pub.id)}" aria-label="Eliminar">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────────────
// Eventos
// ─────────────────────────────────────────────────────────────────
function _wireEventos() {
  _contenedor.querySelector('#btn-crear-pub')?.addEventListener('click', () => {
    if (_onIrAPublicar) _onIrAPublicar();
  });

  _contenedor.querySelector('#btn-editar-perfil')?.addEventListener('click', async () => {
    const { abrirEditorPerfil } = await import('./marketplace-editar-perfil.js');
    abrirEditorPerfil(_emprendedor, async () => {
      await _cargarDatos();
      _renderContenido();
    });
  });

  _contenedor.querySelectorAll('.marketplace-pub-editar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pubId = btn.dataset.pubId;
      await _editarPublicacion(pubId);
    });
  });

  _contenedor.querySelectorAll('.marketplace-pub-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pubId = btn.dataset.pubId;
      await _eliminarPublicacion(pubId);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────────
async function _editarPublicacion(pubId) {
  const pub = _publicaciones.find(p => p.id === pubId);
  if (!pub) return;

  const { abrirEditorPublicacion } = await import('./marketplace-editar-publicacion.js');
  abrirEditorPublicacion(pub, async () => {
    await _cargarDatos();
    _renderContenido();
  });
}

async function _eliminarPublicacion(pubId) {
  const pub = _publicaciones.find(p => p.id === pubId);
  if (!pub) return;

  const confirmar = confirm(`¿Estás seguro de que quieres eliminar "${pub.titulo}"? Esta acción no se puede deshacer.`);
  if (!confirmar) return;

  try {
    // 1. Borrar imágenes de R2 primero (igual que Flutter)
    const imagenes = pub.marketplace_imagenes || [];
    for (const img of imagenes) {
      if (img.r2_path) {
        try {
          await eliminarDeR2(BUCKETS.marketplace, img.r2_path);
        } catch (e) {
          // No bloqueamos el borrado de la publicación si una imagen
          // ya no existe en R2 o falla su borrado — mismo criterio
          // que el resto del proyecto.
          console.warn('No se pudo eliminar imagen de R2:', img.r2_path, e);
        }
      }
    }

    // 2. Borrar publicación (hard delete real — la política RLS de
    //    DELETE sí existe; la de UPDATE no, por eso el soft-delete
    //    anterior no hacía nada). marketplace_imagenes se limpia
    //    solo por el ON DELETE CASCADE de la FK.
    const { error } = await supabase
      .from('marketplace_publicaciones')
      .delete()
      .eq('id', pubId);

    if (error) throw error;

    _publicaciones = _publicaciones.filter(p => p.id !== pubId);
    _renderContenido();
  } catch (e) {
    console.error('Error eliminando publicación:', e);
    alert(`Error al eliminar: ${e.message}`);
  }
}

function _mostrarError(mensaje) {
  _contenedor.innerHTML = `
    <div class="marketplace-error">
      <p>${_escapeHtml(mensaje)}</p>
      <button type="button" id="btn-reintentar" class="marketplace-btn-principal">Reintentar</button>
    </div>
  `;

  _contenedor.querySelector('#btn-reintentar')?.addEventListener('click', () => {
    render(_contenedor, _onIrAPublicar);
  });
}

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────
function _getImagenPrincipal(pub) {
  const imagenes = pub.marketplace_imagenes || [];
  if (imagenes.length === 0) return null;
  const sorted = [...imagenes].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return sorted[0]?.r2_url ? resolverUrlMarketplace(sorted[0]) : null;
}


