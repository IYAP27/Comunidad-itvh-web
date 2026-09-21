// ═════════════════════════════════════════════════════════════════
// maestros-repository.js — traducción de maestros_repository.dart
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { maestroFromMap, evaluacionFromMap } from './maestro.js';

export const MaestrosRepository = {
  /// Trae los maestros (con promedio ya calculado por la vista
  /// maestros_con_promedio), opcionalmente filtrados por departamento.
  async obtenerMaestros({ departamento = null } = {}) {
    let query = supabase.from('maestros_con_promedio').select().order('apellido_pat', { ascending: true });
    if (departamento && departamento !== 'Todos') {
      query = query.eq('departamento', departamento);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(maestroFromMap);
  },

  /// Antes de dar de alta a un docente, checa que no exista ya uno con
  /// los mismos apellidos (evita duplicados si dos alumnos lo agregan
  /// casi al mismo tiempo).
  async maestroExiste({ apellidoPat, apellidoMat }) {
    const { data, error } = await supabase
      .from('maestros')
      .select('id')
      .ilike('apellido_pat', apellidoPat.trim())
      .ilike('apellido_mat', apellidoMat.trim())
      .maybeSingle();
    if (error) throw error;
    return data != null;
  },

  async crearMaestro(insertMap) {
    const { data, error } = await supabase.from('maestros').insert(insertMap).select().single();
    if (error) throw error;
    return maestroFromMap(data);
  },

  async actualizarMaestro({ id, nombre, apellidoPat, apellidoMat, titulo, departamento, materias, semestres }) {
    const { error } = await supabase
      .from('maestros')
      .update({
        nombre,
        apellido_pat: apellidoPat,
        apellido_mat: apellidoMat,
        titulo,
        departamento,
        materias,
        semestres,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async obtenerEvaluaciones(maestroId) {
    const { data, error } = await supabase
      .from('evaluaciones')
      .select()
      .eq('maestro_id', maestroId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(evaluacionFromMap);
  },

  /// Regla de negocio: un alumno solo puede evaluar una vez a cada docente.
  async yaEvaluo({ maestroId, usuarioId }) {
    const { data, error } = await supabase
      .from('evaluaciones')
      .select('id')
      .eq('maestro_id', maestroId)
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    if (error) throw error;
    return data != null;
  },

  async crearEvaluacion(insertMap) {
    const { error } = await supabase.from('evaluaciones').insert(insertMap);
    if (error) throw error;
  },

  async editarEvaluacion({ evaluacionId, estrellas, comentario }) {
    const { error } = await supabase
      .from('evaluaciones')
      .update({ estrellas, comentario })
      .eq('id', evaluacionId);
    if (error) throw error;
  },
};
