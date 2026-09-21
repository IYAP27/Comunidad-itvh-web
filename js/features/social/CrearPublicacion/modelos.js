// ═════════════════════════════════════════════════════════════════
// modelos.js — traducción de crear_publicacion_modelos.dart
//
// Ubicación sugerida: js/features/social/CrearPublicacion/modelos.js
//
// _ScrubberState no tiene equivalente aquí: el scrubber lateral de
// la galería nativa no aplica en web (ver logica.js). Solo queda
// MediaItem, adaptado para envolver un File del navegador junto con
// su URL de previsualización (blob: URL, liberada al quitarlo).
// ═════════════════════════════════════════════════════════════════

let _idSeq = 0;

/**
 * Representa un archivo seleccionado (input o cámara) mientras vive
 * en el estado del wizard, antes de subirse a R2.
 */
export class MediaItem {
  constructor({ file, tipo, previewUrl }) {
    this.id = `media-${++_idSeq}`;
    this.file = file;
    this.tipo = tipo; // 'imagen' | 'video'
    this.previewUrl = previewUrl; // blob: URL para <img>/<video>
  }
}

/** Crea un MediaItem a partir de un File, detectando tipo por MIME. */
export function crearMediaItem(file) {
  const esVideo = file.type.startsWith('video/');
  return new MediaItem({
    file,
    tipo: esVideo ? 'video' : 'imagen',
    previewUrl: URL.createObjectURL(file),
  });
}

/** Libera la blob: URL de un MediaItem. Llamar siempre al quitarlo. */
export function liberarMediaItem(item) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
}