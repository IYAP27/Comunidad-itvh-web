// ═════════════════════════════════════════════════════════════════
// logica.js — traducción de crear_publicacion_logica.dart
//
// Ubicación sugerida: js/features/social/CrearPublicacion/logica.js
//
// Diferencias respecto al Dart original:
//   • Sin galería paginada/scrubber: no hay equivalente web al
//     carrete nativo. El paso 0 usa <input type="file"> + dropzone
//     (ver index.js). Se elimina toda la lógica de permisos,
//     paginación, agrupación por fecha y scrubber.
//   • Sin progreso real de subida: storage-r2.js sube por fetch PUT,
//     que no reporta progreso — _estadoPublicacion solo cambia de
//     texto, sin porcentaje.
//   • Límites de selección, etiquetas, sugerencias, publicar (con
//     rollback) y límite diario de 3 publicaciones: traducción
//     directa del Dart.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../../core/supabase-client.js';
import { usuarioActual } from '../../../core/auth.js';
import { subirMediaPublicacion } from '../../../core/storage-r2.js';
import { buscarPerfilesMencion } from '../../../core/mencion-autocomplete.js';
import { crearMediaItem, liberarMediaItem } from './modelos.js';

export const MAX_ETIQUETADOS = 10;
export const MAX_SUGERIDOS = 10;
export const MAX_MEDIA = 5; // 4 imágenes + 1 video máximo
const TOTAL_PASOS = 3;

/** Estado mutable del wizard. index.js lee/pinta a partir de esto. */
export const state = {
  paso: 0, // 0 = seleccionar, 1 = etiquetar, 2 = publicar
  media: [],
  etiquetados: [],
  publicando: false,
  estadoPublicacion: '',
  nombreUsuario: null,
  fotoPerfilUrl: null,
  usuariosSugeridos: [],
  cargandoSugeridos: false,
};

function uid() {
  return usuarioActual()?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────────────

/** Carga nombre y foto del usuario actual para el composer. Falla en silencio. */
export async function cargarPerfil() {
  const id = uid();
  if (!id) return;
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre_usuario, cdn_foto_perfil')
      .eq('id', id)
      .single();
    if (error) throw error;
    state.nombreUsuario = data?.nombre_usuario ?? 'Tú';
    state.fotoPerfilUrl = data?.cdn_foto_perfil ?? null;
  } catch (e) {
    console.error('CrearPublicacion/logica – perfil:', e);
  }
}

// ─────────────────────────────────────────────────────────────────
// SELECCIÓN DE ARCHIVOS (input / dropzone / cámara)
// ─────────────────────────────────────────────────────────────────

/**
 * Agrega los archivos de un FileList a la selección, aplicando los
 * mismos límites que el Dart original (máx. 1 video, máx. 4
 * imágenes, máx. 5 en total). `onError(msg)` se llama por cada
 * archivo rechazado.
 */
export function agregarArchivos(fileList, onError) {
  for (const file of Array.from(fileList)) {
    const esVideo = file.type.startsWith('video/');
    const esImagen = file.type.startsWith('image/');
    if (!esVideo && !esImagen) {
      onError?.(`"${file.name}" no es una imagen ni un video`);
      continue;
    }

    if (state.media.length >= MAX_MEDIA) {
      onError?.('Máximo 4 imágenes y 1 video por publicación');
      break;
    }
    if (esVideo && state.media.some((m) => m.tipo === 'video')) {
      onError?.('Solo puedes agregar 1 video por publicación');
      continue;
    }
    if (esImagen && state.media.filter((m) => m.tipo === 'imagen').length >= 4) {
      onError?.('Máximo 4 imágenes por publicación');
      continue;
    }

    state.media.push(crearMediaItem(file));
  }
}

/** Quita un archivo ya seleccionado y libera su blob: URL. */
export function quitarMedia(id) {
  const idx = state.media.findIndex((m) => m.id === id);
  if (idx === -1) return;
  liberarMediaItem(state.media[idx]);
  state.media.splice(idx, 1);
}

// ─────────────────────────────────────────────────────────────────
// ETIQUETAS DE PERSONAS
// ─────────────────────────────────────────────────────────────────

/** Reemplaza la lista de etiquetados (llamado desde el paso 1). */
export function actualizarEtiquetados(nuevos) {
  state.etiquetados = [...nuevos];
}

/** Quita a alguien directo desde el chip del paso 2. */
export function quitarEtiquetado(usuarioId) {
  state.etiquetados = state.etiquetados.filter((u) => u.id !== usuarioId);
}

/** Búsqueda del paso 1 (por nombre, @usuario o carrera). */
export async function buscarParaEtiquetar(query) {
  const id = uid();
  const resultados = await buscarPerfilesMencion(query, { incluirNombreYCarrera: true });
  return resultados.filter((p) => p.id !== id);
}

/**
 * Sugerencias mostradas mientras el buscador del paso 1 está vacío:
 * personas ya etiquetadas antes por este usuario, completado con
 * perfiles al azar si no alcanzan. Falla en silencio.
 */
export async function cargarUsuariosSugeridos() {
  const id = uid();
  if (!id) return;

  state.cargandoSugeridos = true;
  try {
    const camposPerfil = 'id, nombre, nombre_usuario, cdn_foto_perfil, carrera';

    const { data: previas, error: errPrevias } = await supabase
      .from('publicacion_etiquetas')
      .select('usuario_id')
      .eq('etiquetado_por', id)
      .limit(50);
    if (errPrevias) throw errPrevias;

    const vistos = new Set([id]);
    const idsFrecuentes = [];
    for (const fila of previas ?? []) {
      if (fila.usuario_id && !vistos.has(fila.usuario_id)) {
        vistos.add(fila.usuario_id);
        idsFrecuentes.push(fila.usuario_id);
      }
    }

    let sugeridos = [];
    if (idsFrecuentes.length > 0) {
      const { data: perfiles, error: errPerfiles } = await supabase
        .from('perfiles')
        .select(camposPerfil)
        .in('id', idsFrecuentes.slice(0, MAX_SUGERIDOS));
      if (errPerfiles) throw errPerfiles;
      sugeridos = perfiles ?? [];
    }

    if (sugeridos.length < MAX_SUGERIDOS) {
      const faltan = MAX_SUGERIDOS - sugeridos.length;
      const excluidos = new Set([...vistos, ...sugeridos.map((u) => u.id)]);

      const { data: candidatos, error: errCand } = await supabase
        .from('perfiles')
        .select(camposPerfil)
        .limit(faltan + excluidos.size + 20);
      if (errCand) throw errCand;

      const aleatorios = (candidatos ?? [])
        .filter((u) => !excluidos.has(u.id))
        .sort(() => Math.random() - 0.5);

      sugeridos = [...sugeridos, ...aleatorios.slice(0, faltan)];
    }

    state.usuariosSugeridos = sugeridos;
  } catch (e) {
    console.error('CrearPublicacion/logica – sugeridos:', e);
  } finally {
    state.cargandoSugeridos = false;
  }
}

// ─────────────────────────────────────────────────────────────────
// NAVEGACIÓN DEL WIZARD
// ─────────────────────────────────────────────────────────────────

export function irPaso(p) {
  state.paso = Math.min(Math.max(p, 0), TOTAL_PASOS - 1);
}
export function pasoSiguiente() {
  irPaso(state.paso + 1);
}
export function pasoAnterior() {
  irPaso(state.paso - 1);
}

// ─────────────────────────────────────────────────────────────────
// PUBLICAR
// ─────────────────────────────────────────────────────────────────

/**
 * Valida el límite diario y el contenido, crea el registro, inserta
 * el lote de etiquetas, sube cada archivo a R2 y hace rollback si
 * algo falla. `onSnack(msg)` recibe los mensajes de error para que
 * index.js los muestre como toast.
 */
export async function publicar(textoRaw, onSnack) {
  if (state.publicando) return { ok: false };
  const id = uid();
  if (!id) return { ok: false };

  // ── Límite: 3 publicaciones por día ──────────────────────────
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  try {
    const { data: conteoHoy, error: errConteo } = await supabase
      .from('publicaciones')
      .select('id')
      .eq('autor_id', id)
      .gte('creado_en', inicioDia.toISOString());
    if (errConteo) throw errConteo;
    if ((conteoHoy ?? []).length >= 3) {
      onSnack?.('Has alcanzado el límite de 3 publicaciones por día');
      return { ok: false };
    }
  } catch (e) {
    console.error('CrearPublicacion/logica – límite diario:', e);
    onSnack?.('No se pudo verificar tu límite diario. Intenta de nuevo.');
    return { ok: false };
  }

  const texto = (textoRaw ?? '').trim();
  if (!texto && state.media.length === 0) {
    onSnack?.('Escribe algo o adjunta un archivo');
    return { ok: false };
  }

  state.publicando = true;
  state.estadoPublicacion = 'Preparando publicación...';

  let pubId = null;
  try {
    const soloVideos = state.media.length > 0 && state.media.every((m) => m.tipo === 'video');
    const tipo = soloVideos ? 'reel' : 'post';

    // ── 1. Crea la publicación ────────────────────────────────
    const { data: pubRes, error: errInsert } = await supabase
      .from('publicaciones')
      .insert({ autor_id: id, contenido: texto, tipo })
      .select('id')
      .single();
    if (errInsert) throw errInsert;
    pubId = pubRes.id;

    // ── 2. Etiquetas — un solo insert con todo el lote ─────────
    if (state.etiquetados.length > 0) {
      const filasEtiquetas = state.etiquetados.map((u) => ({
        publicacion_id: pubId,
        usuario_id: u.id,
        etiquetado_por: id,
      }));
      const { error: errEtiquetas } = await supabase
        .from('publicacion_etiquetas')
        .insert(filasEtiquetas);
      if (errEtiquetas) throw errEtiquetas;
    }

    // ── 3. Sube cada archivo a R2 y registra en Supabase ───────
    for (let i = 0; i < state.media.length; i++) {
      const item = state.media[i];
      state.estadoPublicacion =
        item.tipo === 'video'
          ? 'Subiendo video...'
          : `Subiendo imagen ${i + 1}/${state.media.length}...`;

      const cdnUrl = await subirMediaPublicacion(item.file, pubId, id, i);

      const { error: errMedio } = await supabase.from('publicacion_medios').insert({
        publicacion_id: pubId,
        url: cdnUrl,
        cdn_url: cdnUrl,
        tipo_medio: item.tipo,
        orden: i,
      });
      if (errMedio) throw errMedio;
    }

    return { ok: true, pubId };
  } catch (e) {
    console.error('CrearPublicacion/logica – publicar:', e);
    if (pubId) {
      try {
        await supabase.from('publicaciones').delete().eq('id', pubId);
      } catch (_) {
        /* rollback best-effort */
      }
    }
    onSnack?.('No se pudo publicar. Intenta de nuevo.');
    return { ok: false };
  } finally {
    state.publicando = false;
    state.estadoPublicacion = '';
  }
}

/** Libera blobs y resetea el estado — llamar siempre al cerrar el wizard. */
export function limpiar() {
  state.media.forEach(liberarMediaItem);
  state.media = [];
  state.etiquetados = [];
  state.paso = 0;
  state.publicando = false;
  state.estadoPublicacion = '';
  state.usuariosSugeridos = [];
  state.cargandoSugeridos = false;
}