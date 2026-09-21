// Acciones contextuales de mensajes de JaguarChat.
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { MensajeRepository } from './mensaje-repository.js';
import { TipoMensaje, EstadoMensaje, leerReacciones } from './mensaje.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/// Menú "⋯": Responder / Reaccionar / Editar (solo texto propio) /
/// Eliminar (solo propios). Se cierra solo al elegir algo o al hacer
/// clic afuera.
export function abrirMenuAcciones(btn, msg, miId, ctx) {
  document.querySelectorAll('.conv-menu-acciones, .conv-emoji-picker, .conv-perfil-overlay, .conv-reenviar-overlay').forEach((el) => el.remove());

  const esMio = msg.emisorId === miId;
  const menu = document.createElement('div');
  menu.className = 'conv-menu-acciones';

  const items = [];
  items.push(['responder', '↩️', 'Responder']);
  items.push(['reaccionar', '🙂', 'Reaccionar']);
  if (msg.tipo === TipoMensaje.TEXTO && msg.contenido) items.push(['copiar', '📋', 'Copiar']);
  items.push(['reenviar', '↗️', 'Reenviar']);
  if (esMio && msg.estado === EstadoMensaje.FALLIDO) items.push(['reintentar', '🔄', 'Reintentar']);
  if (esMio && msg.tipo === TipoMensaje.TEXTO) items.push(['editar', '✏️', 'Editar']);
  if (esMio) items.push(['eliminar', '🗑️', 'Eliminar', true]);

  menu.innerHTML = items.map(([accion, icono, etiqueta, peligro]) => `
    <button type="button" class="conv-menu-item ${peligro ? 'peligro' : ''}" data-accion="${accion}">
      <span>${icono}</span>${etiqueta}
    </button>
  `).join('');

  document.body.appendChild(menu);
  posicionarCercaDe(menu, btn);

  menu.querySelector('[data-accion="responder"]').addEventListener('click', () => {
    menu.remove();
    ctx.onResponder(msg);
  });
  menu.querySelector('[data-accion="reaccionar"]').addEventListener('click', () => {
    menu.remove();
    abrirEmojiPicker(btn, msg, miId, ctx);
  });
  menu.querySelector('[data-accion="copiar"]')?.addEventListener('click', async () => {
    menu.remove();
    try { await navigator.clipboard.writeText(msg.contenido || ''); }
    catch { /* portapapeles no disponible */ }
  });
  menu.querySelector('[data-accion="reenviar"]')?.addEventListener('click', () => {
    menu.remove();
    ctx.onReenviar?.(msg);
  });
  menu.querySelector('[data-accion="reintentar"]')?.addEventListener('click', () => {
    menu.remove();
    MensajeRepository.reintentarMensajeEspecifico({ msg, otroUsuarioId: ctx.otroUsuarioId });
  });
  menu.querySelector('[data-accion="editar"]')?.addEventListener('click', () => {
    menu.remove();
    ctx.onEditar(msg);
  });
  menu.querySelector('[data-accion="eliminar"]')?.addEventListener('click', () => {
    menu.remove();
    if (confirm('¿Eliminar este mensaje para todos?')) {
      MensajeRepository.eliminarMensaje({ msg, otroUsuarioId: ctx.otroUsuarioId });
    }
  });

  setTimeout(() => document.addEventListener('click', function cerrar(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', cerrar);
    }
  }), 0);
}

function abrirEmojiPicker(btn, msg, miId, ctx) {
  const picker = document.createElement('div');
  picker.className = 'conv-emoji-picker';
  picker.innerHTML = EMOJIS_RAPIDOS.map((e) => `<button type="button">${e}</button>`).join('');
  document.body.appendChild(picker);
  posicionarCercaDe(picker, btn);

  picker.querySelectorAll('button').forEach((b, i) => {
    b.addEventListener('click', () => {
      picker.remove();
      const emoji = EMOJIS_RAPIDOS[i];
      const propia = leerReacciones(msg)[miId] === emoji;
      if (propia) {
        MensajeRepository.quitarReaccion({ mensajeId: msg.mensajeId, otroUsuarioId: ctx.otroUsuarioId });
      } else {
        MensajeRepository.reaccionar({ mensajeId: msg.mensajeId, otroUsuarioId: ctx.otroUsuarioId, emoji });
      }
    });
  });

  setTimeout(() => document.addEventListener('click', function cerrar(e) {
    if (!picker.contains(e.target)) {
      picker.remove();
      document.removeEventListener('click', cerrar);
    }
  }), 0);
}

/// Posiciona un popover (menú/emoji picker) pegado a `ancla`, sin
/// salirse de la ventana visible.
function posicionarCercaDe(popover, ancla) {
  const r = ancla.getBoundingClientRect();
  const pw = popover.offsetWidth;
  const ph = popover.offsetHeight;
  let left = r.left + r.width / 2 - pw / 2;
  let top = r.top - ph - 8;
  if (top < 8) top = r.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  popover.style.position = 'fixed';
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}


export function abrirSelectorReenvio(msg, onSeleccionar) {
  const overlay=document.createElement('div'); overlay.className='conv-reenviar-overlay';
  overlay.innerHTML=`<div class="conv-reenviar-card"><div class="conv-reenviar-titulo"><span>Reenviar mensaje</span><button class="conv-overlay-cerrar" type="button">✕</button></div><input class="conv-reenviar-buscar" placeholder="Buscar por nombre o @usuario"><div class="conv-reenviar-lista"><div class="conv-sticker-vacio">Escribe para buscar un destinatario</div></div></div>`;
  document.body.appendChild(overlay); const cerrar=()=>overlay.remove(); overlay.querySelector('.conv-overlay-cerrar').addEventListener('click',cerrar); overlay.addEventListener('click',(e)=>{if(e.target===overlay)cerrar();});
  const input=overlay.querySelector('.conv-reenviar-buscar'), lista=overlay.querySelector('.conv-reenviar-lista'); let timer;
  input.addEventListener('input',()=>{ clearTimeout(timer); const q=input.value.trim(); if(!q){lista.innerHTML='<div class="conv-sticker-vacio">Escribe para buscar un destinatario</div>';return;} timer=setTimeout(async()=>{
    lista.innerHTML='<div class="conv-sticker-vacio">Buscando...</div>'; const miId=usuarioActual()?.id||''; const seguro=q.replace(/\\/g,'\\\\').replace(/%/g,'\\%').replace(/_/g,'\\_');
    try { const {data,error}=await supabase.from('perfiles').select('id,nombre,nombre_usuario,cdn_foto_perfil').or(`nombre.ilike.%${seguro}%,nombre_usuario.ilike.%${seguro}%`).neq('id',miId).limit(20); if(error)throw error;
      if(!data?.length){lista.innerHTML='<div class="conv-sticker-vacio">Sin resultados</div>';return;}
      lista.innerHTML=data.map((p,i)=>`<button type="button" class="conv-reenviar-item" data-i="${i}"><span class="conv-reenviar-avatar">${p.cdn_foto_perfil?`<img src="${_escapeAttr(p.cdn_foto_perfil)}" alt="">`:_escapeHtml((p.nombre||'?')[0])}</span><span><strong>${_escapeHtml(p.nombre||'Usuario')}</strong>${p.nombre_usuario?`<br><small style="color:var(--texto-bajo)">@${_escapeHtml(p.nombre_usuario)}</small>`:''}</span></button>`).join('');
      lista.querySelectorAll('[data-i]').forEach((b)=>b.addEventListener('click',async()=>{b.disabled=true;await onSeleccionar(data[Number(b.dataset.i)]);cerrar();}));
    } catch(e){ console.error(e); lista.innerHTML='<div class="conv-sticker-vacio">No se pudo buscar</div>'; }
  },280); }); input.focus();
}

