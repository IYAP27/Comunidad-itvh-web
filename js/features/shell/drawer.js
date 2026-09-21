// ═════════════════════════════════════════════════════════════════
// drawer.js — traducción de _buildDrawer() en Feed.dart
//
// Contenido real del menú lateral. shell.js ya maneja el toggle
// abrir/cerrar del panel; este archivo solo pinta el contenido y
// conecta cada tile con su pantalla (como "pushed screens" sobre
// document.body, mismo patrón que ya usan historial-*.js).
// ═════════════════════════════════════════════════════════════════

import { alternarTema, esOscuroActual } from '../../core/theme.js';
import { renderConocePlantel } from './conoce-plantel.js';
import { renderHistoriaPlantel } from './historia-plantel-screen.js';
import { renderOfertaEducativa } from '../oferta-educativa/oferta-educativa.js';
import { renderDonaciones } from './donaciones.js';
import { renderAjustes } from './ajustes-screen.js';

export function render(root, { onCerrar } = {}) {
  const oscuro = esOscuroActual();

  root.innerHTML = `
    <div class="drawer-contenido">
      <h2 class="drawer-titulo">Menú</h2>

      <p class="drawer-seccion">PLANTEL</p>

      <button class="drawer-tile-hero" id="dr-conoce" style="background-image:url('/assets/images/drawer_imagen1.webp')">
        <span class="drawer-tile-icono">📍</span>
        <span class="drawer-tile-texto"><strong>Conoce el plantel</strong><small>Descubre nuestras instalaciones</small></span>
      </button>

      <div class="drawer-grid-fila">
        <button class="drawer-tile-grid" id="dr-historia" style="background-image:url('/assets/images/drawer_imagen2.webp')">
          <span class="drawer-tile-grid-icono">📖</span>
          <span class="drawer-tile-grid-label">Un poco de historia</span>
        </button>
        <button class="drawer-tile-grid" id="dr-oferta" style="background-image:url('/assets/images/drawer_imagen3.webp')">
          <span class="drawer-tile-grid-icono">➕</span>
          <span class="drawer-tile-grid-label">Oferta educativa</span>
        </button>
      </div>

      <button class="drawer-tile solido" id="dr-compartir">
        <span class="drawer-tile-icono">📤</span>
        <span class="drawer-tile-texto"><strong>Comparte "Comunidad ITVH"</strong><small>Invita a otros a descubrir la app</small></span>
      </button>

      <button class="drawer-tile solido" id="dr-donaciones">
        <span class="drawer-tile-icono">☕</span>
        <span class="drawer-tile-texto"><strong>¿Nos invitas un café?</strong><small>Apoya el desarrollo de la app</small></span>
      </button>

      <p class="drawer-seccion">PLATAFORMAS</p>
      <div class="drawer-plataformas">
        <button class="plataforma-btn" id="dr-sie">
          <img src="/assets/images/sie_logo.png" alt="SIE" />
          <small>SIE</small>
        </button>
        <button class="plataforma-btn" id="dr-sws">
          <img src="/assets/images/sws_logo.webp" alt="SWS" />
          <small>SWS</small>
        </button>
      </div>

      <p class="drawer-seccion">PREFERENCIAS</p>

      <div class="drawer-toggle-tema">
        <span id="dr-tema-icono">${oscuro ? '🌙' : '☀️'}</span>
        <span class="drawer-toggle-label" id="dr-tema-label">${oscuro ? 'Modo oscuro' : 'Modo claro'}</span>
        <label class="switch">
          <input type="checkbox" id="dr-toggle-tema" ${oscuro ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>

      <button class="drawer-tile solido" id="dr-ajustes">
        <span class="drawer-tile-icono">⚙️</span>
        <span class="drawer-tile-texto"><strong>Ajustes</strong><small>Cuenta, notificaciones, privacidad</small></span>
      </button>

      <div class="drawer-pie" id="dr-pie">
        <p>Comunidad ITVH</p>
        <p class="drawer-pie-sub">Programix NaveJL © 2026</p>
      </div>
    </div>
  `;

  /// Cierra el drawer y abre una pantalla como overlay sobre
  /// document.body — mismo patrón que historial-*.js y pdf-viewer.
  function _abrirPantalla(renderFn) {
    onCerrar?.();
    const overlay = document.createElement('div');
    overlay.className = 'pushed-screen';
    document.body.appendChild(overlay);
    renderFn(overlay, () => overlay.remove());
  }

  root.querySelector('#dr-conoce').addEventListener('click', () => _abrirPantalla(renderConocePlantel));
  root.querySelector('#dr-historia').addEventListener('click', () => _abrirPantalla(renderHistoriaPlantel));
  root.querySelector('#dr-oferta').addEventListener('click', () => _abrirPantalla(renderOfertaEducativa));
  root.querySelector('#dr-donaciones').addEventListener('click', () => _abrirPantalla(renderDonaciones));

  root.querySelector('#dr-ajustes').addEventListener('click', () => {
    // router.js ya reacciona solo al cambio de authState tras
    // cerrarSesion(); onSesionCerrada aquí solo cierra el overlay.
    _abrirPantalla((r, onVolver) => renderAjustes(r, onVolver, onVolver));
  });

  root.querySelector('#dr-compartir').addEventListener('click', async () => {
    const texto =
      'Descarga "Comunidad ITVH". La app exclusiva del Tec de Villahermosa.\n\n' +
      'Android: https://play.google.com/store/apps/details?id=com.programixnavejl.comunidad_tecnm\n\n' +
      'iOS: EN LA WEB, PARA FRESAS QUE USAN IPHONE';

    if (navigator.share) {
      try { await navigator.share({ text: texto }); } catch (_e) { /* usuario canceló */ }
    } else {
      await navigator.clipboard.writeText(texto);
      alert('Texto copiado al portapapeles.');
    }
  });

  root.querySelector('#dr-sie').addEventListener('click', () =>
    window.open('https://villahermosa.sistemasie.app/cgi-bin/sie.pl?Opc=PINDEXESTUDIANTE&psie=villahermosa&dummy=0', '_blank'));
  root.querySelector('#dr-sws').addEventListener('click', () =>
    window.open('https://sws.villahermosa.tecnm.mx/inicio', '_blank'));

  root.querySelector('#dr-toggle-tema').addEventListener('change', (e) => {
    alternarTema();
    root.querySelector('#dr-tema-icono').textContent = e.target.checked ? '🌙' : '☀️';
    root.querySelector('#dr-tema-label').textContent = e.target.checked ? 'Modo oscuro' : 'Modo claro';
  });

  root.querySelector('#dr-pie').addEventListener('click', () =>
    window.open('https://programix-navejl.github.io/Programix-NaveJL-Pagina-Oficial/', '_blank'));
}