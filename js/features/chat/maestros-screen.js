// ═════════════════════════════════════════════════════════════════
// maestros-screen.js
//
// Traducción de RefeMaestros_Principal.dart (pantalla + formulario de
// alta) y maestro_card.dart (tarjeta + edición + evaluación). No usa
// caché local (Dexie) — a diferencia del chat, aquí todo se lee/
// escribe directo contra Supabase, como el resto de la app.
//
// Contrato de pantalla que espera JaguarChatPrincipal:
//   mount(panel, ctx) => cleanupFn
//   ctx = { tabId, isDark, setFab(configOrNull), pillClearanceCss }
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { usuarioActual } from '../../core/auth.js';
import { MaestrosRepository } from './maestros-repository.js';
import { nombreCompleto, maestroToInsertMap } from './maestro.js';
import { abrirReporteContenido } from '../reportes/reportes-ui.js';

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/maestros.css">');
}

// ── Catálogo de departamentos — igual que el enum _Depto en Dart ──────────
const DEPTOS = [
  { id: 'todos', label: 'Todos', chip: 'Todos', color: '#8E8E93', filtroDb: null, icono: '🗂️' },
  { id: 'sistemas', label: 'Sistemas y Computación', chip: 'Sistemas', color: '#007AFF', filtroDb: 'Sistemas y Computación', icono: '💻' },
  { id: 'industrial', label: 'Ingeniería Industrial', chip: 'Industrial', color: '#FF9500', filtroDb: 'Ingeniería Industrial', icono: '🏭' },
  { id: 'economico', label: 'Ciencias Económico-Administrativas', chip: 'Económico', color: '#34C759', filtroDb: 'Ciencias Económico-Administrativas', icono: '🏦' },
  { id: 'quimica', label: 'Ing. Química, Bioquímica y Ambiental', chip: 'Química', color: '#AF52DE', filtroDb: 'Ing. Química, Bioquímica y Ambiental', icono: '🧪' },
  { id: 'tierra', label: 'Ciencias de la Tierra', chip: 'Tierra', color: '#00C7BE', filtroDb: 'Ciencias de la Tierra', icono: '⛰️' },
  { id: 'basicas', label: 'Ciencias Básicas', chip: 'C. Básicas', color: '#FF2D55', filtroDb: 'Ciencias Básicas', icono: '🧮' },
];

const TITULOS = ['Dr.', 'Dra.', 'Ing.', 'Inga.', 'Mtro.', 'Mtra.', 'Lic.', 'Profe'];

export const MaestrosScreen = {
  mount(panel, ctx) {
    _injectStyles();

    const root = document.createElement('div');
    root.className = 'mst-root';
    root.innerHTML = `
      <div class="mst-chips" id="mst-chips">
        ${DEPTOS.map((d) => `
          <button type="button" class="mst-chip" data-depto="${d.id}">
            <span>${d.icono}</span><span>${d.chip}</span>
          </button>
        `).join('')}
      </div>
      <div class="mst-buscador">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
        <input type="text" id="mst-input-buscar" placeholder="Buscar por docente o materia...">
        <button type="button" id="mst-btn-limpiar" title="Limpiar búsqueda" hidden>✕</button>
        <button type="button" id="mst-btn-refrescar" class="mst-btn-refrescar" title="Actualizar lista" aria-label="Actualizar lista">↻</button>
      </div>
      <div class="mst-lista" id="mst-lista"></div>
    `;
    panel.appendChild(root);

    let deptoActivo = DEPTOS[0];
    let maestros = [];
    let busqueda = '';

    const listaEl = root.querySelector('#mst-lista');
    const inputBuscar = root.querySelector('#mst-input-buscar');
    const btnLimpiar = root.querySelector('#mst-btn-limpiar');
    const btnRefrescar = root.querySelector('#mst-btn-refrescar');

    function _pintarChips() {
      root.querySelectorAll('.mst-chip').forEach((btn) => {
        const d = DEPTOS.find((x) => x.id === btn.dataset.depto);
        const activo = d.id === deptoActivo.id;
        btn.classList.toggle('activo', activo);
        btn.style.background = activo ? d.color : '';
        btn.style.borderColor = activo ? d.color : '';
      });
    }

    async function _cargarMaestros() {
      listaEl.innerHTML = `<p class="mst-cargando">Cargando maestros...</p>`;
      try {
        maestros = await MaestrosRepository.obtenerMaestros({ departamento: deptoActivo.filtroDb });
      } catch (e) {
        console.error('MaestrosScreen._cargarMaestros:', e);
        listaEl.innerHTML = `<p class="mst-vacio">No se pudo cargar la lista. Intenta de nuevo.</p>`;
        return;
      }
      _pintarLista();
    }

    function _pintarLista() {
      const q = _normalizarTexto(busqueda);
      const filtrados = q ? maestros.filter((m) => {
        const bolsa = [
          nombreCompleto(m),
          m.departamento || '',
          ...(m.materias || []),
          ...(m.semestres || []),
        ].map(_normalizarTexto).join(' ');
        return bolsa.includes(q);
      }) : maestros;

      listaEl.innerHTML = '';
      if (maestros.length === 0) {
        listaEl.innerHTML = `
          <div class="mst-vacio">
            <div class="mst-vacio-icono">🎓</div>
            Todavía no hay maestros en ${deptoActivo.id === 'todos' ? 'ningún departamento' : 'este departamento'}.<br>
            Sé el primero en agregar uno.
          </div>
        `;
        return;
      }
      if (filtrados.length === 0) {
        listaEl.innerHTML = `<p class="mst-vacio">Sin resultados para "${_escapeHtml(busqueda)}".</p>`;
        return;
      }
      filtrados.forEach((m) => listaEl.appendChild(_crearTarjeta(m, { ctx, onActualizado: _cargarMaestros })));
    }

    root.querySelector('#mst-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('.mst-chip');
      if (!btn) return;
      const d = DEPTOS.find((x) => x.id === btn.dataset.depto);
      if (d.id === deptoActivo.id) return;
      deptoActivo = d;
      _pintarChips();
      _cargarMaestros();
    });

    inputBuscar.addEventListener('input', () => {
      busqueda = inputBuscar.value;
      btnLimpiar.hidden = busqueda.length === 0;
      _pintarLista();
    });
    btnLimpiar.addEventListener('click', () => {
      inputBuscar.value = '';
      busqueda = '';
      btnLimpiar.hidden = true;
      _pintarLista();
    });
    btnRefrescar.addEventListener('click', async () => {
      btnRefrescar.disabled = true;
      btnRefrescar.classList.add('girando');
      try {
        await _cargarMaestros();
      } finally {
        btnRefrescar.disabled = false;
        btnRefrescar.classList.remove('girando');
      }
    });

    // FAB "agregar maestro" — el color acompaña al departamento activo,
    // igual que _colorActivo en Dart.
    ctx.setFab({
      icon: '<span class="mst-fab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>',
      label: 'Docente',
      onClick: () => _abrirFormularioMaestro({ onGuardado: _cargarMaestros, colorAcento: deptoActivo.color }),
    });

    _pintarChips();
    _cargarMaestros();

    return () => {
      ctx.setFab(null);
    };
  },
};

// ── Tarjeta de un maestro ───────────────────────────────────────────────
function _crearTarjeta(maestro, { ctx, onActualizado }) {
  const wrap = document.createElement('div');
  wrap.className = 'mst-tarjeta';

  let evaluaciones = [];
  let cargandoEvals = true;
  let expandido = false;
  const MAX_VISIBLES = 2;

  function render() {
    const inicial = (maestro.nombre || '?').trim().charAt(0).toUpperCase();
    wrap.innerHTML = `
      <div class="mst-tarjeta-top">
        <span class="mst-avatar">${inicial}</span>
        <div style="flex:1;min-width:0;">
          <div class="mst-nombre">${_escapeHtml(nombreCompleto(maestro))}</div>
          ${maestro.departamento ? `<div class="mst-depto">${_escapeHtml(maestro.departamento)}</div>` : ''}
        </div>
        <div class="mst-puntuacion">
          <div class="mst-estrellas">${_renderEstrellas(maestro.promedioEstrellas, 15)}</div>
          <div class="mst-puntuacion-texto">
            ${maestro.promedioEstrellas > 0
              ? `${maestro.promedioEstrellas.toFixed(1)} · ${maestro.totalEvaluaciones} ${maestro.totalEvaluaciones === 1 ? 'eval.' : 'evals.'}`
              : 'Sin evaluar'}
          </div>
          <button type="button" class="mst-btn-editar" id="mst-btn-editar">✏️ Editar</button>
        </div>
      </div>

      <div class="mst-divisor"></div>

      ${maestro.materias.length ? `
        <div class="mst-etiqueta">Materias</div>
        <div class="mst-chips-wrap">${maestro.materias.map((s) => `<span class="mst-pill" style="background:rgba(0,122,255,0.1);color:#007AFF;">${_escapeHtml(s)}</span>`).join('')}</div>
      ` : ''}
      ${maestro.semestres.length ? `
        <div class="mst-etiqueta">Semestres</div>
        <div class="mst-chips-wrap">${maestro.semestres.map((s) => `<span class="mst-pill" style="background:rgba(52,199,89,0.1);color:#34C759;">${_escapeHtml(s)}</span>`).join('')}</div>
      ` : ''}

      <div class="mst-divisor"></div>

      <div class="mst-comentarios-header">
        <span class="mst-etiqueta" style="margin:0;">Comentarios</span>
        <button type="button" class="mst-btn-evaluar" id="mst-btn-evaluar">+ Evaluar</button>
      </div>
      <div id="mst-comentarios"></div>
    `;

    wrap.querySelector('#mst-btn-editar').addEventListener('click', () => {
      _abrirFormularioMaestro({ maestro, onGuardado: (actualizado) => { Object.assign(maestro, actualizado); render(); onActualizado?.(); } });
    });
    wrap.querySelector('#mst-btn-evaluar').addEventListener('click', () => _iniciarEvaluacion());

    _renderComentarios();
  }

  function _renderComentarios() {
    const el = wrap.querySelector('#mst-comentarios');
    if (cargandoEvals) {
      el.innerHTML = `<p class="mst-sin-evals">Cargando...</p>`;
      return;
    }
    if (evaluaciones.length === 0) {
      el.innerHTML = `<p class="mst-sin-evals">Aún no hay evaluaciones. ¡Sé el primero!</p>`;
      return;
    }
    const visibles = expandido ? evaluaciones : evaluaciones.slice(0, MAX_VISIBLES);
    const uidActual = usuarioActual()?.id;
    el.innerHTML = visibles.map((ev) => `
      <div class="mst-comentario" data-eval-id="${_escapeAttr(ev.id)}">
        <span class="mst-comentario-estrellas">${_renderEstrellas(ev.estrellas, 12)}</span>
        <span class="mst-comentario-texto">${ev.comentario ? _escapeHtml(ev.comentario) : 'Sin comentario.'}</span>
        ${uidActual && uidActual !== ev.usuarioId ? '<button type="button" class="mst-reportar-eval" title="Reportar evaluación">🚩</button>' : ''}
      </div>
    `).join('') + (evaluaciones.length > MAX_VISIBLES ? `
      <div class="mst-ver-mas" id="mst-ver-mas">
        ${expandido ? 'Ver menos' : `Ver más comentarios (${evaluaciones.length - MAX_VISIBLES})`} ${expandido ? '▲' : '▼'}
      </div>
    ` : '');

    el.querySelector('#mst-ver-mas')?.addEventListener('click', () => {
      expandido = !expandido;
      _renderComentarios();
    });

    el.querySelectorAll('.mst-reportar-eval').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fila = btn.closest('[data-eval-id]');
        const ev = evaluaciones.find((x) => String(x.id) === String(fila?.dataset.evalId));
        if (!ev) return;
        abrirReporteContenido({
          tipo: 'evaluacion_maestro',
          contenidoId: ev.id,
          autorId: ev.usuarioId,
          titulo: 'Reportar evaluación',
          metadata: { maestro_id: maestro.id, maestro: nombreCompleto(maestro), estrellas: ev.estrellas, comentario: ev.comentario || '' },
        });
      });
    });
  }

  async function _cargarEvaluaciones() {
    try {
      evaluaciones = await MaestrosRepository.obtenerEvaluaciones(maestro.id);
    } catch (e) {
      console.error('Tarjeta maestro — obtenerEvaluaciones:', e);
    }
    cargandoEvals = false;
    _renderComentarios();
  }

  async function _iniciarEvaluacion() {
    const uid = usuarioActual()?.id;
    if (!uid) return;

    let yaEvaluo = false;
    try {
      yaEvaluo = await MaestrosRepository.yaEvaluo({ maestroId: maestro.id, usuarioId: uid });
    } catch (e) {
      console.error('Tarjeta maestro — yaEvaluo:', e);
    }
    if (yaEvaluo) {
      alert('Ya evaluaste a este docente.');
      return;
    }

    _abrirFormularioEvaluacion({
      maestro,
      onGuardado: async () => {
        await _cargarEvaluaciones();
        await onActualizado?.();
      },
    });
  }

  render();
  _cargarEvaluaciones();
  return wrap;
}

function _renderEstrellas(promedio, size) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    const llena = i < Math.floor(promedio);
    const media = !llena && i < promedio;
    const color = promedio > 0 ? '#FFCC00' : 'var(--texto-bajo)';
    if (media) {
      html += `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><defs><linearGradient id="mstMedia${i}${Math.round(promedio * 10)}"><stop offset="50%" stop-color="${color}"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#mstMedia${i}${Math.round(promedio * 10)})" stroke="${color}" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`;
    } else {
      html += `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${llena ? color : 'none'}" stroke="${color}" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`;
    }
  }
  return html;
}

// ── Modal genérico ────────────────────────────────────────────────────
function _abrirModal(tituloHtml, cuerpoHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'mst-modal-overlay';
  overlay.innerHTML = `
    <div class="mst-modal" role="dialog" aria-modal="true">
      <div class="mst-modal-agarradera"></div>
      <div class="mst-modal-cabecera">
        <div class="mst-modal-titulo">${tituloHtml}</div>
        <button type="button" class="mst-modal-cerrar" aria-label="Cerrar">✕</button>
      </div>
      <div id="mst-modal-cuerpo">${cuerpoHtml}</div>
    </div>
  `;
  const cerrar = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrar();
  });
  overlay.querySelector('.mst-modal-cerrar').addEventListener('click', cerrar);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  return overlay;
}

// ── Formulario: agregar / editar maestro ─────────────────────────────────
function _abrirFormularioMaestro({ maestro = null, onGuardado, colorAcento = '#007AFF' }) {
  const esEdicion = maestro != null;
  const overlay = _abrirModal(esEdicion ? 'Editar docente' : 'Agregar docente', `
    <div class="mst-fila-2">
      <div class="mst-campo">
        <label>Título</label>
        <select id="mst-f-titulo">
          ${TITULOS.map((t) => `<option value="${t}" ${maestro?.titulo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="mst-campo" style="flex:2;">
        <label>Nombre(s)</label>
        <input type="text" id="mst-f-nombre" value="${_escapeAttr(maestro?.nombre || '')}" placeholder="Ej. Clemente">
      </div>
    </div>
    <div class="mst-fila-2">
      <div class="mst-campo">
        <label>Apellido paterno</label>
        <input type="text" id="mst-f-pat" value="${_escapeAttr(maestro?.apellidoPat || '')}" placeholder="Ej. Silvan">
      </div>
      <div class="mst-campo">
        <label>Apellido materno</label>
        <input type="text" id="mst-f-mat" value="${_escapeAttr(maestro?.apellidoMat || '')}" placeholder="Ej. Emeterio">
      </div>
    </div>
    <div class="mst-campo">
      <label>Departamento</label>
      <select id="mst-f-depto">
        <option value="">Sin especificar</option>
        ${DEPTOS.filter((d) => d.id !== 'todos').map((d) => `<option value="${_escapeAttr(d.label)}" ${maestro?.departamento === d.label ? 'selected' : ''}>${d.label}</option>`).join('')}
      </select>
    </div>
    <div class="mst-campo">
      <label>Materias</label>
      <input type="text" id="mst-f-materias" value="${_escapeAttr((maestro?.materias || []).join(', '))}" placeholder="Separadas por coma: Cálculo, Física">
      <div class="mst-campo-hint">Sepáralas con comas.</div>
    </div>
    <div class="mst-campo">
      <label>Semestres</label>
      <input type="text" id="mst-f-semestres" value="${_escapeAttr((maestro?.semestres || []).join(', '))}" placeholder="Ej. 3, 4, 5">
    </div>
    ${esEdicion ? '' : '<div class="mst-verificacion" id="mst-f-verificacion" hidden></div>'}
    <p class="mst-error" id="mst-f-error" hidden></p>
    <button type="button" class="mst-btn-guardar" id="mst-f-guardar" style="background:${colorAcento};">Guardar</button>
  `);

  const errorEl = overlay.querySelector('#mst-f-error');
  const btnGuardar = overlay.querySelector('#mst-f-guardar');
  const patEl = overlay.querySelector('#mst-f-pat');
  const matEl = overlay.querySelector('#mst-f-mat');
  const verificacionEl = overlay.querySelector('#mst-f-verificacion');

  let apellidosVerificados = esEdicion;
  let verificando = false;
  let hayDuplicado = false;
  let ultimaCombinacion = esEdicion ? `${maestro.apellidoPat}|${maestro.apellidoMat}` : '';

  function _mostrarVerificacion(tipo, texto) {
    if (!verificacionEl) return;
    verificacionEl.hidden = false;
    verificacionEl.className = `mst-verificacion ${tipo}`;
    verificacionEl.textContent = texto;
  }

  function _resetVerificacion() {
    if (esEdicion) return;
    apellidosVerificados = false;
    hayDuplicado = false;
    ultimaCombinacion = '';
    if (verificacionEl) verificacionEl.hidden = true;
  }

  async function _verificarDuplicado({ forzar = false } = {}) {
    if (esEdicion || verificando) return true;
    const apellidoPat = patEl.value.trim();
    const apellidoMat = matEl.value.trim();
    if (!apellidoPat || !apellidoMat) {
      _resetVerificacion();
      return false;
    }
    const combinacion = `${_normalizarTexto(apellidoPat)}|${_normalizarTexto(apellidoMat)}`;
    if (!forzar && apellidosVerificados && combinacion === ultimaCombinacion) return !hayDuplicado;

    verificando = true;
    btnGuardar.disabled = true;
    _mostrarVerificacion('cargando', 'Verificando que el docente no esté registrado...');
    try {
      const existe = await MaestrosRepository.maestroExiste({ apellidoPat, apellidoMat });
      hayDuplicado = existe;
      apellidosVerificados = !existe;
      ultimaCombinacion = combinacion;
      if (existe) {
        _mostrarVerificacion('error', 'Docente ya existe. Verifica su información en la lista.');
      } else {
        _mostrarVerificacion('ok', '✓ Apellidos verificados. No se encontró un duplicado.');
      }
      return !existe;
    } catch (e) {
      console.error('Formulario maestro — verificar duplicado:', e);
      apellidosVerificados = false;
      hayDuplicado = false;
      _mostrarVerificacion('error', 'No se pudo verificar el docente. Intenta de nuevo.');
      return false;
    } finally {
      verificando = false;
      btnGuardar.disabled = false;
    }
  }

  if (!esEdicion) {
    patEl.addEventListener('input', _resetVerificacion);
    matEl.addEventListener('input', _resetVerificacion);
    patEl.addEventListener('blur', () => _verificarDuplicado());
    matEl.addEventListener('blur', () => _verificarDuplicado());
  }

  btnGuardar.addEventListener('click', async () => {
    const nombre = overlay.querySelector('#mst-f-nombre').value.trim();
    const apellidoPat = patEl.value.trim();
    const apellidoMat = matEl.value.trim();
    const titulo = overlay.querySelector('#mst-f-titulo').value;
    const departamento = overlay.querySelector('#mst-f-depto').value || null;
    const materias = _parsearChips(overlay.querySelector('#mst-f-materias').value);
    const semestres = _parsearChips(overlay.querySelector('#mst-f-semestres').value);

    errorEl.hidden = true;
    if (!nombre || !apellidoPat || !apellidoMat) {
      errorEl.textContent = 'Nombre y ambos apellidos son obligatorios.';
      errorEl.hidden = false;
      return;
    }

    if (!esEdicion) {
      const combinacion = `${_normalizarTexto(apellidoPat)}|${_normalizarTexto(apellidoMat)}`;
      if (!apellidosVerificados || combinacion !== ultimaCombinacion) {
        const disponible = await _verificarDuplicado({ forzar: true });
        if (!disponible) return;
      }
      if (hayDuplicado) return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
      if (esEdicion) {
        await MaestrosRepository.actualizarMaestro({ id: maestro.id, nombre, apellidoPat, apellidoMat, titulo, departamento, materias, semestres });
        overlay.remove();
        onGuardado?.({ ...maestro, nombre, apellidoPat, apellidoMat, titulo, departamento, materias, semestres });
      } else {
        await MaestrosRepository.crearMaestro(maestroToInsertMap({ nombre, apellidoPat, apellidoMat, titulo, departamento, materias, semestres }));
        overlay.remove();
        onGuardado?.();
      }
    } catch (e) {
      console.error('Formulario maestro — guardar:', e);
      errorEl.textContent = _mensajeErrorSupabase(e, 'No se pudo guardar. Intenta de nuevo.');
      errorEl.hidden = false;
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  });
}

function _parsearChips(texto) {
  return texto.split(',').map((s) => s.trim()).filter(Boolean);
}

// ── Formulario: evaluar (estrellas + comentario) ─────────────────────────
function _abrirFormularioEvaluacion({ maestro, onGuardado }) {
  let estrellasElegidas = 0;

  const overlay = _abrirModal(`Evaluar a ${_escapeHtml(nombreCompleto(maestro))}`, `
    <div class="mst-estrellas-picker" id="mst-ev-estrellas">
      ${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-val="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="var(--texto-bajo)" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></button>`).join('')}
    </div>
    <div class="mst-campo">
      <label>Comentario (opcional)</label>
      <textarea id="mst-ev-comentario" placeholder="¿Cómo explica? ¿Es exigente? Cuéntale a los demás..."></textarea>
    </div>
    <p class="mst-error" id="mst-ev-error" hidden></p>
    <button type="button" class="mst-btn-guardar" id="mst-ev-guardar" disabled>Enviar evaluación</button>
  `);

  const botonesEstrella = overlay.querySelectorAll('#mst-ev-estrellas button');
  const btnGuardar = overlay.querySelector('#mst-ev-guardar');
  const errorEl = overlay.querySelector('#mst-ev-error');

  function _pintarEstrellas() {
    botonesEstrella.forEach((btn, i) => {
      const activa = i < estrellasElegidas;
      const svg = btn.querySelector('svg');
      svg.setAttribute('fill', activa ? '#FFCC00' : 'none');
      svg.setAttribute('stroke', activa ? '#FFCC00' : 'var(--texto-bajo)');
    });
    btnGuardar.disabled = estrellasElegidas === 0;
  }

  botonesEstrella.forEach((btn) => {
    btn.addEventListener('click', () => {
      estrellasElegidas = Number(btn.dataset.val);
      _pintarEstrellas();
    });
  });

  btnGuardar.addEventListener('click', async () => {
    const uid = usuarioActual()?.id;
    if (!uid || estrellasElegidas === 0) return;

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Enviando...';
    try {
      await MaestrosRepository.crearEvaluacion({
        maestro_id: maestro.id,
        usuario_id: uid,
        estrellas: estrellasElegidas,
        comentario: overlay.querySelector('#mst-ev-comentario').value.trim() || null,
      });
      overlay.remove();
      onGuardado?.();
    } catch (e) {
      console.error('Formulario evaluación — guardar:', e);
      errorEl.textContent = _mensajeErrorSupabase(e, 'No se pudo enviar tu evaluación. Intenta de nuevo.');
      errorEl.hidden = false;
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Enviar evaluación';
    }
  });
}

function _normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function _mensajeErrorSupabase(error, fallback) {
  const msg = String(error?.message || error?.details || '').toLowerCase();
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Ese registro ya existe.';
  if (msg.includes('permission') || msg.includes('policy') || msg.includes('row-level')) return 'No tienes permiso para realizar esta acción.';
  if (msg.includes('network') || msg.includes('fetch')) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  return fallback;
}

