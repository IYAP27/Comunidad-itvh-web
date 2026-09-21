// ═════════════════════════════════════════════════════════════════
// marketplace-publicar.js
//
// Formulario para crear nueva publicación en el Marketplace:
//   • Seleccionar tipo (Producto / Servicio)
//   • Título, Descripción, Precio, Categoría
//   • Subir fotos (máximo 3)
//   • Estado de verificación del emprendedor
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { subirImagenMarketplace } from '../../core/storage-r2.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _contenedor = null;
let _estadoEmprendedor = null;
let _emprendedorId = null;
let _categorias = [];
let _fotos = [];
let _tipo = 'producto';
let _categoriaId = null;
let _publicando = false;
let _onIrANegocio = null;

// ── FIX: título/descripción/precio ahora viven en estado del módulo,
// no solo en el DOM. Antes, cualquier interacción (cambiar tipo,
// agregar/quitar foto, elegir categoría) llamaba a _renderFormulario(),
// que reconstruye TODO el innerHTML desde cero. Como esos campos no
// tenían respaldo en ninguna variable, el usuario perdía lo que había
// escrito con solo tocar otra parte del formulario.
let _tituloVal = '';
let _descripcionVal = '';
let _precioVal = '';

const LIMITE_PUBLICACIONES = 6;

export async function render(contenedor, onIrANegocio) {
  destruir();
  _contenedor = contenedor;
  _onIrANegocio = onIrANegocio;
  _fotos = [];
  _tipo = 'producto';
  _categoriaId = null;
  _tituloVal = '';
  _descripcionVal = '';
  _precioVal = '';

  contenedor.innerHTML = '<div class="marketplace-publicar-cargando">Verificando estado...</div>';

  try {
    await _verificarEstado();
    
    if (_estadoEmprendedor === 'verificado') {
      _renderFormulario();
    } else if (_estadoEmprendedor === 'pendiente') {
      _renderEstadoPendiente();
    } else if (_estadoEmprendedor === 'suspendido') {
      _renderEstadoSuspendido();
    } else {
      _renderSinSolicitud();
    }
  } catch (e) {
    console.error('Error verificando estado:', e);
    _mostrarError(e.message);
  }
}

export function destruir() {
  _contenedor = null;
}

// ─────────────────────────────────────────────────────────────────
// Verificar estado del emprendedor
// ─────────────────────────────────────────────────────────────────
async function _verificarEstado() {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('emprendedores')
    .select('id, estado')
    .eq('perfil_id', uid)
    .maybeSingle();

  if (error) throw error;

  _emprendedorId = data?.id || null;
  _estadoEmprendedor = data?.estado || null;

  // Cargar categorías si es necesario
  if (_estadoEmprendedor === 'verificado') {
    await _cargarCategorias();
  }
}

async function _cargarCategorias() {
  const { data, error } = await supabase
    .from('marketplace_categorias')
    .select('id, nombre, emoji')
    .order('nombre');

  if (error) throw error;
  _categorias = data || [];
}

// ─────────────────────────────────────────────────────────────────
// Render: Estados
// ─────────────────────────────────────────────────────────────────
function _renderSinSolicitud() {
  _contenedor.innerHTML = `
    <div class="marketplace-estado-container">
      <div class="marketplace-estado-badge">
        <div class="marketplace-estado-icon">❌</div>
        <h2>Aún no eres Emprendedor</h2>
      </div>
      <p class="marketplace-estado-texto">
        Para publicar en el Marketplace, primero necesitas ser verificado como Emprendedor.
      </p>
      <button type="button" id="btn-solicitar-verificacion" class="marketplace-btn-principal">
        Solicitar Verificación
      </button>
    </div>
  `;

  _contenedor.querySelector('#btn-solicitar-verificacion')?.addEventListener('click', () => {
    _abrirSolicitudVerificacion();
  });
}

function _renderEstadoPendiente() {
  _contenedor.innerHTML = `
    <div class="marketplace-estado-container">
      <div class="marketplace-estado-badge pendiente">
        <div class="marketplace-estado-icon">⏳</div>
        <h2>Verificación Pendiente</h2>
      </div>
      <p class="marketplace-estado-texto">
        Tu solicitud de verificación está siendo revisada. Te notificaremos cuando sea aprobada.
      </p>
      <div class="marketplace-estado-info">
        <p>Mientras tanto, puedes preparar tus productos/servicios para publicar.</p>
      </div>
    </div>
  `;
}

function _renderEstadoSuspendido() {
  _contenedor.innerHTML = `
    <div class="marketplace-estado-container">
      <div class="marketplace-estado-badge suspendido">
        <div class="marketplace-estado-icon">🚫</div>
        <h2>Cuenta Suspendida</h2>
      </div>
      <p class="marketplace-estado-texto">
        Tu cuenta ha sido suspendida y no puedes publicar en el Marketplace.
      </p>
      <p class="marketplace-estado-contacto">
        Por favor, contacta a soporte para más información.
      </p>
    </div>
  `;
}


function _abrirSolicitudVerificacion() {
  const modal = document.createElement('div');
  modal.className = 'marketplace-solicitud-overlay';
  modal.innerHTML = `
    <section class="marketplace-solicitud-card" role="dialog" aria-modal="true" aria-label="Solicitud de emprendedor">
      <button type="button" class="marketplace-solicitud-cerrar" aria-label="Cerrar">✕</button>
      <div class="marketplace-solicitud-icon">🏪</div>
      <h2>Solicitar verificación</h2>
      <p>Completa los datos de tu negocio. Un administrador revisará tu solicitud.</p>
      <form id="marketplace-solicitud-form">
        <label>Nombre del negocio</label>
        <input id="marketplace-solicitud-nombre" class="marketplace-form-input" type="text" maxlength="60" placeholder="Tortas El Jaguar" required>
        <label>Descripción</label>
        <textarea id="marketplace-solicitud-descripcion" class="marketplace-form-textarea" maxlength="300" rows="4" placeholder="¿Qué ofreces? ¿Cuál es tu propuesta de valor?" required></textarea>
        <button type="submit" class="marketplace-btn-principal" id="marketplace-solicitud-enviar">Solicitar verificación</button>
      </form>
    </section>
  `;
  document.body.appendChild(modal);

  const cerrar = () => modal.remove();
  modal.querySelector('.marketplace-solicitud-cerrar')?.addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  modal.querySelector('#marketplace-solicitud-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = modal.querySelector('#marketplace-solicitud-nombre').value.trim();
    const descripcion = modal.querySelector('#marketplace-solicitud-descripcion').value.trim();
    if (!nombre || !descripcion) return;
    const btn = modal.querySelector('#marketplace-solicitud-enviar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      const uid = usuarioActual()?.id;
      if (!uid) throw new Error('No hay sesión activa');
      const { error } = await supabase.from('emprendedores').insert({
        perfil_id: uid,
        nombre_negocio: nombre,
        descripcion,
        estado: 'pendiente',
      });
      if (error) throw error;
      cerrar();
      await _verificarEstado();
      _renderEstadoPendiente();
      alert('¡Solicitud enviada! Te notificaremos cuando seas verificado.');
    } catch (err) {
      console.error('Error solicitando verificación:', err);
      alert(`No se pudo enviar la solicitud: ${err.message}`);
      btn.disabled = false;
      btn.textContent = 'Solicitar verificación';
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// Render: Formulario
// ─────────────────────────────────────────────────────────────────
function _renderFormulario() {
  _contenedor.innerHTML = `
    <div class="marketplace-publicar-form">
      <form id="marketplace-pub-form" class="marketplace-form">
        <!-- Tipo -->
        <div class="marketplace-form-section">
          <label class="marketplace-form-label">Tipo</label>
          <div class="marketplace-tipo-selector">
            <button type="button" class="marketplace-tipo-btn ${_tipo === 'producto' ? 'activo' : ''}" data-tipo="producto">
              📦 Producto
            </button>
            <button type="button" class="marketplace-tipo-btn ${_tipo === 'servicio' ? 'activo' : ''}" data-tipo="servicio">
              🔧 Servicio
            </button>
          </div>
        </div>

        <!-- Información básica -->
        <div class="marketplace-form-section">
          <h3 class="marketplace-section-title">Información</h3>
          <div class="marketplace-form-group">
            <input 
              type="text" 
              id="marketplace-titulo" 
              class="marketplace-form-input" 
              placeholder="Título"
              maxlength="100"
              value="${_escapeAttr(_tituloVal)}"
              required
            />
          </div>
          <div class="marketplace-form-group">
            <textarea 
              id="marketplace-descripcion" 
              class="marketplace-form-textarea" 
              placeholder="Descripción"
              maxlength="500"
              rows="4"
              required
            >${_escapeHtml(_descripcionVal)}</textarea>
          </div>
          <div class="marketplace-form-row">
            <div class="marketplace-form-group">
              <input 
                type="number" 
                id="marketplace-precio" 
                class="marketplace-form-input" 
                placeholder="Precio (MXN)"
                min="0"
                step="0.01"
                value="${_escapeAttr(_precioVal)}"
                required
              />
            </div>
            <div class="marketplace-form-group">
              <button type="button" id="btn-seleccionar-categoria" class="marketplace-form-input marketplace-categoria-selector">
                ${_categoriaTexto()}
              </button>
            </div>
          </div>
        </div>

        <!-- Fotos -->
        <div class="marketplace-form-section">
          <h3 class="marketplace-section-title">Fotografías (máximo 3)</h3>
          <div class="marketplace-fotos-container" id="marketplace-fotos-container">
            ${_renderFotos()}
          </div>
          ${_fotos.length < 3 ? `
            <button type="button" id="btn-agregar-foto" class="marketplace-btn-agregar-foto">
              + Agregar Foto
            </button>
          ` : ''}
        </div>

        <!-- Botones -->
        <div class="marketplace-form-acciones">
          <button type="submit" id="btn-publicar" class="marketplace-btn-principal" ${_publicando ? 'disabled' : ''}>
            ${_publicando ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  `;

  _wireFormulario();
}

function _categoriaTexto() {
  if (!_categoriaId) return 'Seleccionar Categoría';
  const cat = _categorias.find(c => c.id === _categoriaId);
  return cat ? `${cat.emoji || '📦'} ${cat.nombre}` : 'Categoría seleccionada';
}

function _renderFotos() {
  return _fotos.map((file, idx) => `
    <div class="marketplace-foto-item">
      <img src="${URL.createObjectURL(file)}" alt="Foto ${idx + 1}" class="marketplace-foto-preview" />
      <button type="button" class="marketplace-foto-remove" data-index="${idx}" aria-label="Eliminar foto">✕</button>
      ${idx === 0 ? '<span class="marketplace-foto-badge">Portada</span>' : ''}
    </div>
  `).join('');
}

// ── FIX: captura los valores actuales del formulario antes de
// reconstruirlo. Se llama justo antes de cada _renderFormulario()
// que se dispare por una interacción parcial (tipo, fotos, categoría),
// para no perder lo que el usuario ya había escrito.
function _capturarCampos() {
  const titulo = _contenedor?.querySelector('#marketplace-titulo');
  const descripcion = _contenedor?.querySelector('#marketplace-descripcion');
  const precio = _contenedor?.querySelector('#marketplace-precio');
  if (titulo) _tituloVal = titulo.value;
  if (descripcion) _descripcionVal = descripcion.value;
  if (precio) _precioVal = precio.value;
}

// ─────────────────────────────────────────────────────────────────
// Eventos del formulario
// ─────────────────────────────────────────────────────────────────
function _wireFormulario() {
  // Selector de tipo
  _contenedor.querySelectorAll('.marketplace-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _capturarCampos();
      _tipo = btn.dataset.tipo;
      _renderFormulario();
    });
  });

  // Agregar foto
  _contenedor.querySelector('#btn-agregar-foto')?.addEventListener('click', async (e) => {
    e.preventDefault();
    _capturarCampos();
    await _abrirSelectorFotos();
  });

  // Eliminar foto
  _contenedor.querySelectorAll('.marketplace-foto-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      _capturarCampos();
      const idx = parseInt(btn.dataset.index);
      _fotos.splice(idx, 1);
      _renderFormulario();
    });
  });

  // Selector de categoría
  _contenedor.querySelector('#btn-seleccionar-categoria')?.addEventListener('click', async (e) => {
    e.preventDefault();
    _capturarCampos();
    await _abrirSelectorCategoria();
  });

  // Enviar formulario
  _contenedor.querySelector('#marketplace-pub-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await _publicar();
  });
}

// ─────────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────────
async function _abrirSelectorFotos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = false;

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (_fotos.length < 3) {
      _fotos.push(file);
      _renderFormulario();
    } else {
      alert('Máximo 3 fotos');
    }
  });

  input.click();
}

async function _abrirSelectorCategoria() {
  if (_categorias.length === 0) {
    alert('No hay categorías disponibles');
    return;
  }

  // Crear modal con categorías
  const modal = document.createElement('div');
  modal.className = 'marketplace-categoria-modal';
  modal.innerHTML = `
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

  document.body.appendChild(modal);

  modal.querySelectorAll('.marketplace-categoria-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _categoriaId = btn.dataset.categoriaId;
      document.body.removeChild(modal);
      _renderFormulario();
    });
  });

  modal.querySelector('.marketplace-categoria-cerrar')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function _publicar() {
  if (_publicando) return;

  const titulo = _contenedor?.querySelector('#marketplace-titulo')?.value?.trim();
  const descripcion = _contenedor?.querySelector('#marketplace-descripcion')?.value?.trim();
  const precio = parseFloat(_contenedor?.querySelector('#marketplace-precio')?.value || 0);

  if (!titulo) {
    alert('El título es requerido');
    return;
  }

  if (!descripcion) {
    alert('La descripción es requerida');
    return;
  }

  if (!_categoriaId) {
    alert('Debe seleccionar una categoría');
    return;
  }

  if (_fotos.length === 0) {
    alert('Debe agregar al menos una foto');
    return;
  }

  // Preservamos los valores por si el límite nos hace abortar y hay
  // que re-renderizar el formulario tal cual estaba.
  _tituloVal = titulo;
  _descripcionVal = descripcion;
  _precioVal = String(precio);

  _publicando = true;
  _renderFormulario();

  try {
    // ── FIX: antes esta validación no existía — Dart sí revisa el
    // límite de publicaciones activas antes de insertar, la web no.
    // Un emprendedor podía crear publicaciones sin límite.
    const { data: activas, error: errActivas } = await supabase
      .from('marketplace_publicaciones')
      .select('id')
      .eq('emprendedor_id', _emprendedorId)
      .eq('esta_activa', true)
      .gt('expira_en', new Date().toISOString());

    if (errActivas) throw errActivas;

    if ((activas || []).length >= LIMITE_PUBLICACIONES) {
      alert(`Límite alcanzado: máximo ${LIMITE_PUBLICACIONES} publicaciones activas a la vez.`);
      _publicando = false;
      _renderFormulario();
      return;
    }

    // 1. Crear publicación
    const { data: pubData, error: pubError } = await supabase
      .from('marketplace_publicaciones')
      .insert({
        emprendedor_id: _emprendedorId,
        titulo,
        descripcion,
        precio,
        tipo: _tipo,
        categoria_id: _categoriaId,
        esta_activa: true,
        // ── FIX: antes eran 30 días. Dart nunca manda `expira_en`
        // en el insert (deja el default de la BD), y toda la UI dice
        // 24 horas — se corrige aquí para que coincida.
        expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      })
      .select()
      .single();

    if (pubError) throw pubError;

    const pubId = pubData.id;

    // 2. Subir fotos
    for (let i = 0; i < _fotos.length; i++) {
      const file = _fotos[i];
      try {
        const resultado = await subirImagenMarketplace(file, pubId, i);

        // Guardar en BD
        await supabase
          .from('marketplace_imagenes')
          .insert({
            publicacion_id: pubId,
            r2_url: resultado.url,
            r2_path: resultado.path,
            orden: i,
          });
      } catch (e) {
        console.error(`Error subiendo foto ${i}:`, e);
      }
    }

    alert('¡Publicación creada exitosamente!');
    
    // Limpiar y volver a negocio
    _fotos = [];
    _categoriaId = null;
    _tipo = 'producto';
    _tituloVal = '';
    _descripcionVal = '';
    _precioVal = '';
    
    if (_onIrANegocio) {
      _onIrANegocio();
    }
  } catch (e) {
    console.error('Error publicando:', e);
    alert(`Error: ${e.message}`);
    _publicando = false;
    _renderFormulario();
  }
}

function _mostrarError(mensaje) {
  _contenedor.innerHTML = `
    <div class="marketplace-error">
      <p>Error: ${_escapeHtml(mensaje)}</p>
      <button type="button" id="btn-reintentar" class="marketplace-btn-principal">Reintentar</button>
    </div>
  `;

  _contenedor.querySelector('#btn-reintentar')?.addEventListener('click', () => {
    render(_contenedor, _onIrANegocio);
  });
}

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────
