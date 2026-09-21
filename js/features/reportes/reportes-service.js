// ═════════════════════════════════════════════════════════════════
// reportes-service.js
// Capa unificada de reportes de Comunidad ITVH Web.
//
// Compatibilidad:
// - publicaciones sociales -> tabla existente `reportes` (igual que móvil)
// - marketplace / objetos perdidos / evaluaciones de maestros / perfiles
//   -> tabla genérica `reportes_contenido` incluida en la migración SQL.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';

export const MOTIVOS_REPORTE = [
  { key: 'spam', label: 'Spam o publicidad no deseada', icon: '📨' },
  { key: 'acoso_bullying', label: 'Acoso o bullying', icon: '😠' },
  { key: 'contenido_inapropiado', label: 'Contenido inapropiado u ofensivo', icon: '🚫' },
  { key: 'desinformacion', label: 'Desinformación o noticias falsas', icon: '⚠️' },
  { key: 'violencia', label: 'Violencia o contenido peligroso', icon: '🛑' },
  { key: 'otro', label: 'Otro motivo', icon: '•••' },
];

export async function reportarPublicacionSocial({ publicacionId, autorId, motivo, detalle = null }) {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('Debes iniciar sesión para reportar.');
  if (!publicacionId) throw new Error('Publicación inválida.');
  if (uid === autorId) throw new Error('No puedes reportar tu propia publicación.');

  const { error } = await supabase.from('reportes').insert({
    publicacion_id: publicacionId,
    reportado_por: uid,
    autor_id: autorId || null,
    motivo,
  });
  if (error) throw _normalizarError(error);

  return { ok: true, tipo: 'publicacion' };
}

export async function reportarContenido({ tipo, contenidoId, autorId = null, motivo, detalle = null, metadata = null }) {
  const uid = usuarioActual()?.id;
  if (!uid) throw new Error('Debes iniciar sesión para reportar.');
  if (!tipo || !contenidoId) throw new Error('Contenido inválido.');
  if (autorId && uid === autorId) throw new Error('No puedes reportar tu propio contenido.');

  const { error } = await supabase.from('reportes_contenido').insert({
    tipo_contenido: tipo,
    contenido_id: String(contenidoId),
    reportado_por: uid,
    autor_id: autorId || null,
    motivo,
    detalle: detalle?.trim() || null,
    metadata: metadata || {},
  });
  if (error) {
    const normalizado = _normalizarError(error, true);
    if (String(error?.code || '') === '42P01' || /reportes_contenido/i.test(String(error?.message || ''))) {
      try { localStorage.setItem('reportes_globales_sql_ok', '0'); } catch {}
    }
    throw normalizado;
  }
  try { localStorage.setItem('reportes_globales_sql_ok', '1'); } catch {}

  return { ok: true, tipo };
}

function _normalizarError(error, generico = false) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  if (code === '23505' || /duplicate|unique/i.test(msg)) {
    return new Error('Ya reportaste este contenido. El equipo de moderación lo revisará.');
  }
  if (generico && (code === '42P01' || /reportes_contenido/i.test(msg) && /does not exist|schema cache/i.test(msg))) {
    return new Error('El sistema global de reportes necesita aplicar la migración de Supabase incluida en el proyecto.');
  }
  return new Error(msg || 'No se pudo enviar el reporte. Intenta de nuevo.');
}
