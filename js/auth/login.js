// ═════════════════════════════════════════════════════════════════
// login.js — traducción de iniciar_sesion.dart
//
// Permite iniciar sesión únicamente con correo institucional.
// La web no resuelve nombre_usuario → email en `perfiles`, evitando
// exponer correos a usuarios no autenticados. Verifica estado_cuenta de
// forma inmediata (no espera al listener de auth.js) para poder
// mostrar el bloqueo al instante, igual que en Flutter.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../core/supabase-client.js';

const REGEX_CORREO_TEC = /^l[0-9]{8}@villahermosa\.tecnm\.mx$/;

export function render(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-auth">
      <div class="tarjeta-auth glass">
        <img src="assets/icons/splash_foreground.png" alt="Comunidad ITVH" class="logo-auth" />

        <h1 class="titulo-auth">Bienvenido</h1>
        <p class="subtitulo-auth">Inicia sesión para continuar</p>

        <form id="form-login" novalidate>
          <label class="campo-auth">
            <span>Correo institucional</span>
            <input type="email" id="login-email" placeholder="l12345678@villahermosa.tecnm.mx" required autocomplete="email" inputmode="email" spellcheck="false" autocapitalize="none" />
          </label>

          <label class="campo-auth">
            <span>Contraseña</span>
            <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password" />
          </label>

          <p id="login-error" class="error-auth" hidden></p>

          <div class="acciones-inline">
            <a href="#/recuperar-password">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" id="login-submit" class="btn-primario">
            <span class="btn-texto">Iniciar sesión</span>
            <span class="btn-spinner" hidden></span>
          </button>
        </form>

        <div id="bloqueo-cuenta" class="bloqueo-cuenta" hidden></div>

        <div class="acciones-auth">
          <a href="#/registro">¿No tienes cuenta? Regístrate</a>
        </div>
      </div>
    </div>
  `;

  const form      = contenedor.querySelector('#form-login');
  const btn       = contenedor.querySelector('#login-submit');
  const btnTexto  = contenedor.querySelector('.btn-texto');
  const btnSpin   = contenedor.querySelector('.btn-spinner');
  const errorEl   = contenedor.querySelector('#login-error');
  const bloqueoEl = contenedor.querySelector('#bloqueo-cuenta');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    bloqueoEl.hidden = true;

    const email    = contenedor.querySelector('#login-email').value.trim().toLowerCase();
    const password = contenedor.querySelector('#login-password').value;

    if (!email || !password) {
      _mostrarError('Completa todos los campos.');
      return;
    }

    if (!REGEX_CORREO_TEC.test(email)) {
      _mostrarError('Ingresa tu correo institucional del ITVH.');
      return;
    }

    _setCargando(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;

      // Verificación inmediata de estado_cuenta — no esperar al
      // listener de auth.js, para mostrar el bloqueo sin demora.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles')
          .select('estado_cuenta')
          .eq('id', user.id)
          .single();

        if (perfilError || !perfil?.estado_cuenta) {
          await supabase.auth.signOut();
          throw new Error('No se pudo verificar el estado de la cuenta.');
        }

        const estado = perfil.estado_cuenta;
        if (estado === 'suspendido' || estado === 'expulsado') {
          await supabase.auth.signOut();
          _mostrarBloqueo(estado);
          _setCargando(false);
          return;
        }
      }

      // Login exitoso — auth.js detecta la sesión y router.js navega al feed.
    } catch (err) {
      _mostrarError(_traducirError(err?.message ?? ''));
      _setCargando(false);
    }
  });

  function _setCargando(cargando) {
    btn.disabled = cargando;
    btnTexto.hidden = cargando;
    btnSpin.hidden = !cargando;
  }

  function _mostrarError(mensaje) {
    errorEl.textContent = mensaje;
    errorEl.hidden = false;
  }

  function _mostrarBloqueo(estado) {
    const esSuspendido = estado === 'suspendido';
    bloqueoEl.innerHTML = `
      <div class="bloqueo-icono ${esSuspendido ? 'ambar' : 'rojo'}">
        <span>${esSuspendido ? '🔒' : '⛔'}</span>
      </div>
      <h3>${esSuspendido ? 'Cuenta suspendida' : 'Cuenta eliminada'}</h3>
      <p>${
        esSuspendido
          ? 'Tu cuenta ha sido suspendida temporalmente por violar las normas de la comunidad. Si crees que es un error, contacta a un administrador.'
          : 'Tu cuenta ha sido eliminada permanentemente de la plataforma por violar gravemente las normas de la comunidad. No es posible recuperarla.'
      }</p>
      <button type="button" id="bloqueo-entendido" class="btn-secundario">Entendido</button>
    `;
    bloqueoEl.hidden = false;
    bloqueoEl.querySelector('#bloqueo-entendido').addEventListener('click', () => {
      bloqueoEl.hidden = true;
    });
  }
}

function _traducirError(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión.';
  }
  if (lower.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento.';
  }
  return 'Error al iniciar sesión. Intenta de nuevo.';
}