// seleccionar-tipo.js — hub de creación (traducción de SeleccionarTipoHistoria.dart)

import * as MusicaService from '../../../core/musica-service.js';

let _overlay = null;

export function abrir({ onTexto, onMedia, onCerrar }) {
  if (_overlay) return;

  const el = document.createElement('div');
  el.className = 'pushed-screen historia-wizard';
  el.innerHTML = `
    <header class="appbar-simple">
      <button type="button" class="btn-volver" aria-label="Volver">←</button>
      <h2>Agregar a historia</h2>
    </header>
    <main class="historia-seleccion-body">
      <section class="historia-hub">
        <p class="historia-hub-titulo">Añade un estado</p>
        <div class="historia-hub-fila">
          <button type="button" class="historia-hub-btn" data-tipo="texto">
            <span class="historia-hub-icono">Aa</span>
            <span>Texto</span>
          </button>
          <button type="button" class="historia-hub-btn" data-tipo="musica">
            <span class="historia-hub-icono">♫</span>
            <span>Música</span>
          </button>
          <button type="button" class="historia-hub-btn" data-tipo="diseno">
            <span class="historia-hub-icono">◆</span>
            <span>Diseño</span>
          </button>
          <button type="button" class="historia-hub-btn" data-tipo="audio">
            <span class="historia-hub-icono">🎙</span>
            <span>Audio</span>
          </button>
        </div>
      </section>

      <section class="historia-media-seccion">
        <p class="historia-hub-titulo">Imágenes y videos</p>
        <div class="historia-media-dropzone" id="historia-dropzone">
          <p class="historia-media-drop-titulo">Toca para elegir foto o video</p>
          <p class="historia-media-drop-sub">También puedes arrastrar un archivo aquí</p>
          <div class="historia-media-drop-botones">
            <label class="btn-secundario cp-btn-elegir">
              Galería
              <input type="file" id="historia-input-galeria" accept="image/*,video/*" hidden />
            </label>
            <label class="btn-secundario cp-btn-elegir">
              Cámara
              <input type="file" id="historia-input-camara" accept="image/*,video/*" capture="environment" hidden />
            </label>
          </div>
        </div>
      </section>
    </main>
  `;

  document.body.appendChild(el);
  _overlay = el;

  const cerrar = () => {
    el.remove();
    _overlay = null;
    onCerrar?.();
  };

  el.querySelector('.btn-volver').addEventListener('click', cerrar);

  el.querySelector('[data-tipo="texto"]').addEventListener('click', () => {
    el.remove();
    _overlay = null;
    onTexto?.();
  });

  for (const tipo of ['musica', 'diseno', 'audio']) {
    el.querySelector(`[data-tipo="${tipo}"]`).addEventListener('click', () => {
      if (tipo === 'musica') {
        _abrirModalMusica(onTexto, cerrar);
      } else {
        _toast('Próximamente en la versión web');
      }
    });
  }

  // ——— Modal de selección de música —————————————————————————
  function _abrirModalMusica(onSeleccion, onCerrarParent) {
    _ensureMusicaStyles();
    if (document.querySelector('.musica-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'musica-modal';
    modal.innerHTML = `
      <div class="musica-modal-card">
        <header>
          <button data-accion="cerrar">Cerrar</button>
          <input id="musica-buscar-input" placeholder="Buscar canción o artista..." />
        </header>
        <div id="musica-resultados" class="musica-resultados"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#musica-buscar-input');
    const results = modal.querySelector('#musica-resultados');

    let timeout = null;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const q = input.value.trim();
        results.innerHTML = '<p class="muted">Buscando…</p>';
        try {
          const items = await MusicaService.buscar(q, { limit: 12 });
          results.innerHTML = items.map((it, idx) => `
            <div class="musica-item" data-idx="${idx}">
              <img src="${_esc(it.artwork || '')}" alt="" />
              <div class="musica-meta"><strong>${_esc(it.title)}</strong><br/><small>${_esc(it.artist)}</small></div>
            </div>
          `).join('') || '<p class="muted">No se encontraron resultados</p>';

          results.querySelectorAll('.musica-item').forEach((n) => {
            n.addEventListener('click', () => {
              const idx = Number(n.dataset.idx);
              const sel = items[idx];
              modal.remove();
              onCerrarParent?.();
              onSeleccion?.(sel);
            });
          });
        } catch (e) {
          results.textContent = `Error: ${e instanceof Error ? e.message : String(e)}`;
          results.className = 'musica-resultados muted';
        }
      }, 350);
    });

    modal.querySelector('[data-accion="cerrar"]').addEventListener('click', () => modal.remove());
  }

  function _ensureMusicaStyles() {
    if (document.querySelector('#musica-modal-styles')) return;
    const css = `
      .musica-modal { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); z-index:12000; color:#000; }
      .musica-modal-card { background:#fff; color:#000; width:min(680px,95%); max-height:80vh; overflow:auto; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
      .musica-modal-card header { display:flex; gap:8px; padding:10px; border-bottom:1px solid #eee; color:#000; }
      .musica-modal-card input { flex:1; padding:8px 10px; font-size:14px; color:#000; }
      .musica-resultados { padding:8px 12px; display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px; }
      .musica-item { display:flex; gap:8px; align-items:center; padding:6px; cursor:pointer; border-radius:6px; color:#000; }
      .musica-item img { width:56px; height:56px; object-fit:cover; border-radius:6px; }
      .musica-meta { font-size:13px; color:#000; }
      @media (max-width:420px){ .musica-resultados{grid-template-columns:1fr;} }
    `;
    const s = document.createElement('style');
    s.id = 'musica-modal-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  const inputGaleria = el.querySelector('#historia-input-galeria');
  const inputCamara = el.querySelector('#historia-input-camara');
  const dropzone = el.querySelector('#historia-dropzone');

  const manejarArchivo = (file) => {
    if (!file) return;
    el.remove();
    _overlay = null;
    onMedia?.(file);
  };

  inputGaleria.addEventListener('change', () => manejarArchivo(inputGaleria.files?.[0]));
  inputCamara.addEventListener('change', () => manejarArchivo(inputCamara.files?.[0]));

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('label')) return;
    inputGaleria.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('activa');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('activa'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('activa');
    manejarArchivo(e.dataTransfer.files?.[0]);
  });
}

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

function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
