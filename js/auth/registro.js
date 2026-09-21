// ═════════════════════════════════════════════════════════════════
// registro.js — traducción de crear_cuenta.dart
//
// Solo permite registro con correo institucional del ITVH
// (formato: l########@villahermosa.tecnm.mx). Verifica unicidad
// del nombre de usuario antes de crear la cuenta, y hace upsert
// del perfil tras el signUp — mismo flujo que Flutter.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../core/supabase-client.js';

const REGEX_CORREO_TEC = /^l[0-9]{8}@villahermosa\.tecnm\.mx$/;

const CARRERAS = [
  'Ingeniería Ambiental',
  'Ingeniería Bioquímica',
  'Ingeniería Civil',
  'Ingeniería en Ciencia de Datos',
  'Ingeniería en Gestión Empresarial',
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería en Tecnologías de la Información y Comunicaciones',
  'Ingeniería Industrial',
  'Ingeniería Informática',
  'Ingeniería Petrolera',
  'Ingeniería Química',
  'Licenciatura en Administración',
];

export function render(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-auth">
      <div class="tarjeta-auth glass">
        <img src="assets/icons/splash_foreground.png" alt="Comunidad ITVH" class="logo-auth" />
        <h1 class="titulo-auth">Crear cuenta</h1>
        <p class="subtitulo-auth">Completa tu información para registrarte</p>

        <form id="form-registro" novalidate>
          <p class="seccion-label">Datos personales</p>

          <label class="campo-auth">
            <span>Nombre completo</span>
            <input type="text" id="reg-nombre" required autocomplete="name" />
          </label>

          <label class="campo-auth">
            <span>Nombre de usuario</span>
            <input type="text" id="reg-usuario" required autocomplete="username" />
          </label>

          <label class="campo-auth">
            <span>Número de control (opcional)</span>
            <input type="text" id="reg-control" inputmode="numeric" />
          </label>

          <p class="seccion-label">Información académica</p>

          <label class="campo-auth">
            <span>Carrera</span>
            <select id="reg-carrera" required>
              <option value="" disabled selected>Selecciona tu carrera</option>
              ${CARRERAS.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </label>

          <label class="campo-auth">
            <span>Semestre actual</span>
            <select id="reg-semestre" required>
              <option value="" disabled selected>Selecciona tu semestre</option>
              ${Array.from({ length: 12 }, (_, i) => i + 1)
                .map((n) => `<option value="${n}">${n}° Semestre</option>`)
                .join('')}
            </select>
          </label>

          <p class="seccion-label">Datos de acceso</p>

          <label class="campo-auth">
            <span>Correo institucional</span>
            <input type="email" id="reg-email" placeholder="l12345678@villahermosa.tecnm.mx" required autocomplete="email" />
          </label>

          <label class="campo-auth">
            <span>Contraseña</span>
            <input type="password" id="reg-password" placeholder="Mínimo 8 caracteres" required autocomplete="new-password" minlength="8" />
          </label>

          <p id="registro-error" class="error-auth" hidden></p>

          <button type="submit" id="registro-submit" class="btn-primario">
            <span class="btn-texto">Crear cuenta</span>
            <span class="btn-spinner" hidden></span>
          </button>
        </form>

        <div class="acciones-auth">
          <a href="#/login">¿Ya tienes cuenta? Inicia sesión</a>
        </div>
      </div>
    </div>
  `;

  const form     = contenedor.querySelector('#form-registro');
  const btn      = contenedor.querySelector('#registro-submit');
  const btnTexto = contenedor.querySelector('.btn-texto');
  const btnSpin  = contenedor.querySelector('.btn-spinner');
  const errorEl  = contenedor.querySelector('#registro-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const nombre   = contenedor.querySelector('#reg-nombre').value.trim();
    const usuario  = contenedor.querySelector('#reg-usuario').value.trim();
    const control  = contenedor.querySelector('#reg-control').value.trim();
    const carrera  = contenedor.querySelector('#reg-carrera').value;
    const semestre = Number(contenedor.querySelector('#reg-semestre').value);
    const email    = contenedor.querySelector('#reg-email').value.trim().toLowerCase();
    const password = contenedor.querySelector('#reg-password').value;

    // ── Validaciones locales, mismo orden que Flutter ──
    if (!nombre)  return _mostrarError('Ingresa tu nombre completo.');
    if (!usuario) return _mostrarError('Ingresa un nombre de usuario.');
    if (usuario.includes(' ')) return _mostrarError('El usuario no puede tener espacios.');
    if (!email)   return _mostrarError('Ingresa tu correo institucional.');
    if (!REGEX_CORREO_TEC.test(email)) {
      return _mostrarError('Acceso denegado. Introduce un correo institucional válido del ITVH.');
    }
    if (password.length < 8) return _mostrarError('La contraseña debe tener al menos 8 caracteres.');
    if (!carrera)  return _mostrarError('Selecciona tu carrera.');
    if (!semestre) return _mostrarError('Selecciona tu semestre.');

    _setCargando(true);

    try {
      // Verificar unicidad del nombre de usuario (case-insensitive).
      const { data: existente } = await supabase
        .from('perfiles')
        .select('id')
        .ilike('nombre_usuario', usuario)
        .maybeSingle();

      if (existente) {
        _mostrarError('Ese nombre de usuario ya está en uso.');
        _setCargando(false);
        return;
      }

      // Crear usuario en Supabase Auth.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      const uid = signUpData.user?.id;
      if (!uid) throw new Error('No se pudo crear el usuario.');

      // Upsert del perfil (por si el trigger ya creó una fila vacía).
      const { error: perfilError } = await supabase.from('perfiles').upsert({
        id: uid,
        nombre,
        nombre_usuario: usuario,
        email,
        carrera,
        semestre,
        numero_control: control || null,
      });
      if (perfilError) throw perfilError;

      // Registro exitoso — auth.js detecta la sesión y navega al feed.
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
}

function _traducirError(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('database error') || lower.includes('unexpected_failure') || lower.includes('violates check constraint')) {
    return 'Tu matrícula no cumple con los requisitos del Tec (L + 8 números) o ya está registrada.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo institucional.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (lower.includes('invalid email') || lower.includes('bad request')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (lower.includes('signup is disabled')) {
    return 'El registro está deshabilitado temporalmente.';
  }
  return msg || 'Error al crear la cuenta. Intenta de nuevo.';
}