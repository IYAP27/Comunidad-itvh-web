// ═════════════════════════════════════════════════════════════════
// shell.js — traducción de Feed.dart (FeedTab)
//
// Contenedor raíz tras autenticarse: AppBar + TabBar segmentado +
// Drawer lateral + banner de notificaciones en tiempo real.
//
// Cada pestaña carga su módulo con import() dinámico la primera vez
// que se activa (lazy) — así no se paga el costo de Marketplace,
// Chat, etc. hasta que el usuario realmente entra a esa pestaña.
// Mientras un módulo no exista todavía (fases futuras), se muestra
// un placeholder en vez de romper.
//
// El Drawer real (contenido) se agrega en drawer.js — este archivo
// solo maneja el toggle abrir/cerrar y el contenedor.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import * as BuscadorUsuarios from '../social/buscador-usuarios.js';
import * as Notificaciones from '../social/notificaciones.js';
import { obtenerPreferenciasNotificaciones } from '../social/notificaciones-preferencias.js';

const TABS = [
  { id: 'comunidad', label: 'Comunidad', modulo: '../social/feed.js?v=1.18.6' },
  { id: 'perfil',    label: 'Mi Perfil', modulo: '../perfil/mi-perfil.js' },
  { id: 'market',    label: 'Market',    modulo: '../marketplace/marketplace-home.js?v=1.18.6' },
  { id: 'jaguares',  label: 'Jaguares',  modulo: '../chat/jaguar-chat.js' },
  { id: 'ubicatec',  label: 'UbicaTec',  modulo: '../mapa/ubicatecnm.js' },
];
// Íconos inline (SVG, sin librerías externas) — outline por defecto,
// se rellenan con currentColor cuando la pestaña está activa vía CSS
// (.shell-tab.activa svg { fill: currentColor }).
const ICONOS = {
  comunidad: `<svg viewBox="0 0 24 24"><path d="M12 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-6 1c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm12 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 2c-2.33 0-7 1.17-7 3.5V21h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-6.29.79C4.36 15.14 2 15.91 2 17.5V19h3v-1.5c0-.62.25-1.19.71-1.71zm12.58 0c.46.52.71 1.09.71 1.71V19h3v-1.5c0-1.59-2.36-2.36-3.71-2.71z"/></svg>`,
  perfil: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  market: `<svg viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.59 1.41.59s1.05-.23 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM6.5 8C5.67 8 5 7.33 5 6.5S5.67 5 6.5 5 8 5.67 8 6.5 7.33 8 6.5 8z"/></svg>`,
  jaguares: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>`,
  ubicatec: `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  admin: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
};

function _iconoTab(id) {
  return ICONOS[id] ?? '';
}

const TAB_ADMIN = { id: 'admin', label: 'Admin', modulo: '../../admin/panel-admin.js' };

let _esAdmin = false;
let _tabActiva = 'comunidad';
let _canalNotif = null;
let _contenedor = null;

export async function render(contenedor) {
  _contenedor = contenedor;
  _esAdmin = await _verificarSiEsAdmin();

  const tabs = _esAdmin ? [...TABS, TAB_ADMIN] : TABS;
  const perfil = await _cargarPerfil();

  contenedor.innerHTML = `
    <div class="shell-app">
      <header class="shell-appbar">
        <button type="button" id="btn-drawer" class="btn-icono" aria-label="Abrir menú">☰</button>
        <img src="/assets/images/appbar_modo_oscuro.png" alt="Comunidad ITVH" class="shell-logo" />

        <nav class="shell-tabbar">
          ${tabs.map((t) => `
            <button type="button" class="shell-tab ${t.id === _tabActiva ? 'activa' : ''}" data-tab="${t.id}" aria-label="${t.label}" title="${t.label}">
              ${_iconoTab(t.id)}
            </button>
          `).join('')}
        </nav>

        <button type="button" id="btn-buscar" class="feed-icono-btn" aria-label="Buscar usuarios">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
        </button>
        <button type="button" id="btn-notif" class="feed-icono-btn" aria-label="Notificaciones">
          <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          <span id="badge-notif-shell" class="feed-badge" hidden>0</span>
        </button>

        <button type="button" id="btn-avatar" class="shell-avatar">
          ${
            perfil?.fotoUrl
              ? `<img src="${perfil.fotoUrl}" alt="" />`
              : `<span>${perfil?.inicial ?? ''}</span>`
          }
        </button>
      </header>

      <div id="shell-drawer-overlay" class="shell-drawer-overlay" hidden></div>
      <aside id="shell-drawer" class="shell-drawer" hidden></aside>

      <main id="shell-tab-contenido" class="shell-tab-contenido"></main>
    </div>
  `;

  _wireEventos(tabs);
  _wireNavegacionExterna(tabs);
  _suscribirNotificaciones();
  _cargarBadgeNotif();
  await _mostrarTab(_tabActiva, tabs);
}

export function destruir() {
  _canalNotif?.unsubscribe();
  _canalNotif = null;
}

// ─────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────
async function _verificarSiEsAdmin() {
  const uid = usuarioActual()?.id;
  if (!uid) return false;

  const { data } = await supabase
    .from('tabla_admins')
    .select('id')
    .eq('perfil_id', uid)
    .maybeSingle();

  return !!data;
}

// ─────────────────────────────────────────────────────────────────
// PERFIL (para el avatar del AppBar)
// ─────────────────────────────────────────────────────────────────
async function _cargarPerfil() {
  const uid = usuarioActual()?.id;
  if (!uid) return null;

  try {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre, nombre_usuario, cdn_foto_perfil, carrera, semestre')
      .eq('id', uid)
      .maybeSingle();

    if (!data) return null;

    const fotoUrl = resolverUrlPerfil(data);
    const inicial = data.nombre ? data.nombre[0].toUpperCase() : '';
    return { ...data, fotoUrl, inicial };
  } catch (e) {
    console.error('shell.js – error cargando perfil:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENTOS: tabs, drawer, avatar
// ─────────────────────────────────────────────────────────────────
function _wireEventos(tabs) {
  _contenedor.querySelectorAll('.shell-tab').forEach((btn) => {
    btn.addEventListener('click', () => _mostrarTab(btn.dataset.tab, tabs));
  });

  const overlay = _contenedor.querySelector('#shell-drawer-overlay');
  const drawer  = _contenedor.querySelector('#shell-drawer');

  _contenedor.querySelector('#btn-drawer').addEventListener('click', async () => {
    // En modo sidebar fija (escritorio) el botón ☰ está oculto por CSS,
    // así que este handler solo corre en modo móvil/tablet.
    overlay.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('abierto'));
    await _cargarContenidoDrawer(drawer, _cerrarDrawer);
  });

  overlay.addEventListener('click', _cerrarDrawer);

  _contenedor.querySelector('#btn-buscar').addEventListener('click', () => {
    BuscadorUsuarios.abrir();
  });

  _contenedor.querySelector('#btn-notif').addEventListener('click', () => {
    Notificaciones.abrir(() => _cargarBadgeNotif());
  });

  _contenedor.querySelector('#btn-avatar').addEventListener('click', () => {
    window.location.hash = '#/mi-perfil/editar';
  });

  function _cerrarDrawer() {
    drawer.classList.remove('abierto');
    setTimeout(() => {
      drawer.hidden = true;
      overlay.hidden = true;
    }, 250);
  }

  // ── Sidebar fija en escritorio ──────────────────────────────────
  // A partir de --breakpoint-sidebar (ver responsive-desktop.css) el
  // drawer deja de ser un panel deslizante con overlay y pasa a verse
  // siempre, como columna izquierda — igual que el menú de Facebook.
  // Aquí solo decidimos cuándo cargar su contenido y mostrarlo así;
  // el acomodo visual (posición, ancho) lo resuelve el CSS mediante
  // la clase .sidebar-fija.
  const mqSidebar = window.matchMedia('(min-width: 1100px)');
  function _actualizarModoSidebar() {
    const esFija = mqSidebar.matches;
    drawer.classList.toggle('sidebar-fija', esFija);
    if (esFija) {
      overlay.hidden = true;
      drawer.hidden = false;
      _cargarContenidoDrawer(drawer, null);
    } else if (!drawer.classList.contains('abierto')) {
      drawer.hidden = true;
    }
  }
  _actualizarModoSidebar();
  mqSidebar.addEventListener('change', _actualizarModoSidebar);
}

/// Carga el contenido real del drawer (drawer.js) una sola vez —
/// tanto el clic en ☰ (móvil) como la sidebar fija (escritorio)
/// reusan esta misma función.
async function _cargarContenidoDrawer(drawer, onCerrar) {
  if (drawer.dataset.cargado) return;
  drawer.dataset.cargado = '1';
  try {
    const mod = await import('./drawer.js');
    mod.render(drawer, { onCerrar });
  } catch (_e) {
    drawer.innerHTML = `<p class="drawer-placeholder">Menú en construcción.</p>`;
  }
}

// Navegación solicitada desde módulos superpuestos (por ejemplo, una
// notificación de "Emprendedor verificado").
function _wireNavegacionExterna(tabs) {
  // Evita duplicar listeners si el shell se reconstruye en la misma sesión.
  if (_contenedor?.dataset.navExternaWired === '1') return;
  if (_contenedor) _contenedor.dataset.navExternaWired = '1';

  window.addEventListener('comunidad:marketplace-publicar', async () => {
    await _mostrarTab('market', tabs);
    // marketplace-home escucha este segundo evento y abre su tab Publicar.
    setTimeout(() => window.dispatchEvent(new CustomEvent('comunidad:marketplace-tab', { detail: { tab: 'publicar' } })), 80);
  });
}

// ─────────────────────────────────────────────────────────────────
// CAMBIO DE PESTAÑA — carga perezosa del módulo correspondiente
// ─────────────────────────────────────────────────────────────────
async function _mostrarTab(tabId, tabs) {
  _tabActiva = tabId;
  _contenedor.querySelectorAll('.shell-tab').forEach((btn) => {
    btn.classList.toggle('activa', btn.dataset.tab === tabId);
  });

  const contenidoEl = _contenedor.querySelector('#shell-tab-contenido');
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;

  // Por si la pestaña anterior ensanchó su propia columna (ver
  // jaguar-chat.js, que usa más ancho que el resto de la app) — se
  // resetea ANTES de cargar la siguiente para que ninguna otra
  // pestaña herede ese ancho por accidente. Se pone en <html> (mismo
  // nivel donde vive originalmente --app-max-width en variables.css /
  // responsive-desktop.css) para que también afecte el grid de la
  // sidebar (.shell-app), no solo el contenido.
  document.documentElement.style.removeProperty('--app-max-width');

  contenidoEl.innerHTML = `<div class="shell-tab-cargando">Cargando…</div>`;

  try {
    const mod = await import(/* @vite-ignore */ tab.modulo);
    contenidoEl.innerHTML = '';
    await mod.render?.(contenidoEl);
  } catch (e) {
    console.error('shell.js – error cargando módulo de tab:', tab.modulo, e);
    const msg = String(e?.message ?? e);
    contenidoEl.innerHTML = `
      <div class="shell-tab-placeholder">
        <p>${tab.label} todavía no está implementado.</p>
        <details style="margin-top:8px;color:#999;max-width:420px;">
          <summary style="cursor:pointer;">Ver error</summary>
          <pre style="white-space:pre-wrap;word-break:break-word;">${msg}</pre>
        </details>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICACIONES EN TIEMPO REAL — banner estilo iOS
// ─────────────────────────────────────────────────────────────────
function _suscribirNotificaciones() {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  _canalNotif = supabase
    .channel(`shell-notif-${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `destinatario_id=eq.${uid}` },
      (payload) => {
        const row = payload.new;
        if (row?.tipo !== 'mensaje') {
          _enriquecerYMostrarBanner(row);
          _cargarBadgeNotif();
        }
      },
    )
    .subscribe();
}

async function _cargarBadgeNotif() {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('id')
      .eq('destinatario_id', uid)
      .eq('leida', false)
      .neq('tipo', 'mensaje');

    if (error) throw error;
    const badge = _contenedor?.querySelector('#badge-notif-shell');
    if (!badge) return;
    const n = data?.length ?? 0;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 99 ? '99+' : String(n);
    } else {
      badge.hidden = true;
    }
  } catch (e) {
    console.error('shell.js – badge notificaciones:', e);
  }
}

async function _enriquecerYMostrarBanner(row) {
  try {
    let nombre = 'Alguien';
    let fotoUrl = '';

    if (row.origen_id) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, cdn_foto_perfil')
        .eq('id', row.origen_id)
        .maybeSingle();

      if (perfil) {
        nombre = (perfil.nombre ?? '').split(' ')[0] || 'Alguien';
        fotoUrl = resolverUrlPerfil(perfil);
      }
    }

    const prefs = obtenerPreferenciasNotificaciones();
    const texto = _textoNotif(row.tipo, nombre, row.contenido);

    if (prefs.banners) {
      _mostrarBanner({ nombre, fotoUrl, texto, row });
    }

    // Notificación nativa del navegador mientras la web siga abierta.
    // Para recibirla con el navegador totalmente cerrado haría falta Web Push
    // (service worker + backend/Firebase), que es una integración distinta.
    if (
      prefs.navegador &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      (document.hidden || !document.hasFocus())
    ) {
      const n = new Notification('Comunidad ITVH', {
        body: texto,
        icon: fotoUrl || '/assets/images/icon-192.png',
        tag: `social-${row.id ?? Date.now()}`,
      });
      n.onclick = () => {
        window.focus();
        Notificaciones.abrir(() => _cargarBadgeNotif());
        n.close();
      };
    }
  } catch (e) {
    console.error('shell.js – banner notif:', e);
  }
}

function _textoNotif(tipo, nombre, contenido = null) {
  const textos = {
    like: `${nombre} reaccionó a tu publicación`,
    comentario: `${nombre} comentó en tu publicación`,
    respuesta: `${nombre} respondió a tu comentario`,
    seguidor: `${nombre} comenzó a seguirte`,
    like_comentario: `${nombre} reaccionó a tu comentario`,
    like_historia: `${nombre} reaccionó a tu historia`,
    comentario_historia: `${nombre} comentó en tu historia`,
    verificado_emprendedor: '¡Ya eres Emprendedor Verificado! Ya puedes publicar en Marketplace.',
    mencion: `${nombre} te mencionó en un comentario`,
    etiqueta: `${nombre} te etiquetó en una publicación`,
  };
  return textos[tipo] ?? 'Tienes una nueva notificación';
}

let _bannerActual = null;

function _mostrarBanner(banner) {
  _bannerActual?.remove();

  const el = document.createElement('div');
  el.className = 'banner-toast';
  el.innerHTML = `
    <div class="banner-avatar">
      ${banner.fotoUrl ? `<img src="${banner.fotoUrl}" alt="" />` : '👤'}
    </div>
    <div class="banner-texto">
      <p class="banner-titulo">Notificación</p>
      <p class="banner-cuerpo">${banner.texto}</p>
    </div>
    <span class="banner-chevron">›</span>
  `;
  document.body.appendChild(el);
  _bannerActual = el;

  requestAnimationFrame(() => el.classList.add('visible'));

  el.addEventListener('click', () => {
    Notificaciones.abrir(() => _cargarBadgeNotif());
    el.remove();
    _bannerActual = null;
  });

  setTimeout(() => {
    if (_bannerActual === el) {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
      _bannerActual = null;
    }
  }, 8000);
}