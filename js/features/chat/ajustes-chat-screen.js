// ═════════════════════════════════════════════════════════════════
// ajustes-chat-screen.js
//
// Adaptación web de ConfiguracionPageHome.dart (JaguarChat móvil).
// • Chats archivados.
// • Cuenta de Google vinculada.
// • Backup/restauración en Google Drive / appDataFolder.
// • Formato de backup compatible con la app móvil (v2):
//   JSON -> gzip -> AES-256-CBC, clave derivada del UID de Supabase.
// • Cerrar sesión.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { cerrarSesion } from '../../core/auth.js';
import { ChatRepository } from './chat-repository.js';
import {
  cuentaGoogleGuardada,
  vincularGoogle,
  desvincularGoogle,
  respaldarEnGoogleDrive,
  restaurarDesdeGoogleDrive,
  mensajeErrorGoogle,
} from './chat-google-backup-service.js';

const BACKUP_FECHA_KEY = 'jaguarchat_backup_ultima_fecha';
const BACKUP_TAMANIO_KEY = 'jaguarchat_backup_tamanio_bytes';

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'ajustes-chat-screen-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
.jca-root{
  min-height:100%;
  padding:12px 16px 28px;
  box-sizing:border-box;
  color:var(--texto-alto, #fff);
}
.jca-section{ margin-top:4px; }
.jca-section + .jca-section{ margin-top:28px; }
.jca-section-label{
  margin:0 0 8px 4px;
  color:var(--texto-medio, #9e9e9e);
  font-size:11px;
  font-weight:700;
  letter-spacing:1.1px;
}
.jca-section-sub{
  display:block;
  margin-top:3px;
  color:var(--texto-bajo, #666);
  font-size:11px;
  font-weight:400;
  letter-spacing:0;
}
.jca-card{
  overflow:hidden;
  border:1px solid var(--div-oscuro, #2a2a2a);
  border-radius:16px;
  background:var(--bg-card-oscuro, #1a1a1a);
}
.jca-row{
  width:100%; min-height:54px;
  display:flex; align-items:center; gap:12px;
  padding:12px 16px;
  box-sizing:border-box;
  border:0; background:transparent;
  color:var(--texto-alto, #fff);
  text-align:left; font:inherit;
}
button.jca-row{ cursor:pointer; }
button.jca-row:hover{ background:rgba(127,127,127,.08); }
button.jca-row:disabled{ cursor:default; opacity:.58; }
.jca-icon{
  width:34px; height:34px; flex:0 0 34px;
  display:flex; align-items:center; justify-content:center;
  border-radius:50%;
  color:#3390EC;
  background:rgba(51,144,236,.12);
}
.jca-icon svg{ width:19px !important; height:19px !important; flex:0 0 19px; }
.jca-row-body{ flex:1; min-width:0; }
.jca-row-title{ font-size:14.5px; font-weight:600; }
.jca-row-sub{ margin-top:2px; color:var(--texto-bajo,#777); font-size:12px; line-height:1.35; }
.jca-chevron{ color:var(--texto-bajo,#666); font-size:24px; line-height:1; }
.jca-divider{ height:1px; margin-left:62px; background:var(--div-oscuro,#2a2a2a); opacity:.8; }
.jca-badge{
  min-width:22px; height:22px; padding:0 7px;
  box-sizing:border-box; display:flex; align-items:center; justify-content:center;
  border-radius:11px; background:rgba(51,144,236,.15);
  color:#3390EC; font-size:12px; font-weight:800;
}
.jca-google-account{
  display:flex; align-items:center; gap:12px;
  padding:12px 16px;
}
.jca-google-avatar{
  width:40px; height:40px; flex:0 0 40px;
  overflow:hidden; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:rgba(51,144,236,.14); color:#3390EC;
}
.jca-google-avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.jca-google-avatar svg{ width:22px !important; height:22px !important; }
.jca-google-info{ flex:1; min-width:0; }
.jca-google-title{ font-size:14px; font-weight:650; }
.jca-google-email{ margin-top:2px; color:var(--texto-medio,#999); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jca-unlink{
  border:0; background:transparent; color:#ef5350;
  font:inherit; font-size:12px; font-weight:700; cursor:pointer;
  padding:7px 8px; border-radius:8px;
}
.jca-unlink:hover{ background:rgba(239,83,80,.10); }
.jca-backup-info{ display:flex; align-items:center; gap:12px; padding:14px 16px 12px; }
.jca-backup-title{ font-size:14px; font-weight:600; }
.jca-backup-size{ margin-top:3px; font-size:12px; color:var(--texto-bajo,#666); }
.jca-hint{ margin:8px 4px 0; color:var(--texto-bajo,#666); font-size:12px; line-height:1.5; }
.jca-danger{
  margin-top:38px; width:100%; min-height:52px;
  display:flex; align-items:center; gap:12px;
  padding:14px 16px; box-sizing:border-box; border-radius:14px;
  border:1px solid rgba(229,57,53,.22);
  background:rgba(229,57,53,.08); color:#ef5350;
  font:inherit; font-size:15px; font-weight:650; cursor:pointer;
}
.jca-danger:hover{ background:rgba(229,57,53,.13); }
/* IMPORTANTE: evita que reglas globales de svg estiren el icono de cerrar sesión. */
.jca-danger > svg{ width:22px !important; height:22px !important; min-width:22px; max-width:22px; flex:0 0 22px; display:block; }
.jca-spinner{
  width:17px; height:17px; border-radius:50%;
  border:2px solid rgba(51,144,236,.25); border-top-color:#3390EC;
  animation:jca-spin .75s linear infinite;
}
@keyframes jca-spin{to{transform:rotate(360deg)}}

/* pantalla interna de archivados */
.jca-archivados{
  position:absolute; inset:0; z-index:35;
  display:flex; flex-direction:column;
  background:var(--bg-app,#000); color:var(--texto-alto,#fff);
}
.jca-arch-header{
  flex:0 0 58px; display:flex; align-items:center; gap:10px;
  padding:0 12px; border-bottom:1px solid var(--div-oscuro,#2a2a2a);
  background:var(--bg-app,#000);
}
.jca-back{
  width:38px; height:38px; border:0; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:transparent; color:#3390EC; font-size:30px; cursor:pointer;
}
.jca-arch-title{ font-size:17px; font-weight:750; }
.jca-arch-list{ flex:1; overflow:auto; padding:4px 0; }
.jca-arch-empty{
  height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:28px; text-align:center; color:var(--texto-bajo,#777);
}
.jca-empty-icon{ font-size:52px; opacity:.5; margin-bottom:12px; }
.jca-chat{
  display:flex; align-items:center; gap:12px; padding:10px 16px;
  border-bottom:1px solid rgba(127,127,127,.08);
}
.jca-avatar{
  width:48px; height:48px; flex:0 0 48px; border-radius:50%; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:rgba(51,144,236,.15); color:#3390EC; font-weight:750; font-size:18px;
}
.jca-avatar img{ width:100%; height:100%; object-fit:cover; }
.jca-chat-info{ flex:1; min-width:0; }
.jca-chat-name{ font-size:14.5px; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jca-chat-preview{ margin-top:3px; font-size:12.5px; color:var(--texto-bajo,#777); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jca-unarchive{
  width:38px; height:38px; flex:0 0 38px; border-radius:50%; border:0;
  display:flex; align-items:center; justify-content:center;
  background:rgba(51,144,236,.10); color:#3390EC; cursor:pointer;
}
.jca-unarchive svg{ width:20px !important; height:20px !important; }

.jca-toast{
  position:fixed; left:50%; bottom:26px; z-index:1200;
  transform:translateX(-50%) translateY(18px);
  max-width:min(520px, calc(100vw - 32px));
  padding:11px 15px; border-radius:12px;
  background:#222; color:#fff; font-size:13px;
  box-shadow:0 10px 30px rgba(0,0,0,.35);
  opacity:0; transition:.18s ease; pointer-events:none;
}
.jca-toast.visible{ opacity:1; transform:translateX(-50%) translateY(0); }
.jca-toast.error{ background:#b3261e; }
`;

const ICON = {
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16v13H4z"/><path d="M3 4h18v4H3z"/><path d="M9 12h6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 4.5 4.5 0 0 0 7 18Z"/><path d="m9 13 3-3 3 3M12 10v6"/></svg>',
  restore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/><path d="M12 8v5l3 2"/></svg>',
  done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 7 10 17l-5-5"/><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5"/></svg>',
  unarchive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 8h16v12H4z"/><path d="M3 4h18v4H3z"/><path d="m9 14 3-3 3 3M12 11v6"/></svg>',
};

export const AjustesChatScreen = {
  mount(panel) {
    _injectStyles();

    const root = document.createElement('div');
    root.className = 'jca-root';
    panel.appendChild(root);

    let destruido = false;
    let operacionEnCurso = false;
    let vinculando = false;

    async function render() {
      const totalArchivados = await ChatRepository.contarArchivados();
      if (destruido) return;

      const fechaRaw = localStorage.getItem(BACKUP_FECHA_KEY);
      const tamanio = Number(localStorage.getItem(BACKUP_TAMANIO_KEY) || 0);
      const fecha = fechaRaw ? new Date(fechaRaw) : null;
      const cuentaGoogle = cuentaGoogleGuardada();

      root.innerHTML = `
        <section class="jca-section">
          <p class="jca-section-label">CHATS</p>
          <div class="jca-card">
            <button type="button" class="jca-row" id="jca-archivados">
              <span class="jca-icon">${ICON.archive}</span>
              <span class="jca-row-body"><span class="jca-row-title">Chats archivados</span></span>
              ${totalArchivados > 0 ? `<span class="jca-badge">${totalArchivados}</span>` : '<span class="jca-chevron">›</span>'}
            </button>
          </div>
        </section>

        <section class="jca-section">
          <p class="jca-section-label">NOTIFICACIONES</p>
          <div class="jca-card">
            <button type="button" class="jca-row" id="jca-notificaciones">
              <span class="jca-icon">${ICON.bell}</span>
              <span class="jca-row-body">
                <span class="jca-row-title">Notificaciones de mensajes</span>
                <div class="jca-row-sub">${typeof Notification === 'undefined' ? 'No disponibles en este navegador' : Notification.permission === 'granted' ? 'Activadas' : Notification.permission === 'denied' ? 'Bloqueadas por el navegador' : 'Toca para activarlas'}</div>
              </span>
              <span class="jca-chevron">›</span>
            </button>
          </div>
        </section>

        <section class="jca-section">
          <p class="jca-section-label">CUENTA DE GOOGLE
            <span class="jca-section-sub">Necesaria para las copias de seguridad</span>
          </p>
          <div class="jca-card">
            ${cuentaGoogle ? `
              <div class="jca-google-account">
                <span class="jca-google-avatar">
                  ${cuentaGoogle.foto ? `<img src="${_escapeAttr(cuentaGoogle.foto)}" alt="">` : ICON.person}
                </span>
                <span class="jca-google-info">
                  <div class="jca-google-title">Google Drive</div>
                  <div class="jca-google-email">${_escapeHtml(cuentaGoogle.email)}</div>
                </span>
                <button type="button" class="jca-unlink" id="jca-desvincular-google">Desvincular</button>
              </div>
            ` : `
              <button type="button" class="jca-row" id="jca-vincular-google" ${vinculando ? 'disabled' : ''}>
                <span class="jca-icon">${vinculando ? '<span class="jca-spinner"></span>' : ICON.person}</span>
                <span class="jca-row-body"><span class="jca-row-title">${vinculando ? 'Vinculando...' : 'Vincular cuenta de Google'}</span></span>
                <span class="jca-chevron">›</span>
              </button>
            `}
          </div>
        </section>

        <section class="jca-section">
          <p class="jca-section-label">COPIAS DE SEGURIDAD
            <span class="jca-section-sub">Se guardan en tu Google Drive privado</span>
          </p>
          <div class="jca-card">
            <div class="jca-backup-info">
              <span class="jca-icon">${ICON.done}</span>
              <span class="jca-row-body">
                <div class="jca-backup-title">${fecha ? `Último backup: ${_formatearFecha(fecha)}` : 'Sin backup todavía'}</div>
                ${tamanio > 0 ? `<div class="jca-backup-size">${_formatearBytes(tamanio)}</div>` : ''}
              </span>
            </div>
            <div class="jca-divider"></div>
            <button type="button" class="jca-row" id="jca-respaldar" ${operacionEnCurso ? 'disabled' : ''}>
              <span class="jca-icon">${ICON.cloud}</span>
              <span class="jca-row-body"><span class="jca-row-title">Respaldar ahora</span></span>
              <span class="jca-chevron">›</span>
            </button>
            <div class="jca-divider"></div>
            <button type="button" class="jca-row" id="jca-restaurar" ${operacionEnCurso ? 'disabled' : ''}>
              <span class="jca-icon">${ICON.restore}</span>
              <span class="jca-row-body">
                <span class="jca-row-title">Restaurar conversaciones</span>
                <div class="jca-row-sub">Fusiona chats y mensajes del backup de Google Drive</div>
              </span>
              <span class="jca-chevron">›</span>
            </button>
          </div>
          <p class="jca-hint">Las copias están cifradas y se guardan en el espacio privado de la aplicación en Google Drive. El formato es compatible con JaguarChat móvil.</p>
        </section>

        <button type="button" class="jca-danger" id="jca-cerrar-sesion">
          ${ICON.logout}<span>Cerrar sesión</span>
        </button>
      `;

      root.querySelector('#jca-archivados').addEventListener('click', () => _abrirArchivados(panel, render));

      root.querySelector('#jca-notificaciones').addEventListener('click', async () => {
        if (typeof Notification === 'undefined') { _toast('Este navegador no admite notificaciones', true); return; }
        if (Notification.permission === 'denied') { _toast('Las notificaciones están bloqueadas. Actívalas desde los permisos del sitio.', true); return; }
        const permiso = await Notification.requestPermission();
        _toast(permiso === 'granted' ? 'Notificaciones activadas ✓' : 'No se activaron las notificaciones', permiso !== 'granted');
        await render();
      });

      root.querySelector('#jca-vincular-google')?.addEventListener('click', async () => {
        if (vinculando) return;
        vinculando = true;
        await render();
        try {
          const cuenta = await vincularGoogle();
          _toast(`Cuenta vinculada: ${cuenta.email}`);
        } catch (err) {
          console.error('Vincular Google:', err);
          _toast(mensajeErrorGoogle(err), true);
        } finally {
          vinculando = false;
          await render();
        }
      });

      root.querySelector('#jca-desvincular-google')?.addEventListener('click', async () => {
        if (!confirm('Ya no se harán copias con esta cuenta. El backup anterior en Google Drive se conservará. ¿Desvincular?')) return;
        await desvincularGoogle();
        _toast('Cuenta de Google desvinculada');
        await render();
      });

      root.querySelector('#jca-respaldar').addEventListener('click', async (e) => {
        if (operacionEnCurso) return;
        operacionEnCurso = true;
        const btn = e.currentTarget;
        const previo = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="jca-icon"><span class="jca-spinner"></span></span><span class="jca-row-body"><span class="jca-row-title">Guardando en Drive...</span></span>`;
        try {
          if (!cuentaGoogleGuardada()) await vincularGoogle();
          const bytes = await respaldarEnGoogleDrive();
          localStorage.setItem(BACKUP_FECHA_KEY, new Date().toISOString());
          localStorage.setItem(BACKUP_TAMANIO_KEY, String(bytes));
          _toast('Backup guardado en Google Drive ✓');
        } catch (err) {
          console.error('JaguarChat backup Drive:', err);
          btn.innerHTML = previo;
          _toast(mensajeErrorGoogle(err), true);
        } finally {
          operacionEnCurso = false;
          await render();
        }
      });

      root.querySelector('#jca-restaurar').addEventListener('click', async (e) => {
        if (operacionEnCurso) return;
        if (!confirm('Se importarán los chats y mensajes del backup. Los datos actuales no se borrarán; se fusionarán. ¿Continuar?')) return;
        operacionEnCurso = true;
        const btn = e.currentTarget;
        const previo = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="jca-icon"><span class="jca-spinner"></span></span><span class="jca-row-body"><span class="jca-row-title">Restaurando...</span></span>`;
        try {
          if (!cuentaGoogleGuardada()) await vincularGoogle();
          await restaurarDesdeGoogleDrive();
          _toast('Conversaciones restauradas ✓');
        } catch (err) {
          console.error('JaguarChat restaurar Drive:', err);
          btn.innerHTML = previo;
          _toast(mensajeErrorGoogle(err), true);
        } finally {
          operacionEnCurso = false;
          await render();
        }
      });

      root.querySelector('#jca-cerrar-sesion').addEventListener('click', async () => {
        if (!confirm('¿Estás seguro? Tu historial local se conservará en este navegador.')) return;
        try {
          await desvincularGoogle();
          await cerrarSesion();
        } catch (err) {
          console.error('Cerrar sesión JaguarChat:', err);
          _toast('No se pudo cerrar la sesión', true);
        }
      });
    }

    render();

    return () => {
      destruido = true;
      panel.querySelector('.jca-archivados')?.remove();
    };
  },
};

async function _abrirArchivados(panel, onCambio) {
  panel.querySelector('.jca-archivados')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'jca-archivados';
  overlay.innerHTML = `
    <div class="jca-arch-header">
      <button type="button" class="jca-back" aria-label="Volver">‹</button>
      <div class="jca-arch-title">Archivados</div>
    </div>
    <div class="jca-arch-list"><div class="jca-arch-empty"><span class="jca-spinner"></span></div></div>
  `;
  panel.appendChild(overlay);
  const listaEl = overlay.querySelector('.jca-arch-list');
  overlay.querySelector('.jca-back').addEventListener('click', () => overlay.remove());

  async function cargar() {
    const chats = await ChatRepository.obtenerArchivados();
    if (!overlay.isConnected) return;
    if (!chats.length) {
      listaEl.innerHTML = `<div class="jca-arch-empty"><div class="jca-empty-icon">🗃️</div><div>Sin chats archivados</div></div>`;
      return;
    }
    listaEl.innerHTML = chats.map((chat) => {
      const inicial = (chat.otroNombre || '?').trim().charAt(0).toUpperCase();
      const avatar = chat.otroAvatarUrl
        ? `<img src="${_escapeAttr(chat.otroAvatarUrl)}" alt="">`
        : _escapeHtml(inicial);
      return `
        <div class="jca-chat" data-id="${_escapeAttr(chat.otroUsuarioId)}">
          <div class="jca-avatar">${avatar}</div>
          <div class="jca-chat-info">
            <div class="jca-chat-name">${_escapeHtml(chat.otroNombre || 'Usuario')}</div>
            <div class="jca-chat-preview">${_escapeHtml(chat.ultimoMensaje || 'Sin mensajes')}</div>
          </div>
          <button type="button" class="jca-unarchive" title="Desarchivar">${ICON.unarchive}</button>
        </div>`;
    }).join('');

    listaEl.querySelectorAll('.jca-chat').forEach((fila) => {
      fila.querySelector('.jca-unarchive').addEventListener('click', async () => {
        const id = fila.dataset.id;
        await ChatRepository.toggleArchivado(id);
        await cargar();
        await onCambio?.();
        _toast('Chat desarchivado');
      });
    });
  }

  await cargar();
}

function _formatearFecha(fecha) {
  const ahora = new Date();
  const dif = ahora - fecha;
  if (dif >= 0 && dif < 24 * 60 * 60 * 1000) {
    return `hoy a las ${fecha.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}`;
  }
  if (dif >= 0 && dif < 7 * 24 * 60 * 60 * 1000) {
    return fecha.toLocaleDateString('es-MX', { weekday:'long' }) + ' ' +
      fecha.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
  }
  return fecha.toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
}

function _formatearBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function _toast(texto, error = false) {
  let el = document.querySelector('.jca-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'jca-toast';
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.toggle('error', error);
  requestAnimationFrame(() => el.classList.add('visible'));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 3200);
}

