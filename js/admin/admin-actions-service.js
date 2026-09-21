import { supabase } from '../core/supabase-client.js';

let _backendDisponible = null;

/**
 * Intenta ejecutar una acción administrativa en la Edge Function segura.
 * Retorna { usadoBackend, data, error }. Si la función aún no está desplegada,
 * usadoBackend=false para permitir el fallback compatible con la versión actual.
 */
export async function ejecutarAccionAdmin(accion, payload = {}) {
  if (_backendDisponible === false) return { usadoBackend: false, data: null, error: null };

  try {
    const { data, error } = await supabase.functions.invoke('admin-acciones', {
      body: { accion, payload },
    });

    if (error) {
      const status = error?.context?.status ?? error?.status;
      if (status === 404 || status === 405 || /not found|function/i.test(error.message || '')) {
        _backendDisponible = false;
        return { usadoBackend: false, data: null, error: null };
      }
      return { usadoBackend: true, data: null, error };
    }

    _backendDisponible = true;
    return { usadoBackend: true, data, error: null };
  } catch (error) {
    // Fallos de red no deben romper el panel antes del despliegue de la función.
    if (_backendDisponible !== true) {
      _backendDisponible = false;
      return { usadoBackend: false, data: null, error: null };
    }
    return { usadoBackend: true, data: null, error };
  }
}
