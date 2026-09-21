// ═════════════════════════════════════════════════════════════════
// reacciones.js
//
// Selector de emojis + hoja de reacciones para publicaciones.
// Replica la idea de reacciones.dart / hoja_reacciones.dart con una
// implementación web ligera y reusable.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';

const STORAGE_KEY = 'comunidad_itvh_emojis_recientes';
const INICIALES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const TODOS = [
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏',
  '😍', '🤩', '🥳', '😎', '😡', '😤', '🤯', '💯',
  '✨', '🙌', '👌', '🤝', '😆', '🤣', '😔', '👀',
  '🎉', '🏆', '📌', '💙', '🫶', '🫡', '🤔', '😱',
];

let _selector = null;
let _sheet = null;

export function emojiRapido() {
  return recientes()[0] ?? '👍';
}

export function recientes() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(raw) && raw.length ? raw : INICIALES;
  } catch (_e) {
    return INICIALES;
  }
}

export function registrarEmoji(emoji) {
  const lista = recientes().filter((e) => e !== emoji);
  lista.unshift(emoji);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, 20)));
}

export function abrirSelectorReaccion(anchor, { actual = null, onSeleccionar } = {}) {
  cerrarSelectorReaccion();

  const backdrop = document.createElement('div');
  backdrop.className = 'reaction-picker-backdrop';
  backdrop.addEventListener('click', cerrarSelectorReaccion);

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.innerHTML = `
    <div class="reaction-picker-section">
      ${recientes().slice(0, 8).map((e) => _btnEmoji(e)).join('')}
      ${actual ? `<button type="button" class="reaction-picker-remove" data-remove="1">Quitar</button>` : ''}
    </div>
    <div class="reaction-picker-grid">
      ${TODOS.map((e) => _btnEmoji(e)).join('')}
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(picker);
  _selector = { backdrop, picker };

  const rect = anchor?.getBoundingClientRect?.() ?? { left: 16, top: window.innerHeight / 2, bottom: window.innerHeight / 2 };
  const width = 306;
  const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
  const topPreferido = rect.top - 182;
  const top = topPreferido > 10 ? topPreferido : Math.min(rect.bottom + 8, window.innerHeight - 220);
  picker.style.left = `${left}px`;
  picker.style.top = `${Math.max(10, top)}px`;

  picker.querySelectorAll('[data-emoji]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      registrarEmoji(emoji);
      cerrarSelectorReaccion();
      onSeleccionar?.(emoji);
    });
  });
  picker.querySelector('[data-remove]')?.addEventListener('click', () => {
    cerrarSelectorReaccion();
    onSeleccionar?.(null);
  });
}

export function cerrarSelectorReaccion() {
  _selector?.backdrop.remove();
  _selector?.picker.remove();
  _selector = null;
}

function _btnEmoji(emoji) {
  return `<button type="button" class="reaction-emoji-btn" data-emoji="${emoji}">${emoji}</button>`;
}

export async function abrirHojaReacciones(post) {
  const postId = typeof post === 'string' ? post : post?.id;
  if (!postId) return;
  if (_sheet) _sheet.remove();

  const overlay = document.createElement('div');
  overlay.className = 'reactions-sheet-overlay';
  overlay.innerHTML = `
    <div class="reactions-sheet-backdrop"></div>
    <section class="reactions-sheet">
      <div class="comments-handle"></div>
      <header class="reactions-sheet-header">
        <h2>Reacciones</h2>
        <button type="button" aria-label="Cerrar">✕</button>
      </header>
      <div id="reactions-sheet-body" class="reactions-sheet-body">
        <div class="spinner"></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  _sheet = overlay;
  overlay.querySelector('.reactions-sheet-backdrop').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.reactions-sheet-header button').addEventListener('click', () => overlay.remove());

  await _cargarReacciones(postId, overlay);
}

async function _cargarReacciones(postId, overlay) {
  const body = overlay.querySelector('#reactions-sheet-body');
  try {
    const { data, error } = await supabase
      .from('reacciones')
      .select(`
        usuario_id, tipo, creado_en,
        perfiles!reacciones_usuario_id_fkey
          (id, nombre, nombre_usuario, cdn_foto_perfil)
      `)
      .eq('publicacion_id', postId)
      .order('creado_en', { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    if (!rows.length) {
      body.innerHTML = `<div class="reactions-empty">Aún no hay reacciones.</div>`;
      return;
    }

    body.innerHTML = rows.map((r) => {
      const perfil = r.perfiles ?? {};
      const foto = resolverUrlPerfil(perfil);
      const nombre = perfil.nombre ?? 'Usuario';
      const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '';
      return `
        <button type="button" class="reaction-row" data-uid="${_escapeAttr(perfil.id ?? r.usuario_id)}">
          <span class="reaction-row-avatar">
            ${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : `<span>${_escapeHtml(nombre[0] ?? '')}</span>`}
          </span>
          <span class="reaction-row-text">
            <strong>${_escapeHtml(nombre)}</strong>
            <small>${_escapeHtml(usuario)}</small>
          </span>
          <span class="reaction-row-emoji">${_escapeHtml(r.tipo ?? '👍')}</span>
        </button>
      `;
    }).join('');

    body.querySelectorAll('.reaction-row').forEach((row) => {
      row.addEventListener('click', () => abrirPerfil(row.dataset.uid));
    });
  } catch (e) {
    console.error('reacciones.js – cargar:', e);
    body.innerHTML = `<div class="reactions-empty">No se pudieron cargar las reacciones.</div>`;
  }
}


