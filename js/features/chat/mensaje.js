// ═════════════════════════════════════════════════════════════════
// mensaje.js
//
// Equivalente web de mensaje.dart. Aquí un "Mensaje" es un objeto
// plano (no una clase con @collection), porque Dexie no necesita
// anotaciones — pero los NOMBRES DE CAMPO son idénticos a los de
// Isar/Dart para que sea directo mapear entre ambos lados si algún
// día comparten payloads de debug, backups, etc.
// ═════════════════════════════════════════════════════════════════

export const EstadoMensaje = Object.freeze({
  ENVIANDO: 'enviando',
  ENTREGADO: 'entregado',
  FALLIDO: 'fallido',
  RECIBIDO: 'recibido',
});

export const TipoMensaje = Object.freeze({
  TEXTO: 'texto',
  IMAGEN: 'imagen',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENTO: 'documento',
  STICKER: 'sticker',
});

export function esMedia(tipo) {
  return tipo !== TipoMensaje.TEXTO;
}

// ── Metadata de media empaquetada para viajar por Supabase ─────────────────
// Mismo contrato JSON que MetadataMedia.empaquetar()/desempaquetar() en Dart.
export function empaquetarMetadata({
  caption = null,
  nombreArchivo = null,
  tamanioBytes = null,
  duracionMs = null,
  ancho = null,
  alto = null,
  thumbnailUrl = null,
} = {}) {
  return JSON.stringify({
    caption,
    nombreArchivo,
    tamanioBytes,
    duracionMs,
    ancho,
    alto,
    thumbnailUrl,
  });
}

export function desempaquetarMetadata(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── Reacciones (idéntico a Mensaje.reacciones / reaccionesAgrupadas en Dart) ─
// Se guardan serializadas en reaccionesRaw como JSON { usuarioId: emoji }.

export function leerReacciones(msg) {
  if (!msg?.reaccionesRaw) return {};
  try {
    return JSON.parse(msg.reaccionesRaw);
  } catch {
    return {};
  }
}

export function escribirReacciones(mapa) {
  return Object.keys(mapa).length === 0 ? null : JSON.stringify(mapa);
}

/// Agrupa las reacciones por emoji → lista de usuarioIds, para pintar
/// los chips debajo de la burbuja (mismo criterio que
/// reaccionesAgrupadas en Dart).
export function reaccionesAgrupadas(msg) {
  const reacciones = leerReacciones(msg);
  const grupos = new Map();
  for (const [usuarioId, emoji] of Object.entries(reacciones)) {
    if (!grupos.has(emoji)) grupos.set(emoji, []);
    grupos.get(emoji).push(usuarioId);
  }
  return grupos;
}

// ── Preview de texto (idéntico a Mensaje.textoPreview en Dart) ─────────────
export function textoPreview(msg) {
  if (msg.eliminado) return 'Mensaje eliminado';

  switch (msg.tipo) {
    case TipoMensaje.IMAGEN:
      return msg.contenido ? `📷 ${msg.contenido}` : '📷 Foto';
    case TipoMensaje.VIDEO:
      return msg.contenido ? `🎬 ${msg.contenido}` : '🎬 Video';
    case TipoMensaje.AUDIO: {
      const seg = Math.round((msg.mediaDuracionMs || 0) / 1000);
      const m = Math.floor(seg / 60);
      const s = String(seg % 60).padStart(2, '0');
      return `🎤 Audio (${m}:${s})`;
    }
    case TipoMensaje.DOCUMENTO:
      return `📄 ${msg.mediaNombreArchivo || 'Documento'}`;
    case TipoMensaje.STICKER:
      return '🏷️ Sticker';
    default:
      return msg.contenido || '';
  }
}

// ── Parseo desde una fila de Supabase (mensajes_pendientes) ────────────────
// Equivalente a Mensaje.fromSupabase() en Dart.
export function mensajeFromSupabase(row, { miId, otroId }) {
  const emisor = row.remitente_id;
  const tipo = row.tipo || TipoMensaje.TEXTO;

  const msg = {
    mensajeId: row.id,
    chatOtroUsuarioId: emisor === miId ? otroId : emisor,
    emisorId: emisor,
    tipo,
    mediaUrlRemota: row.media_url ?? null,
    timestamp: row.creado_en,
    estado: EstadoMensaje.ENTREGADO,
    contextoDescripcion: row.contexto_descripcion ?? null,
    contextoImagenUrl: row.contexto_imagen_url ?? null,
    contextoLugar: row.contexto_lugar ?? null,
    contextoObjetoId: row.contexto_objeto_id ?? null,
    contextoTipo: row.contexto_tipo ?? null,
    respuestaAMensajeId: row.respuesta_a_id ?? null,
    respuestaAContenido: row.respuesta_a_contenido ?? null,
    respuestaATipo: row.respuesta_a_tipo ?? null,
    respuestaAEmisorId: row.respuesta_a_emisor_id ?? null,
    editado: row.editado ?? false,
    eliminado: row.eliminado ?? false,
  };

  if (esMedia(tipo)) {
    const meta = desempaquetarMetadata(row.contenido);
    msg.contenido = meta.caption ?? null;
    msg.mediaNombreArchivo = meta.nombreArchivo ?? null;
    msg.mediaTamanioBytes = meta.tamanioBytes ?? null;
    msg.mediaDuracionMs = meta.duracionMs ?? null;
    msg.mediaAncho = meta.ancho ?? null;
    msg.mediaAlto = meta.alto ?? null;
    msg.mediaThumbnailUrl = meta.thumbnailUrl ?? null;
  } else {
    msg.contenido = row.contenido ?? null;
  }

  return msg;
}