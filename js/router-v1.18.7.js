// ═════════════════════════════════════════════════════════════════
// router.js
//
// Router simple basado en hash (#/ruta), sin dependencias externas.
// Equivalente web de las `routes` nombradas de MaterialApp en
// main.dart + el comportamiento de AuthGate.
//
// Reglas de navegación:
//   • authState === 'cargando'       → pantalla de carga
//   • authState === 'bloqueado'      → pantalla de cuenta bloqueada
//   • authState === 'no-autenticado' → login / registro / recuperar
//   • authState === 'autenticado'    → feed (o la ruta protegida
//                                        que el usuario pidió)
//
// Caso especial: cuando Supabase detecta el evento PASSWORD_RECOVERY
// (usuario abrió el link del correo), se fuerza la pantalla de
// "nueva contraseña" sin importar el hash actual — mismo criterio
// que el deep link comunidaditvh://login-callback en Flutter.
// ═════════════════════════════════════════════════════════════════

import { supabase } from './core/supabase-client.js';
import { authState, motivoBloqueo } from './core/auth.js';
import * as Login from './auth/login.js';
import * as Registro from './auth/registro.js';
import * as Recuperar from './auth/recuperar-password.js';

const app = document.getElementById('app');

/// Rutas públicas (no requieren sesión) y su función de render.
const RUTAS_PUBLICAS = {
  '/login':             Login.render,
  '/registro':          Registro.render,
  '/recuperar-password': Recuperar.renderSolicitar,
};

/// true mientras estemos en el flujo forzado de nueva contraseña
/// (link de recuperación abierto) — tiene prioridad sobre el hash.
let _enFlujoRecuperacion = false;

/// Referencia al módulo del shell activo — permite llamar destruir()
/// al salir (cierre de sesión) para cancelar el canal de Realtime
/// de notificaciones y evitar fugas de memoria.
let _shellModulo = null;

/// Import del shell principal (AppBar + TabBar + Drawer). shell.js
/// ya maneja internamente sus propios placeholders para las pestañas
/// que aún no existen (Fases 1-6), así que aquí no hace falta
/// try/catch de contenido — solo por si el archivo en sí no existe.
async function _renderShell(contenedor) {
  try {
    const mod = await import('./features/shell/shell-v1.18.7.js');
    _shellModulo = mod;
    await mod.render(contenedor);
  } catch (e) {
    console.error('router.js – error cargando shell:', e);
    contenedor.innerHTML = `
      <div class="pantalla-placeholder">
        <h2>Sesión iniciada ✅</h2>
        <p>No se pudo cargar la aplicación principal.</p>
      </div>
    `;
  }
}

function _renderCargando() {
  app.innerHTML = `
    <div class="pantalla-carga">
      <div class="spinner-grande"></div>
    </div>
  `;
}

function _renderBloqueado() {
  const estado = motivoBloqueo.value;
  const esSuspendido = estado === 'suspendido';
  app.innerHTML = `
    <div class="pantalla-bloqueo">
      <div class="bloqueo-icono ${esSuspendido ? 'ambar' : 'rojo'}">
        <span>${esSuspendido ? '🔒' : '⛔'}</span>
      </div>
      <h1>${esSuspendido ? 'Cuenta suspendida' : 'Cuenta eliminada'}</h1>
      <p>${
        esSuspendido
          ? 'Tu cuenta ha sido suspendida temporalmente por violar las normas de la comunidad. Si crees que es un error, contacta a un administrador.'
          : 'Tu cuenta ha sido eliminada permanentemente de la plataforma por violar gravemente las normas de la comunidad. No es posible recuperarla.'
      }</p>
      <button type="button" id="bloqueo-ok" class="btn-secundario">Entendido</button>
    </div>
  `;
  app.querySelector('#bloqueo-ok').addEventListener('click', () => {
    window.location.hash = '#/login';
  });
}

/// Punto central de decisión — se llama cada vez que cambia el hash
/// o cada vez que cambia authState.
function _resolverRuta() {
  // Flujo de recuperación tiene prioridad absoluta sobre todo lo demás.
  if (_enFlujoRecuperacion) {
    Recuperar.renderNuevaContrasena(app);
    return;
  }

  const estado = authState.value;

  if (estado === 'cargando') {
    _renderCargando();
    return;
  }

  if (estado === 'bloqueado') {
    _renderBloqueado();
    return;
  }

  const ruta = window.location.hash.replace('#', '') || '/login';

  if (estado === 'no-autenticado') {
    // Sesión recién cerrada mientras el shell estaba activo: cancela
    // su canal de Realtime antes de reemplazarlo por la pantalla pública.
    if (_shellModulo) {
      _shellModulo.destruir?.();
      _shellModulo = null;
    }
    const render = RUTAS_PUBLICAS[ruta] ?? Login.render;
    render(app);
    return;
  }

  if (estado === 'autenticado') {
    // Si el usuario autenticado cae en una ruta pública (ej. login
    // tras refrescar), lo mandamos al shell en vez de mostrarle el form.
    if (RUTAS_PUBLICAS[ruta] || ruta === '/login') {
      window.location.hash = '#/home';
      return;
    }
    _renderShell(app);
  }
}

/// Detecta el evento PASSWORD_RECOVERY de Supabase (llega cuando el
/// usuario abre el link del correo) y activa el flujo forzado.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    _enFlujoRecuperacion = true;
    _resolverRuta();
  }
});

// Reacciona a cambios de sesión/estado de cuenta.
authState.listen(_resolverRuta);

// Reacciona a cambios de hash (navegación por enlaces internos).
window.addEventListener('hashchange', _resolverRuta);

// Primera resolución al cargar la app.
_resolverRuta();