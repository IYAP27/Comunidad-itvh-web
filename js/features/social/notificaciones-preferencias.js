// Preferencias locales de notificaciones web.
// No modifica Supabase: solo controla la experiencia en este navegador.

const KEY = 'comunidad_itvh_notificaciones_web_v1';
const DEFAULTS = Object.freeze({
  banners: true,
  navegador: false,
  sonido: false,
});

export function obtenerPreferenciasNotificaciones() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

export function guardarPreferenciasNotificaciones(parcial = {}) {
  const next = { ...obtenerPreferenciasNotificaciones(), ...parcial };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('comunidad:notificaciones-preferencias', { detail: next }));
  return next;
}

export async function solicitarPermisoNotificaciones() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function permisoNotificaciones() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}
