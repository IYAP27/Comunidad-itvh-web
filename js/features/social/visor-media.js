// ═════════════════════════════════════════════════════════════════
// visor-media.js
//
// Visor de fotos/videos estilo pantalla completa, inspirado en
// visor_media.dart. Mantiene el feed debajo y se monta como overlay:
//   • Navegación anterior/siguiente.
//   • Contador 1 / N.
//   • Imagen con zoom por doble click.
//   • Video con play/pause y barra de progreso.
//   • Barra inferior con autor, texto, reacción y comentarios.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { resolverUrlMedio, resolverUrlPerfil } from '../../core/url-helper.js';
import { abrirHojaComentarios } from './hoja-comentarios.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { abrirHojaReacciones, abrirSelectorReaccion, emojiRapido } from './reacciones.js';

let _overlay = null;
let _post = null;
let _medios = [];
let _indice = 0;
let _overlayVisible = true;
let _zoom = false;
let _onReaccionar = null;
let _onRefrescar = null;
let _progresoTimer = null;

export function abrirVisorMedia({ post, indiceInicial = 0, onReaccionar, onRefrescar }) {
  if (!post || !post.publicacion_medios?.length) return;
  if (_overlay) _cerrar();

  _post = post;
  _medios = [...post.publicacion_medios].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  _indice = Math.min(Math.max(indiceInicial, 0), _medios.length - 1);
  _overlayVisible = true;
  _zoom = false;
  _onReaccionar = onReaccionar ?? null;
  _onRefrescar = onRefrescar ?? null;

  _render();
  _pintar();
  document.addEventListener('keydown', _onKeydown);
}

function _cerrar() {
  _pausarVideoActual();
  clearInterval(_progresoTimer);
  document.removeEventListener('keydown', _onKeydown);
  _overlay?.remove();
  _overlay = null;
  _post = null;
  _medios = [];
}

function _render() {
  const el = document.createElement('div');
  el.className = 'media-viewer';
  el.innerHTML = `
    <div id="media-viewer-stage" class="media-viewer-stage"></div>
    <header id="media-viewer-top" class="media-viewer-top"></header>
    <footer id="media-viewer-bottom" class="media-viewer-bottom"></footer>
    <button type="button" id="media-prev" class="media-nav media-prev" aria-label="Anterior">‹</button>
    <button type="button" id="media-next" class="media-nav media-next" aria-label="Siguiente">›</button>
  `;
  document.body.appendChild(el);
  _overlay = el;

  el.querySelector('#media-prev').addEventListener('click', () => _mover(-1));
  el.querySelector('#media-next').addEventListener('click', () => _mover(1));
}

function _pintar() {
  if (!_overlay) return;
  _pintarStage();
  _pintarTop();
  _pintarBottom();
  _actualizarNav();
}

function _pintarStage() {
  const stage = _overlay.querySelector('#media-viewer-stage');
  const medio = _medios[_indice];
  const url = resolverUrlMedio(medio);
  const esVideo = medio.tipo_medio === 'video';
  clearInterval(_progresoTimer);

  stage.innerHTML = esVideo
    ? `
      <div class="media-video-wrap">
        <video id="media-video" src="${_escapeAttr(url)}" playsinline controlslist="nodownload"></video>
        <button type="button" id="media-play-center" class="media-play-center" aria-label="Reproducir">▶</button>
        <div class="media-video-controls">
          <span id="media-time-current">0:00</span>
          <input id="media-progress" type="range" min="0" max="1000" value="0" />
          <span id="media-time-total">0:00</span>
        </div>
      </div>
    `
    : `
      <div class="media-image-wrap ${_zoom ? 'zoom' : ''}">
        <img id="media-image" src="${_escapeAttr(url)}" alt="" />
      </div>
    `;

  stage.onclick = (e) => {
    if (e.target.closest('button,input,video')) return;
    _overlayVisible = !_overlayVisible;
    _aplicarOverlayVisible();
  };

  if (esVideo) _wireVideo();
  else _wireImagen();
}

function _wireImagen() {
  const img = _overlay.querySelector('#media-image');
  img.addEventListener('dblclick', (e) => {
    e.preventDefault();
    _zoom = !_zoom;
    _overlay.querySelector('.media-image-wrap')?.classList.toggle('zoom', _zoom);
  });
}

function _wireVideo() {
  const video = _overlay.querySelector('#media-video');
  const play = _overlay.querySelector('#media-play-center');
  const progress = _overlay.querySelector('#media-progress');
  const current = _overlay.querySelector('#media-time-current');
  const total = _overlay.querySelector('#media-time-total');

  const toggle = () => {
    if (video.paused) video.play();
    else video.pause();
  };

  play.addEventListener('click', toggle);
  video.addEventListener('click', () => {
    _overlayVisible = !_overlayVisible;
    _aplicarOverlayVisible();
  });
  video.addEventListener('dblclick', toggle);
  video.addEventListener('play', () => play.classList.add('oculto'));
  video.addEventListener('pause', () => play.classList.remove('oculto'));
  video.addEventListener('loadedmetadata', () => {
    total.textContent = _fmt(video.duration);
  });
  progress.addEventListener('input', () => {
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = (Number(progress.value) / 1000) * video.duration;
  });

  _progresoTimer = setInterval(() => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    current.textContent = _fmt(video.currentTime);
    total.textContent = _fmt(video.duration);
    progress.value = String(Math.round((video.currentTime / video.duration) * 1000));
  }, 250);

  video.play().catch(() => {});
}

function _pintarTop() {
  const top = _overlay.querySelector('#media-viewer-top');
  top.innerHTML = `
    <button type="button" id="media-close" class="media-close" aria-label="Cerrar">✕</button>
    ${_medios.length > 1 ? `<span class="media-counter">${_indice + 1} / ${_medios.length}</span>` : ''}
  `;
  top.querySelector('#media-close').addEventListener('click', _cerrar);
  _aplicarOverlayVisible();
}

function _pintarBottom() {
  const bottom = _overlay.querySelector('#media-viewer-bottom');
  const perfil = _post.perfiles ?? {};
  const foto = resolverUrlPerfil(perfil);
  const nombre = perfil.nombre ?? 'Usuario';
  const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '@usuario';
  const tiempo = _tiempoRelativo(_post.creado_en);
  const reaccion = _post.mi_reaccion;
  const totalReacciones = _post.total_reacciones_real ?? _post.total_reacciones ?? 0;
  const totalComentarios = _post.total_comentarios_real ?? _post.total_comentarios ?? 0;

  bottom.innerHTML = `
    <div class="media-author">
      <button type="button" class="media-author-avatar" id="media-author-btn">
        ${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : `<span>${_escapeHtml(nombre[0] ?? '')}</span>`}
      </button>
      <div>
        <button type="button" class="media-author-name" id="media-author-name">${_escapeHtml(nombre)}</button>
        <p>${_escapeHtml(usuario)} · ${_escapeHtml(tiempo)}</p>
      </div>
    </div>

    ${_post.contenido ? `<p class="media-caption">${_escapeHtml(_post.contenido)}</p>` : ''}

    <div class="media-actions">
      <button type="button" id="media-react" class="media-pill ${reaccion ? 'activo' : ''}">
        <span>${reaccion ? _escapeHtml(reaccion) : '♡'}</span>
        ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : ''}
      </button>
      <button type="button" id="media-comments" class="media-pill">
        <span>💬</span>
        ${totalComentarios > 0 ? `<strong>${totalComentarios}</strong>` : ''}
      </button>
      <button type="button" id="media-reactions" class="media-pill media-pill-right">
        <span>👥</span>
        ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : ''}
      </button>
    </div>
  `;

  bottom.querySelector('#media-react').addEventListener('click', async () => {
    const siguiente = _post.mi_reaccion ? null : emojiRapido();
    await _onReaccionar?.(siguiente);
    _pintarBottom();
  });
  _wireSelectorVisor(bottom.querySelector('#media-react'));
  bottom.querySelector('#media-comments').addEventListener('click', () => {
    abrirHojaComentarios(_post, () => {
      _onRefrescar?.();
      _pintarBottom();
    });
  });
  bottom.querySelector('#media-reactions').addEventListener('click', () => {
    abrirHojaReacciones(_post);
  });
  bottom.querySelector('#media-author-btn').addEventListener('click', () => {
    abrirPerfil(_post.autor_id);
  });
  bottom.querySelector('#media-author-name').addEventListener('click', () => {
    abrirPerfil(_post.autor_id);
  });
  _aplicarOverlayVisible();
}

function _wireSelectorVisor(btn) {
  if (!btn) return;
  let timer = null;
  let longPress = false;
  const abrir = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    longPress = true;
    abrirSelectorReaccion(btn, {
      actual: _post.mi_reaccion,
      onSeleccionar: async (emoji) => {
        await _onReaccionar?.(emoji);
        _pintarBottom();
      },
    });
  };
  btn.addEventListener('pointerdown', () => {
    longPress = false;
    timer = setTimeout(() => abrir({ preventDefault() {}, stopPropagation() {} }), 450);
  });
  btn.addEventListener('pointerup', () => clearTimeout(timer));
  btn.addEventListener('pointerleave', () => clearTimeout(timer));
  btn.addEventListener('contextmenu', abrir);
  btn.addEventListener('click', (ev) => {
    if (longPress) {
      ev.preventDefault();
      ev.stopPropagation();
      longPress = false;
    }
  }, true);
}

function _mover(delta) {
  const nuevo = _indice + delta;
  if (nuevo < 0 || nuevo >= _medios.length) return;
  _pausarVideoActual();
  _indice = nuevo;
  _zoom = false;
  _overlayVisible = true;
  _pintar();
}

function _actualizarNav() {
  const prev = _overlay.querySelector('#media-prev');
  const next = _overlay.querySelector('#media-next');
  prev.hidden = _medios.length <= 1 || _indice === 0;
  next.hidden = _medios.length <= 1 || _indice === _medios.length - 1;
}

function _aplicarOverlayVisible() {
  if (!_overlay) return;
  _overlay.querySelector('#media-viewer-top')?.classList.toggle('oculto', !_overlayVisible);
  _overlay.querySelector('#media-viewer-bottom')?.classList.toggle('oculto', !_overlayVisible);
  _overlay.querySelectorAll('.media-nav').forEach((btn) => btn.classList.toggle('oculto', !_overlayVisible));
}

function _pausarVideoActual() {
  _overlay?.querySelector('#media-video')?.pause();
}

function _onKeydown(e) {
  if (e.key === 'Escape') _cerrar();
  if (e.key === 'ArrowLeft') _mover(-1);
  if (e.key === 'ArrowRight') _mover(1);
}

function _fmt(segundosRaw) {
  const segundos = Math.max(0, Math.floor(segundosRaw || 0));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = String(segundos % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function _tiempoRelativo(fechaStr) {
  const fecha = fechaStr ? new Date(fechaStr) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  const diff = Date.now() - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'numeric', year: 'numeric' });
}


