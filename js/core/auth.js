// ═════════════════════════════════════════════════════════════════
// auth.js
//
// Estado global de autenticación + verificación de estado de cuenta.
// Equivalente web de AuthGate + _AuthChecker en main.dart.
//
// Responsabilidades:
//   1. Escuchar supabase.auth.onAuthStateChange y mantener
//      `authState.value` actualizado ('cargando' | 'autenticado' |
//      'no-autenticado' | 'bloqueado').
//   2. Verificar `estado_cuenta` en la tabla `perfiles` tras cada
//      inicio de sesión (suspendido / expulsado / activo) — igual
//      que _AuthChecker en Flutter.
//   3. Exponer `sesionActual()` y `usuarioActual()` de conveniencia.
//
// Uso típico en cualquier módulo de features/:
//   import { authState, sesionActual } from '../../core/auth.js';
//
//   authState.listen((estado) => {
//     if (estado === 'autenticado') render();
//     if (estado === 'no-autenticado') location.hash = '#/login';
//   });
// ═════════════════════════════════════════════════════════════════

import { supabase } from './supabase-client.js';
import { Notifier } from './notifier.js';

/// Valores posibles: 'cargando' | 'autenticado' | 'no-autenticado' | 'bloqueado'
export const authState = new Notifier('cargando');

/// Cuando authState === 'bloqueado', aquí queda el motivo: 'suspendido' | 'expulsado'
export const motivoBloqueo = new Notifier(null);

let _sesion = null;

/// Devuelve la sesión activa de Supabase (o null si no hay).
export function sesionActual() {
  return _sesion;
}

/// Devuelve el usuario autenticado (o null si no hay sesión).
export function usuarioActual() {
  return _sesion?.user ?? null;
}


// ─────────────────────────────────────────────────────────────────
// VERIFICACIÓN DE ESTADO DE CUENTA
//
// Igual que _AuthChecker._verificarEstadoCuenta en main.dart: antes
// de dar acceso, confirma que la cuenta no esté suspendida/expulsada,
// incluso si hay una sesión local válida.
// ─────────────────────────────────────────────────────────────────
async function _verificarEstadoCuenta(sesion) {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('estado_cuenta')
      .eq('id', sesion.user.id)
      .single();

    if (error) throw error;

    const estado = data?.estado_cuenta;

    // El estado de la cuenta es una comprobación de seguridad. Si no puede
    // determinarse de forma explícita, no se concede acceso silenciosamente.
    if (!estado) throw new Error('No se pudo determinar el estado de la cuenta.');

    if (estado === 'suspendido' || estado === 'expulsado') {
      motivoBloqueo.value = estado;
      _sesion = null;
      authState.value = 'bloqueado';
      await supabase.auth.signOut();
      return;
    }

    motivoBloqueo.value = null;
    _sesion = sesion;
    authState.value = 'autenticado';
  } catch (e) {
    console.error('auth – verificar estado de cuenta:', e);
    motivoBloqueo.value = null;
    _sesion = null;
    authState.value = 'no-autenticado';

    // Fail-closed: ante un fallo de esta comprobación se invalida la sesión
    // web. No modifica el flujo ni el código de la aplicación móvil.
    try { await supabase.auth.signOut(); } catch {}
  }
}


// ─────────────────────────────────────────────────────────────────
// LISTENER PRINCIPAL — equivalente a AuthGate
// ─────────────────────────────────────────────────────────────────
supabase.auth.onAuthStateChange((event, sesion) => {
  if (sesion && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
    _verificarEstadoCuenta(sesion);
    return;
  }

  if (event === 'SIGNED_OUT') {
    _sesion = null;
    authState.value = 'no-autenticado';
    return;
  }

  if (!sesion) {
    authState.value = 'no-autenticado';
  }
});


// ─────────────────────────────────────────────────────────────────
// ACCIONES DE AUTENTICACIÓN
// (login.js, registro.js, recuperar-password.js llaman a estas)
// ─────────────────────────────────────────────────────────────────

export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function registrarse(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function recuperarContrasena(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Debe apuntar a una ruta real de tu dominio, donde el usuario
    // ingresará su nueva contraseña. Ajusta al dominio final.
    redirectTo: `${window.location.origin}/#/nueva-contrasena`,
  });
  if (error) throw error;
}

export async function establecerNuevaContrasena(nuevaContrasena) {
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
  if (error) throw error;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}