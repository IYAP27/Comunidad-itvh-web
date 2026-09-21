// ═════════════════════════════════════════════════════════════════
// ubicatecnm.js — traducción de ubicatecnm.dart
//
// Hub principal de "UbicaTecNM": botón que abre el mapa interactivo
// (mapa-interactivo.js, como pushed-screen sobre document.body, mismo
// patrón que conoce-plantel.js) + lista de videos recreativos de
// YouTube con miniatura lazy (el iframe solo se crea al tocar play,
// igual que el YoutubePlayerController de la versión Flutter).
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { renderMapaInteractivo } from './mapa-interactivo.js';

// Mismo orden y IDs que _videosRecreativos en ubicatecnm.dart.
const VIDEOS_RECREATIVOS = [
  { titulo: 'Recorrido virtual por el ITVH', videoId: 'yaiVJRymK4A' },
  { titulo: 'Conoce nuestro programa', videoId: '5Ujpf2XjdX8' },
  { titulo: 'Primer día de clases agosto 2023', videoId: 'IlX-h0N-LDs' },
];

export function render(contenedor) {
  contenedor.innerHTML = `
    <div class="ubicatec-hub">
      <p class="ubicatec-titulo-linea1">UbicaTecNM</p>
      <p class="ubicatec-titulo-linea2">Campus Villahermosa</p>

      <button type="button" class="ubicatec-boton-mapa" id="btn-abrir-mapa">
        <span class="ubicatec-boton-mapa-icono">📍</span>
        <span class="ubicatec-boton-mapa-texto">
          <span class="ubicatec-boton-mapa-titulo">Mapa interactivo del ITVH</span>
          <span class="ubicatec-boton-mapa-sub">Explora los edificios y accesos del campus</span>
        </span>
        <span class="ubicatec-boton-mapa-chevron">›</span>
      </button>

      <p class="ubicatec-seccion-titulo">Videos recreativos</p>
      <p class="ubicatec-seccion-sub">Conoce el campus a través de estos recorridos</p>

      <div id="ubicatec-videos"></div>
    </div>
  `;

  const videosEl = contenedor.querySelector('#ubicatec-videos');
  videosEl.innerHTML = VIDEOS_RECREATIVOS.map((v, i) => `
    <div class="ubicatec-video-card">
      <button type="button" class="ubicatec-video-miniatura" data-video-index="${i}">
        <img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="${_escapeAttr(v.titulo)}" loading="lazy">
        <span class="ubicatec-video-play"><span>▶</span></span>
      </button>
      <p class="ubicatec-video-titulo">${_escapeHtml(v.titulo)}</p>
    </div>
  `).join('');

  videosEl.querySelectorAll('.ubicatec-video-miniatura').forEach((btn) => {
    btn.addEventListener('click', () => {
      const video = VIDEOS_RECREATIVOS[Number(btn.dataset.videoIndex)];
      // Al tocar, se reemplaza la miniatura por el iframe embebido —
      // mismo comportamiento "lazy" que el YoutubePlayerController de
      // la versión móvil, que solo se construye al tocar la tarjeta.
      btn.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/${video.videoId}?autoplay=1"
          title="${_escapeAttr(video.titulo)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    }, { once: true });
  });

  contenedor.querySelector('#btn-abrir-mapa').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'pushed-screen';
    document.body.appendChild(overlay);
    renderMapaInteractivo(overlay, () => overlay.remove());
  });
}

