import { ChatMediaService } from './chat-media-service.js';
import { StickersRecientesService } from './stickers-recientes-service.js';
import { escapeAttr } from '../../core/html-utils.js';
import { mostrarPreviaMedia } from './conversacion-media.js';

const EMOJIS_PANEL = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','🤩','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
  '🤔','🫣','🤭','🫢','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪',
  '😵','🤐','🤢','🤮','🤧','😷','🤒','🤕','👍','👎','👏','🙌','🤝','🙏','💪','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','🔥','✨','🎉','😺','🐆'
];

export function crearControladorAdjuntos({
  root,
  inputEl,
  panelEmoji,
  otroUsuarioId,
  otroNombre,
  otroNombreUsuario,
  otroAvatarUrl,
  obtenerRespuesta,
  consumirRespuesta,
  snippetPara,
  mostrarSubiendo,
  ocultarSubiendo,
}) {
  const inputImagenEl = root.querySelector('#conv-input-imagen');
  const inputDocumentoEl = root.querySelector('#conv-input-documento');
  const inputStickerEl = root.querySelector('#conv-input-sticker');
  const btnEmoji = root.querySelector('#conv-btn-emoji');
  const btnImagen = root.querySelector('#conv-btn-imagen');
  const btnDocumento = root.querySelector('#conv-btn-documento');

  let destruido = false;
  let cerrarPrevia = null;

  const datosRespuesta = (respuesta) => ({
    respuestaAMensajeId: respuesta?.mensajeId ?? null,
    respuestaAContenido: respuesta ? snippetPara(respuesta) : null,
    respuestaATipo: respuesta?.tipo ?? null,
    respuestaAEmisorId: respuesta?.emisorId ?? null,
  });

  function prepararEnvioMedia(file, esVideo = file.type.startsWith('video/')) {
    if (destruido) return;
    const respuesta = obtenerRespuesta();
    cerrarPrevia?.();
    cerrarPrevia = mostrarPreviaMedia(file, esVideo, async (caption) => {
      cerrarPrevia = null;
      if (destruido) return;
      consumirRespuesta();
      mostrarSubiendo(esVideo ? 'Subiendo video...' : 'Subiendo foto...');
      try {
        const params = {
          file, otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
          caption, ...datosRespuesta(respuesta),
        };
        if (esVideo) await ChatMediaService.enviarVideo(params);
        else await ChatMediaService.enviarImagen(params);
      } catch (e) {
        console.error('Error al enviar media:', e);
        alert('No se pudo enviar el archivo. Intenta de nuevo.');
      } finally {
        ocultarSubiendo();
      }
    });
  }

  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (!item) return;
    const original = item.getAsFile();
    if (!original) return;
    e.preventDefault();
    const ext = (original.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    prepararEnvioMedia(new File([original], `imagen-portapapeles-${Date.now()}.${ext}`, { type: original.type }), false);
  };

  const onImagenClick = () => inputImagenEl.click();
  const onImagenChange = () => {
    const file = inputImagenEl.files?.[0];
    inputImagenEl.value = '';
    if (file) prepararEnvioMedia(file);
  };

  const onDocumentoClick = () => inputDocumentoEl.click();
  const onDocumentoChange = async () => {
    const file = inputDocumentoEl.files?.[0];
    inputDocumentoEl.value = '';
    if (!file || destruido) return;

    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const permitidas = new Set(['pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z']);
    if (!permitidas.has(extension)) {
      alert('Formato no permitido. Puedes enviar PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP, RAR o 7Z.');
      return;
    }

    const respuesta = obtenerRespuesta();
    consumirRespuesta();
    mostrarSubiendo(`Enviando ${file.name}...`);
    try {
      await ChatMediaService.enviarDocumento({
        file, otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        ...datosRespuesta(respuesta),
      });
    } catch (e) {
      console.error('Error al enviar documento:', e);
      const detalle = String(e?.message || e || 'Error desconocido');
      alert(`No se pudo enviar el documento. ${detalle}`);
    } finally {
      ocultarSubiendo();
    }
  };

  const onEmojiClick = () => {
    if (!panelEmoji.hidden) {
      panelEmoji.hidden = true;
      return;
    }
    pintarPanelEmojis(panelEmoji, {
      inputEl,
      onSticker: async (sticker) => {
        panelEmoji.hidden = true;
        mostrarSubiendo('Enviando sticker...');
        try {
          await ChatMediaService.enviarStickerExistente({ sticker, otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl });
        } catch (e) {
          console.error(e);
          alert('No se pudo enviar el sticker.');
        } finally {
          ocultarSubiendo();
        }
      },
      onSubirSticker: () => inputStickerEl.click(),
    });
    panelEmoji.hidden = false;
  };

  const onStickerChange = async () => {
    const file = inputStickerEl.files?.[0];
    inputStickerEl.value = '';
    if (!file || destruido) return;
    panelEmoji.hidden = true;
    mostrarSubiendo('Subiendo sticker...');
    try {
      await ChatMediaService.enviarSticker({ file, otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl });
    } catch (e) {
      console.error(e);
      alert('No se pudo enviar el sticker.');
    } finally {
      ocultarSubiendo();
    }
  };

  inputEl.addEventListener('paste', onPaste);
  btnImagen.addEventListener('click', onImagenClick);
  inputImagenEl.addEventListener('change', onImagenChange);
  btnDocumento.addEventListener('click', onDocumentoClick);
  inputDocumentoEl.addEventListener('change', onDocumentoChange);
  btnEmoji.addEventListener('click', onEmojiClick);
  inputStickerEl.addEventListener('change', onStickerChange);

  return {
    destruir() {
      destruido = true;
      cerrarPrevia?.();
      cerrarPrevia = null;
      panelEmoji.hidden = true;
      inputEl.removeEventListener('paste', onPaste);
      btnImagen.removeEventListener('click', onImagenClick);
      inputImagenEl.removeEventListener('change', onImagenChange);
      btnDocumento.removeEventListener('click', onDocumentoClick);
      inputDocumentoEl.removeEventListener('change', onDocumentoChange);
      btnEmoji.removeEventListener('click', onEmojiClick);
      inputStickerEl.removeEventListener('change', onStickerChange);
    },
  };
}

function pintarPanelEmojis(panel, { inputEl, onSticker, onSubirSticker }) {
  panel.innerHTML = `
    <div class="conv-panel-tabs"><button type="button" class="activo" data-tab="emoji">Emojis</button><button type="button" data-tab="sticker">Stickers</button></div>
    <div class="conv-emoji-grid" data-panel="emoji">${EMOJIS_PANEL.map((e) => `<button type="button">${e}</button>`).join('')}</div>
    <div class="conv-sticker-panel" data-panel="sticker" hidden></div>`;

  const emojiGrid = panel.querySelector('[data-panel="emoji"]');
  const stickerPanel = panel.querySelector('[data-panel="sticker"]');

  emojiGrid.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const ini = inputEl.selectionStart ?? inputEl.value.length;
    const fin = inputEl.selectionEnd ?? ini;
    inputEl.setRangeText(b.textContent, ini, fin, 'end');
    inputEl.dispatchEvent(new Event('input'));
    inputEl.focus();
  }));

  function pintarStickers() {
    const lista = StickersRecientesService.obtener();
    stickerPanel.innerHTML = `<div class="conv-sticker-toolbar"><button type="button" class="conv-sticker-subir">+ Agregar sticker</button></div>` +
      (lista.length
        ? `<div class="conv-sticker-grid">${lista.map((st, i) => `<button type="button" data-i="${i}"><img src="${escapeAttr(st.url)}" alt="Sticker"></button>`).join('')}</div>`
        : '<div class="conv-sticker-vacio">Todavía no tienes stickers recientes.<br>Usa “Agregar sticker” para subir un WEBP, PNG o GIF.</div>');
    stickerPanel.querySelector('.conv-sticker-subir').addEventListener('click', onSubirSticker);
    stickerPanel.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => onSticker(lista[Number(b.dataset.i)])));
  }

  panel.querySelectorAll('.conv-panel-tabs button').forEach((b) => b.addEventListener('click', () => {
    panel.querySelectorAll('.conv-panel-tabs button').forEach((x) => x.classList.toggle('activo', x === b));
    const mostrarStickers = b.dataset.tab === 'sticker';
    emojiGrid.hidden = mostrarStickers;
    stickerPanel.hidden = !mostrarStickers;
    if (mostrarStickers) pintarStickers();
  }));
}
