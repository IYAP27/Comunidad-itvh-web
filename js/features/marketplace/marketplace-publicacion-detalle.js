import { resolverUrlMarketplace } from '../../core/url-helper.js';
import { usuarioActual } from '../../core/auth.js';
import { abrirReporteContenido } from '../reportes/reportes-ui.js';
import { escapeHtml as _esc, escapeAttr as _escAttr } from '../../core/html-utils.js';

let _overlay = null;

export function abrirDetallePublicacion(pub, { onContactar, onVerEmprendedor } = {}) {
  cerrarDetallePublicacion();

  const imagenes = [...(pub.marketplace_imagenes || [])]
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map((img) => resolverUrlMarketplace(img))
    .filter(Boolean);

  let indice = 0;
  _overlay = document.createElement('div');
  _overlay.className = 'marketplace-detalle-overlay';
  _overlay.innerHTML = `
    <section class="marketplace-detalle-card" role="dialog" aria-modal="true" aria-label="Detalle de publicación">
      <button type="button" class="marketplace-detalle-cerrar" aria-label="Cerrar">✕</button>
      <div class="marketplace-detalle-galeria">
        ${imagenes.length ? `<img id="marketplace-detalle-img" src="${_escAttr(imagenes[0])}" alt="${_escAttr(pub.titulo || 'Publicación')}">` : '<div class="marketplace-detalle-sin-foto">📦</div>'}
        ${imagenes.length > 1 ? `
          <button class="marketplace-detalle-nav prev" type="button" aria-label="Anterior">‹</button>
          <button class="marketplace-detalle-nav next" type="button" aria-label="Siguiente">›</button>
          <div class="marketplace-detalle-contador" id="marketplace-detalle-contador">1 / ${imagenes.length}</div>
        ` : ''}
      </div>
      <div class="marketplace-detalle-info">
        <div class="marketplace-detalle-top">
          <span class="marketplace-detalle-tipo">${pub.tipo === 'servicio' ? '🔧 Servicio' : '📦 Producto'}</span>
          ${pub.marketplace_categorias ? `<span class="marketplace-detalle-cat">${pub.marketplace_categorias.emoji || '📦'} ${_esc(pub.marketplace_categorias.nombre || '')}</span>` : ''}
        </div>
        <h2>${_esc(pub.titulo || '')}</h2>
        <div class="marketplace-detalle-precio">${pub.precio != null ? `$${Number(pub.precio).toFixed(2)} MXN` : 'Precio a tratar'}</div>
        <p class="marketplace-detalle-descripcion">${_esc(pub.descripcion || 'Sin descripción')}</p>
        <button type="button" class="marketplace-detalle-negocio">${_esc(pub.emprendedores?.nombre_negocio || 'Emprendedor')} ${pub.emprendedores?.estado === 'verificado' ? '✅' : ''}</button>
        <div class="marketplace-detalle-acciones">
          <button type="button" class="marketplace-btn-secundario marketplace-detalle-ver-negocio">Ver negocio</button>
          <button type="button" class="marketplace-btn-secundario marketplace-detalle-reportar">🚩 Reportar</button>
          <button type="button" class="marketplace-btn-principal marketplace-detalle-contactar">📬 Contactar</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(_overlay);

  const pintar = () => {
    const img = _overlay?.querySelector('#marketplace-detalle-img');
    const c = _overlay?.querySelector('#marketplace-detalle-contador');
    if (img) img.src = imagenes[indice];
    if (c) c.textContent = `${indice + 1} / ${imagenes.length}`;
  };

  _overlay.querySelector('.marketplace-detalle-cerrar')?.addEventListener('click', cerrarDetallePublicacion);
  _overlay.addEventListener('click', (e) => { if (e.target === _overlay) cerrarDetallePublicacion(); });
  _overlay.querySelector('.marketplace-detalle-nav.prev')?.addEventListener('click', () => { indice = (indice - 1 + imagenes.length) % imagenes.length; pintar(); });
  _overlay.querySelector('.marketplace-detalle-nav.next')?.addEventListener('click', () => { indice = (indice + 1) % imagenes.length; pintar(); });
  _overlay.querySelector('.marketplace-detalle-contactar')?.addEventListener('click', () => { cerrarDetallePublicacion(); onContactar?.(); });
  const autorId = pub.emprendedores?.perfiles?.id || null;
  const btnReportar = _overlay.querySelector('.marketplace-detalle-reportar');
  if (btnReportar && usuarioActual()?.id === autorId) btnReportar.remove();
  else btnReportar?.addEventListener('click', () => {
    cerrarDetallePublicacion();
    abrirReporteContenido({ tipo: 'marketplace', contenidoId: pub.id, autorId, titulo: 'Reportar publicación de Marketplace', metadata: { titulo: pub.titulo || '', emprendedor_id: pub.emprendedores?.id || null } });
  });
  _overlay.querySelector('.marketplace-detalle-ver-negocio')?.addEventListener('click', () => { cerrarDetallePublicacion(); onVerEmprendedor?.(); });
  _overlay.querySelector('.marketplace-detalle-negocio')?.addEventListener('click', () => { cerrarDetallePublicacion(); onVerEmprendedor?.(); });
  document.addEventListener('keydown', _onKey);
}

export function cerrarDetallePublicacion() {
  document.removeEventListener('keydown', _onKey);
  _overlay?.remove();
  _overlay = null;
}

function _onKey(e) { if (e.key === 'Escape') cerrarDetallePublicacion(); }
