// ═════════════════════════════════════════════════════════════════
// jaguar-chat-principal.js
//
// Equivalente web de jaguar_chat_principal.dart. Contenedor principal
// de "Jaguar Chat": AppBar + 4 páginas deslizables + barra inferior
// flotante estilo Telegram (fondo translúcido + blur real, indicador
// sólido deslizante detrás del tab activo, SIN cápsula de fondo).
//
// DIFERENCIAS DELIBERADAS respecto al Dart (limitaciones/capacidades
// propias del navegador):
//
//   • PageView -> contenedor con scroll-snap horizontal. El navegador
//     no tiene un widget "PageView" nativo, pero scroll-snap-type: x
//     mandatory + scroll-snap-align: start da el mismo swipe físico,
//     y CSS scrollIntoView/scrollTo cubre el animateToPage().
//
//   • didChangeMetrics (detectar teclado) -> no existe una API de
//     "el teclado está visible" en web. Se aproxima con
//     visualViewport.resize: si el viewport visual se encoge más de
//     ~150px respecto al alto de la ventana, asumimos que es el
//     teclado (heurística estándar para PWAs). Si el navegador no
//     soporta visualViewport, simplemente nunca se oculta el pill.
//
//   • GlobalKey hacia RefMaestrosScreen -> en vez de amarrar el shell
//     a una pantalla específica, se generalizó: CUALQUIER tab puede
//     llamar a `ctx.setFab(config | null)` desde su propio mount()
//     para pedir que el shell muestre/oculte/actualice el FAB
//     flotante mientras esa tab esté activa. Hoy solo lo usará
//     Maestros, pero el shell ya no necesita saber cuál.
//
//   • fabBottomOffset (para el FAB LOCAL de Cosas Perdidas) -> se
//     expone tanto como propiedad CSS custom (--jcp-fab-clearance en
//     cada panel) como getter JS (shell.pillClearancePx()), para que
//     esa pantalla (cuando se porte) posicione su propio FAB arriba
//     del pill sin que el shell tenga que saber que existe.
// ═════════════════════════════════════════════════════════════════

const ACCENT = '#007AFF';
const TELEGRAM_BLUE = '#3390EC';

// Mismo punto de quiebre que usan chats-screen.js / conversacion-screen.js
// para su layout de dos columnas — todo cambia junto de forma consistente.
const MQ_ESCRITORIO = '(min-width: 900px)';

const TABS = [
  { id: 'chats', label: 'Chats', subtitulo: 'Chats', icon: 'chat' },
  { id: 'maestros', label: 'Maestros', subtitulo: 'Ref. de maestros', icon: 'school' },
  { id: 'perdidas', label: 'Perdidas', subtitulo: 'Cosas perdidas', icon: 'search' },
  { id: 'ajustes', label: 'Ajustes', subtitulo: 'Configuración', icon: 'settings' },
];

// ── Íconos inline (outline / filled), currentColor para heredar el color
// del tab activo/inactivo sin depender de una fuente de íconos externa. ──
const ICONS = {
  chat: {
    outline:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.1 0-2.15-.2-3.1-.6L4 21l1.3-4.4C4.5 15.3 4 13.7 4 12Z"/></svg>',
    filled:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.1 0-2.15-.2-3.1-.6L4 21l1.3-4.4C4.5 15.3 4 13.7 4 12Z"/></svg>',
  },
  school: {
    outline:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 8-4.2V15"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>',
    filled:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5v4.4c0 1.7 2.7 3.1 6 3.1s6-1.4 6-3.1v-4.4L12 13 6 10.5Z"/><path d="M20 9.2V16h-1.5V9.9L20 9.2Z"/></svg>',
  },
  // manage_search_rounded en Dart usa el mismo ícono para outline y
  // filled — solo cambia el color, no la forma.
  search: {
    outline:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6"/><path d="m20 20-4.3-4.3"/><path d="M8 10.5h5M8 8h3"/></svg>',
    filled:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6"/><path d="m20 20-4.3-4.3"/><path d="M8 10.5h5M8 8h3"/></svg>',
  },
  settings: {
    outline:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.4.8a8 8 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.9a8 8 0 0 0-1.7 1l-2.4-.8-2 3.4L6.6 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.4-.8a8 8 0 0 0 1.7 1l.4 2.9h3.8l.4-2.9a8 8 0 0 0 1.7-1l2.4.8 2-3.4-2-1.5Z"/></svg>',
    filled:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.4.8a8 8 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.9a8 8 0 0 0-1.7 1l-2.4-.8-2 3.4L6.6 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.4-.8a8 8 0 0 0 1.7 1l.4 2.9h3.8l.4-2.9a8 8 0 0 0 1.7-1l2.4.8 2-3.4-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"/></svg>',
  },
};

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'jcp-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
.jcp-root{
  --jcp-accent:${ACCENT};
  --jcp-telegram:${TELEGRAM_BLUE};
  --jcp-pill-h:58px;
  --jcp-pill-margin:calc(10px + env(safe-area-inset-bottom, 0px) * 0.15);
  --jcp-page-pad-bottom:calc(var(--jcp-pill-h) + var(--jcp-pill-margin) + 8px);
  --jcp-fab-clearance:calc(var(--jcp-pill-h) + var(--jcp-pill-margin) + 12px);
  position:relative;
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:0;
  background:#fff;
  color:#000;
  font-family:inherit;
  overflow:hidden;
}
.jcp-root.jcp-dark{ background:#000; color:#fff; }

/* ── AppBar ─────────────────────────────────────────────────────── */
.jcp-appbar{
  flex:0 0 72px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 16px 0 16px;
  box-sizing:border-box;
}
.jcp-title{
  display:flex;
  flex-direction:column;
  font-size:26px;
  font-weight:800;
  line-height:1.15;
  letter-spacing:-0.5px;
}
.jcp-title-line1{ color:#000; }
.jcp-dark .jcp-title-line1{ color:#fff; }
.jcp-title-line2{ color:var(--jcp-accent); }

.jcp-badge{
  display:flex;
  align-items:center;
  gap:6px;
  padding:7px 12px;
  border-radius:14px;
  background:rgba(0,0,0,0.05);
  transition:opacity 220ms ease, transform 220ms ease;
}
.jcp-dark .jcp-badge{ background:rgba(255,255,255,0.08); }
.jcp-badge svg{ width:18px; height:18px; color:var(--jcp-accent); flex:none; }
.jcp-badge span{
  font-size:18px;
  font-weight:600;
  letter-spacing:-0.1px;
  color:var(--jcp-accent);
  white-space:nowrap;
}
.jcp-badge.jcp-badge-swap{ opacity:0; transform:scale(0.92); }

/* ── Body / páginas (equivalente a PageView) ───────────────────── */
.jcp-body{
  position:relative;
  flex:1 1 0;
  min-height:0;
  overflow:hidden;
}
.jcp-pages{
  display:flex;
  height:100%;
  min-height:0;
  overflow-x:auto;
  overflow-y:hidden;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.jcp-pages::-webkit-scrollbar{ display:none; }
.jcp-page{
  flex:0 0 100%;
  width:100%;
  height:100%;
  min-height:0;
  overflow-y:auto;
  scroll-snap-align:start;
  box-sizing:border-box;
  padding-bottom:var(--jcp-page-pad-bottom);
  position:relative;
}
.jcp-placeholder{
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:rgba(0,0,0,0.35);
  font-size:14px;
  padding:24px;
  text-align:center;
}
.jcp-dark .jcp-placeholder{ color:rgba(255,255,255,0.35); }

/* ── Pill flotante ───────────────────────────────────────────────── */
.jcp-pill-wrap{
  position:absolute;
  left:14px;
  right:14px;
  bottom:var(--jcp-pill-margin);
  border-radius:26px;
  box-shadow:0 8px 24px -4px rgba(0,0,0,0.08);
  transition:opacity 200ms ease, transform 200ms ease;
  z-index:20;
}
.jcp-dark .jcp-pill-wrap{ box-shadow:0 8px 24px -4px rgba(0,0,0,0.22); }
.jcp-pill-wrap.jcp-hidden{
  opacity:0;
  transform:translateY(12px);
  pointer-events:none;
}
.jcp-pill{
  height:var(--jcp-pill-h);
  border-radius:26px;
  background:rgba(255,255,255,0.55);
  backdrop-filter:blur(30px);
  -webkit-backdrop-filter:blur(30px);
  position:relative;
  overflow:hidden;
}
.jcp-dark .jcp-pill{ background:rgba(255,255,255,0.10); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){
  .jcp-pill{ background:rgba(255,255,255,0.92); }
  .jcp-dark .jcp-pill{ background:rgba(20,20,22,0.92); }
}

.jcp-indicator{
  position:absolute;
  /* top/bottom/left/width/height reales los pone _posicionarIndicador()
     en JS, midiendo el botón activo — aquí solo valores de arranque
     razonables para el primer pintado (tab 0, modo horizontal),
     antes de que corra JS por primera vez. */
  top:6px;
  bottom:6px;
  left:4px;
  width:calc(25% - 8px);
  border-radius:20px;
  background:var(--jcp-telegram);
  box-shadow:0 3px 14px -3px rgba(51,144,236,0.35);
  transition:left 280ms cubic-bezier(0.33,1,0.68,1), top 280ms cubic-bezier(0.33,1,0.68,1),
             width 280ms cubic-bezier(0.33,1,0.68,1), height 280ms cubic-bezier(0.33,1,0.68,1);
}

.jcp-tabs{
  position:relative;
  display:flex;
  height:100%;
}
.jcp-tab{
  flex:1 1 0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:3px;
  border:none;
  background:transparent;
  cursor:pointer;
  color:rgba(0,0,0,0.38);
  padding:0;
}
.jcp-dark .jcp-tab{ color:rgba(255,255,255,0.38); }
.jcp-tab.jcp-active{ color:#fff; }
.jcp-tab svg{
  width:21px;
  height:21px;
  transition:transform 180ms ease;
}
.jcp-tab-label{
  font-size:9.5px;
  font-weight:400;
  transition:font-weight 0s;
}
.jcp-tab.jcp-active .jcp-tab-label{ font-weight:700; }

/* ── FAB flotante genérico ──────────────────────────────────────── */
.jcp-fab{
  position:absolute;
  right:16px;
  bottom:var(--jcp-fab-clearance);
  display:flex;
  align-items:center;
  gap:8px;
  padding:14px 20px;
  border:none;
  border-radius:16px;
  background:var(--jcp-telegram);
  color:#fff;
  font-size:14px;
  font-weight:600;
  cursor:pointer;
  box-shadow:0 6px 18px -4px rgba(51,144,236,0.45);
  transition:opacity 200ms ease, transform 200ms ease;
  z-index:20;
}
.jcp-fab svg{ width:20px; height:20px; }
.jcp-fab.jcp-hidden{
  opacity:0;
  transform:translateY(12px) scale(0.9);
  pointer-events:none;
}

/* ── Escritorio (≥900px): la píldora deja de ser una barra flotante
   abajo y pasa a ser un riel vertical pegado al borde derecho — como
   pediste, "a la derecha, no abajo". Mismo punto de quiebre que usan
   chats-screen.js / conversacion-screen.js para su layout de dos
   columnas, así todo cambia junto de forma consistente. En mobile
   (<900px) no se toca nada: sigue siendo la píldora flotante de
   siempre, que ahí es lo natural. ── */
@media (min-width:900px){
  .jcp-page{
    padding-bottom:0;
    padding-right:calc(var(--jcp-pill-h) + var(--jcp-pill-margin) + 8px);
  }
  .jcp-pill-wrap{
    left:auto;
    right:var(--jcp-pill-margin);
    top:var(--jcp-pill-margin);
    bottom:var(--jcp-pill-margin);
    width:var(--jcp-pill-h);
  }
  .jcp-pill{ height:100%; }
  .jcp-tabs{ flex-direction:column; }
  /* La posición/tamaño reales del indicador (top/height) los pone
     _posicionarIndicador() en JS — aquí ya no hace falta calc con %. */
  .jcp-tab-label{ font-size:8.5px; }
  .jcp-fab{
    right:calc(var(--jcp-pill-h) + var(--jcp-pill-margin) * 2 + 12px);
    bottom:16px;
  }
}
`;

function iconMarkup(tabIcon, active) {
  const variant = active ? 'filled' : 'outline';
  return ICONS[tabIcon][variant];
}

const FAB_ADD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

export class JaguarChatPrincipal {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container - dónde montar el shell.
   * @param {Object<string, {mount:Function}>} [opts.screens] - por tabId
   *   ('chats' | 'maestros' | 'perdidas' | 'ajustes'), cada una con un
   *   mount(panelEl, ctx) => (cleanupFn | void). ctx trae:
   *     { tabId, isDark, setFab(configOrNull), pillClearanceCss }
   *   Si una tab no trae screen, se muestra un placeholder "Próximamente".
   * @param {boolean} [opts.isDark] - fuerza tema; si se omite, se
   *   detecta con prefers-color-scheme y se puede actualizar con
   *   setDarkMode().
   */
  constructor({ container, screens = {}, isDark = null }) {
    injectStyles();
    this.container = container;
    this.screens = screens;
    this.activeIndex = 0;
    this.keyboardVisible = false;
    this.isDark = isDark ?? window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;

    // fab por tab: tabId -> {icon, label, onClick} | null
    this._fabByTab = {};
    this._panelCleanups = {};
    this._destroyed = false;

    this._build();
    this._mountAllScreens();
    this._bindEvents();
    this._updateActiveTabUI(false);
  }

  // ── Construcción del DOM ────────────────────────────────────────────

  _build() {
    const root = document.createElement('div');
    root.className = 'jcp-root' + (this.isDark ? ' jcp-dark' : '');
    this.root = root;

    // AppBar
    const appbar = document.createElement('div');
    appbar.className = 'jcp-appbar';
    appbar.innerHTML = `
      <div class="jcp-title">
        <span class="jcp-title-line1">Jaguar</span>
        <span class="jcp-title-line2">Chat</span>
      </div>
    `;
    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'jcp-badge';
    appbar.appendChild(this.badgeEl);
    root.appendChild(appbar);

    // Body: páginas con scroll-snap
    const body = document.createElement('div');
    body.className = 'jcp-body';

    const pages = document.createElement('div');
    pages.className = 'jcp-pages';
    this.panels = {};
    TABS.forEach((tab) => {
      const page = document.createElement('div');
      page.className = 'jcp-page';
      page.dataset.tabId = tab.id;
      pages.appendChild(page);
      this.panels[tab.id] = page;
    });
    this.pagesEl = pages;
    body.appendChild(pages);

    // Pill flotante
    const pillWrap = document.createElement('div');
    pillWrap.className = 'jcp-pill-wrap';
    const pill = document.createElement('div');
    pill.className = 'jcp-pill';

    const indicator = document.createElement('div');
    indicator.className = 'jcp-indicator';
    pill.appendChild(indicator);
    this.indicatorEl = indicator;

    const tabsRow = document.createElement('div');
    tabsRow.className = 'jcp-tabs';
    this.tabButtons = TABS.map((tab, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'jcp-tab';
      btn.setAttribute('aria-label', tab.label);
      btn.innerHTML = `
        <span class="jcp-tab-icon">${iconMarkup(tab.icon, i === 0)}</span>
        <span class="jcp-tab-label">${tab.label}</span>
      `;
      btn.addEventListener('click', () => this.goToTab(i));
      tabsRow.appendChild(btn);
      return btn;
    });
    pill.appendChild(tabsRow);
    pillWrap.appendChild(pill);
    this.pillWrapEl = pillWrap;
    body.appendChild(pillWrap);

    // FAB genérico
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'jcp-fab jcp-hidden';
    body.appendChild(fab);
    this.fabEl = fab;

    root.appendChild(body);
    this.container.innerHTML = '';
    this.container.appendChild(root);

    this._updateBadge(false);
  }

  // ── Montaje de las 4 pantallas (todas vivas a la vez, como el PageView) ──

  _mountAllScreens() {
    TABS.forEach((tab) => {
      const panel = this.panels[tab.id];
      const screen = this.screens[tab.id];

      const ctx = {
        tabId: tab.id,
        isDark: this.isDark,
        pillClearanceCss: 'var(--jcp-fab-clearance)',
        setFab: (config) => this._setFab(tab.id, config),
      };

      if (screen && typeof screen.mount === 'function') {
        const cleanup = screen.mount(panel, ctx);
        if (typeof cleanup === 'function') this._panelCleanups[tab.id] = cleanup;
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'jcp-placeholder';
        placeholder.textContent = `${tab.subtitulo} — próximamente`;
        panel.appendChild(placeholder);
      }
    });
  }

  // ── Eventos: swipe/scroll, tap en pill, teclado, resize ──────────────

  _bindEvents() {
    let rafPending = false;
    this._onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const width = this.pagesEl.clientWidth || 1;
        const idx = Math.round(this.pagesEl.scrollLeft / width);
        if (idx !== this.activeIndex && idx >= 0 && idx < TABS.length) {
          this.activeIndex = idx;
          this._updateActiveTabUI(true);
        }
      });
    };
    this.pagesEl.addEventListener('scroll', this._onScroll, { passive: true });

    // Heurística de teclado visible: el visualViewport se encoge
    // notoriamente cuando el teclado en pantalla aparece. No hay
    // equivalente exacto a WidgetsBindingObserver.didChangeMetrics en
    // web, pero esto cubre el mismo caso de uso (ocultar pill/FAB para
    // no competir por espacio en pantallas chicas).
    if (window.visualViewport) {
      this._onViewportResize = () => {
        const shrink = window.innerHeight - window.visualViewport.height;
        const visible = shrink > 150;
        if (visible !== this.keyboardVisible) {
          this.keyboardVisible = visible;
          this._updateFabVisibility();
          this.pillWrapEl.classList.toggle('jcp-hidden', visible);
        }
      };
      window.visualViewport.addEventListener('resize', this._onViewportResize);
    }

    // Reposiciona el indicador si la ventana cruza el punto de quiebre
    // (o simplemente cambia de tamaño) — offsetLeft/Top/Width/Height
    // del botón activo pueden cambiar en cualquiera de los dos casos.
    this._onWindowResize = () => this._posicionarIndicador();
    window.addEventListener('resize', this._onWindowResize);

    this._onDarkModeChange = (e) => {
      if (this._explicitTheme) return; // si setDarkMode() ya fue llamado a mano, no pisar
      this.setDarkMode(e.matches);
    };
    this._darkMq = window.matchMedia?.('(prefers-color-scheme: dark)');
    this._darkMq?.addEventListener?.('change', this._onDarkModeChange);
  }

  // ── Navegación entre tabs ─────────────────────────────────────────────

  goToTab(index) {
    if (index === this.activeIndex) return;
    const width = this.pagesEl.clientWidth;
    this.pagesEl.scrollTo({ left: width * index, behavior: 'smooth' });
    this.activeIndex = index;
    this._updateActiveTabUI(true);
  }

  /// Mide el botón activo real (offsetLeft/Top/Width/Height) y coloca
  /// el indicador ahí mismo, en píxeles — funciona igual en modo
  /// horizontal (mobile, la píldora de abajo) que vertical (escritorio,
  /// el riel de la derecha), sin depender de porcentajes.
  _posicionarIndicador() {
    const btn = this.tabButtons[this.activeIndex];
    if (!btn) return;
    const vertical = window.matchMedia(MQ_ESCRITORIO).matches;
    if (vertical) {
      this.indicatorEl.style.left = '4px';
      this.indicatorEl.style.right = '4px';
      this.indicatorEl.style.width = 'auto';
      this.indicatorEl.style.top = `${btn.offsetTop + 4}px`;
      this.indicatorEl.style.height = `${btn.offsetHeight - 8}px`;
      this.indicatorEl.style.bottom = 'auto';
    } else {
      this.indicatorEl.style.top = '6px';
      this.indicatorEl.style.bottom = '6px';
      this.indicatorEl.style.height = 'auto';
      this.indicatorEl.style.left = `${btn.offsetLeft + 4}px`;
      this.indicatorEl.style.width = `${btn.offsetWidth - 8}px`;
      this.indicatorEl.style.right = 'auto';
    }
  }

  _updateActiveTabUI(animateBadge) {
    this.tabButtons.forEach((btn, i) => {
      const tab = TABS[i];
      const active = i === this.activeIndex;
      btn.classList.toggle('jcp-active', active);
      btn.querySelector('.jcp-tab-icon').innerHTML = iconMarkup(tab.icon, active);
    });
    // Antes esto se hacía con % (calc(25% - 8px)) más una variable CSS
    // con el índice — pero un % de altura/ancho solo funciona si TODA
    // la cadena de contenedores padres tiene una altura/ancho definidos,
    // y ahí se rompía (el indicador terminaba ocupando toda la ventana
    // en vez de solo su cuarto correspondiente). Midiendo el botón
    // real con offsetLeft/offsetTop no depende de esa cadena — el
    // navegador ya hizo ese cálculo por nosotros.
    this._posicionarIndicador();
    this._updateBadge(animateBadge);
    this._updateFabVisibility();
  }

  _updateBadge(animate) {
    const tab = TABS[this.activeIndex];
    const render = () => {
      this.badgeEl.innerHTML = `${iconMarkup(tab.icon, true)}<span>${tab.subtitulo}</span>`;
    };
    if (!animate) {
      render();
      return;
    }
    this.badgeEl.classList.add('jcp-badge-swap');
    setTimeout(() => {
      render();
      this.badgeEl.classList.remove('jcp-badge-swap');
    }, 140);
  }

  // ── FAB genérico (cualquier tab puede pedirlo) ────────────────────────

  _setFab(tabId, config) {
    this._fabByTab[tabId] = config || null;
    if (TABS[this.activeIndex].id === tabId) this._updateFabVisibility();
  }

  _updateFabVisibility() {
    const activeTab = TABS[this.activeIndex].id;
    const config = this._fabByTab[activeTab];
    const shouldShow = !!config && !this.keyboardVisible;

    this.fabEl.classList.toggle('jcp-hidden', !shouldShow);
    if (!shouldShow) return;

    this.fabEl.innerHTML = `${config.icon || FAB_ADD_ICON}<span>${config.label || ''}</span>`;
    this.fabEl.onclick = config.onClick || null;
  }

  // ── API pública auxiliar ──────────────────────────────────────────────

  /// Distancia (como valor CSS) desde el borde inferior real hasta donde
  /// debe empezar cualquier FAB LOCAL de una pantalla (equivalente a
  /// fabBottomOffset en CosasPerdidaScreen). Úsalo así en el CSS de esa
  /// pantalla: `bottom: ${shell.pillClearanceCss()}`.
  pillClearanceCss() {
    return 'var(--jcp-fab-clearance)';
  }

  setDarkMode(isDark) {
    this._explicitTheme = true;
    this.isDark = isDark;
    this.root.classList.toggle('jcp-dark', isDark);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.pagesEl.removeEventListener('scroll', this._onScroll);
    if (window.visualViewport && this._onViewportResize) {
      window.visualViewport.removeEventListener('resize', this._onViewportResize);
    }
    window.removeEventListener('resize', this._onWindowResize);
    this._darkMq?.removeEventListener?.('change', this._onDarkModeChange);
    Object.values(this._panelCleanups).forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('JaguarChatPrincipal.destroy, cleanup de panel:', e);
      }
    });
    this.container.innerHTML = '';
  }
}