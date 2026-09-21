// ═════════════════════════════════════════════════════════════════
// widgets.js — traducción de crear_publicacion_widgets.dart
//
// Ubicación sugerida: js/features/social/CrearPublicacion/widgets.js
//
// Funciones puras que devuelven fragmentos de HTML (mismo criterio
// que buscador-usuarios.js: template strings + wiring de eventos
// aparte, en index.js). _CeldaAsset no aplica (no hay grid de
// galería nativa) — en su lugar hay miniaturaSeleccion (barra
// inferior del paso 0) y previewMedia (carrusel del paso 2).
// ═════════════════════════════════════════════════════════════════

import { resolverUrlPerfil } from '../../../core/url-helper.js';

export function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

/** Avatar circular con fallback a ícono si no hay foto. */
export function htmlAvatar(url, size = 40) {
  return `
    <div class="crear-pub-avatar" style="width:${size}px;height:${size}px">
      ${url ? `<img src="${escapar(url)}" alt="" />` : `<span>👤</span>`}
    </div>
  `;
}

/** Miniatura chica en la barra inferior del paso 0 (seleccionar). */
export function htmlMiniaturaSeleccion(item, orden) {
  const esVideo = item.tipo === 'video';
  return `
    <div class="cp-mini" data-id="${item.id}">
      <div class="cp-mini-media">
        ${esVideo ? `<span class="cp-mini-play">▶</span>` : `<img src="${item.previewUrl}" alt="" />`}
      </div>
      <span class="cp-mini-orden">${orden}</span>
      <button type="button" class="cp-mini-quitar" data-id="${item.id}" aria-label="Quitar">✕</button>
    </div>
  `;
}

/** Miniatura grande en el carrusel de preview del paso 2 (publicar). */
export function htmlPreviewMedia(item, orden) {
  const esVideo = item.tipo === 'video';
  return `
    <div class="cp-preview-item" data-id="${item.id}">
      ${esVideo
        ? `<video src="${item.previewUrl}" muted playsinline></video><span class="cp-preview-play">▶</span>`
        : `<img src="${item.previewUrl}" alt="" />`}
      <span class="cp-preview-orden">${orden}</span>
      <button type="button" class="cp-preview-quitar" data-id="${item.id}" aria-label="Quitar">✕</button>
    </div>
  `;
}

/** Fila de persona reutilizada en sugerencias y resultados del paso 1. */
export function htmlFilaPersona(perfil, marcado) {
  const foto = resolverUrlPerfil(perfil) || '';
  const carrera = perfil.carrera;
  const sub = carrera
    ? `@${escapar(perfil.nombre_usuario ?? '')} · ${escapar(carrera)}`
    : `@${escapar(perfil.nombre_usuario ?? '')}`;
  return `
    <div class="item-usuario cp-fila-persona" data-uid="${perfil.id}">
      <div class="item-usuario-avatar">
        ${foto ? `<img src="${escapar(foto)}" alt="" />` : `<span>👤</span>`}
      </div>
      <div class="item-usuario-info">
        <p class="item-usuario-nombre">${escapar(perfil.nombre ?? '')}</p>
        <p class="item-usuario-usr">${sub}</p>
      </div>
      <span class="cp-check ${marcado ? 'marcado' : ''}" aria-hidden="true"></span>
    </div>
  `;
}

/** Chip removible de una persona ya etiquetada (paso 1 y resumen del paso 2). */
export function htmlChipEtiquetado(perfil) {
  const foto = resolverUrlPerfil(perfil) || '';
  return `
    <span class="cp-chip" data-uid="${perfil.id}">
      <span class="cp-chip-avatar">${foto ? `<img src="${escapar(foto)}" alt="" />` : '👤'}</span>
      ${escapar(perfil.nombre ?? '')}
      <button type="button" class="cp-chip-quitar" data-uid="${perfil.id}" aria-label="Quitar">✕</button>
    </span>
  `;
}