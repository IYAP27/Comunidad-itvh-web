// ═════════════════════════════════════════════════════════════════
// mencion-autocomplete.js — traducción de mencion_autocomplete.dart
//
// Ubicación sugerida: js/core/mencion-autocomplete.js
//
// Lógica compartida de búsqueda de perfiles. La usa el selector de
// "Etiquetar personas" de CrearPublicacion (con incluirNombreYCarrera
// en true) y, en el futuro, el autocompletado de @menciones en
// comentarios (con el valor por defecto, incluirNombreYCarrera=false).
// ═════════════════════════════════════════════════════════════════

import { supabase } from './supabase-client.js';

/**
 * Busca perfiles que coincidan con `query` (case-insensitive).
 *
 * Por defecto (@menciones en comentarios) busca solo por PREFIJO de
 * nombre_usuario y devuelve hasta 5 resultados.
 *
 * Con `incluirNombreYCarrera: true` (usado por "Etiquetar personas")
 * también busca coincidencias parciales en `nombre` y `carrera`, y
 * devuelve hasta 8 resultados — así se puede etiquetar buscando
 * "Isaac" o "ISC" y no solo el @usuario exacto.
 *
 * `query` vacío devuelve [] sin consultar la base de datos.
 */
export async function buscarPerfilesMencion(query, { incluirNombreYCarrera = false } = {}) {
  const texto = (query ?? '').trim();
  if (!texto) return [];

  try {
    const base = supabase
      .from('perfiles')
      .select('id, nombre, nombre_usuario, cdn_foto_perfil, carrera');

    const { data, error } = incluirNombreYCarrera
      ? await base
          .or(`nombre_usuario.ilike.${texto}%,nombre.ilike.%${texto}%,carrera.ilike.%${texto}%`)
          .limit(8)
      : await base.ilike('nombre_usuario', `${texto}%`).limit(5);

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('mencion-autocomplete.js – buscarPerfilesMencion:', e);
    return [];
  }
}

/**
 * Devuelve el fragmento de texto tras el último "@" activo antes del
 * cursor (sin espacios de por medio), o null si el cursor no está
 * dentro de una mención en construcción.
 */
export function detectarQueryMencion(texto, cursorPos) {
  if (cursorPos <= 0 || cursorPos > texto.length) return null;
  const antes = texto.slice(0, cursorPos);
  const idxArroba = antes.lastIndexOf('@');
  if (idxArroba === -1) return null;
  const fragmento = antes.slice(idxArroba + 1);
  if (/[\s\n]/.test(fragmento)) return null;
  return fragmento;
}

/** Índice donde empieza el "@" de la mención activa. */
export function indiceArrobaActiva(texto, cursorPos) {
  if (cursorPos <= 0 || cursorPos > texto.length) return null;
  const antes = texto.slice(0, cursorPos);
  const idxArroba = antes.lastIndexOf('@');
  if (idxArroba === -1) return null;
  const fragmento = antes.slice(idxArroba + 1);
  if (/[\s\n]/.test(fragmento)) return null;
  return idxArroba;
}

/**
 * Reemplaza la mención en construcción por "@nombre_usuario " y
 * devuelve { texto, cursorPos } con el cursor listo tras el espacio.
 */
export function aplicarMencionSeleccionada({ texto, inicioArroba, cursorPos, nombreUsuario }) {
  const antes = texto.slice(0, inicioArroba);
  const despues = texto.slice(cursorPos);
  const insertado = `@${nombreUsuario} `;
  const nuevoTexto = `${antes}${insertado}${despues}`;
  return { texto: nuevoTexto, cursorPos: (antes + insertado).length };
}