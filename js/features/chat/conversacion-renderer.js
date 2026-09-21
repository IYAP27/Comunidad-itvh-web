import { MensajeRepository } from './mensaje-repository.js';
import { renderCuerpoMensaje, enlazarEventosMedia } from './conversacion-media.js';
import { abrirMenuAcciones } from './conversacion-acciones.js';
import { escapeHtml, escapeAttr } from '../../core/html-utils.js';
import { EstadoMensaje, esMedia, textoPreview, leerReacciones, reaccionesAgrupadas } from './mensaje.js';

export function pintarMensajes(cuerpoEl, mensajes, miId, ctx) {
  if (!mensajes || mensajes.length === 0) {
    cuerpoEl.innerHTML = '<p class="conv-vacio">Todavía no hay mensajes.<br>Manda el primero 👋</p>';
    return;
  }

  let html = '';
  let fechaAnterior = null;

  for (const msg of mensajes) {
    const fechaMsg = new Date(msg.timestamp);
    const claveDia = fechaMsg.toDateString();
    if (claveDia !== fechaAnterior) {
      html += `<div class="conv-fecha-separador">${formatoFechaLarga(fechaMsg)}</div>`;
      fechaAnterior = claveDia;
    }

    const esMio = msg.emisorId === miId;
    const hora = fechaMsg.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let metaEstado = '';
    if (esMio) {
      if (msg.estado === EstadoMensaje.ENVIANDO) metaEstado = '· enviando...';
      else if (msg.estado === EstadoMensaje.FALLIDO) metaEstado = `<button type="button" class="conv-fallido-reintentar" data-reintentar="${escapeAttr(msg.mensajeId)}">· no enviado · reintentar</button>`;
      else if (msg.estado === EstadoMensaje.ENTREGADO) metaEstado = '· ✓';
    }

    const { html: cuerpoBurbuja, esMedia: mediaFlag } = renderCuerpoMensaje(msg);
    const citaHtml = !msg.eliminado ? renderCita(msg, miId, ctx.otroNombre) : '';
    const contextoHtml = !msg.eliminado ? renderContextoObjeto(msg) : '';
    const reaccionesHtml = renderReacciones(msg, miId);
    const botonMas = !msg.eliminado ? `<button type="button" class="conv-btn-mas" data-mensaje-id="${escapeAttr(msg.mensajeId)}" title="Más opciones">⋯</button>` : '';
    const grupo = `
      <div class="conv-grupo">
        <div class="conv-burbuja ${mediaFlag ? 'conv-burbuja-media' : ''}" data-mensaje-id="${escapeAttr(msg.mensajeId)}">${citaHtml}${contextoHtml}${cuerpoBurbuja}</div>
        ${reaccionesHtml}
        <div class="conv-meta"><span>${hora}</span> ${metaEstado}</div>
      </div>
    `;

    html += `
      <div class="conv-fila ${esMio ? 'mio' : 'otro'}">
        ${esMio ? botonMas : ''}
        ${grupo}
        ${esMio ? '' : botonMas}
      </div>
    `;
  }

  cuerpoEl.innerHTML = html;
  const porId = new Map(mensajes.map((m) => [m.mensajeId, m]));
  enlazarEventosMedia(cuerpoEl, mensajes);

  cuerpoEl.querySelectorAll('[data-reintentar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const msg = porId.get(btn.dataset.reintentar);
      if (msg) MensajeRepository.reintentarMensajeEspecifico({ msg, otroUsuarioId: ctx.otroUsuarioId });
    });
  });

  cuerpoEl.querySelectorAll('.conv-btn-mas').forEach((btn) => {
    btn.addEventListener('click', () => {
      const msg = porId.get(btn.dataset.mensajeId);
      if (msg) abrirMenuAcciones(btn, msg, miId, ctx);
    });
  });

  cuerpoEl.querySelectorAll('.conv-reaccion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const msg = porId.get(chip.dataset.mensajeId);
      if (!msg) return;
      const emoji = chip.dataset.emoji;
      const propia = leerReacciones(msg)[miId] === emoji;
      if (propia) MensajeRepository.quitarReaccion({ mensajeId: msg.mensajeId, otroUsuarioId: ctx.otroUsuarioId });
      else MensajeRepository.reaccionar({ mensajeId: msg.mensajeId, otroUsuarioId: ctx.otroUsuarioId, emoji });
    });
  });

  cuerpoEl.querySelectorAll('.conv-cita').forEach((cita) => {
    cita.addEventListener('click', () => {
      const objetivo = cuerpoEl.querySelector(`[data-mensaje-id="${CSS.escape(cita.dataset.irA)}"]`);
      if (!objetivo) return;
      objetivo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      objetivo.style.outline = '2px solid #3390EC';
      setTimeout(() => { objetivo.style.outline = 'none'; }, 900);
    });
  });

  cuerpoEl.querySelectorAll('.conv-contexto-card[data-contexto-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      if ((card.dataset.contextoTipo || 'objeto_perdido') !== 'objeto_perdido') return;
      try {
        const { abrirDetalleObjetoPerdido } = await import('./cosas-perdidas-screen.js');
        abrirDetalleObjetoPerdido(card.dataset.contextoId);
      } catch (e) {
        console.error('Abrir detalle de objeto perdido:', e);
      }
    });
  });
}

function renderCita(msg, miId, otroNombre) {
  if (!msg.respuestaAMensajeId) return '';
  const autor = msg.respuestaAEmisorId === miId ? 'Tú' : otroNombre;
  const snippet = esMedia(msg.respuestaATipo)
    ? textoPreview({ tipo: msg.respuestaATipo, contenido: msg.respuestaAContenido })
    : (msg.respuestaAContenido || '');
  return `
    <div class="conv-cita" data-ir-a="${escapeAttr(msg.respuestaAMensajeId)}">
      <span class="conv-cita-autor">${escapeHtml(autor)}</span>
      <span class="conv-cita-texto">${escapeHtml(snippet)}</span>
    </div>
  `;
}

function renderContextoObjeto(msg) {
  if (!msg.contextoObjetoId) return '';
  return `
    <div class="conv-contexto-card" data-contexto-id="${escapeAttr(msg.contextoObjetoId)}" data-contexto-tipo="${escapeAttr(msg.contextoTipo || 'objeto_perdido')}">
      ${msg.contextoImagenUrl ? `<img src="${escapeAttr(msg.contextoImagenUrl)}" alt="">` : ''}
      <div class="conv-contexto-card-info">
        ${msg.contextoDescripcion ? `<div class="conv-contexto-card-desc">${escapeHtml(msg.contextoDescripcion)}</div>` : ''}
        ${msg.contextoLugar ? `<div class="conv-contexto-card-lugar">📍 ${escapeHtml(msg.contextoLugar)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderReacciones(msg, miId) {
  const grupos = reaccionesAgrupadas(msg);
  if (grupos.size === 0) return '';
  const chips = [...grupos.entries()].map(([emoji, usuarios]) => {
    const mia = usuarios.includes(miId);
    return `
      <button type="button" class="conv-reaccion-chip ${mia ? 'mia' : ''}" data-mensaje-id="${escapeAttr(msg.mensajeId)}" data-emoji="${escapeAttr(emoji)}">
        <span>${escapeHtml(emoji)}</span>${usuarios.length > 1 ? `<span class="conv-reaccion-cuenta">${usuarios.length}</span>` : ''}
      </button>
    `;
  }).join('');
  return `<div class="conv-reacciones">${chips}</div>`;
}

function formatoFechaLarga(fecha) {
  const ahora = new Date();
  if (fecha.toDateString() === ahora.toDateString()) return 'Hoy';
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: fecha.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined });
}
