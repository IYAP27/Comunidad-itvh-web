// publicar.js — traducción de PublicarHistoria.dart

import { escapeHtml as _escapeHtml } from '../../../core/html-utils.js';
import { supabase } from '../../../core/supabase-client.js';
import { usuarioActual } from '../../../core/auth.js';
import { subirHistoria, subirHistoriaDesdeBytes } from '../../../core/storage-r2.js';

const MAX_HISTORIAS_DIA = 3;

async function _puedePublicarHoy(uid) {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Intento primario: columna 'creado_en'
  try {
    const { data, error } = await supabase
      .from('historias')
      .select('id')
      .eq('autor_id', uid)
      .gte('creado_en', hace24h);
    if (error) throw error;
    return (data?.length ?? 0) < MAX_HISTORIAS_DIA;
  } catch (e) {
    // Fallback: si la columna no existe en esta instancia de DB, reintentar con 'created_at'
    try {
      const { data, error } = await supabase
        .from('historias')
        .select('id')
        .eq('autor_id', uid)
        .gte('created_at', hace24h);
      if (error) throw error;
      return (data?.length ?? 0) < MAX_HISTORIAS_DIA;
    } catch (e2) {
      // si falla de nuevo, propagar el error original para debugging
      throw e2 || e;
    }
  }
}

function _esVideoExt(ext) {
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext.toLowerCase().replace('.', ''));
}

/**
 * Sube la media e inserta la fila en `historias`.
 * Acepta `file` (File) o `blob` + `extension`.
 */
export async function publicarHistoria({ file, blob, extension, videoInicioMs, videoFinMs, musica } = {}) {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('No hay sesión activa');

  const puede = await _puedePublicarHoy(uid);
  if (!puede) {
    const err = new Error('Límite diario alcanzado');
    err.codigo = 'limite';
    throw err;
  }

  let cdnUrl;
  let tipo;
  let finMs = videoFinMs;

  if (file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    cdnUrl = await subirHistoria(file, uid);
    tipo = _esVideoExt(ext) ? 'video' : 'imagen';
  } else if (blob) {
    const ext = (extension || 'png').toLowerCase().replace('.', '');
    const bytes = await blob.arrayBuffer();
    cdnUrl = await subirHistoriaDesdeBytes(bytes, ext, uid);
    tipo = _esVideoExt(ext) ? 'video' : 'imagen';
  } else {
    throw new Error('No hay contenido para publicar');
  }

  const payload = {
    autor_id: uid,
    media_url: cdnUrl,
    cdn_url: cdnUrl,
    tipo,
  };

  if (musica) {
    // campos opcionales para mostrar/preview de música en la historia
    payload.musica_id = musica.id ?? null;
    payload.musica_titulo = musica.title ?? null;
    payload.musica_artista = musica.artist ?? null;
    payload.musica_preview_url = musica.previewUrl ?? null;
    payload.musica_artwork = musica.artwork ?? null;
    try {
      payload.musica_json = JSON.stringify(musica);
    } catch (_e) {
      payload.musica_json = null;
    }
    // También enviar los campos que usa la app Flutter (prefijo 'track_')
    payload.track_id = musica.id ?? null;
    payload.track_titulo = musica.title ?? null;
    payload.track_artista = musica.artist ?? null;
    payload.track_cover = musica.artwork ?? null;
    payload.preview_url = musica.previewUrl ?? musica.preview_url ?? null;
    // inicio de pista (si existe), por compatibilidad con Flutter
    payload.track_inicio_ms = musica.startMs ?? musica.inicioMs ?? 0;
  }

  if (tipo === 'video') {
    payload.video_inicio_ms = videoInicioMs ?? 0;
    payload.video_fin_ms = finMs ?? 15000;
  }

  // Intento insert iterativo: si la instancia de DB no tiene columnas opcionales
  // (ej. musica_titulo, musica_artista, etc.), el servidor responde con PGRST204.
  // En ese caso eliminamos la(s) columna(s) faltante(s) del payload y reintentamos.
  const toInsert = { ...payload };
  const removed = [];
  while (true) {
    try {
      const { error } = await supabase.from('historias').insert(toInsert);
      if (error) {
        // Detectar error por columna inexistente
        const msg = String(error.message || error.details || '');
          // Capturar varios formatos de mensaje de PostgREST / Postgres
          // Ejemplos:
          // "Could not find the 'musica_artista' column of 'historias' in the schema cache"
          // "column \"musica_artista\" of relation \"historias\" does not exist"
          let col = null;
          let m = msg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
          if (!m) m = msg.match(/'([a-zA-Z0-9_]+)' column of 'historias'/i);
          if (!m) m = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of\s+relation\s+"?historias"?/i);
          if (!m) m = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?/i);
          if (m) col = m[1];
          if (col && col in toInsert) {
            console.warn('publicarHistoria – columna ausente detectada, removiendo y reintentando:', col);
            removed.push(col);
            delete toInsert[col];
            continue; // reintentar sin esa columna
          }
        console.error('publicarHistoria – insert error (no recoverable):', error, 'payload:', toInsert);
        throw error;
      }
      break; // éxito
    } catch (e) {
      // si ya intentamos eliminar columnas y no hay más cambios, relanzar con info
      if (removed.length > 0) {
        throw new Error(`Insert failed after removing columns: ${removed.join(', ')} — ${String(e)}`);
      }
      throw e;
    }
  }
  return true;
}

/**
 * Overlay de publicación (subiendo / éxito / error / límite).
 * Devuelve true si se publicó con éxito.
 */
export function abrirOverlayPublicacion({ publicarFn }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'historia-publicar-overlay';
    overlay.innerHTML = `
      <div class="historia-publicar-card">
        <div id="hp-contenido"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const contenido = overlay.querySelector('#hp-contenido');
    let cerrando = false;

    const cerrar = (resultado) => {
      if (cerrando) return;
      cerrando = true;
      overlay.remove();
      resolve(resultado);
    };

    const pintarSubiendo = () => {
      contenido.innerHTML = `
        <div class="historia-publicar-spinner"></div>
        <p class="historia-publicar-titulo">Publicando tu historia...</p>
        <p class="historia-publicar-sub">Esto solo tomará un momento</p>
      `;
    };

    const pintarExito = () => {
      contenido.innerHTML = `
        <div class="historia-publicar-icono historia-publicar-exito">✓</div>
        <p class="historia-publicar-titulo">¡Historia publicada!</p>
        <p class="historia-publicar-sub">Ya está visible para tus seguidores</p>
      `;
    };

    const pintarLimite = () => {
      contenido.innerHTML = `
        <div class="historia-publicar-icono historia-publicar-limite">⏳</div>
        <p class="historia-publicar-titulo">Límite diario alcanzado</p>
        <p class="historia-publicar-sub">Ya publicaste ${MAX_HISTORIAS_DIA} historias en las últimas 24 horas. Intenta de nuevo más tarde.</p>
        <button type="button" class="historia-publicar-btn" data-accion="cerrar">Entendido</button>
      `;
      contenido.querySelector('[data-accion="cerrar"]')?.addEventListener('click', () => cerrar(false));
    };

    const pintarError = (mensaje) => {
      contenido.innerHTML = `
        <div class="historia-publicar-icono historia-publicar-error">✕</div>
        <p class="historia-publicar-titulo">No se pudo publicar</p>
        <p class="historia-publicar-sub">${_escapeHtml(mensaje)}</p>
        <button type="button" class="historia-publicar-btn" data-accion="reintentar">Reintentar</button>
        <button type="button" class="historia-publicar-btn-sec" data-accion="cerrar">Cancelar</button>
      `;
      contenido.querySelector('[data-accion="reintentar"]')?.addEventListener('click', () => _ejecutar());
      contenido.querySelector('[data-accion="cerrar"]')?.addEventListener('click', () => cerrar(false));
    };

    async function _ejecutar() {
      pintarSubiendo();
      try {
        await publicarFn();
        pintarExito();
        setTimeout(() => cerrar(true), 800);
      } catch (e) {
        if (e?.codigo === 'limite') {
          pintarLimite();
        } else {
          pintarError(String(e?.message ?? e).replace(/^Exception:\s*/, ''));
        }
      }
    }

    _ejecutar();
  });
}

