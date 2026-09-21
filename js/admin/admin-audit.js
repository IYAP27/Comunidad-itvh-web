import { supabase } from '../core/supabase-client.js';
import { usuarioActual } from '../core/auth.js';

const TABLA = 'auditoria_admin';
let _disponible = null;

function _esTablaNoDisponible(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '42P01' || code === '42501' || /does not exist|schema cache|permission denied/i.test(msg);
}

export async function auditoriaDisponible({ refrescar = false } = {}) {
  if (!refrescar && _disponible !== null) return _disponible;
  try {
    const { error } = await supabase.from(TABLA).select('id', { count: 'exact', head: true });
    if (error) throw error;
    _disponible = true;
  } catch (error) {
    _disponible = false;
    if (!_esTablaNoDisponible(error)) console.warn('admin-audit – detectar tabla:', error);
  }
  return _disponible;
}

export async function registrarAuditoria({
  accion,
  objetivoTipo = null,
  objetivoId = null,
  motivo = null,
  metadata = null,
} = {}) {
  const uid = usuarioActual()?.id;
  if (!uid || !accion) return false;
  if (_disponible === false) return false;

  const payload = {
    admin_perfil_id: uid,
    accion: String(accion).slice(0, 80),
    objetivo_tipo: objetivoTipo ? String(objetivoTipo).slice(0, 60) : null,
    objetivo_id: objetivoId ? String(objetivoId).slice(0, 160) : null,
    motivo: motivo ? String(motivo).slice(0, 1000) : null,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  };

  try {
    const { error } = await supabase.from(TABLA).insert(payload);
    if (error) throw error;
    _disponible = true;
    return true;
  } catch (error) {
    if (_esTablaNoDisponible(error)) _disponible = false;
    console.warn('admin-audit – registrar:', error);
    return false;
  }
}

export async function listarAuditoria({ limite = 150 } = {}) {
  const { data, error } = await supabase
    .from(TABLA)
    .select('id,admin_perfil_id,admin_nivel,accion,objetivo_tipo,objetivo_id,motivo,metadata,creado_en')
    .order('creado_en', { ascending: false })
    .limit(Math.min(Math.max(Number(limite) || 150, 1), 500));
  if (error) throw error;
  return data || [];
}
