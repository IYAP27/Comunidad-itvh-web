// Servicio de Google Drive para respaldos de JaguarChat web.
// Mantiene el formato v2 compatible con la app móvil.

import { db } from '../../core/db.js';
import { usuarioActual } from '../../core/auth.js';

const GOOGLE_EMAIL_KEY = 'jaguarchat_backup_google_email';
const GOOGLE_FOTO_KEY = 'jaguarchat_backup_google_foto';
const GOOGLE_CLIENT_ID = '773599655241-hbi4ku82lh3vrb5hh8apdmueensbp87a.apps.googleusercontent.com';
const GOOGLE_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
const DRIVE_BACKUP_NAME = 'jaguarchat_backup.enc';

let _googleToken = null;
let _googleTokenExpira = 0;
let _googleScriptPromise = null;

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE IDENTITY SERVICES + DRIVE appDataFolder
// ─────────────────────────────────────────────────────────────────────────────

export function cuentaGoogleGuardada() {
  const email = localStorage.getItem(GOOGLE_EMAIL_KEY);
  if (!email) return null;
  return { email, foto: localStorage.getItem(GOOGLE_FOTO_KEY) || null };
}

async function _cargarGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return;
  if (_googleScriptPromise) return _googleScriptPromise;
  _googleScriptPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector('script[data-jca-google-identity]');
    if (existente) {
      existente.addEventListener('load', resolve, { once: true });
      existente.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.jcaGoogleIdentity = '1';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
  return _googleScriptPromise;
}

async function _pedirTokenGoogle({ interactivo = false } = {}) {
  if (_googleToken && Date.now() < _googleTokenExpira - 60_000) return _googleToken;
  await _cargarGoogleIdentity();

  return new Promise((resolve, reject) => {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPE,
      callback: (resp) => {
        if (resp?.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        _googleToken = resp.access_token;
        _googleTokenExpira = Date.now() + (Number(resp.expires_in || 3600) * 1000);
        resolve(_googleToken);
      },
      error_callback: (err) => reject(new Error(err?.message || err?.type || 'No se pudo abrir Google')),
    });

    cliente.requestAccessToken({ prompt: interactivo ? 'select_account' : '' });
  });
}

export async function vincularGoogle() {
  const token = await _pedirTokenGoogle({ interactivo: true });
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('No se pudo obtener la cuenta de Google');
  const info = await resp.json();
  if (!info.email) throw new Error('Google no devolvió el correo de la cuenta');
  localStorage.setItem(GOOGLE_EMAIL_KEY, info.email);
  if (info.picture) localStorage.setItem(GOOGLE_FOTO_KEY, info.picture);
  else localStorage.removeItem(GOOGLE_FOTO_KEY);
  return { email: info.email, foto: info.picture || null };
}

export async function desvincularGoogle({ conservarDatos = false } = {}) {
  try {
    await _cargarGoogleIdentity();
    if (_googleToken) {
      await new Promise((resolve) => google.accounts.oauth2.revoke(_googleToken, resolve));
    }
  } catch (_) {
    // Desvincular localmente sigue siendo válido aunque Google no responda.
  }
  _googleToken = null;
  _googleTokenExpira = 0;
  if (!conservarDatos) {
    localStorage.removeItem(GOOGLE_EMAIL_KEY);
    localStorage.removeItem(GOOGLE_FOTO_KEY);
  }
}

async function _driveFetch(url, options = {}, { interactivo = true } = {}) {
  let token;
  try {
    token = await _pedirTokenGoogle({ interactivo: false });
  } catch (e) {
    if (!interactivo) throw e;
    token = await _pedirTokenGoogle({ interactivo: true });
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  let resp = await fetch(url, { ...options, headers });

  if (resp.status === 401 && interactivo) {
    _googleToken = null;
    _googleTokenExpira = 0;
    token = await _pedirTokenGoogle({ interactivo: true });
    headers.set('Authorization', `Bearer ${token}`);
    resp = await fetch(url, { ...options, headers });
  }
  return resp;
}

async function _buscarBackupDrive() {
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,size,modifiedTime)&pageSize=10`;
  const resp = await _driveFetch(url);
  if (!resp.ok) throw await _errorDrive(resp);
  const data = await resp.json();
  return data.files?.[0] || null;
}

async function _subirBackupDrive(bytes) {
  let archivo = await _buscarBackupDrive();

  if (!archivo) {
    const crear = await _driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_BACKUP_NAME, parents: ['appDataFolder'] }),
    });
    if (!crear.ok) throw await _errorDrive(crear);
    archivo = await crear.json();
  }

  const subir = await _driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(archivo.id)}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (!subir.ok) throw await _errorDrive(subir);
}

async function _descargarBackupDrive() {
  const archivo = await _buscarBackupDrive();
  if (!archivo) throw new Error('No se encontró ningún backup en Google Drive');
  const resp = await _driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(archivo.id)}?alt=media`);
  if (!resp.ok) throw await _errorDrive(resp);
  return new Uint8Array(await resp.arrayBuffer());
}

async function _errorDrive(resp) {
  let detalle = '';
  try {
    const data = await resp.json();
    detalle = data?.error?.message || '';
  } catch (_) {}
  return new Error(detalle || `Google Drive respondió ${resp.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP COMPATIBLE CON FLUTTER
// ─────────────────────────────────────────────────────────────────────────────

export async function respaldarEnGoogleDrive() {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('No hay una sesión activa de Comunidad ITVH');

  const [chats, mensajes] = await Promise.all([db.chats.toArray(), db.mensajes.toArray()]);
  const payload = {
    version: 2,
    exportado_en: new Date().toISOString(),
    chats: chats.map(_normalizarChatBackup),
    mensajes: mensajes.map(_normalizarMensajeBackup),
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const comprimido = await _gzip(jsonBytes);
  const cifrado = await _cifrarCompatibleMovil(uid, comprimido);
  await _subirBackupDrive(cifrado);
  return cifrado.byteLength;
}

export async function restaurarDesdeGoogleDrive() {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('No hay una sesión activa de Comunidad ITVH');

  const cifrado = await _descargarBackupDrive();
  const comprimido = await _descifrarCompatibleMovil(uid, cifrado);
  const plano = await _gunzip(comprimido);
  const json = new TextDecoder().decode(plano);

  let payload;
  try {
    payload = JSON.parse(json);
  } catch (_) {
    throw new Error('El backup está dañado o no contiene JSON válido');
  }
  if (!Array.isArray(payload?.chats) || !Array.isArray(payload?.mensajes)) {
    throw new Error('El archivo no parece ser un backup de JaguarChat');
  }

  const chats = payload.chats.map(_normalizarChatRestaurado).filter((x) => x.otroUsuarioId);
  const mensajes = payload.mensajes.map(_normalizarMensajeRestaurado).filter((x) => x.mensajeId && x.chatOtroUsuarioId);

  await db.transaction('rw', db.chats, db.mensajes, async () => {
    if (chats.length) await db.chats.bulkPut(chats);
    if (mensajes.length) await db.mensajes.bulkPut(mensajes);
  });
}

function _normalizarChatBackup(c) {
  return {
    otroUsuarioId: c.otroUsuarioId,
    otroNombre: c.otroNombre ?? 'Usuario',
    otroNombreUsuario: c.otroNombreUsuario ?? null,
    otroAvatarUrl: c.otroAvatarUrl ?? null,
    ultimoMensaje: c.ultimoMensaje ?? null,
    ultimaFecha: c.ultimaFecha ? new Date(c.ultimaFecha).toISOString() : null,
    noLeidos: Number(c.noLeidos || 0),
    fijado: Boolean(c.fijado),
    silenciado: Boolean(c.silenciado),
    archivado: Boolean(c.archivado),
  };
}

function _normalizarMensajeBackup(m) {
  return {
    mensajeId: m.mensajeId,
    chatOtroUsuarioId: m.chatOtroUsuarioId,
    emisorId: m.emisorId,
    contenido: m.contenido ?? null,
    tipo: m.tipo ?? 'texto',
    mediaUrlRemota: m.mediaUrlRemota ?? null,
    mediaNombreArchivo: m.mediaNombreArchivo ?? null,
    mediaTamanioBytes: m.mediaTamanioBytes ?? null,
    mediaDuracionMs: m.mediaDuracionMs ?? null,
    mediaAncho: m.mediaAncho ?? null,
    mediaAlto: m.mediaAlto ?? null,
    mediaThumbnailUrl: m.mediaThumbnailUrl ?? null,
    timestamp: new Date(m.timestamp).toISOString(),
    estado: m.estado ?? 'recibido',
    contextoDescripcion: m.contextoDescripcion ?? null,
    contextoImagenUrl: m.contextoImagenUrl ?? null,
    contextoLugar: m.contextoLugar ?? null,
    contextoObjetoId: m.contextoObjetoId ?? null,
    contextoTipo: m.contextoTipo ?? null,
    respuestaAMensajeId: m.respuestaAMensajeId ?? null,
    respuestaAContenido: m.respuestaAContenido ?? null,
    respuestaATipo: m.respuestaATipo ?? null,
    respuestaAEmisorId: m.respuestaAEmisorId ?? null,
    editado: Boolean(m.editado),
    eliminado: Boolean(m.eliminado),
    reaccionesRaw: m.reaccionesRaw ?? null,
  };
}

function _normalizarChatRestaurado(c) {
  return {
    otroUsuarioId: c.otroUsuarioId,
    otroNombre: c.otroNombre ?? 'Usuario',
    otroNombreUsuario: c.otroNombreUsuario ?? null,
    otroAvatarUrl: c.otroAvatarUrl ?? null,
    ultimoMensaje: c.ultimoMensaje ?? null,
    ultimaFecha: c.ultimaFecha ?? null,
    noLeidos: Number(c.noLeidos || 0),
    fijado: Boolean(c.fijado),
    silenciado: Boolean(c.silenciado),
    archivado: Boolean(c.archivado),
  };
}

function _normalizarMensajeRestaurado(m) {
  return {
    mensajeId: m.mensajeId,
    chatOtroUsuarioId: m.chatOtroUsuarioId,
    emisorId: m.emisorId,
    contenido: m.contenido ?? null,
    tipo: m.tipo ?? 'texto',
    mediaUrlRemota: m.mediaUrlRemota ?? null,
    mediaNombreArchivo: m.mediaNombreArchivo ?? null,
    mediaTamanioBytes: m.mediaTamanioBytes ?? null,
    mediaDuracionMs: m.mediaDuracionMs ?? null,
    mediaAncho: m.mediaAncho ?? null,
    mediaAlto: m.mediaAlto ?? null,
    mediaThumbnailUrl: m.mediaThumbnailUrl ?? null,
    timestamp: m.timestamp,
    estado: m.estado ?? 'recibido',
    contextoDescripcion: m.contextoDescripcion ?? null,
    contextoImagenUrl: m.contextoImagenUrl ?? null,
    contextoLugar: m.contextoLugar ?? null,
    contextoObjetoId: m.contextoObjetoId ?? null,
    contextoTipo: m.contextoTipo ?? null,
    respuestaAMensajeId: m.respuestaAMensajeId ?? null,
    respuestaAContenido: m.respuestaAContenido ?? null,
    respuestaATipo: m.respuestaATipo ?? null,
    respuestaAEmisorId: m.respuestaAEmisorId ?? null,
    editado: Boolean(m.editado),
    eliminado: Boolean(m.eliminado),
    reaccionesRaw: m.reaccionesRaw ?? null,
  };
}

async function _claveDesdeUid(uid) {
  const enc = new TextEncoder();
  const sal = enc.encode('jaguarchat-backup-v2');
  const info = enc.encode('aes-256-cbc-backup-key');

  const saltKey = await crypto.subtle.importKey('raw', sal, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, enc.encode(uid)));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bloque = new Uint8Array(info.length + 1);
  bloque.set(info, 0);
  bloque[bloque.length - 1] = 0x01;
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, bloque));
  return okm.slice(0, 32);
}

async function _cifrarCompatibleMovil(uid, datos) {
  const keyBytes = await _claveDesdeUid(uid);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, datos));
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv, 0);
  out.set(ciphertext, iv.length);
  return out;
}

async function _descifrarCompatibleMovil(uid, datos) {
  if (datos.length < 17) throw new Error('Archivo de backup inválido o corrupto');
  const keyBytes = await _claveDesdeUid(uid);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  const iv = datos.slice(0, 16);
  const ciphertext = datos.slice(16);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext));
  } catch (_) {
    throw new Error('No se pudo descifrar el backup. Usa la misma cuenta de Comunidad ITVH con la que se creó.');
  }
}

async function _gzip(bytes) {
  if (!('CompressionStream' in window)) throw new Error('Tu navegador no soporta compresión de backups. Actualiza Chrome/Edge/Opera.');
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function _gunzip(bytes) {
  if (!('DecompressionStream' in window)) throw new Error('Tu navegador no soporta restaurar backups comprimidos. Actualiza Chrome/Edge/Opera.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function mensajeErrorGoogle(err) {
  const msg = String(err?.message || err || 'Error desconocido');
  if (/origin|mismatch|unauthorized/i.test(msg)) {
    return 'Google rechazó el dominio actual. Agrega este dominio a “Authorized JavaScript origins” del cliente OAuth de Google Cloud.';
  }
  if (/popup|closed|cancel|access_denied/i.test(msg)) return 'Se canceló el acceso a Google.';
  return msg;
}

