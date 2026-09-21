// ═════════════════════════════════════════════════════════════════
// ajustes-screen.js — adaptado de Aspirantes ITVH web
//
// Cambios respecto al original:
//   • Tabla `perfiles_aspirantes` → `perfiles`
//   • cerrarSesion() ahora viene de core/auth.js (mantiene authState
//     sincronizado con el resto de la app, en vez de llamar
//     supabase.auth.signOut() directo aquí)
//   • URLs legales apuntan al repo de Comunidad ITVH
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { cerrarSesion } from '../../core/auth.js';
import { abrirHistorialReacciones } from './historial-reacciones.js';
import { abrirHistorialComentarios } from './historial-comentarios.js';
import { obtenerPreferenciasNotificaciones, guardarPreferenciasNotificaciones, solicitarPermisoNotificaciones, permisoNotificaciones } from '../social/notificaciones-preferencias.js';

const URL_TERMINOS    = 'https://programix-navejl.github.io/Comunidad-ITVH-Cumplimiento-Legal/terminos.html';
const URL_PRIVACIDAD  = 'https://programix-navejl.github.io/Comunidad-ITVH-Cumplimiento-Legal/politica.html';
const URL_ESTANDARES  = 'https://programix-navejl.github.io/Comunidad-ITVH-Cumplimiento-Legal/estandares.html';

function abrirUrl(url) { window.open(url, '_blank'); }

export function renderAjustes(root, onVolver, onSesionCerrada) {
  const notifPrefs = obtenerPreferenciasNotificaciones();
  const permisoNotif = permisoNotificaciones();
  root.innerHTML = `
    <header class="appbar-simple"><button class="btn-volver">‹</button><h2>Ajustes</h2></header>

    <p class="section-label-ajustes">CUENTA</p>
    <div class="card-group">
      <button class="settings-tile" id="ajuste-password">🔒 Cambiar contraseña <span class="chevron">›</span></button>
    </div>

    <p class="section-label-ajustes">NOTIFICACIONES</p>
    <div class="card-group">
      <div class="settings-row settings-row-toggle">
        🔔 <div><p class="settings-row-title">Avisos dentro de la app</p><p class="settings-row-sub">Muestra un banner cuando llega una interacción</p></div>
        <label class="switch"><input type="checkbox" id="ajuste-notif-banners" ${notifPrefs.banners ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <hr class="divider-inset">
      <div class="settings-row settings-row-toggle">
        🖥️ <div><p class="settings-row-title">Notificaciones del navegador</p><p class="settings-row-sub" id="ajuste-notif-estado">${permisoNotif === 'granted' ? 'Permiso concedido' : permisoNotif === 'denied' ? 'Bloqueadas por el navegador' : permisoNotif === 'unsupported' ? 'No disponibles' : 'Requiere permiso del navegador'}</p></div>
        <label class="switch"><input type="checkbox" id="ajuste-notif-navegador" ${notifPrefs.navegador && permisoNotif === 'granted' ? 'checked' : ''} ${permisoNotif === 'unsupported' ? 'disabled' : ''}><span class="slider"></span></label>
      </div>
      <hr class="divider-inset">
      <button class="settings-row" id="ajuste-reacciones">
        ❤️ <div><p class="settings-row-title">Reacciones</p><p class="settings-row-sub">Publicaciones a las que reaccionaste</p></div><span class="chevron">›</span>
      </button>
      <hr class="divider-inset">
      <button class="settings-row" id="ajuste-comentarios">
        💬 <div><p class="settings-row-title">Comentarios</p><p class="settings-row-sub">Publicaciones en las que comentaste</p></div><span class="chevron">›</span>
      </button>
    </div>

    <p class="section-label-ajustes">LEGAL</p>
    <div class="card-group">
      <button class="settings-tile" id="ajuste-terminos">📄 Términos y condiciones <span class="chevron">›</span></button>
      <hr class="divider-inset">
      <button class="settings-tile" id="ajuste-privacidad">🛡️ Política de privacidad <span class="chevron">›</span></button>
      <hr class="divider-inset">
      <button class="settings-tile" id="ajuste-estandares">🛡️ Estándares de seguridad infantil <span class="chevron">›</span></button>
    </div>

    <p class="section-label-ajustes">SESIÓN</p>
    <div class="card-group">
      <button class="settings-tile" id="ajuste-cerrar-sesion">🚪 Cerrar sesión</button>
      <hr class="divider-inset">
      <button class="settings-tile destructivo" id="ajuste-eliminar-cuenta">🗑️ Eliminar cuenta</button>
    </div>

    <div class="pie-ajustes">
      <p>Comunidad ITVH</p>
      <p class="pie-sub">Programix NaveJL © 2026</p>
    </div>
  `;

  root.querySelector('.btn-volver').addEventListener('click', onVolver);
  root.querySelector('#ajuste-reacciones').addEventListener('click', () => abrirHistorialReacciones());
  root.querySelector('#ajuste-comentarios').addEventListener('click', () => abrirHistorialComentarios());
  root.querySelector('#ajuste-notif-banners')?.addEventListener('change', (e) => {
    guardarPreferenciasNotificaciones({ banners: e.currentTarget.checked });
  });
  root.querySelector('#ajuste-notif-navegador')?.addEventListener('change', async (e) => {
    const input = e.currentTarget;
    if (!input.checked) {
      guardarPreferenciasNotificaciones({ navegador: false });
      return;
    }
    const permiso = await solicitarPermisoNotificaciones();
    const ok = permiso === 'granted';
    input.checked = ok;
    guardarPreferenciasNotificaciones({ navegador: ok });
    const estado = root.querySelector('#ajuste-notif-estado');
    if (estado) estado.textContent = ok ? 'Permiso concedido' : permiso === 'denied' ? 'Bloqueadas por el navegador' : 'No se activaron';
  });
  root.querySelector('#ajuste-terminos').addEventListener('click', () => abrirUrl(URL_TERMINOS));
  root.querySelector('#ajuste-privacidad').addEventListener('click', () => abrirUrl(URL_PRIVACIDAD));
  root.querySelector('#ajuste-estandares').addEventListener('click', () => abrirUrl(URL_ESTANDARES));
  root.querySelector('#ajuste-password').addEventListener('click', () => abrirCambiarContrasena(root));
  root.querySelector('#ajuste-cerrar-sesion').addEventListener('click', () => confirmarCerrarSesion(onSesionCerrada));
  root.querySelector('#ajuste-eliminar-cuenta').addEventListener('click', () => abrirDialogoEliminarCuenta(onSesionCerrada));
}

async function confirmarCerrarSesion(onSesionCerrada) {
  if (!confirm('¿Estás seguro que deseas cerrar tu sesión?')) return;
  // cerrarSesion() de core/auth.js dispara authState → router.js
  // reacciona solo y navega a /login; no hace falta llamar
  // onSesionCerrada manualmente para la navegación, pero se deja
  // por si el drawer necesita limpiar su propio estado al cerrar.
  await cerrarSesion();
  onSesionCerrada?.();
}

function abrirCambiarContrasena(rootPadre) {
  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen';
  overlay.innerHTML = `
    <header class="appbar-simple">
      <button class="btn-volver">‹</button>
      <h2>Cambiar contraseña</h2>
      <button id="btn-guardar-pass" class="btn-accion-accent">Guardar</button>
    </header>
    <div class="card-group" style="margin-top:16px">
      <input type="password" id="nueva-pass" placeholder="Nueva contraseña" class="input-ajuste">
      <hr class="divider-inset">
      <input type="password" id="confirmar-pass" placeholder="Confirmar contraseña" class="input-ajuste">
    </div>
    <p class="hint-text">La nueva contraseña debe tener al menos 8 caracteres.</p>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.btn-volver').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#btn-guardar-pass').addEventListener('click', async () => {
    const nueva = overlay.querySelector('#nueva-pass').value;
    const confirmar = overlay.querySelector('#confirmar-pass').value;

    if (nueva.length < 8) { alert('Mínimo 8 caracteres'); return; }
    if (nueva !== confirmar) { alert('Las contraseñas no coinciden'); return; }

    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) { alert(error.message); return; }
    alert('Contraseña actualizada correctamente.');
    overlay.remove();
  });
}

function abrirDialogoEliminarCuenta(onSesionCerrada) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog-box">
      <h3>⚠️ Eliminar cuenta</h3>
      <p>Esta acción es permanente e irreversible. Se eliminarán tu perfil, publicaciones, historias y todos tus datos.</p>
      <p><strong>Escribe ELIMINAR para confirmar:</strong></p>
      <input id="input-confirmar-eliminar" placeholder="ELIMINAR" class="input-ajuste">
      <div class="dialog-acciones">
        <button id="btn-cancelar-eliminar">Cancelar</button>
        <button id="btn-confirmar-eliminar" disabled>Eliminar cuenta</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#input-confirmar-eliminar');
  const btnConfirmar = overlay.querySelector('#btn-confirmar-eliminar');

  input.addEventListener('input', () => {
    btnConfirmar.disabled = input.value.trim().toUpperCase() !== 'ELIMINAR';
  });
  overlay.querySelector('#btn-cancelar-eliminar').addEventListener('click', () => overlay.remove());

  btnConfirmar.addEventListener('click', async () => {
    btnConfirmar.disabled = true;
    const textoOriginal = btnConfirmar.textContent;
    btnConfirmar.textContent = 'Eliminando…';

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No hay una sesión válida para eliminar la cuenta.');

      // Importante: esta operación solo elimina el perfil y lo que la BD
      // tenga configurado con ON DELETE CASCADE. La limpieza física de R2
      // y el borrado del usuario de Supabase Auth requieren backend con
      // privilegios de servicio y NO deben hacerse desde el navegador.
      const { data: eliminado, error: deleteError } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (deleteError) throw deleteError;
      if (!eliminado?.id) {
        throw new Error('La base de datos no confirmó la eliminación del perfil.');
      }

      await cerrarSesion();
      overlay.remove();
      onSesionCerrada?.();
    } catch (e) {
      console.error('Error eliminando cuenta:', e);
      alert(`No se pudo eliminar la cuenta: ${e?.message || 'error desconocido'}`);
      btnConfirmar.textContent = textoOriginal;
      btnConfirmar.disabled = input.value.trim().toUpperCase() !== 'ELIMINAR';
    }
  });
}