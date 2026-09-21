// ═════════════════════════════════════════════════════════════════
// cosas-perdidas-screen.js
// Web equivalente a CosasPerdidasPrincipal.dart.
//
// Paridad deliberada con móvil:
// - Un reporte dura 7 días y luego deja de mostrarse.
// - No existe segmentación perdido/encontrado ni estado "recuperado".
// - El autor elimina el reporte cuando ya no lo necesita.
// - "Contactar" abre JaguarChat con la tarjeta contextual del objeto.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { usuarioActual } from '../../core/auth.js';
import { ObjetosPerdidosRepository } from './objetos-perdidos-repository.js';
import { abrirConversacion } from './conversacion-screen.js?v=1.9.3';
import { abrirReporteContenido } from '../reportes/reportes-ui.js';

const MAX_DESCRIPCION = 300;
const MAX_IMAGEN_MB = 15;

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/perdidas.css">');
}

export const CosasPerdidasScreen = {
  mount(panel, ctx) {
    _injectStyles();

    const root = document.createElement('div');
    root.className = 'cp-root';
    root.innerHTML = `
      <div class="cp-encabezado">
        <div>
          <p class="cp-titulo">Cosas perdidas</p>
          <p class="cp-subtitulo">Reporta o encuentra objetos extraviados en el campus. Los reportes expiran a los 7 días.</p>
        </div>
        <button type="button" class="cp-btn-refrescar" id="cp-refrescar" title="Actualizar">↻</button>
      </div>

      <div class="cp-herramientas">
        <label class="cp-buscador">
          <span>⌕</span>
          <input id="cp-busqueda" type="search" placeholder="Buscar por descripción, lugar o persona..." autocomplete="off">
        </label>
        <div class="cp-filtros" role="group" aria-label="Filtrar reportes">
          <button type="button" class="cp-filtro activo" data-filtro="todos">Todos</button>
          <button type="button" class="cp-filtro" data-filtro="mios">Mis reportes</button>
        </div>
      </div>

      <div class="cp-resumen" id="cp-resumen" hidden></div>
      <div class="cp-lista" id="cp-lista"></div>
    `;
    panel.appendChild(root);

    const listaEl = root.querySelector('#cp-lista');
    const busquedaEl = root.querySelector('#cp-busqueda');
    const resumenEl = root.querySelector('#cp-resumen');
    let items = [];
    let filtro = 'todos';

    async function _cargar() {
      listaEl.innerHTML = `<p class="cp-cargando"><span class="cp-spinner"></span>Cargando reportes...</p>`;
      try {
        items = await ObjetosPerdidosRepository.cargar();
      } catch (e) {
        console.error('CosasPerdidasScreen._cargar:', e);
        listaEl.innerHTML = `<div class="cp-error">No se pudo cargar la lista.<br><button type="button" id="cp-reintentar">Reintentar</button></div>`;
        listaEl.querySelector('#cp-reintentar')?.addEventListener('click', _cargar);
        return;
      }
      _pintar();
    }

    function _filtrados() {
      const miId = usuarioActual()?.id;
      const q = _normalizar(busquedaEl.value.trim());
      return items.filter((obj) => {
        if (filtro === 'mios' && obj.autorId !== miId) return false;
        if (!q) return true;
        return _normalizar([
          obj.descripcion,
          obj.lugar,
          obj.autorNombre,
          obj.autorNombreUsuario,
        ].filter(Boolean).join(' ')).includes(q);
      });
    }

    function _pintar() {
      const visibles = _filtrados();
      const miId = usuarioActual()?.id;
      const buscando = Boolean(busquedaEl.value.trim()) || filtro !== 'todos';

      resumenEl.hidden = !buscando;
      if (buscando) resumenEl.textContent = `${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}`;

      if (visibles.length === 0) {
        listaEl.innerHTML = `
          <div class="cp-vacio">
            <div class="cp-vacio-icono">🔎</div>
            ${items.length === 0
              ? 'No hay reportes activos por ahora.<br>¿Perdiste algo? Sé el primero en reportarlo.'
              : 'No encontramos reportes que coincidan con tu búsqueda.'}
          </div>
        `;
        return;
      }

      listaEl.innerHTML = '';
      visibles.forEach((obj) => listaEl.appendChild(_crearTarjeta(obj, miId === obj.autorId, _cargar)));
    }

    root.querySelector('#cp-refrescar').addEventListener('click', _cargar);
    busquedaEl.addEventListener('input', _pintar);
    root.querySelectorAll('.cp-filtro').forEach((btn) => {
      btn.addEventListener('click', () => {
        filtro = btn.dataset.filtro;
        root.querySelectorAll('.cp-filtro').forEach((b) => b.classList.toggle('activo', b === btn));
        _pintar();
      });
    });

    ctx.setFab({
      icon: '<span class="cp-fab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>',
      label: 'Reportar',
      onClick: () => _abrirFormularioReporte(_cargar),
    });

    _cargar();
    return () => ctx.setFab(null);
  },
};

// ── Tarjeta ──────────────────────────────────────────────────────────────
function _crearTarjeta(obj, esMio, onCambio) {
  const wrap = document.createElement('article');
  wrap.className = 'cp-tarjeta';

  const inicial = (obj.autorNombre || '?').trim().charAt(0).toUpperCase();
  const avatar = obj.autorAvatar
    ? `<img src="${_escapeAttr(obj.autorAvatar)}" alt="">`
    : `<span>${inicial}</span>`;

  wrap.innerHTML = `
    ${obj.imagenUrl ? `
      <button type="button" class="cp-tarjeta-imagen-wrap" data-accion="detalle" aria-label="Ver detalle del objeto">
        <img src="${_escapeAttr(obj.imagenUrl)}" alt="Foto del objeto reportado" loading="lazy">
      </button>
    ` : ''}
    <div class="cp-tarjeta-cuerpo">
      <div class="cp-meta-fila">
        <span>${_relativo(obj.creadoEn)}</span>
        <span class="cp-expira">⏱️ ${_expiracion(obj.expiraEn)}</span>
      </div>
      <button type="button" class="cp-descripcion cp-descripcion-btn" data-accion="detalle">${_escapeHtml(obj.descripcion)}</button>
      ${obj.lugar ? `<div class="cp-lugar">📍 ${_escapeHtml(obj.lugar)}</div>` : ''}
      <div class="cp-footer">
        <span class="cp-autor-avatar">${avatar}</span>
        <span class="cp-autor-info">
          <div class="cp-autor-nombre">${_escapeHtml(obj.autorNombre)}</div>
          ${obj.autorNombreUsuario ? `<div class="cp-autor-usuario">@${_escapeHtml(obj.autorNombreUsuario)}</div>` : ''}
        </span>
        ${esMio
          ? `<button type="button" class="cp-btn-eliminar" data-accion="eliminar">🗑️ Eliminar</button>`
          : `<button type="button" class="cp-btn-contactar" data-accion="contactar">💬 Contactar</button>`}
      </div>
    </div>
  `;

  wrap.querySelectorAll('[data-accion="detalle"]').forEach((el) => {
    el.addEventListener('click', () => abrirDetalleObjetoPerdido(obj.id, obj));
  });

  if (esMio) {
    wrap.querySelector('[data-accion="eliminar"]')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este reporte? El reporte y la imagen se eliminarán permanentemente.')) return;
      try {
        await ObjetosPerdidosRepository.eliminar(obj);
        onCambio?.();
      } catch (e) {
        console.error('Eliminar reporte:', e);
        alert('No se pudo eliminar el reporte. Intenta de nuevo.');
      }
    });
  } else {
    wrap.querySelector('[data-accion="contactar"]')?.addEventListener('click', () => _contactar(obj));
  }

  return wrap;
}

function _contactar(obj) {
  abrirConversacion({
    otroUsuarioId: obj.autorId,
    otroNombre: obj.autorNombre,
    otroNombreUsuario: obj.autorNombreUsuario,
    otroAvatarUrl: obj.autorAvatar,
    contextoObjeto: {
      id: obj.id,
      descripcion: obj.descripcion,
      imagenUrl: obj.imagenUrl,
      lugar: obj.lugar,
      tipo: 'objeto_perdido',
    },
  });
}

// ── Detalle (equivalente a DetalleObjetoPerdidoScreen de móvil) ────────
export async function abrirDetalleObjetoPerdido(objetoId, objetoInicial = null) {
  _injectStyles();
  document.querySelector('.cp-detalle-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'cp-detalle-overlay';
  overlay.innerHTML = `
    <section class="cp-detalle" role="dialog" aria-modal="true" aria-label="Detalle de objeto perdido">
      <header class="cp-detalle-header">
        <button type="button" class="cp-detalle-cerrar" aria-label="Cerrar">‹</button>
        <strong>Objeto perdido</strong>
        <span></span>
      </header>
      <div class="cp-detalle-contenido"><p class="cp-cargando"><span class="cp-spinner"></span>Cargando...</p></div>
    </section>
  `;
  document.body.appendChild(overlay);

  const cerrar = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.cp-detalle-cerrar').addEventListener('click', cerrar);

  let obj = objetoInicial;
  try {
    obj = await ObjetosPerdidosRepository.cargarPorId(objetoId);
  } catch (e) {
    console.warn('Detalle objeto:', e);
  }

  const contenido = overlay.querySelector('.cp-detalle-contenido');
  if (!obj || new Date(obj.expiraEn).getTime() <= Date.now()) {
    contenido.innerHTML = `
      <div class="cp-detalle-no-disponible">
        <div>⏱️</div>
        <p>Este reporte ya no está disponible</p>
      </div>`;
    return;
  }

  const esMio = usuarioActual()?.id === obj.autorId;
  const card = _crearTarjeta(obj, esMio, () => cerrar());
  // Dentro del detalle, pulsar descripción/imagen ya no abre otro detalle.
  card.querySelectorAll('[data-accion="detalle"]').forEach((el) => el.replaceWith(el.cloneNode(true)));
  contenido.innerHTML = '';
  contenido.appendChild(card);
  if (!esMio) {
    const acciones = document.createElement('div');
    acciones.className = 'cp-detalle-reportar-wrap';
    acciones.innerHTML = `<button type="button" class="cp-btn-reportar-global">🚩 Reportar este aviso</button>`;
    acciones.querySelector('button').addEventListener('click', () => {
      cerrar();
      abrirReporteContenido({ tipo: 'objeto_perdido', contenidoId: obj.id, autorId: obj.autorId, titulo: 'Reportar aviso de objeto perdido', metadata: { descripcion: obj.descripcion || '', lugar: obj.lugar || '' } });
    });
    contenido.appendChild(acciones);
  }
}

function _relativo(iso) {
  const fecha = new Date(iso);
  const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function _expiracion(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  const dias = Math.floor(ms / 86400000);
  if (dias <= 0) return 'Expira hoy';
  if (dias === 1) return 'Expira mañana';
  return `Expira en ${dias} días`;
}

// ── Formulario de reporte ──────────────────────────────────────────────
function _abrirFormularioReporte(onCreado) {
  document.querySelector('.cp-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'cp-modal-overlay';
  overlay.innerHTML = `
    <div class="cp-modal" role="dialog" aria-modal="true" aria-label="Reportar objeto perdido">
      <div class="cp-modal-agarradera"></div>
      <div class="cp-modal-cabecera">
        <div class="cp-modal-titulo">Reportar objeto perdido</div>
        <button type="button" class="cp-modal-cerrar" aria-label="Cerrar">✕</button>
      </div>
      <p class="cp-subtitulo" style="margin-top:-8px;">El reporte expira automáticamente en 7 días.</p>

      <label class="cp-imagen-picker" id="cp-imagen-picker">
        <span class="cp-imagen-picker-icono">📷</span>
        <span>Agregar foto (opcional)</span>
        <small>Se comprimirá antes de subir</small>
        <input type="file" accept="image/*" id="cp-input-imagen" hidden>
      </label>

      <div class="cp-campo">
        <label>Descripción</label>
        <textarea id="cp-input-descripcion" maxlength="${MAX_DESCRIPCION}" placeholder="¿Qué se perdió? Describe el objeto..."></textarea>
        <div class="cp-contador" id="cp-contador">0/${MAX_DESCRIPCION}</div>
      </div>
      <div class="cp-campo">
        <label>Lugar (opcional)</label>
        <input type="text" id="cp-input-lugar" maxlength="120" placeholder="Ej. Biblioteca, Sala H-12, Edificio C...">
      </div>

      <p class="cp-error-msg" id="cp-error" hidden></p>
      <button type="button" class="cp-btn-guardar" id="cp-btn-publicar">Publicar reporte</button>
    </div>
  `;

  let previewUrl = null;
  const cerrar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.cp-modal-cerrar').addEventListener('click', cerrar);
  document.body.appendChild(overlay);

  let archivoElegido = null;
  const errorEl = overlay.querySelector('#cp-error');

  function _mostrarError(texto) {
    errorEl.textContent = texto;
    errorEl.hidden = false;
  }

  function _wireInputImagen() {
    const inputImagenEl = overlay.querySelector('#cp-input-imagen');
    inputImagenEl.addEventListener('change', () => {
      const file = inputImagenEl.files?.[0];
      if (!file) return;
      errorEl.hidden = true;
      if (!file.type.startsWith('image/')) {
        _mostrarError('Selecciona un archivo de imagen.');
        inputImagenEl.value = '';
        return;
      }
      if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
        _mostrarError(`La imagen no puede superar ${MAX_IMAGEN_MB} MB.`);
        inputImagenEl.value = '';
        return;
      }
      archivoElegido = file;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      const pickerEl = overlay.querySelector('#cp-imagen-picker');
      pickerEl.innerHTML = `
        <img src="${previewUrl}" alt="Vista previa">
        <button type="button" class="cp-imagen-quitar" id="cp-imagen-quitar" aria-label="Quitar imagen">✕</button>
      `;
      pickerEl.querySelector('#cp-imagen-quitar').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        archivoElegido = null;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        pickerEl.innerHTML = `
          <span class="cp-imagen-picker-icono">📷</span>
          <span>Agregar foto (opcional)</span>
          <small>Se comprimirá antes de subir</small>
          <input type="file" accept="image/*" id="cp-input-imagen" hidden>
        `;
        _wireInputImagen();
      });
    });
  }
  _wireInputImagen();

  const descripcionEl = overlay.querySelector('#cp-input-descripcion');
  const contadorEl = overlay.querySelector('#cp-contador');
  const btnPublicar = overlay.querySelector('#cp-btn-publicar');

  descripcionEl.addEventListener('input', () => {
    contadorEl.textContent = `${descripcionEl.value.length}/${MAX_DESCRIPCION}`;
    errorEl.hidden = true;
  });

  btnPublicar.addEventListener('click', async () => {
    const descripcion = descripcionEl.value.trim();
    const lugar = overlay.querySelector('#cp-input-lugar').value.trim();

    errorEl.hidden = true;
    if (!descripcion) {
      _mostrarError('Escribe una descripción del objeto.');
      descripcionEl.focus();
      return;
    }

    const autorId = usuarioActual()?.id;
    if (!autorId) {
      _mostrarError('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }

    btnPublicar.disabled = true;
    btnPublicar.innerHTML = '<span class="cp-spinner cp-spinner-btn"></span> Publicando...';
    try {
      await ObjetosPerdidosRepository.crear({ descripcion, lugar, file: archivoElegido, autorId });
      cerrar();
      onCreado?.();
    } catch (e) {
      console.error('Publicar reporte:', e);
      _mostrarError(_mensajeErrorSubida(e));
      btnPublicar.disabled = false;
      btnPublicar.textContent = 'Publicar reporte';
    }
  });
}

function _mensajeErrorSubida(e) {
  const m = String(e?.message || e || '');
  if (/sesión activa/i.test(m)) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (/tipo de archivo no permitido/i.test(m)) return 'Ese formato de imagen no está permitido.';
  if (/tiempo de espera/i.test(m)) return 'La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.';
  return 'No se pudo publicar el reporte. Intenta de nuevo.';
}

function _normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
