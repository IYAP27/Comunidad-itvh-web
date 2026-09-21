// ═════════════════════════════════════════════════════════════════
// marketplace-home.js
//
// Contenedor principal del módulo "MarketPlace": agrupa 3 secciones
// bajo un mismo AppBar + navegación por pestañas (similar a Flutter)
//
// Secciones:
//   0. Inicio     — feed de publicaciones del Marketplace
//   1. Publicar   — formulario para crear nueva publicación
//   2. Mi negocio — panel privado del emprendedor
//
// Navegación:
//   • Clics en los tabs de la barra inferior
//   • Programáticamente desde "Mi negocio" → "Publicar"
//   • Sincronización de estado entre pestañas
// ═════════════════════════════════════════════════════════════════

import * as MarketplaceFeed from './marketplace-feed-v1.18.7.js';
import * as MarketplacePublicar from './marketplace-publicar-v1.18.7.js';
import * as MarketplaceMiNegocio from './marketplace-mi-negocio-v1.18.7.js';
import { themeNotifier, esOscuroActual } from '../../core/theme.js';

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'publicar', label: 'Publicar', icon: '➕' },
  { id: 'negocio', label: 'Mi negocio', icon: '🏪' },
];

const TAB_INICIAL = 'inicio';

let _contenedor = null;
let _dejarTema = null;
let _tabActiva = null;
let _modulos = {
  inicio: null,
  publicar: null,
  negocio: null,
};

export async function render(contenedor) {
  destruir();
  _contenedor = contenedor;
  // ── FIX: antes era el string 'null' en vez del valor `null`. ──
  // Como _mostrarTab('inicio') comparaba 'inicio' === 'null' (false,
  // por suerte) el bug real estaba al revés: si en algún momento se
  // volvía a llamar _mostrarTab con ese mismo string por error, la
  // comparación `tabId === _tabActiva` podía dar un falso positivo.
  // Se dejaba además sin ningún tab marcado como activo en el primer
  // render porque ningún TABS.id vale 'null'. Usar `null` real evita
  // cualquier colisión con IDs de tabs futuros.
  _tabActiva = null;

  contenedor.innerHTML = `
    <div class="marketplace-home">
      <header class="marketplace-appbar">
        <div class="marketplace-titulo">
          <span class="marketplace-titulo-market">Market</span>
          <span class="marketplace-titulo-place">Place</span>
        </div>
      </header>

      <div class="marketplace-contenido" id="marketplace-contenido"></div>

      <nav class="marketplace-tabbar">
        <div class="marketplace-tabbar-bg"></div>
        ${TABS.map((tab) => `
          <button 
            type="button" 
            class="marketplace-tab" 
            data-tab="${tab.id}"
            title="${tab.label}"
            aria-label="${tab.label}"
          >
            <span class="marketplace-tab-icon">${tab.icon}</span>
            <span class="marketplace-tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </nav>
    </div>
  `;

  // v1.18.7: el tema se aplica también por variables INLINE sobre el
  // contenedor del Marketplace. Así no depende de que el navegador tenga
  // una versión concreta de marketplace.css en caché.
  _aplicarTemaMarketplace();
  _dejarTema?.();
  _dejarTema = themeNotifier.listen(() => _aplicarTemaMarketplace());

  _wireEventos();
  _wireTabExterna();
  // ── FIX: antes se llamaba `await _mostrarTab(_tabActiva)`, es
  // decir, con el string 'null'. Como _mostrarTab compara
  // `tabId === _tabActiva` y ambos valían el mismo string 'null',
  // la función retornaba de inmediato sin montar ningún módulo:
  // el contenido se quedaba en "Cargando..." para siempre y ningún
  // botón de la barra quedaba marcado como activo. Ahora se fuerza
  // explícitamente el tab inicial.
  await _mostrarTab(TAB_INICIAL);
}

let _onTabExterna = null;
function _wireTabExterna() {
  if (_onTabExterna) window.removeEventListener('comunidad:marketplace-tab', _onTabExterna);
  _onTabExterna = (e) => {
    const tab = e.detail?.tab;
    if (TABS.some((t) => t.id === tab)) _mostrarTab(tab);
  };
  window.addEventListener('comunidad:marketplace-tab', _onTabExterna);
}


function _aplicarTemaMarketplace() {
  const home = _contenedor?.querySelector('.marketplace-home');
  if (!home) return;
  const dark = esOscuroActual();
  const vars = dark ? {
    '--marketplace-accent':'#4da3ff',
    '--marketplace-bg':'#101114',
    '--marketplace-bg-dark':'#191b20',
    '--marketplace-border':'#2b2e35',
    '--marketplace-text':'#f5f7fb',
    '--marketplace-text-secondary':'#aeb4bf',
    '--marketplace-glass-bg':'rgba(22,24,29,.92)',
    '--marketplace-glass-border':'rgba(255,255,255,.09)',
    '--marketplace-glass-shadow':'0 10px 34px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35)'
  } : {
    '--marketplace-accent':'#3390EC',
    '--marketplace-bg':'#ffffff',
    '--marketplace-bg-dark':'#f5f5f5',
    '--marketplace-border':'#e0e0e0',
    '--marketplace-text':'#1a1a1a',
    '--marketplace-text-secondary':'#666666',
    '--marketplace-glass-bg':'rgba(255,255,255,.90)',
    '--marketplace-glass-border':'rgba(0,0,0,.08)',
    '--marketplace-glass-shadow':'0 8px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06)'
  };
  Object.entries(vars).forEach(([k,v]) => home.style.setProperty(k,v));
  home.style.backgroundColor = vars['--marketplace-bg'];
  home.style.color = vars['--marketplace-text'];
  const contenido = home.querySelector('.marketplace-contenido');
  if (contenido) {
    contenido.style.backgroundColor = vars['--marketplace-bg'];
    contenido.style.color = vars['--marketplace-text'];
  }
}

export function destruir() {
  _dejarTema?.();
  _dejarTema = null;
  if (_onTabExterna) { window.removeEventListener('comunidad:marketplace-tab', _onTabExterna); _onTabExterna = null; }
  // Destruir módulos activos
  Object.values(_modulos).forEach(mod => {
    if (mod?.destruir) {
      try {
        mod.destruir();
      } catch (e) {
        console.error('Error destruyendo módulo:', e);
      }
    }
  });
  _modulos = { inicio: null, publicar: null, negocio: null };
}

// ─────────────────────────────────────────────────────────────────
// Cambiar de pestaña
// ─────────────────────────────────────────────────────────────────
async function _mostrarTab(tabId) {
  if (tabId === _tabActiva) return;

  _tabActiva = tabId;

  // Actualizar botones activos
  _contenedor.querySelectorAll('.marketplace-tab').forEach(btn => {
    btn.classList.toggle('activa', btn.dataset.tab === tabId);
  });

  const contenidoDiv = _contenedor.querySelector('#marketplace-contenido');
  if (!contenidoDiv) return;

  try {
    contenidoDiv.innerHTML = '<div class="marketplace-cargando">Cargando...</div>';

    switch (tabId) {
      case 'inicio':
        if (!_modulos.inicio) {
          _modulos.inicio = MarketplaceFeed;
        }
        await _modulos.inicio.render(contenidoDiv);
        break;

      case 'publicar':
        if (!_modulos.publicar) {
          _modulos.publicar = MarketplacePublicar;
        }
        await _modulos.publicar.render(contenidoDiv, () => _mostrarTab('negocio'));
        break;

      case 'negocio':
        if (!_modulos.negocio) {
          _modulos.negocio = MarketplaceMiNegocio;
        }
        await _modulos.negocio.render(contenidoDiv, () => _mostrarTab('publicar'));
        break;
    }
  } catch (e) {
    console.error(`Error renderizando tab ${tabId}:`, e);
    contenidoDiv.replaceChildren();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-mensaje';
    errorDiv.textContent = `Error: ${e instanceof Error ? e.message : String(e)}`;
    contenidoDiv.appendChild(errorDiv);
  }
}

// ─────────────────────────────────────────────────────────────────
// Eventos
// ─────────────────────────────────────────────────────────────────
function _wireEventos() {
  _contenedor.querySelectorAll('.marketplace-tab').forEach(btn => {
    btn.addEventListener('click', () => _mostrarTab(btn.dataset.tab));
  });
}

// Navegar a perfil público de emprendedor
export async function irAlPerfilEmprendedor(emprendedorId) {
  // Esta función puede ser llamada desde marketplace-feed.js
  // para navegar al perfil público del emprendedor
  try {
    // Importar el módulo marketplace-perfil-publico
    const { render } = await import('./marketplace-perfil-publico.js');
    
    // Crear un modal o pantalla para mostrar el perfil
    const modal = document.createElement('div');
    modal.className = 'marketplace-perfil-modal';
    modal.innerHTML = '<div class="marketplace-perfil-contenido"></div>';
    
    document.body.appendChild(modal);
    
    await render(
      modal.querySelector('.marketplace-perfil-contenido'),
      emprendedorId,
      () => modal.remove()
    );
  } catch (e) {
    console.error('Error abriendo perfil público:', e);
  }
}