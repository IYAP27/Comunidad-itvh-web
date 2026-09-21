// ═════════════════════════════════════════════════════════════════
// maestro.js — traducción de maestro_model.dart
//
// A diferencia del chat, aquí no hace falta Dexie/caché local: todo
// vive directo en Supabase (tabla `maestros`, vista
// `maestros_con_promedio`, tabla `evaluaciones`) y se lee/escribe al
// vuelo, igual que feed.js o marketplace-home.js.
// ═════════════════════════════════════════════════════════════════

/// Arma el objeto Maestro a partir de una fila de Supabase
/// (maestros_con_promedio). Equivalente a Maestro.fromMap().
export function maestroFromMap(map) {
  return {
    id: map.id,
    nombre: map.nombre,
    apellidoPat: map.apellido_pat,
    apellidoMat: map.apellido_mat,
    titulo: map.titulo || 'Profe',
    departamento: map.departamento ?? null,
    materias: map.materias || [],
    semestres: map.semestres || [],
    creadoPor: map.creado_por ?? null,
    createdAt: map.created_at,
    promedioEstrellas: Number(map.promedio_estrellas) || 0,
    totalEvaluaciones: Number(map.total_evaluaciones) || 0,
  };
}

/// "Ing. Clemente Silvan Emeterio" — igual que el getter nombreCompleto en Dart.
export function nombreCompleto(m) {
  return `${m.titulo} ${m.nombre} ${m.apellidoPat} ${m.apellidoMat}`;
}

/// Lo que se manda a Supabase al crear/editar (sin id/created_at, los
/// pone la base de datos). Equivalente a Maestro.toInsertMap().
export function maestroToInsertMap(m) {
  return {
    nombre: m.nombre,
    apellido_pat: m.apellidoPat,
    apellido_mat: m.apellidoMat,
    titulo: m.titulo,
    departamento: m.departamento,
    materias: m.materias,
    semestres: m.semestres,
  };
}

/// Equivalente a Evaluacion.fromMap().
export function evaluacionFromMap(map) {
  return {
    id: map.id,
    maestroId: map.maestro_id,
    usuarioId: map.usuario_id,
    estrellas: map.estrellas,
    comentario: map.comentario ?? null,
    createdAt: map.created_at,
  };
}
