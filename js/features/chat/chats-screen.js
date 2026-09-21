// ═════════════════════════════════════════════════════════════════
// chats-screen.js
//
// Equivalente web de chats_page_home.dart (ChatsScreen). Alcance de
// esta primera fase: lista de chats en vivo + iniciar chat nuevo +
// abrir conversación. Fijar/silenciar/archivar quedan para una
// fase siguiente (el repositorio ya los soporta — ChatRepository.
// toggleFijado/toggleSilenciado/toggleArchivado — solo falta la UI).
//
// Contrato que espera JaguarChatPrincipal: mount(panel, ctx) =>
// cleanupFn.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { ChatRepository } from './chat-repository.js';
import { PresenceService } from './presence-service.js';
import { abrirConversacion, montarConversacionEnPanel } from './conversacion-screen.js?v=1.9.3';

const MQ_ESCRITORIO = '(min-width: 900px)';

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'chats-screen-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
.cs-root{ padding:4px 0 16px; }
.cs-nuevo{
  display:flex; align-items:center; gap:12px;
  width:calc(100% - 32px); margin:8px 16px 12px;
  padding:12px 14px; border-radius:14px;
  background:rgba(51,144,236,0.08);
  border:1px solid rgba(51,144,236,0.18);
  color:#3390EC; font-size:14px; font-weight:600;
  cursor:pointer;
}
.cs-nuevo svg{ width:20px; height:20px; flex-shrink:0; }

.cs-item{
  display:flex; align-items:center; gap:12px; position:relative;
  width:100%; padding:10px 10px 10px 16px; box-sizing:border-box;
  background:none; border:none; text-align:left; cursor:pointer;
}
.cs-item-main{ display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
.cs-item-menu{ width:32px; height:32px; border:none; border-radius:50%; background:none; color:var(--texto-bajo); cursor:pointer; flex-shrink:0; font-size:20px; line-height:1; }
.cs-item-menu:hover{ background:rgba(127,127,127,.12); }
.cs-menu-pop{ position:fixed; z-index:850; min-width:185px; padding:6px; border:1px solid var(--div-oscuro); border-radius:12px; background:var(--bg-card-oscuro); box-shadow:0 10px 30px rgba(0,0,0,.4); }
.cs-menu-pop button{ width:100%; border:none; background:none; color:var(--texto-alto); padding:9px 10px; border-radius:8px; text-align:left; cursor:pointer; font-size:13px; }
.cs-menu-pop button:hover{ background:rgba(127,127,127,.12); }
.cs-menu-pop button.peligro{ color:#ff6b6b; }
.cs-item:active{ background:rgba(127,127,127,0.08); }

.cs-avatar-wrap{ position:relative; flex-shrink:0; }
.cs-avatar{
  width:52px; height:52px; border-radius:50%;
  background:#2C2C2E; color:rgba(255,255,255,0.6);
  display:flex; align-items:center; justify-content:center;
  font-size:19px; font-weight:700; overflow:hidden;
}
.cs-avatar img{ width:100%; height:100%; object-fit:cover; }
.cs-online-dot{
  position:absolute; right:1px; bottom:1px;
  width:13px; height:13px; border-radius:50%;
  background:#34C759; border:2.5px solid var(--bg-app);
}

.cs-info{ flex:1; min-width:0; }
.cs-info-top{ display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.cs-nombre{
  color:var(--texto-alto); font-size:15px; font-weight:600;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.cs-fecha{ color:var(--texto-bajo); font-size:12px; flex-shrink:0; }
.cs-info-bottom{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:2px; }
.cs-preview{
  color:var(--texto-medio); font-size:13.5px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.cs-item.no-leido .cs-preview{ color:var(--texto-alto); font-weight:500; }
.cs-badge{
  flex-shrink:0; min-width:20px; height:20px; padding:0 6px;
  border-radius:10px; background:#3390EC; color:#fff;
  font-size:11.5px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
}

.cs-vacio{
  padding:60px 32px; text-align:center;
  color:var(--texto-bajo); font-size:14px; line-height:1.5;
}
.cs-vacio-icono{ font-size:40px; margin-bottom:12px; }

.cs-item.activo{ background:rgba(51,144,236,0.10); }

/* ── Layout de escritorio: lista a la izquierda, conversación abierta
   a la derecha (estilo WhatsApp Web) — así la lista de chats nunca
   se tapa y la barra principal de arriba tampoco, porque ya no se usa
   pantalla completa (.pushed-screen) para la conversación. Debajo de
   900px se mantiene tal cual estaba: lista sola, ocupa toda la pestaña,
   y abrir un chat sí usa pantalla completa (más cómodo en celular). ── */
@media (min-width: 900px) {
  .cs-root{
    display: flex;
    height: 100%;
    padding: 0;
  }
  .cs-lista-col{
    width: 300px;
    flex-shrink: 0;
    overflow-y: auto;
    height: 100%;
    border-right: 1px solid var(--div-oscuro);
    padding: 4px 0 16px;
    box-sizing: border-box;
  }
  .cs-nuevo{ margin: 8px 12px 12px; width: calc(100% - 24px); }
  .cs-detalle-col{
    flex: 1;
    min-width: 0;
    height: 100%;
  }
  .cs-detalle-vacio{
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--texto-bajo);
    font-size: 14px;
    padding: 24px;
  }
}

/* ── Buscador "nuevo chat" (overlay) ── */
.cs-buscador-overlay{ position:fixed; inset:0; background:var(--bg-app); z-index:600; display:flex; flex-direction:column; }
.cs-buscador-campo{
  display:flex; align-items:center; gap:10px; margin:12px 16px;
  padding:11px 14px; border-radius:14px;
  background:var(--campo-bg); border:1px solid var(--campo-borde);
}
.cs-buscador-campo input{
  flex:1; min-width:0; background:none; border:none; outline:none;
  color:var(--texto-alto); font-size:14px;
}
.cs-buscador-campo svg{ width:18px; height:18px; flex-shrink:0; }
.cs-buscador-campo input::placeholder{ color:var(--texto-bajo); }
.cs-buscador-lista{ flex:1; overflow-y:auto; }
.cs-buscador-vacio{ padding:40px 24px; text-align:center; color:var(--texto-bajo); font-size:13.5px; }
`;

export const ChatsScreen = {
  mount(panel, ctx) {
    _injectStyles();

    const root = document.createElement('div');
    root.className = 'cs-root';
    root.innerHTML = `
      <div class="cs-lista-col">
        <button type="button" class="cs-nuevo" id="cs-btn-nuevo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo chat
        </button>
        <div id="cs-lista"></div>
      </div>
      <div class="cs-detalle-col" id="cs-detalle">
        <div class="cs-detalle-vacio">Selecciona un chat para empezar a platicar</div>
      </div>
    `;
    panel.appendChild(root);

    const listaEl = root.querySelector('#cs-lista');
    const detalleEl = root.querySelector('#cs-detalle');
    const mqEscritorio = window.matchMedia(MQ_ESCRITORIO);
    let chatsActuales = [];
    let enLinea = new Set();
    let chatAbiertoId = null;
    let cerrarConversacionActual = null;

    function pintar() {
      if (chatsActuales.length === 0) {
        listaEl.innerHTML = `
          <div class="cs-vacio">
            <div class="cs-vacio-icono">💬</div>
            Todavía no tienes conversaciones.<br>Toca "Nuevo chat" para empezar una.
          </div>
        `;
        return;
      }
      listaEl.innerHTML = chatsActuales.map((chat) => _renderItem(chat, enLinea, chatAbiertoId)).join('');
      listaEl.querySelectorAll('.cs-item').forEach((item) => {
        const chat = chatsActuales.find((c) => c.otroUsuarioId === item.dataset.id);
        item.querySelector('.cs-item-main')?.addEventListener('click', () => chat && _abrirChat(chat));
        item.querySelector('.cs-item-menu')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (chat) _abrirMenuChat(e.currentTarget, chat, {
            onEliminar: () => {
              if (chatAbiertoId === chat.otroUsuarioId) {
                cerrarConversacionActual?.(); cerrarConversacionActual = null; chatAbiertoId = null;
                detalleEl.innerHTML = '<div class="cs-detalle-vacio">Selecciona un chat para empezar a platicar</div>';
              }
            },
          });
        });
      });
    }

    function _abrirChat(chat) {
      // En escritorio, la conversación se monta EMBEBIDA junto a la
      // lista (nunca tapa la barra principal ni la lista de chats).
      // En mobile/tablet angosto, se abre en pantalla completa, que
      // es lo natural ahí (no hay espacio para las dos columnas).
      if (mqEscritorio.matches) {
        chatAbiertoId = chat.otroUsuarioId;
        pintar(); // para resaltar el chat activo en la lista
        cerrarConversacionActual?.();
        cerrarConversacionActual = montarConversacionEnPanel(detalleEl, {
          otroUsuarioId: chat.otroUsuarioId,
          otroNombre: chat.otroNombre,
          otroNombreUsuario: chat.otroNombreUsuario,
          otroAvatarUrl: chat.otroAvatarUrl,
        });
      } else {
        abrirConversacion({
          otroUsuarioId: chat.otroUsuarioId,
          otroNombre: chat.otroNombre,
          otroNombreUsuario: chat.otroNombreUsuario,
          otroAvatarUrl: chat.otroAvatarUrl,
        });
      }
    }

    const unsubChats = ChatRepository.subscribeChats((chats) => {
      chatsActuales = chats;
      pintar();
    });

    const unsubPresence = PresenceService.subscribe((idsEnLinea) => {
      enLinea = idsEnLinea instanceof Set ? idsEnLinea : new Set(idsEnLinea);
      pintar();
    });
    PresenceService.iniciarPresencia?.();

    root.querySelector('#cs-btn-nuevo').addEventListener('click', () => _abrirBuscadorNuevoChat(_abrirChat));

    return () => {
      unsubChats();
      unsubPresence?.();
      cerrarConversacionActual?.();
    };
  },
};

function _renderItem(chat, enLinea, chatAbiertoId) {
  const inicial = (chat.otroNombre || '?').trim().charAt(0).toUpperCase();
  const avatar = chat.otroAvatarUrl
    ? `<img src="${_escapeAttr(chat.otroAvatarUrl)}" alt="">`
    : `<span>${inicial}</span>`;
  const online = enLinea.has(chat.otroUsuarioId) ? '<span class="cs-online-dot"></span>' : '';
  const noLeido = (chat.noLeidos || 0) > 0;
  const activo = chat.otroUsuarioId === chatAbiertoId;
  const fecha = chat.ultimaFecha ? _formatoFecha(chat.ultimaFecha) : '';

  return `
    <div class="cs-item ${noLeido ? 'no-leido' : ''} ${activo ? 'activo' : ''}" data-id="${_escapeAttr(chat.otroUsuarioId)}">
      <div class="cs-item-main" role="button" tabindex="0">
        <span class="cs-avatar-wrap">
          <span class="cs-avatar">${avatar}</span>
          ${online}
        </span>
        <span class="cs-info">
          <span class="cs-info-top">
            <span class="cs-nombre">${_escapeHtml(chat.otroNombre)}</span>
            <span class="cs-fecha">${fecha}</span>
          </span>
          <span class="cs-info-bottom">
            <span class="cs-preview">${_escapeHtml(chat.ultimoMensaje || 'Sin mensajes')}</span>
            ${noLeido ? `<span class="cs-badge">${chat.noLeidos > 99 ? '99+' : chat.noLeidos}</span>` : ''}
          </span>
        </span>
      </div>
      <button type="button" class="cs-item-menu" title="Opciones">⋮</button>
    </div>
  `;
}

function _abrirMenuChat(ancla, chat, { onEliminar } = {}) {
  document.querySelectorAll('.cs-menu-pop').forEach((e) => e.remove());
  const menu = document.createElement('div');
  menu.className = 'cs-menu-pop';
  menu.innerHTML = `
    <button type="button" data-a="fijar">${chat.fijado ? '📌 Desfijar' : '📌 Fijar chat'}</button>
    <button type="button" data-a="silenciar">${chat.silenciado ? '🔔 Activar sonido' : '🔕 Silenciar'}</button>
    <button type="button" data-a="archivar">📦 Archivar chat</button>
    <button type="button" class="peligro" data-a="eliminar">🗑️ Eliminar conversación</button>`;
  document.body.appendChild(menu);
  const r=ancla.getBoundingClientRect();
  menu.style.left=`${Math.max(8,Math.min(r.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))}px`;
  menu.style.top=`${Math.max(8,Math.min(r.bottom+5,window.innerHeight-menu.offsetHeight-8))}px`;
  const cerrar=()=>menu.remove();
  menu.querySelector('[data-a="fijar"]').addEventListener('click', async()=>{cerrar();await ChatRepository.toggleFijado(chat.otroUsuarioId);});
  menu.querySelector('[data-a="silenciar"]').addEventListener('click', async()=>{cerrar();await ChatRepository.toggleSilenciado(chat.otroUsuarioId);});
  menu.querySelector('[data-a="archivar"]').addEventListener('click', async()=>{cerrar();await ChatRepository.toggleArchivado(chat.otroUsuarioId);});
  menu.querySelector('[data-a="eliminar"]').addEventListener('click', async()=>{cerrar();if(!confirm(`¿Eliminar la conversación con ${chat.otroNombre}? Se borrará del almacenamiento de este navegador.`))return;await ChatRepository.eliminarChat(chat.otroUsuarioId);onEliminar?.();});
  setTimeout(() => {
    document.addEventListener('click', function fuera(e) {
      if (!menu.contains(e.target) && e.target !== ancla) {
        menu.remove();
        document.removeEventListener('click', fuera);
      }
    });
  }, 0);
}

function _formatoFecha(iso) {
  const fecha = new Date(iso);
  const ahora = new Date();
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  if (mismoDia) {
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

// ── Buscador "nuevo chat" ────────────────────────────────────────
function _abrirBuscadorNuevoChat(onSeleccionar) {
  const overlay = document.createElement('div');
  overlay.className = 'cs-buscador-overlay';
  overlay.innerHTML = `
    <header class="appbar-simple">
      <button type="button" class="btn-volver">‹</button>
      <span style="font-weight:700;color:var(--texto-alto);">Nuevo chat</span>
    </header>
    <div class="cs-buscador-campo">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--texto-bajo)" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>
      <input type="text" placeholder="Buscar por nombre o @usuario..." id="cs-buscar-input" autofocus>
    </div>
    <div class="cs-buscador-lista" id="cs-buscar-lista">
      <p class="cs-buscador-vacio">Escribe para buscar a alguien</p>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.btn-volver').addEventListener('click', () => overlay.remove());

  const input = overlay.querySelector('#cs-buscar-input');
  const listaEl = overlay.querySelector('#cs-buscar-lista');
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const termino = input.value.trim();
    if (!termino) {
      listaEl.innerHTML = `<p class="cs-buscador-vacio">Escribe para buscar a alguien</p>`;
      return;
    }
    debounce = setTimeout(() => _buscarPerfiles(termino, listaEl, overlay, onSeleccionar), 350);
  });
}

async function _buscarPerfiles(termino, listaEl, overlay, onSeleccionar) {
  listaEl.innerHTML = `<p class="cs-buscador-vacio">Buscando...</p>`;
  const miId = usuarioActual()?.id ?? null;
  const consulta = termino.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_usuario, cdn_foto_perfil')
      .or(`nombre_usuario.ilike.%${consulta}%,nombre.ilike.%${consulta}%`)
      .neq('id', miId ?? '')
      .limit(20);
    if (error) throw error;

    if (!data || data.length === 0) {
      listaEl.innerHTML = `<p class="cs-buscador-vacio">Sin resultados</p>`;
      return;
    }

    listaEl.innerHTML = data.map((p) => {
      const inicial = (p.nombre || '?').trim().charAt(0).toUpperCase();
      const avatar = p.cdn_foto_perfil
        ? `<img src="${_escapeAttr(p.cdn_foto_perfil)}" alt="">`
        : `<span>${inicial}</span>`;
      return `
        <button type="button" class="cs-item" data-id="${_escapeAttr(p.id)}">
          <span class="cs-avatar-wrap"><span class="cs-avatar">${avatar}</span></span>
          <span class="cs-info">
            <span class="cs-info-top"><span class="cs-nombre">${_escapeHtml(p.nombre)}</span></span>
            ${p.nombre_usuario ? `<span class="cs-info-bottom"><span class="cs-preview">@${_escapeHtml(p.nombre_usuario)}</span></span>` : ''}
          </span>
        </button>
      `;
    }).join('');

    listaEl.querySelectorAll('.cs-item').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const perfil = data[i];
        overlay.remove();
        onSeleccionar({
          otroUsuarioId: perfil.id,
          otroNombre: perfil.nombre || 'Usuario',
          otroNombreUsuario: perfil.nombre_usuario,
          otroAvatarUrl: perfil.cdn_foto_perfil,
        });
      });
    });
  } catch (e) {
    console.error('ChatsScreen._buscarPerfiles:', e);
    listaEl.innerHTML = `<p class="cs-buscador-vacio">No se pudo buscar. Intenta de nuevo.</p>`;
  }
}

