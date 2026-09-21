// editar-texto.js — editor de historia de texto (traducción de historias_texto.dart)

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../../core/html-utils.js';
import { FONDOS_HISTORIA, FONDO_INICIAL_INDEX, cssFondo } from './datos/fondos-historia.js';
import { FUENTES_HISTORIA, cssFuente } from './datos/fuentes-historia.js';
import { capturarTextoComoPng } from './canvas-historia.js';
import { publicarHistoria, abrirOverlayPublicacion } from './publicar.js';

let _overlay = null;

export function abrir({ onPublicado, onVolver, musica } = {}) {
  if (_overlay) return;

  let fondoIndex = FONDO_INICIAL_INDEX;
  let fuenteIndex = 0;
  let panel = null; // 'fuente' | 'color' | null
  let publicando = false;

  const el = document.createElement('div');
  el.className = 'historia-editor-overlay historia-editor-texto';
  el.innerHTML = `
    <header class="historia-editor-topbar">
      <button type="button" class="btn-volver-hero" aria-label="Volver">←</button>
      <div class="historia-texto-tools">
        <button type="button" class="historia-editor-tool" id="btn-fuente" title="Tipografía">Aa</button>
        <button type="button" class="historia-editor-tool" id="btn-fondo" title="Fondo">🎨</button>
      </div>
      <button type="button" class="historia-editor-compartir" id="btn-compartir-texto" aria-label="Compartir">➤</button>
    </header>

    <div class="historia-editor-stage">
      <div class="historia-lienzo historia-lienzo-texto" id="historia-lienzo-texto">
        <textarea id="historia-texto-input" maxlength="200" placeholder="Escribe tu historia..."></textarea>
      </div>
    </div>

    <div class="historia-panel-inferior" id="historia-panel-inferior" hidden></div>
  `;

  document.body.appendChild(el);
  _overlay = el;

  const lienzo = el.querySelector('#historia-lienzo-texto');
  const textarea = el.querySelector('#historia-texto-input');
  const panelEl = el.querySelector('#historia-panel-inferior');
  const btnCompartir = el.querySelector('#btn-compartir-texto');

  const pintarEstilo = () => {
    const fondo = FONDOS_HISTORIA[fondoIndex];
    const fuente = FUENTES_HISTORIA[fuenteIndex];
    lienzo.style.background = cssFondo(fondo);
    const estilo = cssFuente(fuente);
    Object.assign(textarea.style, estilo);
    const claro = fondo.id === 'blanco' || fondo.id === 'amarillo';
    textarea.style.color = claro ? '#111' : '#fff';
    textarea.style.caretColor = claro ? '#111' : '#fff';
  };

  const cerrarPanel = () => {
    panel = null;
    panelEl.hidden = true;
    panelEl.innerHTML = '';
    textarea.focus();
  };

  const pintarPanelFuente = () => {
    panel = 'fuente';
    panelEl.hidden = false;
    panelEl.innerHTML = `
      <div class="historia-panel-header">
        <span>Tipografía</span>
        <button type="button" class="historia-panel-ok" data-accion="ok">OK</button>
      </div>
      <div class="historia-panel-scroll">
        ${FUENTES_HISTORIA.map((f, i) => `
          <button type="button" class="historia-fuente-chip ${i === fuenteIndex ? 'activa' : ''}" data-i="${i}">
            <span style="font-family:${f.fontFamily};font-weight:${f.fontWeight};font-style:${f.fontStyle}">${f.etiqueta}</span>
          </button>
        `).join('')}
      </div>
    `;
    panelEl.querySelector('[data-accion="ok"]')?.addEventListener('click', cerrarPanel);
    panelEl.querySelectorAll('.historia-fuente-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        fuenteIndex = Number(btn.dataset.i);
        pintarEstilo();
        pintarPanelFuente();
      });
    });
  };

  const pintarPanelFondo = () => {
    panel = 'color';
    panelEl.hidden = false;
    panelEl.innerHTML = `
      <div class="historia-panel-header">
        <span>Fondo</span>
        <button type="button" class="historia-panel-ok" data-accion="ok">OK</button>
      </div>
      <div class="historia-panel-scroll historia-fondos-grid">
        ${FONDOS_HISTORIA.map((f, i) => `
          <button type="button" class="historia-fondo-chip ${i === fondoIndex ? 'activa' : ''}"
            data-i="${i}" style="background:${cssFondo(f)}" title="${f.id}"></button>
        `).join('')}
      </div>
    `;
    panelEl.querySelector('[data-accion="ok"]')?.addEventListener('click', cerrarPanel);
    panelEl.querySelectorAll('.historia-fondo-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        fondoIndex = Number(btn.dataset.i);
        pintarEstilo();
        pintarPanelFondo();
      });
    });
  };

  pintarEstilo();
  setTimeout(() => textarea.focus(), 100);

  function _ensureEditorMusicaStyles() {
    if (document.querySelector('#historia-music-editor-styles')) return;
    const s = document.createElement('style');
    s.id = 'historia-music-editor-styles';
    s.textContent = `
      .historia-musica-chip-editor { position: absolute; right: 18px; top: 56px; z-index: 11000; pointer-events: auto; }
      .historia-musica-chip-editor .editor-music-inner { display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.5); color:#fff; padding:8px 10px; border-radius:20px; min-width:180px; box-shadow:0 6px 20px rgba(0,0,0,0.4); }
      .editor-music-cover { width:44px; height:44px; border-radius:50%; overflow:hidden; flex:0 0 44px; display:flex; align-items:center; justify-content:center; }
      .editor-music-cover img { width:100%; height:100%; object-fit:cover; animation:music-spin 4s linear infinite; animation-play-state:paused; transform-origin:center center; }
      .historia-musica-chip-editor.playing .editor-music-cover img { animation-play-state:running; }
      .editor-music-fallback { font-size:18px; opacity:0.9; }
      .editor-music-meta { display:flex; flex-direction:column; min-width:0; }
      .editor-music-title { font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .editor-music-artist { font-size:12px; color:rgba(255,255,255,0.85); }
      .editor-music-play { font-size:16px; flex:0 0 28px; }
      @keyframes music-spin { to { transform: rotate(360deg); } }
      @media (max-width:420px) { .historia-musica-chip-editor { right:10px; top:72px; } .editor-music-title{font-size:12px;} }
    `;
    document.head.appendChild(s);
  }

  // Si se abre con una pista seleccionada, mostrar badge breve
  if (musica) {
    _ensureEditorMusicaStyles();
    const chip = document.createElement('div');
    chip.className = 'historia-musica-chip-editor';
    chip.innerHTML = `
      <div class="editor-music-inner">
        <div class="editor-music-cover">${musica.artwork ? `<img src="${_escapeAttr(musica.artwork)}" alt=""/>` : `<div class="editor-music-fallback">♪</div>`}</div>
        <div class="editor-music-meta"><div class="editor-music-title">${_escapeHtml(musica.title)}</div><div class="editor-music-artist">${_escapeHtml(musica.artist)}</div></div>
        <div class="editor-music-play">▶</div>
      </div>
    `;
    el.appendChild(chip);
    // audio preview
    try {
      const audio = new Audio(musica.previewUrl || musica.preview_url || musica.preview || musica.previewUrl || '');
      audio.loop = true;
      el._musicAudioEditor = audio;
      const playEl = chip.querySelector('.editor-music-play');
      let playing = false;
      const toggle = async (ev) => {
        ev?.stopPropagation();
        try {
          if (!playing) {
            await audio.play();
            chip.classList.add('playing');
            playEl.textContent = '⏸';
            playing = true;
          } else {
            audio.pause();
            chip.classList.remove('playing');
            playEl.textContent = '▶';
            playing = false;
          }
        } catch (e) {
          console.error('editar-texto.js – audio preview error:', e);
        }
      };
      chip.addEventListener('click', toggle);
      el._musicChipEditor = chip;
    } catch (e) {
      console.warn('editar-texto.js – no se pudo iniciar preview:', e);
    }
  }

  el.querySelector('#btn-fuente').addEventListener('click', () => {
    panel === 'fuente' ? cerrarPanel() : pintarPanelFuente();
  });
  el.querySelector('#btn-fondo').addEventListener('click', () => {
    panel === 'color' ? cerrarPanel() : pintarPanelFondo();
  });

  const cerrar = () => {
    try { el._musicAudioEditor?.pause(); } catch (_) {}
    if (el._musicChipEditor) { el._musicChipEditor.remove(); el._musicChipEditor = null; }
    el.remove();
    _overlay = null;
  };

  const confirmarSalir = () => {
    if (!textarea.value.trim()) {
      cerrar();
      onVolver?.();
      return;
    }
    if (confirm('¿Descartar historia? Vas a perder el texto que escribiste.')) {
      cerrar();
      onVolver?.();
    }
  };

  el.querySelector('.btn-volver-hero').addEventListener('click', confirmarSalir);

  btnCompartir.addEventListener('click', async () => {
    const texto = textarea.value.trim();
    if (!texto || publicando) return;
    publicando = true;
    btnCompartir.disabled = true;
    textarea.blur();

    try {
      await new Promise((r) => setTimeout(r, 80));
      const blob = await capturarTextoComoPng({
        texto,
        fondo: FONDOS_HISTORIA[fondoIndex],
        fuente: FUENTES_HISTORIA[fuenteIndex],
      });

      const ok = await abrirOverlayPublicacion({
        publicarFn: () => publicarHistoria({ blob, extension: 'png', musica }),
      });

      if (ok) {
        cerrar();
        onPublicado?.();
      }
    } catch (e) {
      console.error('editar-texto.js – publicar:', e);
    } finally {
      publicando = false;
      btnCompartir.disabled = false;
    }
  });
}

