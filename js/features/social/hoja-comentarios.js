// ═════════════════════════════════════════════════════════════════
// hoja-comentarios.js
//
// Equivalente web de HojaComentarios:
//   • Hoja inferior con comentarios raíz y respuestas.
//   • Enviar, responder, editar y eliminar comentarios propios.
//   • Reacción rápida con 👍 en comentarios/respuestas.
//   • Autocompletado de @menciones usando el helper compartido.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import {
  aplicarMencionSeleccionada,
  buscarPerfilesMencion,
  detectarQueryMencion,
  indiceArrobaActiva,
} from '../../core/mencion-autocomplete.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { abrirSelectorReaccion, emojiRapido } from './reacciones.js';

let _overlay = null;
let _post = null;
let _comentarios = [];
let _cargando = true;
let _enviando = false;
let _respondiendo = null;
let _nombreRespondiendo = null;
let _editando = null;
let _sugerencias = [];
let _buscandoMencion = false;
let _inicioArrobaActiva = null;
let _debounceMencion = null;
let _onCambios = null;

export function abrirHojaComentarios(post, onCambios) {
  if (_overlay) return;
  _post = typeof post === 'object' ? post : { id: post };
  _onCambios = onCambios ?? null;
  _comentarios = [];
  _cargando = true;
  _enviando = false;
  _respondiendo = null;
  _nombreRespondiendo = null;
  _editando = null;
  _sugerencias = [];
  _buscandoMencion = false;
  _inicioArrobaActiva = null;

  _render();
  _cargarComentarios();
}

function _cerrar() {
  clearTimeout(_debounceMencion);
  _overlay?.remove();
  _overlay = null;
  _post = null;
  _onCambios = null;
}

function _uid() {
  return usuarioActual()?.id ?? null;
}

function _render() {
  const el = document.createElement('div');
  el.className = 'comments-overlay';
  el.innerHTML = `
    <div class="comments-backdrop"></div>
    <section class="comments-sheet" role="dialog" aria-label="Comentarios">
      <div class="comments-handle"></div>
      <header class="comments-header">
        <div class="comments-title">
          <span>💬</span>
          <strong id="comments-count">Comentarios</strong>
        </div>
        <button type="button" class="comments-close" aria-label="Cerrar">✕</button>
      </header>
      <div id="comments-list" class="comments-list"></div>
      <footer class="comments-composer">
        <div id="comments-mention-panel" class="comments-mention-panel" hidden></div>
        <div id="comments-action-row" class="comments-action-row" hidden></div>
        <div class="comments-input-row">
          <textarea id="comments-input" rows="1" placeholder="Escribe un comentario..."></textarea>
          <button type="button" id="comments-send" class="comments-send" aria-label="Enviar">➤</button>
        </div>
      </footer>
    </section>
  `;
  document.body.appendChild(el);
  _overlay = el;

  el.querySelector('.comments-backdrop').addEventListener('click', _cerrar);
  el.querySelector('.comments-close').addEventListener('click', _cerrar);
  el.querySelector('#comments-send').addEventListener('click', _onEnviar);

  const input = el.querySelector('#comments-input');
  input.addEventListener('input', () => {
    _autoGrow(input);
    _onCambioTexto(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _onEnviar();
    }
  });
  input.focus();

  _pintar();
}

async function _cargarComentarios() {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select(`
        id, contenido, creado_en, autor_id, parent_id, editado_en,
        perfiles!comentarios_autor_id_fkey
          (id, nombre, nombre_usuario, cdn_foto_perfil)
      `)
      .eq('publicacion_id', _post.id)
      .order('creado_en', { ascending: true });
    if (error) throw error;

    const comentarios = data ?? [];
    const ids = comentarios.map((c) => c.id);
    let reacciones = [];
    if (ids.length > 0) {
      const { data: likes, error: errLikes } = await supabase
        .from('reacciones_comentarios')
        .select('comentario_id, usuario_id, tipo')
        .in('comentario_id', ids);
      if (errLikes) throw errLikes;
      reacciones = likes ?? [];
    }

    const uid = _uid();
    _comentarios = comentarios.map((c) => {
      const propias = reacciones.filter((r) => r.comentario_id === c.id);
      return {
        ...c,
        mi_reaccion: propias.find((r) => r.usuario_id === uid)?.tipo ?? null,
        total_likes: propias.length,
      };
    });
  } catch (e) {
    console.error('hoja-comentarios.js – cargar:', e);
  } finally {
    _cargando = false;
    _pintar();
  }
}

function _pintar() {
  if (!_overlay) return;
  _pintarHeader();
  _pintarLista();
  _pintarComposer();
}

function _pintarHeader() {
  const count = _overlay.querySelector('#comments-count');
  if (!count) return;
  const total = _comentarios.length;
  count.textContent = `${total} ${total === 1 ? 'comentario' : 'comentarios'}`;
}

function _pintarLista() {
  const lista = _overlay.querySelector('#comments-list');
  if (!lista) return;

  if (_cargando) {
    lista.innerHTML = `<div class="comments-loading"><div class="spinner"></div></div>`;
    return;
  }

  const raices = _comentarios.filter((c) => !c.parent_id);
  if (raices.length === 0) {
    lista.innerHTML = `
      <div class="comments-empty">
        <div>💬</div>
        <p>Sé el primero en comentar</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = raices.map((c) => {
    const respuestas = _comentarios.filter((r) => r.parent_id === c.id);
    return _htmlComentario(c, respuestas);
  }).join('');

  _wireLista(lista);
}

function _htmlComentario(c, respuestas = []) {
  return `
    <article class="comment-thread" data-comment-id="${_escapeAttr(c.id)}">
      ${_htmlItem(c, false)}
      ${
        respuestas.length
          ? `<button type="button" class="comment-replies-toggle" data-accion="toggle-respuestas" data-comment-id="${_escapeAttr(c.id)}">
              Ver ${respuestas.length} ${respuestas.length === 1 ? 'respuesta' : 'respuestas'}
            </button>
            <div class="comment-replies" hidden>
              ${respuestas.map((r) => _htmlItem(r, true)).join('')}
            </div>`
          : ''
      }
    </article>
  `;
}

function _htmlItem(item, esRespuesta) {
  const perfil = item.perfiles ?? {};
  const foto = resolverUrlPerfil(perfil);
  const nombre = perfil.nombre ?? 'Usuario';
  const esMio = item.autor_id === _uid();
  const reaccion = item.mi_reaccion;
  const likes = item.total_likes ?? 0;
  const tiempo = `${_tiempoRelativo(item.creado_en)}${item.editado_en ? ' · editado' : ''}`;

  return `
    <div class="comment-item ${esRespuesta ? 'respuesta' : ''}" data-comment-id="${_escapeAttr(item.id)}">
      <button type="button" class="comment-avatar" data-accion="perfil" data-uid="${_escapeAttr(item.autor_id)}">
        ${foto ? `<img src="${_escapeAttr(foto)}" alt="" loading="lazy" />` : `<span>${_escapeHtml(nombre[0] ?? '')}</span>`}
      </button>
      <div class="comment-main">
        <div class="comment-bubble">
          <button type="button" class="comment-author" data-accion="perfil" data-uid="${_escapeAttr(item.autor_id)}">
            ${_escapeHtml(nombre)}
          </button>
          <p>${_htmlConMenciones(item.contenido ?? '')}</p>
        </div>
        <div class="comment-actions">
          <span>${_escapeHtml(tiempo)}</span>
          <button type="button" class="comment-action-pill ${reaccion ? 'activo' : ''}" data-accion="reaccion" data-comment-id="${_escapeAttr(item.id)}">
            ${reaccion ? _escapeHtml(reaccion) : '♡'}${likes > 0 ? ` <strong>${likes}</strong>` : ''}
          </button>
          <button type="button" data-accion="responder" data-comment-id="${_escapeAttr(item.id)}">Responder</button>
          ${esMio ? `<button type="button" data-accion="editar" data-comment-id="${_escapeAttr(item.id)}">Editar</button>` : ''}
          ${esMio ? `<button type="button" class="destructivo" data-accion="eliminar" data-comment-id="${_escapeAttr(item.id)}">Eliminar</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function _wireLista(lista) {
  lista.querySelectorAll('[data-accion]').forEach((el) => {
    el.addEventListener('click', () => {
      const accion = el.dataset.accion;
      const commentId = el.dataset.commentId;
      const item = _comentarios.find((c) => c.id === commentId);

      if (accion === 'toggle-respuestas') {
        const thread = lista.querySelector(`.comment-thread[data-comment-id="${CSS.escape(commentId)}"]`);
        const replies = thread?.querySelector('.comment-replies');
        if (!replies) return;
        replies.hidden = !replies.hidden;
        el.textContent = replies.hidden
          ? el.textContent.replace('Ocultar', 'Ver')
          : el.textContent.replace('Ver', 'Ocultar');
        return;
      }
      if (accion === 'reaccion' && item) _reaccionarComentario(item);
      if (accion === 'responder' && item) _iniciarRespuesta(item);
      if (accion === 'editar' && item) _iniciarEdicion(item);
      if (accion === 'eliminar' && item) _confirmarEliminar(item);
      if (accion === 'perfil') abrirPerfil(el.dataset.uid);
    });
  });
  lista.querySelectorAll('[data-accion="reaccion"]').forEach((btn) => {
    const item = _comentarios.find((c) => c.id === btn.dataset.commentId);
    if (item) _wireSelectorComentario(btn, item);
  });
}

function _wireSelectorComentario(btn, item) {
  let timer = null;
  let longPress = false;
  const abrir = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    longPress = true;
    abrirSelectorReaccion(btn, {
      actual: item.mi_reaccion,
      onSeleccionar: (emoji) => _reaccionarComentario(item, emoji),
    });
  };
  btn.addEventListener('pointerdown', () => {
    longPress = false;
    timer = setTimeout(() => abrir({ preventDefault() {}, stopPropagation() {} }), 450);
  });
  btn.addEventListener('pointerup', () => clearTimeout(timer));
  btn.addEventListener('pointerleave', () => clearTimeout(timer));
  btn.addEventListener('contextmenu', abrir);
  btn.addEventListener('click', (ev) => {
    if (longPress) {
      ev.preventDefault();
      ev.stopPropagation();
      longPress = false;
    }
  }, true);
}

function _pintarComposer() {
  const actionRow = _overlay.querySelector('#comments-action-row');
  const input = _overlay.querySelector('#comments-input');
  const send = _overlay.querySelector('#comments-send');
  if (!actionRow || !input || !send) return;

  send.disabled = _enviando;
  send.innerHTML = _enviando ? `<span class="comments-send-spinner"></span>` : (_editando ? '✓' : '➤');
  input.placeholder = _editando
    ? 'Edita tu comentario...'
    : _respondiendo
      ? 'Escribe tu respuesta...'
      : 'Escribe un comentario...';

  if (_editando) {
    actionRow.hidden = false;
    actionRow.innerHTML = `
      <span>✎ Editando comentario</span>
      <button type="button" id="comments-cancel-action">Cancelar</button>
    `;
  } else if (_respondiendo) {
    actionRow.hidden = false;
    actionRow.innerHTML = `
      <span>↩ Respondiendo a ${_escapeHtml(_nombreRespondiendo ?? 'usuario')}</span>
      <button type="button" id="comments-cancel-action">Cancelar</button>
    `;
  } else {
    actionRow.hidden = true;
    actionRow.innerHTML = '';
  }

  actionRow.querySelector('#comments-cancel-action')?.addEventListener('click', _cancelarAccion);
  _pintarSugerencias();
}

function _iniciarRespuesta(item) {
  const raizId = item.parent_id ?? item.id;
  const perfil = item.perfiles ?? {};
  const mencion = item.parent_id && perfil.nombre_usuario ? `@${perfil.nombre_usuario} ` : '';

  _respondiendo = raizId;
  _nombreRespondiendo = perfil.nombre ?? null;
  _editando = null;
  _setInput(mencion);
  _pintarComposer();
}

function _iniciarEdicion(item) {
  _editando = item.id;
  _respondiendo = null;
  _nombreRespondiendo = null;
  _setInput(item.contenido ?? '');
  _pintarComposer();
}

function _cancelarAccion() {
  _editando = null;
  _respondiendo = null;
  _nombreRespondiendo = null;
  _setInput('');
  _pintarComposer();
}

async function _onEnviar() {
  if (_editando) {
    await _guardarEdicion();
  } else {
    await _enviarComentario();
  }
}

async function _enviarComentario() {
  const uid = _uid();
  const input = _overlay?.querySelector('#comments-input');
  const texto = input?.value.trim() ?? '';
  if (!uid || !texto || _enviando) return;

  _enviando = true;
  _pintarComposer();
  try {
    const { error } = await supabase.from('comentarios').insert({
      publicacion_id: _post.id,
      autor_id: uid,
      contenido: texto,
      parent_id: _respondiendo,
    });
    if (error) throw error;

    _respondiendo = null;
    _nombreRespondiendo = null;
    _setInput('');
    await _cargarComentarios();
    _onCambios?.();
  } catch (e) {
    console.error('hoja-comentarios.js – enviar:', e);
  } finally {
    _enviando = false;
    _pintarComposer();
  }
}

async function _guardarEdicion() {
  const input = _overlay?.querySelector('#comments-input');
  const texto = input?.value.trim() ?? '';
  if (!_editando || !texto || _enviando) return;

  const id = _editando;
  const ahora = new Date().toISOString();
  _enviando = true;
  _pintarComposer();
  try {
    const { error } = await supabase
      .from('comentarios')
      .update({ contenido: texto, editado_en: ahora })
      .eq('id', id);
    if (error) throw error;

    const idx = _comentarios.findIndex((c) => c.id === id);
    if (idx !== -1) _comentarios[idx] = { ..._comentarios[idx], contenido: texto, editado_en: ahora };
    _editando = null;
    _setInput('');
    _pintar();
    _onCambios?.();
  } catch (e) {
    console.error('hoja-comentarios.js – editar:', e);
  } finally {
    _enviando = false;
    _pintarComposer();
  }
}

function _confirmarEliminar(item) {
  const esRaiz = !item.parent_id;
  const msg = esRaiz
    ? '¿Eliminar este comentario y todas sus respuestas?'
    : '¿Eliminar esta respuesta?';
  if (confirm(msg)) _eliminarComentario(item);
}

async function _eliminarComentario(item) {
  try {
    if (!item.parent_id) {
      const respuestas = _comentarios.filter((c) => c.parent_id === item.id).map((c) => c.id);
      if (respuestas.length > 0) {
        await supabase.from('reacciones_comentarios').delete().in('comentario_id', respuestas);
        await supabase.from('comentarios').delete().in('id', respuestas);
      }
    }

    await supabase.from('reacciones_comentarios').delete().eq('comentario_id', item.id);
    const { error } = await supabase.from('comentarios').delete().eq('id', item.id);
    if (error) throw error;

    _comentarios = _comentarios.filter((c) => c.id !== item.id && c.parent_id !== item.id);
    if (_editando === item.id) _cancelarAccion();
    _pintar();
    _onCambios?.();
  } catch (e) {
    console.error('hoja-comentarios.js – eliminar:', e);
  }
}

async function _reaccionarComentario(item, emoji = undefined) {
  const uid = _uid();
  if (!uid) return;

  const antes = item.mi_reaccion;
  const despues = emoji === undefined ? (antes ? null : emojiRapido()) : emoji;
  _actualizarComentarioLocal(item.id, {
    mi_reaccion: despues,
    total_likes: Math.max(0, (item.total_likes ?? 0) +
      (antes == null && despues != null ? 1 : 0) -
      (antes != null && despues == null ? 1 : 0)),
  });
  _pintarLista();

  try {
    if (antes) {
      const { error } = await supabase
        .from('reacciones_comentarios')
        .delete()
        .eq('comentario_id', item.id)
        .eq('usuario_id', uid);
      if (error) throw error;
    } else if (antes == null) {
      const { error } = await supabase
        .from('reacciones_comentarios')
        .insert({ comentario_id: item.id, usuario_id: uid, tipo: despues });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('reacciones_comentarios')
        .update({ tipo: despues })
        .eq('comentario_id', item.id)
        .eq('usuario_id', uid);
      if (error) throw error;
    }
  } catch (e) {
    console.error('hoja-comentarios.js – reaccionar:', e);
    await _cargarComentarios();
  }
}

function _actualizarComentarioLocal(id, patch) {
  const idx = _comentarios.findIndex((c) => c.id === id);
  if (idx !== -1) _comentarios[idx] = { ..._comentarios[idx], ...patch };
}

function _onCambioTexto(texto) {
  const input = _overlay?.querySelector('#comments-input');
  const cursor = input?.selectionStart ?? -1;
  if (cursor < 0) return;

  const idxArroba = indiceArrobaActiva(texto, cursor);
  const query = detectarQueryMencion(texto, cursor);

  if (idxArroba == null || query == null) {
    _sugerencias = [];
    _inicioArrobaActiva = null;
    _pintarSugerencias();
    return;
  }

  _inicioArrobaActiva = idxArroba;
  clearTimeout(_debounceMencion);
  _debounceMencion = setTimeout(async () => {
    _buscandoMencion = true;
    _pintarSugerencias();
    _sugerencias = await buscarPerfilesMencion(query);
    _buscandoMencion = false;
    _pintarSugerencias();
  }, 250);
}

function _pintarSugerencias() {
  const panel = _overlay?.querySelector('#comments-mention-panel');
  if (!panel) return;

  if (_buscandoMencion) {
    panel.hidden = false;
    panel.innerHTML = `<p class="comments-mention-empty">Buscando...</p>`;
    return;
  }

  if (_sugerencias.length === 0) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;
  panel.innerHTML = _sugerencias.map((p) => {
    const foto = resolverUrlPerfil(p);
    return `
      <button type="button" class="comments-mention-item" data-uid="${_escapeAttr(p.id)}">
        <span class="comments-mention-avatar">${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : _escapeHtml((p.nombre ?? '?')[0])}</span>
        <span><strong>${_escapeHtml(p.nombre ?? '')}</strong><small>@${_escapeHtml(p.nombre_usuario ?? '')}</small></span>
      </button>
    `;
  }).join('');

  panel.querySelectorAll('.comments-mention-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const perfil = _sugerencias.find((p) => p.id === btn.dataset.uid);
      if (perfil) _seleccionarMencion(perfil);
    });
  });
}

function _seleccionarMencion(perfil) {
  const input = _overlay?.querySelector('#comments-input');
  if (!input || _inicioArrobaActiva == null) return;

  const cursor = input.selectionStart;
  const res = aplicarMencionSeleccionada({
    texto: input.value,
    inicioArroba: _inicioArrobaActiva,
    cursorPos: cursor,
    nombreUsuario: perfil.nombre_usuario ?? '',
  });

  input.value = res.texto;
  input.selectionStart = res.cursorPos;
  input.selectionEnd = res.cursorPos;
  input.focus();
  _sugerencias = [];
  _inicioArrobaActiva = null;
  _pintarSugerencias();
}

function _setInput(valor) {
  const input = _overlay?.querySelector('#comments-input');
  if (!input) return;
  input.value = valor;
  input.focus();
  input.selectionStart = valor.length;
  input.selectionEnd = valor.length;
  _autoGrow(input);
}

function _autoGrow(input) {
  input.style.height = 'auto';
  input.style.height = `${Math.min(110, input.scrollHeight)}px`;
}

function _htmlConMenciones(texto) {
  return _escapeHtml(texto).replace(/(^|\s)@([a-zA-Z0-9._-]+)/g, '$1<span class="comment-mention">@$2</span>');
}

function _tiempoRelativo(fechaStr) {
  const fecha = fechaStr ? new Date(fechaStr) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  const diff = Date.now() - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'numeric', year: 'numeric' });
}


