// ═════════════════════════════════════════════════════════════════
// reportes-ui.js — modal reutilizable para reportar cualquier contenido
// ═════════════════════════════════════════════════════════════════

import { MOTIVOS_REPORTE, reportarContenido, reportarPublicacionSocial } from './reportes-service.js';

let _overlay = null;
let _styles = false;

export function abrirReportePublicacion(post, { onEnviado } = {}) {
  return _abrir({
    titulo: 'Reportar publicación',
    subtitulo: '¿Por qué quieres reportar esta publicación?',
    enviar: ({ motivo, detalle }) => reportarPublicacionSocial({
      publicacionId: post.id,
      autorId: post.autor_id,
      motivo,
      detalle,
    }),
    onEnviado,
  });
}

export function abrirReporteContenido({ tipo, contenidoId, autorId = null, titulo = 'Reportar contenido', subtitulo = 'Cuéntanos qué ocurre.', metadata = null, onEnviado = null }) {
  return _abrir({
    titulo,
    subtitulo,
    enviar: ({ motivo, detalle }) => reportarContenido({ tipo, contenidoId, autorId, motivo, detalle, metadata }),
    onEnviado,
  });
}

function _abrir({ titulo, subtitulo, enviar, onEnviado }) {
  _inyectarStyles();
  cerrarReporte();

  _overlay = document.createElement('div');
  _overlay.className = 'reporte-overlay';
  _overlay.innerHTML = `
    <section class="reporte-card" role="dialog" aria-modal="true" aria-label="${_escAttr(titulo)}">
      <header class="reporte-header">
        <div>
          <h2>${_esc(titulo)}</h2>
          <p>${_esc(subtitulo)}</p>
        </div>
        <button class="reporte-cerrar" type="button" aria-label="Cerrar">✕</button>
      </header>
      <div class="reporte-motivos">
        ${MOTIVOS_REPORTE.map((m) => `
          <button type="button" class="reporte-motivo" data-motivo="${_escAttr(m.key)}">
            <span>${m.icon}</span><strong>${_esc(m.label)}</strong><span class="reporte-check">✓</span>
          </button>`).join('')}
      </div>
      <label class="reporte-detalle-wrap" hidden>
        <span>Describe brevemente el problema (opcional)</span>
        <textarea class="reporte-detalle" maxlength="500" rows="3" placeholder="Agrega contexto para el equipo de moderación..."></textarea>
      </label>
      <p class="reporte-error" hidden></p>
      <button type="button" class="reporte-enviar" disabled>Enviar reporte</button>
      <p class="reporte-nota">Tu identidad no se muestra al autor del contenido.</p>
    </section>`;
  document.body.appendChild(_overlay);

  let motivo = null;
  const detalleWrap = _overlay.querySelector('.reporte-detalle-wrap');
  const detalleEl = _overlay.querySelector('.reporte-detalle');
  const btnEnviar = _overlay.querySelector('.reporte-enviar');
  const errorEl = _overlay.querySelector('.reporte-error');

  const cerrar = () => cerrarReporte();
  _overlay.querySelector('.reporte-cerrar').addEventListener('click', cerrar);
  _overlay.addEventListener('click', (e) => { if (e.target === _overlay) cerrar(); });

  _overlay.querySelectorAll('.reporte-motivo').forEach((btn) => {
    btn.addEventListener('click', () => {
      motivo = btn.dataset.motivo;
      _overlay.querySelectorAll('.reporte-motivo').forEach((b) => b.classList.toggle('seleccionado', b === btn));
      detalleWrap.hidden = motivo !== 'otro';
      btnEnviar.disabled = false;
      errorEl.hidden = true;
      if (motivo === 'otro') setTimeout(() => detalleEl.focus(), 0);
    });
  });

  btnEnviar.addEventListener('click', async () => {
    if (!motivo) return;
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    errorEl.hidden = true;
    try {
      await enviar({ motivo, detalle: detalleEl.value });
      const card = _overlay.querySelector('.reporte-card');
      card.innerHTML = `
        <div class="reporte-ok">
          <div class="reporte-ok-icon">✓</div>
          <h2>Reporte enviado</h2>
          <p>Gracias. El equipo de moderación revisará el contenido.</p>
          <button type="button" class="reporte-enviar">Listo</button>
        </div>`;
      card.querySelector('button').addEventListener('click', cerrar);
      onEnviado?.();
    } catch (e) {
      errorEl.textContent = e?.message || 'No se pudo enviar el reporte.';
      errorEl.hidden = false;
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar reporte';
    }
  });

  document.addEventListener('keydown', _onKey);
}

export function cerrarReporte() {
  document.removeEventListener('keydown', _onKey);
  _overlay?.remove();
  _overlay = null;
}

function _onKey(e) { if (e.key === 'Escape') cerrarReporte(); }
function _esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }
function _escAttr(s) { return _esc(s).replace(/"/g, '&quot;'); }

function _inyectarStyles() {
  if (_styles) return;
  _styles = true;
  const st = document.createElement('style');
  st.id = 'reportes-global-styles';
  st.textContent = `
    .reporte-overlay{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.68);display:flex;align-items:flex-end;justify-content:center;padding:16px}
    .reporte-card{width:min(560px,100%);max-height:min(760px,92dvh);overflow:auto;background:var(--bg-card-oscuro,#18181a);color:var(--texto-alto,#fff);border:1px solid var(--div-oscuro,rgba(255,255,255,.12));border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.45)}
    .reporte-header{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px}.reporte-header>div{flex:1}.reporte-header h2,.reporte-ok h2{margin:0 0 5px;font-size:20px}.reporte-header p,.reporte-ok p{margin:0;color:var(--texto-medio,#aaa);font-size:13.5px;line-height:1.45}.reporte-cerrar{width:34px;height:34px;border:0;border-radius:50%;background:rgba(127,127,127,.16);color:inherit;cursor:pointer}
    .reporte-motivos{display:grid;gap:7px}.reporte-motivo{width:100%;display:grid;grid-template-columns:30px 1fr 24px;align-items:center;gap:8px;text-align:left;padding:12px;border-radius:13px;border:1px solid var(--div-oscuro,rgba(255,255,255,.11));background:transparent;color:inherit;cursor:pointer}.reporte-motivo:hover{background:rgba(127,127,127,.09)}.reporte-motivo.seleccionado{border-color:#3390EC;background:rgba(51,144,236,.12)}.reporte-motivo strong{font-size:13.5px}.reporte-check{opacity:0;color:#3390EC;font-weight:800}.reporte-motivo.seleccionado .reporte-check{opacity:1}
    .reporte-detalle-wrap{display:grid;gap:7px;margin-top:12px;font-size:12px;color:var(--texto-medio,#aaa)}.reporte-detalle{resize:vertical;min-height:76px;border:1px solid var(--div-oscuro,rgba(255,255,255,.13));border-radius:12px;padding:10px 12px;background:var(--campo-bg,#232326);color:inherit;font:inherit;outline:none}.reporte-detalle:focus{border-color:#3390EC}.reporte-enviar{width:100%;margin-top:14px;border:0;border-radius:12px;padding:12px 14px;background:#3390EC;color:#fff;font-weight:700;cursor:pointer}.reporte-enviar:disabled{opacity:.45;cursor:not-allowed}.reporte-error{margin:10px 0 0;color:#ff6b6b;font-size:12.5px}.reporte-nota{text-align:center;color:var(--texto-bajo,#888);font-size:11.5px;margin:9px 0 0}.reporte-ok{text-align:center;padding:20px 8px 8px}.reporte-ok-icon{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:rgba(52,199,89,.14);color:#34C759;font-size:32px;font-weight:800}
    .reporte-menu{position:fixed;z-index:1200;min-width:180px;background:var(--bg-card-oscuro,#1c1c1e);border:1px solid var(--div-oscuro,rgba(255,255,255,.12));border-radius:12px;padding:6px;box-shadow:0 10px 35px rgba(0,0,0,.35)}.reporte-menu button{width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:10px;border-radius:8px;cursor:pointer}.reporte-menu button:hover{background:rgba(127,127,127,.12)}.reporte-menu .peligro{color:#ff6b6b}
    @media(min-width:700px){.reporte-overlay{align-items:center}.reporte-card{border-radius:20px}}
  `;
  document.head.appendChild(st);
}
