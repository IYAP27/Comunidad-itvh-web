// ═════════════════════════════════════════════════════════════════
// chat-media-service.js — traducción de chat_media_service.dart
//
// Sube el archivo a R2 (bucket chat) vía storage-r2.js, y con la
// URL resultante llama a MensajeRepository.enviarMensaje. Igual que
// en Dart: si no hay sesión activa, lanza una excepción explícita en
// vez de fallar en silencio.
//
// Alcance de esta fase: imagen, video, documento. Audio (nota de voz
// grabada) queda pendiente — necesita UI de grabación con
// MediaRecorder que todavía no existe; el backend (storage-r2.js
// subirAudioChat + mensaje-repository.js) ya lo soporta.
// ═════════════════════════════════════════════════════════════════

import { usuarioActual } from '../../core/auth.js';
import * as StorageR2 from '../../core/storage-r2.js';
import { MensajeRepository } from './mensaje-repository.js';
import { TipoMensaje } from './mensaje.js';
import { StickersRecientesService } from './stickers-recientes-service.js';

function _requerirMiId() {
  const miId = usuarioActual()?.id;
  if (!miId) throw new Error('No hay sesión activa: no se puede enviar media (miId es null).');
  return miId;
}

export const ChatMediaService = {
  async enviarImagen({ file, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null, caption = null, respuestaAMensajeId = null, respuestaAContenido = null, respuestaATipo = null, respuestaAEmisorId = null }) {
    const miId = _requerirMiId();
    const mensajeId = crypto.randomUUID();
    try {
      const dimensiones = await _leerDimensionesImagen(file).catch(() => ({}));
      const subido = await StorageR2.subirImagenChat(file, miId, otroUsuarioId, mensajeId);

      await MensajeRepository.enviarMensaje({
        otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        contenido: caption,
        tipo: TipoMensaje.IMAGEN,
        mediaUrlRemota: subido.url,
        mediaThumbnailUrl: subido.thumbnailUrl,
        mediaTamanioBytes: subido.tamanioBytes,
        mediaAncho: dimensiones.ancho ?? null,
        mediaAlto: dimensiones.alto ?? null,
        respuestaAMensajeId, respuestaAContenido, respuestaATipo, respuestaAEmisorId,
      });
    } catch (e) {
      console.error('ChatMediaService.enviarImagen:', e);
      throw e;
    }
  },

  async enviarVideo({ file, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null, caption = null, respuestaAMensajeId = null, respuestaAContenido = null, respuestaATipo = null, respuestaAEmisorId = null }) {
    const miId = _requerirMiId();
    const mensajeId = crypto.randomUUID();
    try {
      const duracionMs = await _leerDuracionVideo(file).catch(() => null);
      const subido = await StorageR2.subirVideoChat(file, miId, otroUsuarioId, mensajeId);

      await MensajeRepository.enviarMensaje({
        otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        contenido: caption,
        tipo: TipoMensaje.VIDEO,
        mediaUrlRemota: subido.url,
        mediaThumbnailUrl: subido.thumbnailUrl,
        mediaTamanioBytes: subido.tamanioBytes,
        mediaDuracionMs: duracionMs,
        respuestaAMensajeId, respuestaAContenido, respuestaATipo, respuestaAEmisorId,
      });
    } catch (e) {
      console.error('ChatMediaService.enviarVideo:', e);
      throw e;
    }
  },

  async enviarAudio({ file, duracionMs = null, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null, respuestaAMensajeId = null, respuestaAContenido = null, respuestaATipo = null, respuestaAEmisorId = null }) {
    const miId = _requerirMiId();
    const mensajeId = crypto.randomUUID();
    try {
      const subido = await StorageR2.subirAudioChat(file, miId, otroUsuarioId, mensajeId);
      await MensajeRepository.enviarMensaje({
        otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        tipo: TipoMensaje.AUDIO,
        mediaUrlRemota: subido.url,
        mediaTamanioBytes: subido.tamanioBytes,
        mediaDuracionMs: duracionMs,
        respuestaAMensajeId, respuestaAContenido, respuestaATipo, respuestaAEmisorId,
      });
    } catch (e) {
      console.error('ChatMediaService.enviarAudio:', e);
      throw e;
    }
  },

  async enviarSticker({ file, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null }) {
    const miId = _requerirMiId();
    const mensajeId = crypto.randomUUID();
    try {
      const dimensiones = await _leerDimensionesImagen(file).catch(() => ({}));
      const subido = await StorageR2.subirStickerChat(file, miId, otroUsuarioId, mensajeId);
      await MensajeRepository.enviarMensaje({
        otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        tipo: TipoMensaje.STICKER,
        mediaUrlRemota: subido.url,
        mediaTamanioBytes: subido.tamanioBytes,
        mediaAncho: dimensiones.ancho ?? null,
        mediaAlto: dimensiones.alto ?? null,
      });
      StickersRecientesService.agregar({ url: subido.url, ancho: dimensiones.ancho, alto: dimensiones.alto });
    } catch (e) {
      console.error('ChatMediaService.enviarSticker:', e);
      throw e;
    }
  },

  async enviarStickerExistente({ sticker, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null }) {
    _requerirMiId();
    await MensajeRepository.enviarMensaje({
      otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
      tipo: TipoMensaje.STICKER,
      mediaUrlRemota: sticker.url,
      mediaAncho: sticker.ancho ?? null,
      mediaAlto: sticker.alto ?? null,
    });
    StickersRecientesService.agregar(sticker);
  },

  async enviarDocumento({ file, otroUsuarioId, otroNombre, otroNombreUsuario = null, otroAvatarUrl = null, respuestaAMensajeId = null, respuestaAContenido = null, respuestaATipo = null, respuestaAEmisorId = null }) {
    const miId = _requerirMiId();
    const mensajeId = crypto.randomUUID();
    try {
      const subido = await StorageR2.subirDocumentoChat(file, miId, otroUsuarioId, mensajeId, file.name);

      await MensajeRepository.enviarMensaje({
        otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
        tipo: TipoMensaje.DOCUMENTO,
        mediaUrlRemota: subido.url,
        mediaNombreArchivo: subido.nombreArchivo,
        mediaTamanioBytes: subido.tamanioBytes,
        respuestaAMensajeId, respuestaAContenido, respuestaATipo, respuestaAEmisorId,
      });
    } catch (e) {
      console.error('ChatMediaService.enviarDocumento:', e);
      throw e;
    }
  },
};

function _leerDimensionesImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve({ ancho: img.naturalWidth, alto: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('No se pudo leer la imagen')); };
    img.src = URL.createObjectURL(file);
  });
}

function _leerDuracionVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(Math.round((video.duration || 0) * 1000)); };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error('No se pudo leer el video')); };
    video.src = URL.createObjectURL(file);
  });
}
