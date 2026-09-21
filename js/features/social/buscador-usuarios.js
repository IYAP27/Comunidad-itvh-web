// ═════════════════════════════════════════════════════════════════
// buscador-usuarios.js — traducción web de buscador_usuarios.dart
//
// Overlay tipo "pushed screen" (reusa .pushed-screen / .appbar-simple
// de shell.css) con:
//   • Sugerencias "Personas que quizás conozcas" (misma carrera
//     primero, luego el resto ordenado por total_seguidores)
//   • Búsqueda en vivo por nombre o @usuario, con debounce de 400ms
//   • Botón seguir/dejar de seguir optimista (igual que en Flutter:
//     se actualiza la UI antes de esperar la respuesta de Supabase,
//     y se revierte si falla)
//
// No usa el router (#/hash) porque no hace falta una URL propia para
// esto todavía — se monta directo sobre document.body, igual que el
// banner de notificaciones de shell.js, y se destruye por completo
// al cerrar (sin dejar listeners vivos).
//
// PENDIENTE: al tocar un resultado debería navegar al perfil público
// del usuario (equivalente web de PerfilPublicoScreen). Como esa
// pantalla no existe todavía en el proyecto web, por ahora solo se
// loguea en consola — ver _irAPerfil().
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { escapeHtml as _escapar, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _overlayEl      = null;
let _debounceTimer   = null;
let _siguiendo       = new Set(); // ids que ya sigo
let _sugerencias     = [];
let _resultados      = [];
let _cargandoSug     = true;
let _buscando        = false;
let _hayBusqueda     = false;

/// Punto de entrada: monta el overlay y dispara las cargas
/// iniciales. Si ya está abierto, no hace nada (evita duplicados si
/// se llama dos veces seguidas por doble click).
export function abrir() {
  if (_overlayEl) return;
  _hayBusqueda = false;
  _resultados  = [];
  _cargandoSug = true;
  _render();
  _cargarEstadoSeguidos();
  _cargarSugerencias();
}

function _cerrar() {
  clearTimeout(_debounceTimer);
  _overlayEl?.remove();
  _overlayEl = null;
}

function _uid() {
  return usuarioActual()?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────
// CARGA DE DATOS
// ─────────────────────────────────────────────────────────────────

async function _cargarEstadoSeguidos() {
  const uid = _uid();
  if (!uid) return;
  try {
    const { data, error } = await supabase
      .from('seguidores')
      .select('seguido_id')
      .eq('seguidor_id', uid);
    if (error) throw error;
    _siguiendo = new Set((data ?? []).map((r) => r.seguido_id));
  } catch (e) {
    console.error('buscador-usuarios.js – seguidos:', e);
  }
}

/// Sugerencias: prioriza usuarios de la misma carrera que aún no
/// sigo, y completa con el resto ordenado por total_seguidores —
/// mismo criterio que _cargarSugerencias() en Flutter.
async function _cargarSugerencias() {
  const uid = _uid();
  if (!uid) return;

  try {
    const { data: miPerfil } = await supabase
      .from('perfiles')
      .select('carrera')
      .eq('id', uid)
      .maybeSingle();

    const miCarrera = miPerfil?.carrera ?? null;

    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_usuario, cdn_foto_perfil, carrera, total_seguidores')
      .neq('id', uid)
      .order('total_seguidores', { ascending: false })
      .limit(20);
    if (error) throw error;

    const todos = data ?? [];

    const mismaCarrera = todos.filter(
      (u) => miCarrera && u.carrera === miCarrera && !_siguiendo.has(u.id),
    );
    const otros = todos.filter(
      (u) => !_siguiendo.has(u.id) && !mismaCarrera.some((m) => m.id === u.id),
    );

    _sugerencias = [...mismaCarrera, ...otros].slice(0, 10);
  } catch (e) {
    console.error('buscador-usuarios.js – sugerencias:', e);
  } finally {
    _cargandoSug = false;
    _pintarBody();
  }
}

async function _buscar(texto) {
  const uid = _uid();
  if (!uid) return;

  _buscando = true;
  _pintarBody();

  try {
    const q = texto.startsWith('@') ? texto.slice(1) : texto;
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_usuario, cdn_foto_perfil, carrera')
      .neq('id', uid)
      .or(`nombre.ilike.%${q}%,nombre_usuario.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;

    _resultados = data ?? [];
  } catch (e) {
    console.error('buscador-usuarios.js – buscar:', e);
  } finally {
    _buscando = false;
    _pintarBody();
  }
}

/// Seguir / dejar de seguir, optimista: cambia el Set local antes
/// de esperar la respuesta de Supabase, y revierte si la escritura
/// falla — igual que _toggleFollow() en Flutter.
async function _toggleFollow(usuarioId, btnEl) {
  const uid = _uid();
  if (!uid) return;

  const yaSigo = _siguiendo.has(usuarioId);
  yaSigo ? _siguiendo.delete(usuarioId) : _siguiendo.add(usuarioId);
  _actualizarBotonSeguir(btnEl, !yaSigo);

  try {
    if (yaSigo) {
      const { error } = await supabase
        .from('seguidores')
        .delete()
        .eq('seguidor_id', uid)
        .eq('seguido_id', usuarioId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('seguidores')
        .insert({ seguidor_id: uid, seguido_id: usuarioId });
      if (error) throw error;
    }
  } catch (e) {
    // Revierte
    yaSigo ? _siguiendo.add(usuarioId) : _siguiendo.delete(usuarioId);
    _actualizarBotonSeguir(btnEl, yaSigo);
    console.error('buscador-usuarios.js – follow:', e);
  }
}

function _actualizarBotonSeguir(btnEl, siguiendo) {
  if (!btnEl) return;
  btnEl.textContent = siguiendo ? 'Siguiendo' : 'Seguir';
  btnEl.classList.toggle('siguiendo', siguiendo);
}

function _irAPerfil(usuarioId) {
  abrirPerfil(usuarioId);
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────

function _render() {
  const el = document.createElement('div');
  el.className = 'pushed-screen';
  el.id = 'buscador-usuarios-screen';
  el.innerHTML = `
    <header class="appbar-simple">
      <button type="button" class="btn-volver" id="btn-cerrar-buscador" aria-label="Volver">‹</button>
      <div class="buscador-input-wrap">
        <svg class="buscador-input-icono" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
        <input type="text" id="input-buscar-usuario" placeholder="Buscar por nombre o @usuario" autocomplete="off" />
        <button type="button" id="btn-limpiar-buscador" class="btn-limpiar-buscador" hidden aria-label="Limpiar">✕</button>
      </div>
    </header>
    <main class="buscador-body" id="buscador-body"></main>
  `;
  document.body.appendChild(el);
  _overlayEl = el;

  el.querySelector('#btn-cerrar-buscador').addEventListener('click', _cerrar);

  const input       = el.querySelector('#input-buscar-usuario');
  const btnLimpiar  = el.querySelector('#btn-limpiar-buscador');
  input.focus();

  input.addEventListener('input', () => {
    const texto = input.value.trim();
    btnLimpiar.hidden = texto.length === 0;
    _hayBusqueda = texto.length > 0;

    clearTimeout(_debounceTimer);
    if (!texto) {
      _resultados = [];
      _pintarBody();
      return;
    }
    _debounceTimer = setTimeout(() => _buscar(texto), 400);
  });

  btnLimpiar.addEventListener('click', () => {
    input.value = '';
    btnLimpiar.hidden = true;
    _hayBusqueda = false;
    _resultados  = [];
    _pintarBody();
    input.focus();
  });

  _pintarBody();
}

function _pintarBody() {
  const body = _overlayEl?.querySelector('#buscador-body');
  if (!body) return;

  if (_hayBusqueda) {
    body.innerHTML = _buscando
      ? _htmlSpinner()
      : (_resultados.length === 0 ? _htmlSinResultados() : _htmlLista(_resultados, null));
  } else {
    body.innerHTML = _cargandoSug
      ? _htmlSpinner()
      : (_sugerencias.length === 0
          ? `<p class="buscador-vacio">No hay sugerencias disponibles</p>`
          : _htmlLista(_sugerencias, 'Personas que quizás conozcas'));
  }

  _wireItemsUsuario(body);
}

function _htmlSpinner() {
  return `<div class="spinner"></div>`;
}

function _htmlSinResultados() {
  const texto = _overlayEl.querySelector('#input-buscar-usuario').value;
  return `
    <div class="buscador-sin-resultados">
      <p>Sin resultados para<br><strong>"${_escapar(texto)}"</strong></p>
    </div>
  `;
}

function _htmlLista(usuarios, etiqueta) {
  const encabezado = etiqueta
    ? `<p class="buscador-seccion-label">${_escapar(etiqueta)}</p>`
    : `<p class="buscador-seccion-label">${usuarios.length} resultado${usuarios.length === 1 ? '' : 's'}</p>`;

  return `
    ${encabezado}
    ${usuarios.map(_htmlItemUsuario).join('')}
  `;
}

function _htmlItemUsuario(u) {
  const foto      = resolverUrlPerfil(u) || '';
  const siguiendo = _siguiendo.has(u.id);
  return `
    <div class="item-usuario" data-uid="${_escapeAttr(u.id)}">
      <div class="item-usuario-avatar">
        ${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : `<span>👤</span>`}
      </div>
      <div class="item-usuario-info">
        <p class="item-usuario-nombre">${_escapar(u.nombre ?? '')}</p>
        ${u.nombre_usuario ? `<p class="item-usuario-usr">@${_escapar(u.nombre_usuario)}</p>` : ''}
        ${u.carrera ? `<p class="item-usuario-carrera">${_escapar(u.carrera)}</p>` : ''}
      </div>
      <button type="button" class="btn-seguir ${siguiendo ? 'siguiendo' : ''}" data-uid="${_escapeAttr(u.id)}">
        ${siguiendo ? 'Siguiendo' : 'Seguir'}
      </button>
      <span class="item-usuario-flecha">›</span>
    </div>
  `;
}

function _wireItemsUsuario(body) {
  body.querySelectorAll('.btn-seguir').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _toggleFollow(btn.dataset.uid, btn);
    });
  });
  body.querySelectorAll('.item-usuario').forEach((row) => {
    row.addEventListener('click', () => _irAPerfil(row.dataset.uid));
  });
}

