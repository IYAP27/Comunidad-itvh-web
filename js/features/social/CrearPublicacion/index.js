// ═════════════════════════════════════════════════════════════════
// index.js — traducción de crear_publicacion.dart (pantalla raíz)
//
// Ubicación sugerida: js/features/social/CrearPublicacion/index.js
//
// Wizard de 3 pasos montado como overlay sobre document.body, mismo
// patrón que buscador-usuarios.js / notificaciones.js (pushed-screen,
// sin usar el router de hash — no hace falta una URL propia).
//
// Los 3 pasos existen todos en el DOM a la vez (equivalente al
// IndexedStack de Flutter) y se alternan con `hidden`, así el scroll
// y los resultados de búsqueda del paso 1 no se pierden al ir y
// volver entre pasos.
//
// Integración en feed.js:
//   import { abrir as abrirCrearPublicacion } from './CrearPublicacion/index.js';
//   composerEl.addEventListener('click', abrirCrearPublicacion);
// ═════════════════════════════════════════════════════════════════

import * as L from './logica.js';
import {
  escapar,
  htmlAvatar,
  htmlMiniaturaSeleccion,
  htmlPreviewMedia,
  htmlFilaPersona,
  htmlChipEtiquetado,
} from './widgets.js';

let _overlayEl = null;
let _debounceTimer = null;
let _resultadosBusqueda = [];
let _buscandoPersonas = false;
let _onPublicado = null; // callback opcional para refrescar el feed

// ─────────────────────────────────────────────────────────────────
// ENTRADA / SALIDA
// ─────────────────────────────────────────────────────────────────

/** Abre el wizard. `onPublicado()` se llama tras publicar con éxito. */
export async function abrir(onPublicado) {
  if (_overlayEl) return;
  _onPublicado = onPublicado ?? null;
  L.limpiar();
  _resultadosBusqueda = [];
  _buscandoPersonas = false;

  _render();
  await L.cargarPerfil();
  _pintarComposer();
  L.cargarUsuariosSugeridos().then(() => {
    if (L.state.paso === 1) _pintarPaso1();
  });
}

function _cerrar() {
  if (L.state.publicando) return; // no se puede salir mientras se publica
  clearTimeout(_debounceTimer);
  L.limpiar();
  _overlayEl?.remove();
  _overlayEl = null;
}

// ─────────────────────────────────────────────────────────────────
// RENDER INICIAL — estructura de los 3 pasos, todos en el DOM
// ─────────────────────────────────────────────────────────────────

function _render() {
  const el = document.createElement('div');
  el.className = 'pushed-screen cp-wizard';
  el.id = 'crear-publicacion-screen';
  el.innerHTML = `
    <header class="appbar-simple" id="cp-appbar"></header>
    <main class="cp-body">
      <section id="cp-paso-0" class="cp-paso"></section>
      <section id="cp-paso-1" class="cp-paso" hidden></section>
      <section id="cp-paso-2" class="cp-paso" hidden></section>
    </main>
  `;
  document.body.appendChild(el);
  _overlayEl = el;

  _pintarAppbar();
  _pintarPaso0();
  _pintarPaso1();
  _pintarPaso2();
  _actualizarVisibilidadPasos();
}

// ─────────────────────────────────────────────────────────────────
// NAVEGACIÓN — cambia de paso y repinta lo que depende de él
// ─────────────────────────────────────────────────────────────────

function _irPaso(p) {
  L.irPaso(p);
  _actualizarVisibilidadPasos();
  _pintarAppbar();
}

function _actualizarVisibilidadPasos() {
  for (let i = 0; i < 3; i++) {
    _overlayEl.querySelector(`#cp-paso-${i}`).hidden = i !== L.state.paso;
  }
}

// ─────────────────────────────────────────────────────────────────
// APPBAR — título + acciones, distinta por paso
// ─────────────────────────────────────────────────────────────────

function _tituloPaso() {
  return L.state.paso === 1 ? 'Etiquetar personas' : 'Nueva publicación';
}

function _pintarAppbar() {
  const bar = _overlayEl.querySelector('#cp-appbar');
  const paso = L.state.paso;

  const leading =
    paso === 0
      ? `<button type="button" class="btn-cerrar-x" id="cp-btn-cerrar" aria-label="Cerrar">✕</button>`
      : `<button type="button" class="btn-volver" id="cp-btn-atras" aria-label="Atrás">‹</button>`;

  let accion = '';
  if (paso === 1) {
    accion = `<button type="button" class="btn-accion-accent" id="cp-btn-siguiente-1">
      ${L.state.etiquetados.length === 0 ? 'Omitir' : 'Siguiente'}
    </button>`;
  } else if (paso === 2) {
    accion = L.state.publicando
      ? `<div class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;"></div>`
      : `<button type="button" class="cp-btn-publicar" id="cp-btn-publicar">Publicar</button>`;
  }

  bar.innerHTML = `
    ${leading}
    <h2>${_tituloPaso()}</h2>
    ${accion}
  `;

  bar.querySelector('#cp-btn-cerrar')?.addEventListener('click', _cerrar);
  bar.querySelector('#cp-btn-atras')?.addEventListener('click', () => _irPaso(L.state.paso - 1));
  bar.querySelector('#cp-btn-siguiente-1')?.addEventListener('click', () => _irPaso(2));
  bar.querySelector('#cp-btn-publicar')?.addEventListener('click', _onPublicar);
}

// ─────────────────────────────────────────────────────────────────
// PASO 0 — seleccionar fotos/videos
// ─────────────────────────────────────────────────────────────────

function _pintarPaso0() {
  const sec = _overlayEl.querySelector('#cp-paso-0');
  sec.innerHTML = `
    <div class="cp-dropzone" id="cp-dropzone">
      <p class="cp-dropzone-titulo">Arrastra fotos o videos aquí</p>
      <p class="cp-dropzone-sub">o elige desde tu dispositivo</p>
      <div class="cp-dropzone-botones">
        <label class="btn-secundario cp-btn-elegir">
          Elegir archivos
          <input type="file" id="cp-input-galeria" accept="image/*,video/*" multiple hidden />
        </label>
        <label class="btn-secundario cp-btn-elegir">
          Cámara
          <input type="file" id="cp-input-camara" accept="image/*,video/*" capture="environment" hidden />
        </label>
      </div>
    </div>
    <div class="cp-barra-seleccion" id="cp-barra-seleccion"></div>
  `;

  const dropzone = sec.querySelector('#cp-dropzone');
  const inputGaleria = sec.querySelector('#cp-input-galeria');
  const inputCamara = sec.querySelector('#cp-input-camara');

  const manejarArchivos = (fileList) => {
    L.agregarArchivos(fileList, (msg) => _toast(msg));
    _pintarBarraSeleccion();
  };

  inputGaleria.addEventListener('change', (e) => {
    manejarArchivos(e.target.files);
    e.target.value = '';
  });
  inputCamara.addEventListener('change', (e) => {
    manejarArchivos(e.target.files);
    e.target.value = '';
  });

  ['dragover', 'dragenter'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('cp-dropzone-activa');
    }),
  );
  ['dragleave', 'dragend'].forEach((ev) =>
    dropzone.addEventListener(ev, () => dropzone.classList.remove('cp-dropzone-activa')),
  );
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('cp-dropzone-activa');
    manejarArchivos(e.dataTransfer.files);
  });

  _pintarBarraSeleccion();
}

/** Barra inferior fija: miniaturas de lo seleccionado + botón "Siguiente". */
function _pintarBarraSeleccion() {
  const barra = _overlayEl.querySelector('#cp-barra-seleccion');
  const media = L.state.media;

  barra.innerHTML = `
    <div class="cp-barra-seleccion-scroll">
      ${
        media.length === 0
          ? `<p class="cp-barra-vacio">Puedes continuar sin fotos ni videos</p>`
          : media.map((item, i) => htmlMiniaturaSeleccion(item, i + 1)).join('')
      }
    </div>
    <button type="button" class="cp-btn-siguiente" id="cp-btn-siguiente-0">Siguiente</button>
  `;

  barra.querySelectorAll('.cp-mini-quitar').forEach((btn) => {
    btn.addEventListener('click', () => {
      L.quitarMedia(btn.dataset.id);
      _pintarBarraSeleccion();
      _pintarPaso2(); // el preview del paso 2 debe reflejar el cambio
    });
  });
  barra.querySelector('#cp-btn-siguiente-0').addEventListener('click', () => _irPaso(1));
}

// ─────────────────────────────────────────────────────────────────
// PASO 1 — etiquetar personas
// ─────────────────────────────────────────────────────────────────

function _pintarPaso1() {
  const sec = _overlayEl.querySelector('#cp-paso-1');
  sec.innerHTML = `
    <div class="cp-buscador-wrap">
      <input type="text" id="cp-input-buscar-persona" placeholder="Buscar por nombre, usuario o carrera..." autocomplete="off" />
    </div>
    <div class="cp-chips-seleccionados" id="cp-chips-seleccionados"></div>
    <div class="cp-lista-personas" id="cp-lista-personas"></div>
  `;

  const input = sec.querySelector('#cp-input-buscar-persona');
  input.addEventListener('input', () => {
    const texto = input.value.trim();
    clearTimeout(_debounceTimer);
    if (!texto) {
      _resultadosBusqueda = [];
      _pintarListaPersonas();
      return;
    }
    _debounceTimer = setTimeout(async () => {
      _buscandoPersonas = true;
      _pintarListaPersonas();
      _resultadosBusqueda = await L.buscarParaEtiquetar(texto);
      _buscandoPersonas = false;
      _pintarListaPersonas();
    }, 400);
  });

  _pintarChipsSeleccionados();
  _pintarListaPersonas();
}

function _pintarChipsSeleccionados() {
  const cont = _overlayEl.querySelector('#cp-chips-seleccionados');
  if (!cont) return;
  if (L.state.etiquetados.length === 0) {
    cont.innerHTML = '';
    return;
  }
  cont.innerHTML = L.state.etiquetados.map(htmlChipEtiquetado).join('');
  cont.querySelectorAll('.cp-chip-quitar').forEach((btn) => {
    btn.addEventListener('click', () => _alternarSeleccionPersona({ id: btn.dataset.uid }));
  });
}

function _pintarListaPersonas() {
  const cont = _overlayEl.querySelector('#cp-lista-personas');
  if (!cont) return;

  const input = _overlayEl.querySelector('#cp-input-buscar-persona');
  const buscadorVacio = !input?.value.trim();

  if (buscadorVacio) {
    if (L.state.cargandoSugeridos) {
      cont.innerHTML = `<div class="spinner"></div>`;
    } else if (L.state.usuariosSugeridos.length === 0) {
      cont.innerHTML = `<p class="cp-lista-vacio">Escribe un nombre, usuario o carrera</p>`;
    } else {
      cont.innerHTML =
        `<p class="cp-seccion-label">Sugerencias</p>` +
        L.state.usuariosSugeridos
          .map((p) => htmlFilaPersona(p, L.state.etiquetados.some((u) => u.id === p.id)))
          .join('');
    }
  } else if (_buscandoPersonas) {
    cont.innerHTML = `<div class="spinner"></div>`;
  } else if (_resultadosBusqueda.length === 0) {
    cont.innerHTML = `<p class="cp-lista-vacio">Sin resultados</p>`;
  } else {
    cont.innerHTML = _resultadosBusqueda
      .map((p) => htmlFilaPersona(p, L.state.etiquetados.some((u) => u.id === p.id)))
      .join('');
  }

  cont.querySelectorAll('.cp-fila-persona').forEach((fila) => {
    fila.addEventListener('click', () => {
      const id = fila.dataset.uid;
      const perfil =
        L.state.usuariosSugeridos.find((p) => p.id === id) ??
        _resultadosBusqueda.find((p) => p.id === id);
      if (perfil) _alternarSeleccionPersona(perfil);
    });
  });
}

function _alternarSeleccionPersona(perfil) {
  const yaElegido = L.state.etiquetados.some((u) => u.id === perfil.id);
  if (yaElegido) {
    L.quitarEtiquetado(perfil.id);
  } else {
    if (L.state.etiquetados.length >= L.MAX_ETIQUETADOS) {
      _toast(`Máximo ${L.MAX_ETIQUETADOS} personas etiquetadas`);
      return;
    }
    L.actualizarEtiquetados([...L.state.etiquetados, perfil]);
  }
  _pintarChipsSeleccionados();
  _pintarListaPersonas();
  _pintarAppbar(); // "Omitir" ↔ "Siguiente"
  _pintarEtiquetasResumen(); // resumen del paso 2 en vivo
}

// ─────────────────────────────────────────────────────────────────
// PASO 2 — redactar texto + publicar
// ─────────────────────────────────────────────────────────────────

function _pintarPaso2() {
  const sec = _overlayEl.querySelector('#cp-paso-2');
  sec.innerHTML = `
    <div class="cp-composer">
      <div id="cp-composer-avatar"></div>
      <div class="cp-composer-campo">
        <p class="cp-composer-nombre" id="cp-composer-nombre">Tú</p>
        <textarea id="cp-textarea" maxlength="500" placeholder="¿Qué está pasando en el plantel?"></textarea>
      </div>
    </div>
    <div class="cp-etiquetas-seccion" id="cp-etiquetas-seccion"></div>
    <div class="cp-preview-media" id="cp-preview-media"></div>
    <div class="cp-banner-progreso" id="cp-banner-progreso" hidden></div>
  `;
  _pintarComposer();
  _pintarEtiquetasResumen();
  _pintarPreviewMedia();
}

function _pintarComposer() {
  const avatarEl = _overlayEl?.querySelector('#cp-composer-avatar');
  const nombreEl = _overlayEl?.querySelector('#cp-composer-nombre');
  if (avatarEl) avatarEl.innerHTML = htmlAvatar(L.state.fotoPerfilUrl, 40);
  if (nombreEl) nombreEl.textContent = L.state.nombreUsuario ?? 'Tú';
}

function _pintarEtiquetasResumen() {
  const cont = _overlayEl?.querySelector('#cp-etiquetas-seccion');
  if (!cont) return;

  const link = `
    <button type="button" class="cp-link-etiquetar" id="cp-link-etiquetar">
      👤+ ${L.state.etiquetados.length === 0 ? 'Etiquetar personas' : 'Editar etiquetas'}
    </button>
  `;
  const chips =
    L.state.etiquetados.length > 0
      ? `<div class="cp-chips-resumen">${L.state.etiquetados.map(htmlChipEtiquetado).join('')}</div>`
      : '';

  cont.innerHTML = link + chips;
  cont.querySelector('#cp-link-etiquetar').addEventListener('click', () => _irPaso(1));
  cont.querySelectorAll('.cp-chip-quitar').forEach((btn) => {
    btn.addEventListener('click', () => {
      L.quitarEtiquetado(btn.dataset.uid);
      _pintarEtiquetasResumen();
      _pintarChipsSeleccionados();
      _pintarListaPersonas();
      _pintarAppbar();
    });
  });
}

function _pintarPreviewMedia() {
  const cont = _overlayEl?.querySelector('#cp-preview-media');
  if (!cont) return;

  if (L.state.media.length === 0) {
    cont.innerHTML = '';
    return;
  }
  cont.innerHTML = L.state.media.map((item, i) => htmlPreviewMedia(item, i + 1)).join('');
  cont.querySelectorAll('.cp-preview-quitar').forEach((btn) => {
    btn.addEventListener('click', () => {
      L.quitarMedia(btn.dataset.id);
      _pintarPreviewMedia();
      _pintarBarraSeleccion();
    });
  });
}

function _pintarBannerProgreso() {
  const banner = _overlayEl?.querySelector('#cp-banner-progreso');
  if (!banner) return;
  const visible = L.state.publicando && L.state.estadoPublicacion;
  banner.hidden = !visible;
  if (visible) {
    banner.innerHTML = `
      <div class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></div>
      <span>${escapar(L.state.estadoPublicacion)}</span>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────
// PUBLICAR
// ─────────────────────────────────────────────────────────────────

async function _onPublicar() {
  const textarea = _overlayEl.querySelector('#cp-textarea');
  _pintarAppbar();
  const intervalo = setInterval(_pintarBannerProgreso, 150);

  const resultado = await L.publicar(textarea?.value ?? '', (msg) => _toast(msg));

  clearInterval(intervalo);
  _pintarAppbar();
  _pintarBannerProgreso();

  if (resultado.ok) {
    _onPublicado?.(resultado.pubId);
    _cerrar();
  }
}

// ─────────────────────────────────────────────────────────────────
// TOAST (reusa .toast-simple de shell.css)
// ─────────────────────────────────────────────────────────────────

function _toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-simple';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}