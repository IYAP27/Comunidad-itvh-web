// hoja-vistas.js — lista de usuarios que vieron una historia
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../../core/html-utils.js';
import { supabase } from '../../../core/supabase-client.js';
import { resolverUrlPerfil } from '../../../core/url-helper.js';
import { abrirPerfil } from '../../perfil/mi-perfil.js';

export async function abrirHojaVistas(historiaId) {
  if (!historiaId) return;
  const overlay = document.createElement('div');
  overlay.className = 'reactions-sheet-overlay';
  overlay.innerHTML = `
    <div class="reactions-sheet-backdrop"></div>
    <section class="reactions-sheet">
      <div class="comments-handle"></div>
      <header class="reactions-sheet-header">
        <h2>Vistas</h2>
        <button type="button" aria-label="Cerrar">✕</button>
      </header>
      <div id="vistas-sheet-body" class="reactions-sheet-body">
        <div class="spinner"></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.reactions-sheet-backdrop').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.reactions-sheet-header button').addEventListener('click', () => overlay.remove());

  const body = overlay.querySelector('#vistas-sheet-body');
  try {
    const rows = await _cargarVistas(historiaId);

    if (!rows.length) {
      body.innerHTML = `<div class="reactions-empty">Aún no hay vistas.</div>`;
      return;
    }

    body.innerHTML = rows.map((r) => {
      const perfil = r.perfiles ?? {};
      const foto = resolverUrlPerfil(perfil);
      const nombre = perfil.nombre ?? 'Usuario';
      const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '';
      const fechaTexto = r._fecha ? new Date(r._fecha).toLocaleString() : '';
      return `
        <button type="button" class="reaction-row" data-uid="${perfil.id ?? r.usuario_id}">
          <span class="reaction-row-avatar">
            ${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : `<span>${_escapeHtml(nombre[0] ?? '')}</span>`}
          </span>
          <span class="reaction-row-text">
            <strong>${_escapeHtml(nombre)}</strong>
            <small>${_escapeHtml(usuario)}</small>
          </span>
          ${fechaTexto ? `<span class="reaction-row-meta">${_escapeHtml(fechaTexto)}</span>` : ''}
        </button>
      `;
    }).join('');

    body.querySelectorAll('.reaction-row').forEach((row) => row.addEventListener('click', () => abrirPerfil(row.dataset.uid)));
  } catch (e) {
    console.error('hoja-vistas.js – cargar:', e);
    body.innerHTML = `<div class="reactions-empty">No se pudieron cargar las vistas.</div>`;
  }
}

/**
 * Trae las vistas de una historia ordenadas por fecha descendente.
 * La columna de fecha real en `historia_vistas` es `visto_en`
 * (timestamptz NOT NULL DEFAULT now(), ver schema) — se consulta
 * directamente sin necesidad de probar nombres alternativos.
 */
async function _cargarVistas(historiaId) {
  const { data, error } = await supabase
    .from('historia_vistas')
    .select(`usuario_id, visto_en, perfiles!historia_vistas_usuario_id_fkey(id, nombre, nombre_usuario, cdn_foto_perfil)`)
    .eq('historia_id', historiaId)
    .order('visto_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, _fecha: r.visto_en ?? null }));
}

