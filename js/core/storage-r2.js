// ═════════════════════════════════════════════════════════════════
// storage-r2.js — traducción de storage_service.dart
//
// Sube y elimina archivos en R2 vía Edge Functions con URLs
// prefirmadas. El secretKey nunca viaja al cliente.
//
// Diferencias respecto al Dart original:
//   • Sin ffmpeg: los videos NO se comprimen en el navegador, se
//     suben tal cual los grabó/eligió el usuario (R2 no cobra
//     egress, el costo real es solo storage — decisión ya tomada
//     en conversaciones anteriores).
//   • Compresión de imagen vía Canvas en vez de flutter_image_compress.
//   • Sin duración de audio/video vía ffprobe: se usa el elemento
//     <audio>/<video> nativo para leer .duration cuando se necesita.
//   • subirHistoriaAudioConFondo (mux de audio + fondo con ecualizador
//     ffmpeg) NO tiene equivalente directo en navegador — queda
//     pendiente como decisión de producto aparte si se necesita en
//     web (alternativa: Web Audio API + Canvas + MediaRecorder, es
//     una construcción bastante más compleja que el resto de este
//     archivo).
// ═════════════════════════════════════════════════════════════════

import { supabase } from './supabase-client.js';
import { EDGE_FUNCTIONS_URL, BUCKETS, DOMINIOS } from './r2-config.js';

// ─────────────────────────────────────────────────────────────────
// TIMEOUTS — mismo criterio que el Dart original
// ─────────────────────────────────────────────────────────────────
const TIMEOUT_BOLETO_MS = 15000;
const TIMEOUT_SUBIDA_MS = 60000;


// ─────────────────────────────────────────────────────────────────
// VALIDACIÓN DEFENSIVA DEL CLIENTE
//
// Estas comprobaciones NO sustituyen la autorización de las Edge
// Functions. Su objetivo es impedir que errores del frontend soliciten
// URLs firmadas para buckets/rutas inesperadas y fallar antes de subir.
// ─────────────────────────────────────────────────────────────────
const _BUCKETS_PERMITIDOS = new Set(Object.values(BUCKETS));

const _MIME_POR_BUCKET = new Map([
  [BUCKETS.perfil, new Set(['image/jpeg'])],
  [BUCKETS.publicaciones, new Set(['image/jpeg', 'video/mp4'])],
  [BUCKETS.historias, new Set(['image/jpeg', 'video/mp4'])],
  [BUCKETS.marketplace, new Set(['image/jpeg'])],
  [BUCKETS.cosasPerdidas, new Set(['image/jpeg'])],
  [BUCKETS.chat, new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4',
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
    'application/pdf', 'text/plain', 'text/csv', 'application/csv',
    'application/msword', 'application/vnd.ms-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/vnd.rar', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/octet-stream',
  ])],
]);

function _normalizarContentType(contentType) {
  return String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

function _validarBucket(bucket) {
  if (!_BUCKETS_PERMITIDOS.has(bucket)) {
    throw new Error('Bucket de almacenamiento no permitido.');
  }
}

function _validarPath(path) {
  const p = String(path || '');
  if (!p || p.length > 512) throw new Error('Ruta de almacenamiento inválida.');
  if (p.startsWith('/') || p.includes('\\') || p.includes('..')) {
    throw new Error('Ruta de almacenamiento no permitida.');
  }
  if(/[\u0000-\u001F\u007F]/.test(p)) {
    throw new Error('Ruta de almacenamiento contiene caracteres no permitidos.');
  }
  const segmentos = p.split('/');
  if (segmentos.some((seg) => !seg || seg === '.' || seg === '..')) {
    throw new Error('Ruta de almacenamiento inválida.');
  }
}

function _validarMime(bucket, contentType) {
  const mime = _normalizarContentType(contentType);
  if (!mime) throw new Error('Tipo de archivo no especificado.');
  const permitidos = _MIME_POR_BUCKET.get(bucket);
  if (permitidos && !permitidos.has(mime)) {
    throw new Error(`Tipo de archivo no permitido para ${bucket}: ${mime}`);
  }
  return mime;
}

function _validarPropietarioPath(path, userId) {
  if (!userId || !String(path).startsWith(`${userId}/`)) {
    throw new Error('La ruta de subida no pertenece al usuario autenticado.');
  }
}

function _fetchConTimeout(url, opciones, timeoutMs, mensajeTimeout) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opciones, signal: controller.signal })
    .catch((e) => {
      if (e.name === 'AbortError') throw new Error(mensajeTimeout);
      throw e;
    })
    .finally(() => clearTimeout(id));
}

// ─────────────────────────────────────────────────────────────────
// COMPRESIÓN DE IMAGEN — vía Canvas (equivalente a FlutterImageCompress)
// ─────────────────────────────────────────────────────────────────
async function _comprimirImagen(file, { calidad = 0.7, minAncho = 1280 } = {}) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, minAncho / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al comprimir imagen'))),
      'image/jpeg',
      calidad,
    );
  });
}

function _esVideo(nombreOTipo) {
  const s = nombreOTipo.toLowerCase();
  return s.includes('video') || /\.(mp4|mov|avi|mkv|webm)$/.test(s);
}

// ─────────────────────────────────────────────────────────────────
// SUBIDA VÍA PRESIGNED URL — núcleo compartido por todos los métodos
// ─────────────────────────────────────────────────────────────────
async function _subirViaPresignedUrl(blob, bucket, path, contentType, onProgress) {
  _validarBucket(bucket);
  _validarPath(path);
  const mime = _validarMime(bucket, contentType);

  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error('El archivo está vacío o no es válido.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const token = session?.access_token;
  const userId = session?.user?.id;
  if (!token || !userId) throw new Error('No hay sesión activa: no se puede subir a R2');

  _validarPropietarioPath(path, userId);

  const resBoleto = await _fetchConTimeout(
    `${EDGE_FUNCTIONS_URL}/generar-url-subida`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, contentType: mime, sizeBytes: blob.size }),
    },
    TIMEOUT_BOLETO_MS,
    `Tiempo de espera agotado al pedir la URL de subida (bucket=${bucket}, path=${path}).`,
  );

  if (!resBoleto.ok) {
    throw new Error(`Error al generar URL de subida (${resBoleto.status}): ${await resBoleto.text()}`);
  }
  let uploadUrl;
  try {
    const payload = await resBoleto.json();
    uploadUrl = payload?.url;
    const parsed = new URL(uploadUrl);
    if (parsed.protocol !== 'https:') throw new Error('La URL firmada no usa HTTPS.');
  } catch (error) {
    throw new Error(`La función de almacenamiento devolvió una URL de subida inválida: ${error.message}`);
  }

  // fetch no reporta progreso de PUT de forma nativa; para progreso real
  // (barra de subida) habría que usar XMLHttpRequest. Se deja el hook
  // onProgress por compatibilidad de firma, pero no se invoca aquí salvo
  // que se decida migrar a XHR más adelante.
  const resPut = await _fetchConTimeout(
    uploadUrl,
    { method: 'PUT', headers: { 'Content-Type': mime }, body: blob },
    TIMEOUT_SUBIDA_MS,
    `Tiempo de espera agotado al subir el archivo a R2 (bucket=${bucket}, path=${path}).`,
  );

  if (!resPut.ok) throw new Error(`Error al subir a R2 (${resPut.status})`);
}

// ─────────────────────────────────────────────────────────────────
// FOTO DE PERFIL
// ─────────────────────────────────────────────────────────────────
export async function subirFotoPerfil(file, userId) {
  const comprimido = await _comprimirImagen(file);
  const path = `${userId}/avatar.jpg`;
  await _subirViaPresignedUrl(comprimido, BUCKETS.perfil, path, 'image/jpeg');
  return `${DOMINIOS.perfil}/${path}`;
}

// ─────────────────────────────────────────────────────────────────
// MEDIA DE PUBLICACIÓN
// ─────────────────────────────────────────────────────────────────
export async function subirMediaPublicacion(file, postId, userId, orden) {
  const esVideo = _esVideo(file.type || file.name);
  const path = `${userId}/${postId}/${orden}.${esVideo ? 'mp4' : 'jpg'}`;
  const blob = esVideo ? file : await _comprimirImagen(file);
  await _subirViaPresignedUrl(blob, BUCKETS.publicaciones, path, esVideo ? 'video/mp4' : 'image/jpeg');
  return `${DOMINIOS.publicaciones}/${path}`;
}

// ─────────────────────────────────────────────────────────────────
// HISTORIA
// ─────────────────────────────────────────────────────────────────
export async function subirHistoria(file, userId) {
  const ts = Date.now();
  const esVideo = _esVideo(file.type || file.name);
  const path = `${userId}/${ts}.${esVideo ? 'mp4' : 'jpg'}`;
  const blob = esVideo ? file : await _comprimirImagen(file);
  await _subirViaPresignedUrl(blob, BUCKETS.historias, path, esVideo ? 'video/mp4' : 'image/jpeg');
  return `${DOMINIOS.historias}/${path}`;
}

export async function subirHistoriaDesdeBytes(bytes, extension, userId) {
  const ext = extension.toLowerCase().replace('.', '');
  const contentType = _esVideo(ext) ? 'video/mp4' : 'image/jpeg';
  const blob = new Blob([bytes], { type: contentType });
  const ts = Date.now();
  const path = `${userId}/${ts}.${ext}`;
  await _subirViaPresignedUrl(blob, BUCKETS.historias, path, contentType);
  return `${DOMINIOS.historias}/${path}`;
}

// ─────────────────────────────────────────────────────────────────
// IMAGEN DE MARKETPLACE
// ─────────────────────────────────────────────────────────────────
export async function subirImagenMarketplace(file, publicacionId, orden) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('No hay sesión activa');
  const comprimido = await _comprimirImagen(file);
  const path = `${userId}/${publicacionId}/${orden}.jpg`;
  await _subirViaPresignedUrl(comprimido, BUCKETS.marketplace, path, 'image/jpeg');
  return { url: `${DOMINIOS.marketplace}/${path}`, path };
}

// ─────────────────────────────────────────────────────────────────
// COSAS PERDIDAS (JaguarChat) — una imagen por reporte, sin thumbnail
// aparte (el modelo de Dart solo tiene imagen_url).
// ─────────────────────────────────────────────────────────────────
export async function subirImagenObjetoPerdido(file, userId, objetoId) {
  const comprimido = await _comprimirImagen(file);
  const path = `${userId}/${objetoId}.jpg`;
  await _subirViaPresignedUrl(comprimido, BUCKETS.cosasPerdidas, path, 'image/jpeg');
  return { url: `${DOMINIOS.cosasPerdidas}/${path}`, path };
}

// ─────────────────────────────────────────────────────────────────
// MEDIA DE CHAT (JaguarChat) — bucket nuevo, path por conversación
// ─────────────────────────────────────────────────────────────────
function _carpetaChat(miId, otroId) {
  return `${miId}/chat_${otroId}`;
}

export async function subirImagenChat(file, miId, otroId, mensajeId) {
  const carpeta = _carpetaChat(miId, otroId);
  const comprimido = await _comprimirImagen(file);
  const thumb = await _comprimirImagen(file, { calidad: 0.35, minAncho: 240 });

  const path = `${carpeta}/${mensajeId}.jpg`;
  const thumbPath = `${carpeta}/${mensajeId}_thumb.jpg`;

  await _subirViaPresignedUrl(comprimido, BUCKETS.chat, path, 'image/jpeg');
  await _subirViaPresignedUrl(thumb, BUCKETS.chat, thumbPath, 'image/jpeg');

  return {
    url: `${DOMINIOS.chat}/${path}`,
    thumbnailUrl: `${DOMINIOS.chat}/${thumbPath}`,
    tamanioBytes: file.size,
  };
}

export async function subirVideoChat(file, miId, otroId, mensajeId) {
  const carpeta = _carpetaChat(miId, otroId);
  const path = `${carpeta}/${mensajeId}.mp4`;
  await _subirViaPresignedUrl(file, BUCKETS.chat, path, 'video/mp4');

  // Thumbnail: capturamos un frame con <video>+<canvas> en vez de ffmpeg.
  let thumbnailUrl = null;
  try {
    const thumbBlob = await _extraerFrameVideo(file);
    const thumbPath = `${carpeta}/${mensajeId}_thumb.jpg`;
    await _subirViaPresignedUrl(thumbBlob, BUCKETS.chat, thumbPath, 'image/jpeg');
    thumbnailUrl = `${DOMINIOS.chat}/${thumbPath}`;
  } catch (_e) {
    // Sin thumbnail no es crítico — el video se sube igual.
  }

  return { url: `${DOMINIOS.chat}/${path}`, thumbnailUrl, tamanioBytes: file.size };
}

async function _extraerFrameVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1, video.duration || 0);
    });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          blob ? resolve(blob) : reject(new Error('No se pudo generar el thumbnail'));
        },
        'image/jpeg',
        0.7,
      );
    });
    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Error al leer el video'));
    });
  });
}

export async function subirAudioChat(file, miId, otroId, mensajeId) {
  const carpeta = _carpetaChat(miId, otroId);

  // MediaRecorder suele devolver valores como "audio/webm;codecs=opus".
  // La Edge Function valida una lista cerrada de MIME types y compara el
  // valor exacto, por lo que el parámetro ;codecs=... provoca un 400 aunque
  // audio/webm sí esté permitido. Mandamos el MIME base al pedir la URL y
  // también en el PUT firmado.
  const mimeOriginal = file.type || 'audio/webm';
  const mime = mimeOriginal.split(';')[0].trim().toLowerCase();

  let ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (!ext || ext === file.name?.toLowerCase()) {
    ext = mime.includes('webm') ? 'webm'
      : mime.includes('ogg') ? 'ogg'
      : mime.includes('mpeg') ? 'mp3'
      : mime.includes('mp4') ? 'm4a'
      : 'webm';
  }

  const path = `${carpeta}/${mensajeId}.${ext}`;
  await _subirViaPresignedUrl(file, BUCKETS.chat, path, mime);
  return { url: `${DOMINIOS.chat}/${path}`, tamanioBytes: file.size };
}

export async function subirStickerChat(file, miId, otroId, mensajeId) {
  const carpeta = _carpetaChat(miId, otroId);
  const mime = file.type || 'image/webp';
  let ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (!ext || ext === file.name?.toLowerCase()) {
    ext = mime.includes('png') ? 'png' : mime.includes('gif') ? 'gif' : 'webp';
  }
  const path = `${carpeta}/${mensajeId}_sticker.${ext}`;
  await _subirViaPresignedUrl(file, BUCKETS.chat, path, mime);
  return { url: `${DOMINIOS.chat}/${path}`, tamanioBytes: file.size };
}

export async function subirDocumentoChat(file, miId, otroId, mensajeId, nombreOriginal) {
  const carpeta = _carpetaChat(miId, otroId);
  const ext = (nombreOriginal.split('.').pop() || '').toLowerCase();
  const path = `${carpeta}/${mensajeId}.${ext || 'bin'}`;

  const mimePorExtension = {
    pdf: ['application/pdf'],
    txt: ['text/plain'],
    csv: ['text/csv', 'application/csv'],
    doc: ['application/msword', 'application/vnd.ms-word'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // OOXML es un contenedor ZIP. Algunas implementaciones antiguas de la
      // función firmadora permiten application/zip aunque no conozcan el MIME Office.
      'application/zip',
    ],
    xls: ['application/vnd.ms-excel'],
    xlsx: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ],
    ppt: ['application/vnd.ms-powerpoint'],
    pptx: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
    ],
    zip: ['application/zip'],
    rar: ['application/vnd.rar', 'application/x-rar-compressed'],
    '7z': ['application/x-7z-compressed'],
  };

  const mimeNavegador = (file.type || '').split(';')[0].trim().toLowerCase();
  const candidatos = [...(mimePorExtension[ext] || [])];
  if (mimeNavegador && !candidatos.includes(mimeNavegador)) candidatos.push(mimeNavegador);
  if (candidatos.length === 0) candidatos.push('application/octet-stream');

  let ultimoError = null;
  for (const mime of candidatos) {
    try {
      await _subirViaPresignedUrl(file, BUCKETS.chat, path, mime);
      return { url: `${DOMINIOS.chat}/${path}`, tamanioBytes: file.size, nombreArchivo: nombreOriginal };
    } catch (error) {
      ultimoError = error;
      const mensaje = String(error?.message || error || '');
      const rechazoTipo = /tipo de archivo no permitido|content.?type|mime|415|400/i.test(mensaje);
      if (!rechazoTipo) throw error;
    }
  }

  const detalle = String(ultimoError?.message || ultimoError || 'Tipo de archivo no permitido');
  throw new Error(`El servidor de archivos rechazó ${ext ? `.${ext}` : 'este documento'}. ${detalle}`);
}

// ─────────────────────────────────────────────────────────────────
// ELIMINAR DE R2
// ─────────────────────────────────────────────────────────────────
export async function eliminarDeR2(bucket, path) {
  _validarBucket(bucket);
  _validarPath(path);

  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('No hay sesión activa: no se puede eliminar de R2');

  const res = await _fetchConTimeout(
    `${EDGE_FUNCTIONS_URL}/eliminar-objeto-r2`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path }),
    },
    TIMEOUT_BOLETO_MS,
    `Tiempo de espera agotado al eliminar de R2 (bucket=${bucket}, path=${path}).`,
  );

  if (!res.ok) throw new Error(`Error al eliminar de R2 (${res.status}): ${await res.text()}`);
}