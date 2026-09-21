// editar-media.js — editor de foto/video (traducción simplificada de historiasfotosvideos_editar.dart)

import { capturarImagenConDescripcion, obtenerDuracionVideoMs } from './canvas-historia.js';
import { publicarHistoria, abrirOverlayPublicacion } from './publicar.js';
import * as MusicaService from '../../../core/musica-service.js';

let _overlay = null;

function _esVideo(file) {
  return (file.type || '').startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
}

export function abrir(file, { onPublicado, onVolver }) {
  if (_overlay || !file) return;

  const esVideo = _esVideo(file);
  const previewUrl = URL.createObjectURL(file);
  let modoCubrir = false;
  let musicaSeleccionada = null;
  let publicando = false;

  const el = document.createElement('div');
  el.className = 'historia-editor-overlay';
  el.innerHTML = `
    <header class="historia-editor-topbar">
      <button type="button" class="btn-volver-hero" aria-label="Volver">←</button>
      <span class="historia-editor-chip">Tu historia</span>
      <button type="button" class="historia-editor-compartir" id="btn-compartir-historia" aria-label="Compartir">➤</button>
    </header>

    <div class="historia-editor-stage">
      <div class="historia-lienzo" id="historia-lienzo">
        ${
          esVideo
            ? `<video id="historia-preview-video" src="${previewUrl}" autoplay loop muted playsinline></video>`
            : `<img id="historia-preview-img" src="${previewUrl}" alt="" />`
        }
        <div class="historia-descripcion-overlay" id="historia-descripcion-overlay" hidden></div>
      </div>
    </div>

    <footer class="historia-editor-footer">
      ${
        !esVideo
          ? `<button type="button" class="historia-editor-tool" id="btn-modo-encuadre" title="Ajustar encuadre">⤢</button>`
          : ''
      }
      <button type="button" class="historia-editor-tool" id="btn-agregar-musica" title="Agregar música">♪</button>
      <input type="text" id="historia-descripcion-input" class="historia-descripcion-input"
        placeholder="Agrega una descripción..." maxlength="220" />
    </footer>
  `;

  document.body.appendChild(el);
  _overlay = el;

  const lienzo = el.querySelector('#historia-lienzo');
  const img = el.querySelector('#historia-preview-img');
  const overlayDesc = el.querySelector('#historia-descripcion-overlay');
  const inputDesc = el.querySelector('#historia-descripcion-input');
  const btnCompartir = el.querySelector('#btn-compartir-historia');
  const btnModo = el.querySelector('#btn-modo-encuadre');
  const btnAgregarMusica = el.querySelector('#btn-agregar-musica');

  const actualizarDescripcion = () => {
    const txt = inputDesc.value.trim();
    if (!txt) {
      overlayDesc.hidden = true;
      overlayDesc.textContent = '';
      return;
    }
    overlayDesc.hidden = false;
    overlayDesc.textContent = txt;
  };

  inputDesc.addEventListener('input', actualizarDescripcion);

  btnModo?.addEventListener('click', () => {
    modoCubrir = !modoCubrir;
    img.classList.toggle('modo-cubrir', modoCubrir);
    btnModo.classList.toggle('activo', modoCubrir);
  });

  const cerrar = () => {
    URL.revokeObjectURL(previewUrl);
    el.remove();
    _overlay = null;
  };

  el.querySelector('.btn-volver-hero').addEventListener('click', () => {
    cerrar();
    onVolver?.();
  });

  btnCompartir.addEventListener('click', async () => {
    if (publicando) return;
    publicando = true;
    btnCompartir.disabled = true;

    try {
      let ok = false;

      if (esVideo) {
        const finMs = await obtenerDuracionVideoMs(file);
        ok = await abrirOverlayPublicacion({
          publicarFn: () => publicarHistoria({ file, videoInicioMs: 0, videoFinMs: finMs, musica: musicaSeleccionada }),
        });
      } else {
        const blob = await capturarImagenConDescripcion({
          source: img,
          descripcion: inputDesc.value,
          modoCubrir,
        });
        ok = await abrirOverlayPublicacion({
          publicarFn: () => publicarHistoria({ blob, extension: 'png', musica: musicaSeleccionada }),
        });
      }

      if (ok) {
        cerrar();
        onPublicado?.();
      }
    } catch (e) {
      console.error('editar-media.js – publicar:', e);
    } finally {
      publicando = false;
      btnCompartir.disabled = false;
    }
  });

  // ——— Música: modal de búsqueda —————————————————————————————
  function _abrirModalMusica() {
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
              musicaSeleccionada = sel;
              _mostrarMusicaSeleccionada();
              modal.remove();
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
      .historia-musica-badge { display:inline-block; margin-left:8px; padding:4px 8px; background:#111; color:#fff; border-radius:999px; font-size:13px; }
      @media (max-width:420px){ .musica-resultados{grid-template-columns:1fr;} }
    `;
    const s = document.createElement('style');
    s.id = 'musica-modal-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function _mostrarMusicaSeleccionada() {
    // muestra nombre breve en el footer
    const existente = el.querySelector('.historia-musica-badge');
    if (musicaSeleccionada) {
      if (existente) {
        existente.textContent = `${musicaSeleccionada.title} — ${musicaSeleccionada.artist}`;
      } else {
        const span = document.createElement('span');
        span.className = 'historia-musica-badge';
        span.textContent = `${musicaSeleccionada.title} — ${musicaSeleccionada.artist}`;
        inputDesc.parentNode.insertBefore(span, inputDesc.nextSibling);
      }
    } else if (existente) {
      existente.remove();
    }
  }

  btnAgregarMusica?.addEventListener('click', () => _abrirModalMusica());

  function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
}
