// ═════════════════════════════════════════════════════════════════
// marketplace-editar-publicacion.js
// Espejo de MarketplaceEditarPublicacion.dart
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { eliminarDeR2, subirImagenMarketplace } from '../../core/storage-r2.js';
import { resolverUrlMarketplace } from '../../core/url-helper.js';
import { BUCKETS } from '../../core/r2-config.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _pub = null;
let _onGuardado = null;
let _categorias = [];
let _imagenesExistentes = [];
let _imagenesABorrar = [];
let _fotosNuevas = [];
let _guardando = false;
let _modal = null;

export async function abrirEditorPublicacion(pub, onGuardado) {
  _pub = pub;
  _onGuardado = onGuardado;
  _imagenesExistentes = [...(pub.marketplace_imagenes || [])].sort(
    (a, b) => (a.orden || 0) - (b.orden || 0)
  );
  _imagenesABorrar = [];
  _fotosNuevas = [];
  _guardando = false;

  await _cargarCategorias();
  _render();
}

async function _cargarCategorias() {
  const { data, error } = await supabase
    .from('marketplace_categorias')
    .select('id, nombre, emoji')
    .order('nombre');
  if (!error) _categorias = data || [];
}

function _totalImagenes() {
  return _imagenesExistentes.length + _fotosNuevas.length;
}

// ── FIX: antes de reconstruir el modal por una interacción parcial
// (cambiar tipo, agregar/quitar foto, elegir categoría), _pub nunca
// se actualizaba con lo que el usuario ya había escrito en título,
// descripción o precio. _render() volvía a pintar esos inputs con
// los valores ORIGINALES de _pub, borrando cualquier edición previa.
// Esta función sincroniza el DOM → _pub justo antes de cada _render().
function _sincronizarCamposEnPub() {
  if (!_modal) return;
  const titulo = _modal.querySelector('#editar-titulo')?.value;
  const descripcion = _modal.querySelector('#editar-descripcion')?.value;
  const precio = _modal.querySelector('#editar-precio')?.value;
  _pub = {
    ..._pub,
    titulo: titulo ?? _pub.titulo,
    descripcion: descripcion ?? _pub.descripcion,
    precio: precio ?? _pub.precio,
  };
}

function _render() {
  if (_modal) document.body.removeChild(_modal);

  _modal = document.createElement('div');
  _modal.className = 'marketplace-editar-perfil-modal';
  _modal.innerHTML = `
    <div class="marketplace-editar-perfil-contenido">
      <div class="marketplace-editar-perfil-header">
        <button type="button" class="marketplace-editar-perfil-cerrar" aria-label="Cerrar">✕</button>
        <h3>Editar publicación</h3>
        <button type="button" id="btn-guardar-pub" class="marketplace-editar-perfil-guardar" ${_guardando ? 'disabled' : ''}>
          ${_guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      <form id="marketplace-editar-pub-form" class="marketplace-editar-perfil-form">
        <label class="marketplace-form-label">Tipo</label>
        <div class="marketplace-tipo-selector">
          <button type="button" class="marketplace-tipo-btn ${_pub.tipo === 'producto' ? 'activo' : ''}" data-tipo="producto">📦 Producto</button>
          <button type="button" class="marketplace-tipo-btn ${_pub.tipo === 'servicio' ? 'activo' : ''}" data-tipo="servicio">🔧 Servicio</button>
        </div>

        <label class="marketplace-form-label">Título</label>
        <input type="text" id="editar-titulo" class="marketplace-form-input" maxlength="80"
          value="${_escapeAttr(_pub.titulo || '')}" required />

        <label class="marketplace-form-label">Descripción</label>
        <textarea id="editar-descripcion" class="marketplace-form-textarea" maxlength="500" rows="4"
        >${_escapeHtml(_pub.descripcion || '')}</textarea>

        <label class="marketplace-form-label">Categoría</label>
        <button type="button" id="btn-cat-editar" class="marketplace-form-input marketplace-categoria-selector">
          ${_categoriaTexto()}
        </button>

        <label class="marketplace-form-label">Precio (MXN)</label>
        <input type="number" id="editar-precio" class="marketplace-form-input" min="0" step="0.01"
          value="${_pub.precio ?? ''}" />

        <label class="marketplace-form-label">Fotografías (${_totalImagenes()}/3)</label>
        <div class="marketplace-fotos-container" id="editar-fotos-container">
          ${_renderFotos()}
        </div>
        ${_totalImagenes() < 3 ? `<button type="button" id="btn-agregar-foto-editar" class="marketplace-btn-agregar-foto">+ Agregar Foto</button>` : ''}
      </form>
    </div>
  `;
  document.body.appendChild(_modal);
  _wireEventos();
}

function _categoriaTexto() {
  const cat = _categorias.find(c => c.id === _pub.categoria_id);
  return cat ? `${cat.emoji || '📦'} ${cat.nombre}` : 'Seleccionar categoría';
}

function _renderFotos() {
  const existentes = _imagenesExistentes.map((img, idx) => `
    <div class="marketplace-foto-item">
      <img src="${_escapeAttr(resolverUrlMarketplace(img))}" alt="Foto ${idx + 1}" class="marketplace-foto-preview" />
      <button type="button" class="marketplace-foto-remove" data-existente-idx="${idx}" aria-label="Eliminar foto">✕</button>
    </div>
  `).join('');

  const nuevas = _fotosNuevas.map((file, idx) => `
    <div class="marketplace-foto-item">
      <img src="${URL.createObjectURL(file)}" alt="Foto nueva ${idx + 1}" class="marketplace-foto-preview" />
      <button type="button" class="marketplace-foto-remove" data-nueva-idx="${idx}" aria-label="Eliminar foto">✕</button>
      <span class="marketplace-foto-badge" style="background:#2ecc71;">Nueva</span>
    </div>
  `).join('');

  return existentes + nuevas;
}

function _wireEventos() {
  _modal.querySelector('.marketplace-editar-perfil-cerrar')?.addEventListener('click', _cerrar);
  _modal.addEventListener('click', (e) => { if (e.target === _modal) _cerrar(); });

  _modal.querySelectorAll('.marketplace-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _sincronizarCamposEnPub();
      _pub = { ..._pub, tipo: btn.dataset.tipo };
      _render();
    });
  });

  _modal.querySelector('#btn-cat-editar')?.addEventListener('click', () => {
    _sincronizarCamposEnPub();
    _abrirSelectorCategoria();
  });

  _modal.querySelector('#btn-agregar-foto-editar')?.addEventListener('click', () => {
    _sincronizarCamposEnPub();
    _agregarFoto();
  });

  _modal.querySelectorAll('[data-existente-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      _sincronizarCamposEnPub();
      const idx = parseInt(btn.dataset.existenteIdx);
      const [img] = _imagenesExistentes.splice(idx, 1);
      _imagenesABorrar.push(img);
      _render();
    });
  });

  _modal.querySelectorAll('[data-nueva-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      _sincronizarCamposEnPub();
      const idx = parseInt(btn.dataset.nuevaIdx);
      _fotosNuevas.splice(idx, 1);
      _render();
    });
  });

  const form = _modal.querySelector('#marketplace-editar-pub-form');
  const btnGuardar = _modal.querySelector('#btn-guardar-pub');
  form.addEventListener('submit', (e) => { e.preventDefault(); _guardar(); });
  btnGuardar.addEventListener('click', _guardar);
}

function _agregarFoto() {
  if (_totalImagenes() >= 3) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (_totalImagenes() < 3) {
      _fotosNuevas.push(file);
      _render();
    }
  });
  input.click();
}

function _abrirSelectorCategoria() {
  const sel = document.createElement('div');
  sel.className = 'marketplace-categoria-modal';
  sel.innerHTML = `
    <div class="marketplace-categoria-modal-contenido">
      <h3>Seleccionar Categoría</h3>
      <div class="marketplace-categoria-lista">
        ${_categorias.map(cat => `
          <button type="button" class="marketplace-categoria-item" data-categoria-id="${_escapeAttr(cat.id)}">
            <span class="marketplace-categoria-emoji">${cat.emoji || '📦'}</span>
            <span class="marketplace-categoria-nombre">${_escapeHtml(cat.nombre)}</span>
          </button>
        `).join('')}
      </div>
      <button type="button" class="marketplace-categoria-cerrar" aria-label="Cerrar">✕</button>
    </div>
  `;
  document.body.appendChild(sel);

  sel.querySelectorAll('.marketplace-categoria-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _pub = { ..._pub, categoria_id: btn.dataset.categoriaId };
      document.body.removeChild(sel);
      _render();
    });
  });
  sel.querySelector('.marketplace-categoria-cerrar')?.addEventListener('click', () => document.body.removeChild(sel));
  sel.addEventListener('click', (e) => { if (e.target === sel) document.body.removeChild(sel); });
}

async function _guardar() {
  if (_guardando) return;

  const titulo = _modal.querySelector('#editar-titulo').value.trim();
  const descripcion = _modal.querySelector('#editar-descripcion').value.trim();
  const precio = _modal.querySelector('#editar-precio').value;

  if (!titulo) { alert('Ingresa un título'); return; }
  if (!_pub.categoria_id) { alert('Selecciona una categoría'); return; }

  // Mantiene _pub sincronizado por si el guardado falla y hay que
  // volver a pintar el modal con lo último que el usuario escribió.
  _pub = { ..._pub, titulo, descripcion, precio };

  _guardando = true;
  _render();

  try {
    const pubId = _pub.id;

    // 1. Actualizar datos principales
    const { error: errUpd } = await supabase
      .from('marketplace_publicaciones')
      .update({
        tipo: _pub.tipo,
        titulo,
        descripcion,
        precio: precio === '' ? null : parseFloat(precio),
        categoria_id: _pub.categoria_id,
      })
      .eq('id', pubId);
    if (errUpd) throw errUpd;

    // 2. Borrar imágenes marcadas (R2 + fila en BD — requiere la
    //    política DELETE de marketplace_imagenes)
    for (const img of _imagenesABorrar) {
      if (img.r2_path) {
        try { await eliminarDeR2(BUCKETS.marketplace, img.r2_path); }
        catch (e) { console.warn('No se pudo borrar de R2:', img.r2_path, e); }
      }
      if (img.id) {
        await supabase.from('marketplace_imagenes').delete().eq('id', img.id);
      }
    }

    // 3. Subir fotos nuevas
    const ordenBase = _imagenesExistentes.length;
    for (let i = 0; i < _fotosNuevas.length; i++) {
      const resultado = await subirImagenMarketplace(_fotosNuevas[i], pubId, ordenBase + i);
      await supabase.from('marketplace_imagenes').insert({
        publicacion_id: pubId,
        r2_url: resultado.url,
        r2_path: resultado.path,
        orden: ordenBase + i,
      });
    }

    _cerrar();
    if (_onGuardado) _onGuardado();
  } catch (e) {
    console.error('Error al guardar publicación:', e);
    alert(`Error al guardar: ${e.message}`);
    _guardando = false;
    _render();
  }
}

function _cerrar() {
  if (_modal) {
    document.body.removeChild(_modal);
    _modal = null;
  }
}

