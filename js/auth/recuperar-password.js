// ═════════════════════════════════════════════════════════════════
// recuperar-password.js — traducción de recuperar_contrasena.dart
//
// En Flutter, redirectTo apunta al deep link comunidaditvh://
// login-callback, capturado por app_links. En web no hay deep
// link nativo: Supabase redirige a una URL normal de tu dominio;
// el evento PASSWORD_RECOVERY llega vía onAuthStateChange y
// router.js decide mostrar renderNuevaContrasena en ese caso.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../core/supabase-client.js';

export function renderSolicitar(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-auth">
      <div class="tarjeta-auth glass" id="tarjeta-recuperar"></div>
    </div>
  `;
  _mostrarFormulario(contenedor.querySelector('#tarjeta-recuperar'));
}

function _mostrarFormulario(tarjeta) {
  tarjeta.innerHTML = `
    <img src="/assets/icons/splash_foreground.png" alt="Comunidad ITVH" class="logo-auth" />
    <h1 class="titulo-auth">¿Olvidaste tu contraseña?</h1>
    <p class="subtitulo-auth">Te enviaremos un enlace para restablecerla.</p>

    <form id="form-recuperar" novalidate>
      <label class="campo-auth">
        <span>Correo institucional</span>
        <input type="email" id="recuperar-email" required autocomplete="email" />
      </label>

      <p id="recuperar-error" class="error-auth" hidden></p>

      <button type="submit" id="recuperar-submit" class="btn-primario">
        <span class="btn-texto">Enviar enlace</span>
        <span class="btn-spinner" hidden></span>
      </button>
    </form>

    <div class="acciones-auth">
      <a href="#/login">Volver al inicio de sesión</a>
    </div>
  `;

  const form     = tarjeta.querySelector('#form-recuperar');
  const btn      = tarjeta.querySelector('#recuperar-submit');
  const btnTexto = tarjeta.querySelector('.btn-texto');
  const btnSpin  = tarjeta.querySelector('.btn-spinner');
  const errorEl  = tarjeta.querySelector('#recuperar-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = tarjeta.querySelector('#recuperar-email').value.trim();
    if (!/^[\w\-.]+@[\w\-.]+\.\w+$/.test(email)) {
      errorEl.textContent = 'El correo no tiene un formato válido.';
      errorEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btnTexto.hidden = true;
    btnSpin.hidden = false;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      if (error) throw error;

      _mostrarConfirmacion(tarjeta, email);
    } catch (err) {
      errorEl.textContent = _traducirError(err?.message ?? '');
      errorEl.hidden = false;
      btn.disabled = false;
      btnTexto.hidden = false;
      btnSpin.hidden = true;
    }
  });
}

function _mostrarConfirmacion(tarjeta, email) {
  tarjeta.innerHTML = `
    <div class="confirmacion-auth">
      <div class="icono-confirmacion">✉️</div>
      <h2>¡Correo enviado!</h2>
      <p>Revisa tu bandeja de entrada en<br><strong>${email}</strong><br><br>
         Toca el enlace del correo para establecer tu nueva contraseña.</p>
      <a href="#/login" class="btn-primario btn-enlace">Volver al inicio de sesión</a>
      <button type="button" id="reenviar" class="btn-texto-link">¿No llegó? Reenviar correo</button>
    </div>
  `;
  tarjeta.querySelector('#reenviar').addEventListener('click', () => _mostrarFormulario(tarjeta));
}

function _traducirError(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Demasiados intentos. Espera un momento.';
  }
  if (lower.includes('unable to validate email')) {
    return 'No encontramos una cuenta con ese correo.';
  }
  return 'No se pudo enviar el correo. Intenta de nuevo.';
}


// ─────────────────────────────────────────────────────────────────
// NUEVA CONTRASEÑA — mostrada cuando Supabase detecta el evento
// PASSWORD_RECOVERY tras abrir el link del correo.
// ─────────────────────────────────────────────────────────────────
export function renderNuevaContrasena(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-auth">
      <div class="tarjeta-auth glass" id="tarjeta-nueva-password"></div>
    </div>
  `;
  const tarjeta = contenedor.querySelector('#tarjeta-nueva-password');

  tarjeta.innerHTML = `
    <img src="/assets/icons/splash_foreground.png" alt="Comunidad ITVH" class="logo-auth" />
    <h1 class="titulo-auth">Nueva contraseña</h1>
    <p class="subtitulo-auth">Elige una contraseña segura de al menos 8 caracteres.</p>

    <form id="form-nueva-password" novalidate>
      <label class="campo-auth">
        <span>Nueva contraseña</span>
        <input type="password" id="nueva-password" required minlength="8" autocomplete="new-password" />
      </label>

      <label class="campo-auth">
        <span>Confirmar contraseña</span>
        <input type="password" id="nueva-password-confirm" required autocomplete="new-password" />
      </label>

      <p id="nueva-error" class="error-auth" hidden></p>

      <button type="submit" id="nueva-submit" class="btn-primario">
        <span class="btn-texto">Guardar contraseña</span>
        <span class="btn-spinner" hidden></span>
      </button>
    </form>
  `;

  const form     = tarjeta.querySelector('#form-nueva-password');
  const btn      = tarjeta.querySelector('#nueva-submit');
  const btnTexto = tarjeta.querySelector('.btn-texto');
  const btnSpin  = tarjeta.querySelector('.btn-spinner');
  const errorEl  = tarjeta.querySelector('#nueva-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const password = tarjeta.querySelector('#nueva-password').value;
    const confirm  = tarjeta.querySelector('#nueva-password-confirm').value;

    if (password.length < 8) {
      errorEl.textContent = 'Mínimo 8 caracteres.';
      errorEl.hidden = false;
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Las contraseñas no coinciden.';
      errorEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btnTexto.hidden = true;
    btnSpin.hidden = false;

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Cierra la sesión temporal del magic link para forzar login limpio,
      // igual que en Flutter.
      await supabase.auth.signOut();

      _mostrarExito(tarjeta);
    } catch (err) {
      errorEl.textContent = _traducirErrorNueva(err?.message ?? '');
      errorEl.hidden = false;
      btn.disabled = false;
      btnTexto.hidden = false;
      btnSpin.hidden = true;
    }
  });
}

function _mostrarExito(tarjeta) {
  tarjeta.innerHTML = `
    <div class="confirmacion-auth">
      <div class="icono-confirmacion verde">✔️</div>
      <h2>¡Contraseña actualizada!</h2>
      <p>Tu contraseña fue cambiada exitosamente.<br>Inicia sesión con tus nuevas credenciales.</p>
      <a href="#/login" class="btn-primario btn-enlace">Ir al inicio de sesión</a>
    </div>
  `;
}

function _traducirErrorNueva(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('same password')) return 'La nueva contraseña debe ser diferente a la anterior.';
  if (lower.includes('weak password'))  return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (lower.includes('session'))        return 'El enlace expiró. Solicita uno nuevo.';
  return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
}