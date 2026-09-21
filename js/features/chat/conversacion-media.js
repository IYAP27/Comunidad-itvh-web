import { escapeHtml, escapeAttr } from '../../core/html-utils.js';
import { TipoMensaje } from './mensaje.js';

export function renderCuerpoMensaje(msg) {
  if (msg.eliminado) {
    return { html: '<i>Mensaje eliminado</i>', esMedia: false };
  }

  const captionHtml = msg.contenido
    ? `<div class="conv-media-caption">${escapeHtml(msg.contenido)}</div>`
    : '';

  switch (msg.tipo) {
    case TipoMensaje.IMAGEN: {
      const src = msg.mediaThumbnailUrl || msg.mediaUrlRemota || '';
      return {
        html: `<img class="conv-media-imagen" src="${escapeAttr(src)}" data-full="${escapeAttr(msg.mediaUrlRemota || src)}" alt="Foto" loading="lazy">${captionHtml}`,
        esMedia: true,
      };
    }
    case TipoMensaje.VIDEO: {
      const poster = msg.mediaThumbnailUrl;
      return {
        html: `
          <div class="conv-media-video-wrap">
            ${poster
              ? `<img class="conv-media-video" src="${escapeAttr(poster)}" alt="Video">`
              : '<div class="conv-media-video" style="width:220px;height:160px;background:#111;"></div>'}
            <div class="conv-media-play"><span>▶</span></div>
          </div>
          ${captionHtml}
        `,
        esMedia: true,
      };
    }
    case TipoMensaje.AUDIO:
      return {
        html: `<div class="conv-audio"><span>🎤</span><audio src="${escapeAttr(msg.mediaUrlRemota || '')}" controls preload="metadata"></audio></div>`,
        esMedia: true,
      };
    case TipoMensaje.STICKER:
      return {
        html: `<img class="conv-sticker-msg" src="${escapeAttr(msg.mediaUrlRemota || '')}" alt="Sticker" loading="lazy">`,
        esMedia: true,
      };
    case TipoMensaje.DOCUMENTO: {
      const tam = formatoTamanio(msg.mediaTamanioBytes);
      return {
        html: `
          <a class="conv-media-doc" href="${escapeAttr(msg.mediaUrlRemota || '')}" target="_blank" rel="noopener">
            <span class="conv-media-doc-icono">📄</span>
            <span class="conv-media-doc-info">
              <div class="conv-media-doc-nombre">${escapeHtml(msg.mediaNombreArchivo || 'Documento')}</div>
              ${tam ? `<div class="conv-media-doc-tam">${tam}</div>` : ''}
            </span>
          </a>
        `,
        esMedia: false,
      };
    }
    default:
      return {
        html: escapeHtml(msg.contenido || '') + (msg.editado ? ' <span style="opacity:.6;font-size:11px;">(editado)</span>' : ''),
        esMedia: false,
      };
  }
}

export function enlazarEventosMedia(cuerpoEl, mensajes) {
  const porId = new Map(mensajes.map((m) => [m.mensajeId, m]));

  cuerpoEl.querySelectorAll('.conv-media-imagen').forEach((img) => {
    img.addEventListener('click', () => abrirVisorImagen(img.dataset.full || img.src));
  });

  cuerpoEl.querySelectorAll('.conv-media-video-wrap').forEach((wrap) => {
    wrap.addEventListener('click', () => {
      const id = wrap.closest('.conv-burbuja')?.dataset.mensajeId;
      const msg = porId.get(id);
      if (msg?.mediaUrlRemota) reproducirVideoInline(wrap, msg.mediaUrlRemota);
    }, { once: true });
  });
}

export function mostrarPreviaMedia(file, esVideo, onConfirmar) {
  const overlay = document.createElement('div');
  overlay.className = 'conv-previa-overlay';
  const urlLocal = URL.createObjectURL(file);
  let cerrado = false;

  overlay.innerHTML = `
    <button type="button" class="conv-previa-cerrar">✕</button>
    <div class="conv-previa-cuerpo">
      ${esVideo
        ? `<video src="${escapeAttr(urlLocal)}" controls></video>`
        : `<img src="${escapeAttr(urlLocal)}" alt="">`}
    </div>
    <form class="conv-previa-footer">
      <input type="text" class="conv-previa-caption" placeholder="Agrega un comentario...">
      <button type="submit" class="conv-previa-btn-enviar">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l13 2-13 2v6z"/></svg>
      </button>
    </form>
  `;
  document.body.appendChild(overlay);

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    URL.revokeObjectURL(urlLocal);
    overlay.remove();
  };

  overlay.querySelector('.conv-previa-cerrar').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrar();
  });

  overlay.querySelector('.conv-previa-footer').addEventListener('submit', (e) => {
    e.preventDefault();
    const caption = overlay.querySelector('.conv-previa-caption').value.trim() || null;
    cerrar();
    onConfirmar(caption);
  });

  return cerrar;
}

export function formatoTamanio(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function reproducirVideoInline(wrap, url) {
  const video = document.createElement('video');
  video.className = 'conv-media-video';
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  wrap.replaceChildren(video);
}

function abrirVisorImagen(src) {
  const overlay = document.createElement('div');
  overlay.className = 'conv-visor-overlay';

  const cerrarBtn = document.createElement('button');
  cerrarBtn.type = 'button';
  cerrarBtn.className = 'conv-visor-cerrar';
  cerrarBtn.textContent = '✕';

  const imagen = document.createElement('img');
  imagen.src = src;
  imagen.alt = '';

  overlay.append(cerrarBtn, imagen);
  const cerrar = () => overlay.remove();
  cerrarBtn.addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrar();
  });
  document.body.appendChild(overlay);
}
