// ═════════════════════════════════════════════════════════════════
// conversacion-screen.js
//
// Equivalente web de conversacion_screen.dart. Alcance de esta
// primera fase: burbujas de texto, envío/recepción en vivo, estado
// (enviando/entregado/fallido), marcar como leído al abrir.
// Quedan para una fase siguiente: multimedia, stickers, reacciones,
// responder citando, editar/eliminar (el repositorio ya soporta
// editar/eliminar — MensajeRepository.editarMensaje/eliminarMensaje
// — solo falta la UI de long-press/menú contextual).
// ═════════════════════════════════════════════════════════════════

import { usuarioActual } from '../../core/auth.js';
import { supabase } from '../../core/supabase-client.js';
import { ChatRepository } from './chat-repository.js';
import { MensajeRepository } from './mensaje-repository.js';
import { ChatMediaService } from './chat-media-service.js';
import { PresenceService } from './presence-service.js';
import { crearControladorAudio } from './conversacion-audio-recorder.js';
import { crearControladorAdjuntos } from './conversacion-adjuntos.js';
import { abrirSelectorReenvio } from './conversacion-acciones.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { TipoMensaje, textoPreview } from './mensaje.js';
import { pintarMensajes } from './conversacion-renderer.js';

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'conversacion-screen-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
/* Los componentes de JaguarChat usan el atributo hidden para alternar estados.
   Varias clases declaran display:flex/grid, así que forzamos que hidden siempre gane. */
.conv-pantalla [hidden]{ display:none !important; }
.conv-pantalla{ display:flex; flex-direction:column; height:100%; }
.conv-appbar{
  height:60px; flex-shrink:0; display:flex; align-items:center; gap:10px;
  padding:0 12px; background:var(--bg-card-oscuro); border-bottom:1px solid var(--div-oscuro);
}
.conv-appbar .btn-volver{ font-size:26px; color:var(--texto-alto); background:none; border:none; padding:4px 8px; cursor:pointer; }
.conv-avatar{
  width:38px; height:38px; border-radius:50%; flex-shrink:0;
  background:#2C2C2E; color:rgba(255,255,255,0.6);
  display:flex; align-items:center; justify-content:center;
  font-size:15px; font-weight:700; overflow:hidden;
}
.conv-avatar img{ width:100%; height:100%; object-fit:cover; }
.conv-titulo{ min-width:0; }
.conv-titulo-nombre{ color:var(--texto-alto); font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.conv-titulo-sub{ color:var(--texto-bajo); font-size:12px; }

.conv-cuerpo{ flex:1; overflow-y:auto; padding:14px 12px 8px; display:flex; flex-direction:column; gap:2px; }
.conv-vacio{ margin:auto; text-align:center; color:var(--texto-bajo); font-size:13.5px; padding:24px; }

.conv-fila{ display:flex; margin:3px 0; }
.conv-fila.mio{ justify-content:flex-end; }
.conv-fila.otro{ justify-content:flex-start; }

/* Contenedor real del "78% de ancho máximo" — antes ese max-width
   estaba puesto directo en .conv-burbuja, pero su padre (este div)
   no tenía un ancho definido, así que el porcentaje no tenía contra
   qué calcularse y la burbuja se encogía a casi nada (el texto
   terminaba una letra por línea). Aquí sí resuelve bien porque
   .conv-fila (el padre) ocupa el 100% del ancho del chat. */
.conv-grupo{ max-width:78%; display:flex; flex-direction:column; min-width:0; }
.conv-fila.mio .conv-grupo{ align-items:flex-end; }
.conv-fila.otro .conv-grupo{ align-items:flex-start; }

.conv-burbuja{
  display:inline-block;
  max-width:100%;
  padding:9px 13px; border-radius:18px;
  font-size:14.5px; line-height:1.4; white-space:pre-wrap; overflow-wrap:anywhere;
  position:relative;
}
.conv-fila.mio .conv-burbuja{ background:#3390EC; color:#fff; border-bottom-right-radius:5px; }
.conv-fila.otro .conv-burbuja{ background:var(--bg-card-oscuro); color:var(--texto-alto); border-bottom-left-radius:5px; }

.conv-meta{ display:flex; align-items:center; gap:4px; margin-top:3px; font-size:10.5px; opacity:0.75; }
.conv-fila.mio .conv-meta{ justify-content:flex-end; color:rgba(255,255,255,0.85); }
.conv-fila.otro .conv-meta{ color:var(--texto-bajo); }
.conv-estado-fallido{ color:#FF6B6B; font-weight:600; }

.conv-fecha-separador{ text-align:center; color:var(--texto-bajo); font-size:11.5px; margin:14px 0 6px; }

/* ── Fila con menú de acciones (⋯) al pasar el mouse ── */
.conv-fila{ position:relative; }
.conv-fila:hover .conv-btn-mas, .conv-fila .conv-btn-mas:focus-visible{ opacity:1; }
.conv-btn-mas{
  align-self:center; flex-shrink:0;
  width:26px; height:26px; border-radius:50%; border:none;
  background:rgba(127,127,127,0.14); color:var(--texto-bajo);
  display:flex; align-items:center; justify-content:center;
  opacity:0; transition:opacity 120ms ease; cursor:pointer;
  margin:0 4px;
}

.conv-menu-acciones{
  position:absolute; z-index:15; min-width:170px;
  background:var(--bg-card-oscuro); border:1px solid var(--div-oscuro);
  border-radius:12px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,0.35);
}
.conv-menu-item{
  display:flex; align-items:center; gap:9px; width:100%;
  padding:9px 10px; border:none; background:none; border-radius:8px;
  color:var(--texto-alto); font-size:13.5px; text-align:left; cursor:pointer;
}
.conv-menu-item:hover{ background:rgba(127,127,127,0.12); }
.conv-menu-item.peligro{ color:#FF6B6B; }
.conv-menu-item svg{ width:16px; height:16px; flex-shrink:0; }

.conv-emoji-picker{
  position:absolute; z-index:15; display:flex; gap:4px;
  background:var(--bg-card-oscuro); border:1px solid var(--div-oscuro);
  border-radius:22px; padding:6px 8px; box-shadow:0 8px 24px rgba(0,0,0,0.35);
}
.conv-emoji-picker button{
  border:none; background:none; font-size:20px; line-height:1; padding:4px; cursor:pointer;
  border-radius:50%; transition:transform 100ms ease;
}
.conv-emoji-picker button:hover{ transform:scale(1.25); background:rgba(127,127,127,0.14); }

/* ── Reacciones (chips agrupados debajo de la burbuja) ── */
.conv-reacciones{ display:flex; flex-wrap:wrap; gap:4px; margin-top:3px; }
.conv-reaccion-chip{
  display:flex; align-items:center; gap:3px;
  padding:2px 7px; border-radius:12px; border:1px solid var(--div-oscuro);
  background:var(--bg-card-oscuro); font-size:12px; cursor:pointer;
}
.conv-reaccion-chip.mia{ border-color:#3390EC; background:rgba(51,144,236,0.14); }
.conv-reaccion-chip .conv-reaccion-cuenta{ color:var(--texto-bajo); font-size:11px; }

/* ── Cita de respuesta (dentro de la burbuja) ── */
.conv-cita{
  display:block; padding:6px 9px; margin-bottom:6px; border-radius:8px;
  border-left:3px solid #3390EC; background:rgba(255,255,255,0.08);
  font-size:12.5px; line-height:1.3; cursor:pointer;
}
.conv-fila.mio .conv-cita{ background:rgba(255,255,255,0.16); }
.conv-cita-autor{ font-weight:700; color:#69B7F5; }
.conv-fila.mio .conv-cita-autor{ color:#eaf4ff; }
.conv-cita-texto{ opacity:0.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }

/* ── Card de contexto (objeto perdido / marketplace) dentro de la burbuja ── */
.conv-contexto-card{
  display:flex; gap:8px; align-items:center; cursor:pointer;
  padding:7px; margin-bottom:6px; border-radius:10px;
  background:rgba(255,255,255,0.08);
}
.conv-fila.mio .conv-contexto-card{ background:rgba(255,255,255,0.16); }
.conv-contexto-card img{ width:38px; height:38px; border-radius:7px; object-fit:cover; flex-shrink:0; }
.conv-contexto-card-info{ min-width:0; }
.conv-contexto-card-desc{ font-size:12.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.conv-contexto-card-lugar{ font-size:11px; opacity:0.75; margin-top:2px; }

/* ── Barra de "respondiendo a" / "editando" arriba del composer ── */
.conv-composer-contexto{
  flex-shrink:0; display:flex; align-items:center; gap:10px;
  padding:8px 14px; background:var(--campo-bg); border-top:1px solid var(--div-oscuro);
}
.conv-composer-contexto-linea{ width:3px; align-self:stretch; border-radius:2px; background:#3390EC; flex-shrink:0; }
.conv-composer-contexto-info{ flex:1; min-width:0; }
.conv-composer-contexto-titulo{ font-size:12.5px; font-weight:700; color:#3390EC; }
.conv-composer-contexto-texto{ font-size:12.5px; color:var(--texto-medio); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.conv-composer-contexto-cerrar{
  flex-shrink:0; width:26px; height:26px; border-radius:50%; border:none;
  background:rgba(127,127,127,0.14); color:var(--texto-bajo); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:14px;
}

.conv-composer{
  flex-shrink:0; display:flex; align-items:flex-end; gap:8px;
  padding:10px 12px; background:var(--bg-card-oscuro); border-top:1px solid var(--div-oscuro);
}
.conv-btn-adjuntar{
  flex-shrink:0; width:38px; height:38px; border-radius:50%; border:none;
  background:none; color:var(--texto-bajo); display:flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.conv-btn-adjuntar:hover{ background:rgba(127,127,127,0.12); }
.conv-btn-adjuntar svg{ width:22px; height:22px; }
.conv-composer textarea{
  flex:1; min-width:0; max-height:120px; resize:none;
  padding:10px 14px; border-radius:20px; border:1px solid var(--campo-borde);
  background:var(--campo-bg); color:var(--texto-alto); font-size:14.5px;
  font-family:inherit; outline:none;
}
.conv-composer textarea::placeholder{ color:var(--texto-bajo); }
.conv-btn-enviar{
  flex-shrink:0; width:40px; height:40px; border-radius:50%; border:none;
  background:#3390EC; color:#fff; display:flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.conv-btn-enviar:disabled{ opacity:0.4; cursor:default; }
.conv-btn-enviar svg{ width:19px; height:19px; }

/* En pantallas anchas, la conversación se abre como .pushed-screen
   (pantalla completa) sin ningún límite de ancho — por eso se veía
   estirada de borde a borde con burbujas perdidas en medio de tanto
   espacio vacío. Aquí se limita SOLO esta pantalla (no las demás que
   usan .pushed-screen) a una columna centrada, como el panel de
   chat de Instagram/Messenger. Esto solo aplica en modo pantalla
   completa (mobile) — en modo panel embebido (desktop, ver
   chats-screen.js) el ancho ya lo da la columna del panel. */
@media (min-width: 900px) {
  .conv-pantalla.conv-modo-pantalla-completa{
    max-width: 760px;
    margin: 0 auto;
    border-left: 1px solid var(--div-oscuro);
    border-right: 1px solid var(--div-oscuro);
  }
}

/* ── Burbujas de media (imagen/video/documento) ── */
.conv-media-imagen, .conv-media-video{
  display:block; max-width:280px; max-height:320px;
  border-radius:14px; cursor:pointer; object-fit:cover;
}
.conv-media-video-wrap{ position:relative; }
.conv-media-play{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,0.25); border-radius:14px;
}
.conv-media-play span{
  width:44px; height:44px; border-radius:50%;
  background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.35);
  display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;
}
.conv-burbuja.conv-burbuja-media{ padding:4px; }
.conv-burbuja.conv-burbuja-media .conv-media-caption{ padding:7px 8px 3px; font-size:14px; }

.conv-media-doc{
  display:flex; align-items:center; gap:10px; text-decoration:none; color:inherit;
  min-width:180px;
}
.conv-media-doc-icono{
  width:38px; height:38px; border-radius:10px; flex-shrink:0;
  background:rgba(127,127,127,0.18); display:flex; align-items:center; justify-content:center; font-size:18px;
}
.conv-media-doc-info{ min-width:0; }
.conv-media-doc-nombre{ font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.conv-media-doc-tam{ font-size:11.5px; opacity:0.7; }

/* ── Vista previa antes de enviar (caption) ── */
.conv-previa-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:800;
  display:flex; flex-direction:column;
}
.conv-previa-cerrar{
  align-self:flex-start; margin:12px; width:36px; height:36px; border-radius:50%;
  background:rgba(255,255,255,0.12); border:none; color:#fff; font-size:20px; cursor:pointer;
}
.conv-previa-cuerpo{ flex:1; display:flex; align-items:center; justify-content:center; padding:0 20px; min-height:0; }
.conv-previa-cuerpo img, .conv-previa-cuerpo video{ max-width:100%; max-height:100%; border-radius:8px; }
.conv-previa-footer{ flex-shrink:0; display:flex; align-items:center; gap:10px; padding:14px 16px; }
.conv-previa-footer input{
  flex:1; padding:11px 16px; border-radius:22px; border:1px solid rgba(255,255,255,0.2);
  background:rgba(255,255,255,0.08); color:#fff; font-size:14.5px; outline:none;
}
.conv-previa-footer input::placeholder{ color:rgba(255,255,255,0.5); }
.conv-previa-btn-enviar{
  flex-shrink:0; width:44px; height:44px; border-radius:50%; border:none;
  background:#3390EC; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.conv-previa-btn-enviar svg{ width:20px; height:20px; }
.conv-previa-btn-enviar:disabled{ opacity:0.5; cursor:default; }

/* ── Visor de imagen a pantalla completa ── */
.conv-visor-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:800;
  display:flex; align-items:center; justify-content:center;
}
.conv-visor-overlay img{ max-width:92%; max-height:92%; border-radius:4px; }
.conv-visor-cerrar{
  position:absolute; top:14px; right:16px; width:36px; height:36px; border-radius:50%;
  background:rgba(255,255,255,0.12); border:none; color:#fff; font-size:20px; cursor:pointer;
}

/* ── Banner de "subiendo..." ── */
.conv-subiendo-banner{
  flex-shrink:0; display:flex; align-items:center; gap:10px;
  padding:8px 16px; background:rgba(51,144,236,0.1); color:#3390EC; font-size:13px;
}
.conv-subiendo-spinner{
  width:14px; height:14px; border-radius:50%;
  border:2px solid rgba(51,144,236,0.3); border-top-color:#3390EC;
  animation:conv-girar 0.7s linear infinite; flex-shrink:0;
}
@keyframes conv-girar{ to{ transform:rotate(360deg); } }

/* ── JaguarChat completo: presencia, emojis/stickers, audio y overlays ── */
.conv-appbar-perfil{ display:flex; align-items:center; gap:10px; min-width:0; flex:1; cursor:pointer; border-radius:10px; padding:3px 5px; }
.conv-appbar-perfil:hover{ background:rgba(127,127,127,.08); }
.conv-titulo-sub.en-linea{ color:#34C759; }
.conv-btn-emoji,.conv-btn-audio{ flex-shrink:0; width:38px; height:38px; border-radius:50%; border:none; background:none; color:var(--texto-bajo); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:21px; }
.conv-btn-emoji:hover,.conv-btn-audio:hover{ background:rgba(127,127,127,.12); }
.conv-btn-audio.grabando{ color:#ff453a; background:rgba(255,69,58,.12); animation:conv-pulse 1s ease-in-out infinite; }
@keyframes conv-pulse{ 50%{ transform:scale(.92); opacity:.72; } }
.conv-grabando{ flex-shrink:0; display:flex; align-items:center; gap:8px; padding:7px 14px; color:#ff453a; background:rgba(255,69,58,.08); font-size:13px; border-top:1px solid var(--div-oscuro); }
.conv-grabando-punto{ width:8px; height:8px; border-radius:50%; background:#ff453a; animation:conv-pulse 1s ease-in-out infinite; }

.conv-panel-emoji{ flex-shrink:0; height:280px; background:var(--bg-app); border-top:1px solid var(--div-oscuro); display:flex; flex-direction:column; }
.conv-panel-tabs{ display:flex; border-bottom:1px solid var(--div-oscuro); }
.conv-panel-tabs button{ flex:1; padding:10px; border:none; background:none; color:var(--texto-bajo); font-weight:600; cursor:pointer; }
.conv-panel-tabs button.activo{ color:#3390EC; border-bottom:2px solid #3390EC; }
.conv-emoji-grid{ padding:10px; overflow:auto; display:grid; grid-template-columns:repeat(9,1fr); gap:3px; }
.conv-emoji-grid button{ border:none; background:none; font-size:23px; padding:5px; border-radius:7px; cursor:pointer; }
.conv-emoji-grid button:hover{ background:rgba(127,127,127,.12); }
.conv-sticker-panel{ flex:1; min-height:0; overflow:auto; padding:10px; }
.conv-sticker-toolbar{ display:flex; justify-content:flex-end; margin-bottom:8px; }
.conv-sticker-subir{ border:1px solid rgba(51,144,236,.35); background:rgba(51,144,236,.08); color:#3390EC; border-radius:10px; padding:7px 10px; cursor:pointer; font-size:12px; font-weight:600; }
.conv-sticker-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.conv-sticker-grid button{ height:76px; border:none; background:rgba(127,127,127,.06); border-radius:12px; cursor:pointer; padding:6px; }
.conv-sticker-grid img{ width:100%; height:100%; object-fit:contain; }
.conv-sticker-vacio{ color:var(--texto-bajo); text-align:center; padding:34px 12px; font-size:13px; line-height:1.4; }

.conv-sticker-msg{ width:140px; max-height:150px; object-fit:contain; display:block; }
.conv-audio{ display:flex; align-items:center; gap:8px; min-width:210px; }
.conv-audio audio{ width:230px; max-width:100%; height:34px; }
.conv-fallido-reintentar{ border:none; background:none; color:#ff6b6b; padding:0; cursor:pointer; font:inherit; font-weight:600; }

.conv-perfil-overlay,.conv-reenviar-overlay{ position:fixed; inset:0; z-index:900; background:rgba(0,0,0,.68); display:flex; align-items:center; justify-content:center; padding:18px; }
.conv-perfil-card,.conv-reenviar-card{ width:min(430px,100%); max-height:min(650px,88vh); overflow:auto; background:var(--bg-app); border:1px solid var(--div-oscuro); border-radius:20px; box-shadow:0 18px 60px rgba(0,0,0,.45); }
.conv-perfil-cab{ display:flex; justify-content:flex-end; padding:10px 10px 0; }
.conv-overlay-cerrar{ width:34px; height:34px; border-radius:50%; border:none; background:rgba(127,127,127,.14); color:var(--texto-alto); cursor:pointer; }
.conv-perfil-contenido{ padding:0 22px 24px; text-align:center; }
.conv-perfil-foto{ width:104px; height:104px; margin:0 auto 12px; border-radius:50%; overflow:hidden; background:#2c2c2e; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:700; color:#aaa; }
.conv-perfil-foto img{ width:100%; height:100%; object-fit:cover; }
.conv-perfil-nombre{ font-size:21px; font-weight:750; color:var(--texto-alto); }
.conv-perfil-user{ color:#3390EC; margin-top:3px; }
.conv-perfil-datos{ margin-top:18px; text-align:left; display:grid; gap:8px; }
.conv-perfil-dato{ padding:11px 12px; background:rgba(127,127,127,.07); border-radius:12px; color:var(--texto-medio); font-size:13px; }
.conv-reenviar-card{ padding:14px; }
.conv-reenviar-titulo{ font-weight:750; color:var(--texto-alto); font-size:17px; display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.conv-reenviar-buscar{ width:100%; box-sizing:border-box; padding:11px 13px; border-radius:12px; border:1px solid var(--campo-borde); background:var(--campo-bg); color:var(--texto-alto); outline:none; }
.conv-reenviar-lista{ margin-top:8px; max-height:420px; overflow:auto; }
.conv-reenviar-item{ width:100%; display:flex; align-items:center; gap:10px; border:none; background:none; color:var(--texto-alto); padding:9px; border-radius:10px; cursor:pointer; text-align:left; }
.conv-reenviar-item:hover{ background:rgba(127,127,127,.09); }
.conv-reenviar-avatar{ width:40px;height:40px;border-radius:50%;overflow:hidden;background:#2c2c2e;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.conv-reenviar-avatar img{width:100%;height:100%;object-fit:cover;}

@media (max-width:650px){ .conv-emoji-grid{ grid-template-columns:repeat(7,1fr); } .conv-media-imagen,.conv-media-video{ max-width:230px; } }
`;

/// Construye la UI de la conversación (appbar + burbujas + composer)
/// dentro de `root`, sea cual sea el contenedor (overlay de pantalla
/// completa o panel embebido). Devuelve una función de limpieza
/// (desuscribe el liveQuery de mensajes) para llamar al desmontar.
function _montarConversacion(root, { otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl, contextoObjeto = null }, { mostrarVolver, onVolver }) {
  const inicial = (otroNombre || '?').trim().charAt(0).toUpperCase();
  const avatar = otroAvatarUrl
    ? `<img src="${_escapeAttr(otroAvatarUrl)}" alt="">`
    : `<span>${inicial}</span>`;

  root.innerHTML = `
    <header class="conv-appbar">
      ${mostrarVolver ? '<button type="button" class="btn-volver">‹</button>' : ''}
      <button type="button" class="conv-appbar-perfil" id="conv-perfil-btn" title="Ver perfil">
        <span class="conv-avatar">${avatar}</span>
        <span class="conv-titulo">
          <div class="conv-titulo-nombre">${_escapeHtml(otroNombre)}</div>
          <div class="conv-titulo-sub" id="conv-presencia-texto">${otroNombreUsuario ? `@${_escapeHtml(otroNombreUsuario)}` : 'Usuario'}</div>
        </span>
      </button>
    </header>
    <div class="conv-cuerpo" id="conv-cuerpo"></div>
    <div class="conv-subiendo-banner" id="conv-subiendo-banner" hidden>
      <span class="conv-subiendo-spinner"></span>
      <span id="conv-subiendo-texto">Subiendo...</span>
    </div>
    <div class="conv-composer-contexto" id="conv-composer-contexto" hidden>
      <span class="conv-composer-contexto-linea"></span>
      <span class="conv-composer-contexto-info">
        <div class="conv-composer-contexto-titulo" id="conv-contexto-titulo"></div>
        <div class="conv-composer-contexto-texto" id="conv-contexto-texto"></div>
      </span>
      <button type="button" class="conv-composer-contexto-cerrar" id="conv-contexto-cerrar">✕</button>
    </div>
    <form class="conv-composer" id="conv-composer">
      <button type="button" class="conv-btn-adjuntar" id="conv-btn-imagen" title="Enviar foto o video">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m5 17 4.5-4.5a2 2 0 0 1 2.8 0L18 18"/></svg>
      </button>
      <button type="button" class="conv-btn-adjuntar" id="conv-btn-documento" title="Enviar documento">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48"/></svg>
      </button>
      <input type="file" id="conv-input-imagen" accept="image/*,video/*" hidden>
      <input type="file" id="conv-input-documento" accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/vnd.rar,application/x-7z-compressed" hidden>
      <input type="file" id="conv-input-sticker" accept="image/webp,image/png,image/gif" hidden>
      <button type="button" class="conv-btn-emoji" id="conv-btn-emoji" title="Emojis y stickers">☺</button>
      <textarea id="conv-input" placeholder="Mensaje..." rows="1"></textarea>
      <button type="button" class="conv-btn-audio" id="conv-btn-audio" title="Grabar nota de voz">🎙️</button>
      <button type="submit" class="conv-btn-enviar" id="conv-btn-enviar" disabled hidden>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l13 2-13 2v6z"/></svg>
      </button>
    </form>
    <div class="conv-grabando" id="conv-grabando" hidden><span class="conv-grabando-punto"></span><span>Grabando nota de voz</span><strong id="conv-grabando-tiempo">0:00</strong><span>· toca el micrófono para enviar</span></div>
    <div class="conv-panel-emoji" id="conv-panel-emoji" hidden></div>
  `;

  const cuerpoEl = root.querySelector('#conv-cuerpo');
  const inputEl = root.querySelector('#conv-input');
  const btnEnviar = root.querySelector('#conv-btn-enviar');
  const formEl = root.querySelector('#conv-composer');
  const btnAudio = root.querySelector('#conv-btn-audio');
  const panelEmoji = root.querySelector('#conv-panel-emoji');
  const grabandoEl = root.querySelector('#conv-grabando');
  const grabandoTiempoEl = root.querySelector('#conv-grabando-tiempo');
  const presenciaTextoEl = root.querySelector('#conv-presencia-texto');
  const bannerEl = root.querySelector('#conv-subiendo-banner');
  const bannerTextoEl = root.querySelector('#conv-subiendo-texto');
  const contextoEl = root.querySelector('#conv-composer-contexto');
  const contextoTituloEl = root.querySelector('#conv-contexto-titulo');
  const contextoTextoEl = root.querySelector('#conv-contexto-texto');

  function _mostrarSubiendo(texto) {
    bannerTextoEl.textContent = texto;
    bannerEl.hidden = false;
  }
  function _ocultarSubiendo() {
    bannerEl.hidden = true;
  }

  const miId = usuarioActual()?.id ?? null;
  let primerPintado = true;

  // ── Estado de "respondiendo a" / "editando" / "sobre este objeto" —
  // los tres son mutuamente excluyentes y comparten la misma barrita
  // sobre el composer. contextoObjetoActivo llega ya activo cuando la
  // conversación se abrió desde el botón "Contactar" de Cosas Perdidas.
  let respondiendoA = null; // { mensajeId, contenido, tipo, emisorId }
  let editando = null;      // el objeto Mensaje que se está editando
  let contextoObjetoActivo = contextoObjeto; // { id, descripcion, imagenUrl, lugar, tipo }

  function _snippetPara(msg) {
    return textoPreview(msg);
  }

  function _mostrarContextoObjeto() {
    contextoTituloEl.textContent = 'Sobre este objeto';
    contextoTextoEl.textContent = contextoObjetoActivo.descripcion || '';
    contextoEl.hidden = false;
  }
  if (contextoObjetoActivo) _mostrarContextoObjeto();

  function _iniciarRespuesta(msg) {
    editando = null;
    contextoObjetoActivo = null;
    respondiendoA = msg;
    contextoTituloEl.textContent = msg.emisorId === miId ? 'Respondiendo a ti mismo' : `Respondiendo a ${otroNombre}`;
    contextoTextoEl.textContent = _snippetPara(msg);
    contextoEl.hidden = false;
    inputEl.value = '';
    inputEl.focus();
  }

  function _iniciarEdicion(msg) {
    respondiendoA = null;
    contextoObjetoActivo = null;
    editando = msg;
    contextoTituloEl.textContent = 'Editando mensaje';
    contextoTextoEl.textContent = msg.contenido || '';
    contextoEl.hidden = false;
    inputEl.value = msg.contenido || '';
    inputEl.dispatchEvent(new Event('input'));
    inputEl.focus();
  }

  function _cancelarContexto() {
    respondiendoA = null;
    contextoObjetoActivo = null;
    if (editando) inputEl.value = '';
    editando = null;
    contextoEl.hidden = true;
    inputEl.dispatchEvent(new Event('input'));
  }
  root.querySelector('#conv-contexto-cerrar').addEventListener('click', _cancelarContexto);

  if (mostrarVolver) {
    root.querySelector('.btn-volver').addEventListener('click', () => onVolver?.());
  }

  root.querySelector('#conv-perfil-btn').addEventListener('click', () => {
    _abrirPerfilPreview({ otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl });
  });

  const unsubPresence = PresenceService.subscribe((ids) => {
    const online = ids instanceof Set ? ids.has(otroUsuarioId) : new Set(ids).has(otroUsuarioId);
    presenciaTextoEl.textContent = online ? 'En línea' : (otroNombreUsuario ? `@${otroNombreUsuario}` : 'Desconectado');
    presenciaTextoEl.classList.toggle('en-linea', online);
  });
  PresenceService.iniciarPresencia?.();

  // Marca como leído en cuanto se abre la conversación.
  ChatRepository.marcarComoLeido(otroUsuarioId);

  // Trae cualquier mensaje pendiente (catch-up) — la lista se actualiza
  // sola vía subscribeMensajes en cuanto esto escribe en Dexie.
  if (miId) {
    MensajeRepository.sincronizarDesdeSupabase({ otroUsuarioId, miId });
  }

  const unsubMensajes = MensajeRepository.subscribeMensajes(otroUsuarioId, (mensajes) => {
    pintarMensajes(cuerpoEl, mensajes, miId, {
      otroUsuarioId,
      otroNombre,
      onResponder: _iniciarRespuesta,
      onEditar: _iniciarEdicion,
      onReenviar: (msg) => _abrirReenviar(msg),
    });
    if (primerPintado) {
      cuerpoEl.scrollTop = cuerpoEl.scrollHeight;
      primerPintado = false;
    } else {
      // Si ya estaba cerca del final, sigue el scroll con los mensajes nuevos.
      const cercaDelFinal = cuerpoEl.scrollHeight - cuerpoEl.scrollTop - cuerpoEl.clientHeight < 200;
      if (cercaDelFinal) cuerpoEl.scrollTop = cuerpoEl.scrollHeight;
    }
    // Si llegan mensajes del otro mientras la conversación está abierta,
    // se marcan como leídos de inmediato.
    ChatRepository.marcarComoLeido(otroUsuarioId);
  });

  // Auto-resize del textarea + habilitar/deshabilitar el botón enviar.
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
    const vacio = inputEl.value.trim().length === 0;
    btnEnviar.disabled = vacio;
    btnEnviar.hidden = vacio;
    btnAudio.hidden = !vacio;
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.requestSubmit();
    }
  });

  // Envío de texto / emoji insertado en el textarea. Este listener es
  // el punto único de salida del composer y debe permanecer en la pantalla
  // aunque el resto de responsabilidades se extraigan a controladores.
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const texto = inputEl.value.trim();
    if (!texto) return;

    btnEnviar.disabled = true;

    try {
      if (editando) {
        const msgAEditar = editando;
        _cancelarContexto();
        await MensajeRepository.editarMensaje({
          msg: msgAEditar,
          nuevoContenido: texto,
          otroUsuarioId,
        });
        return;
      }

      const respuesta = respondiendoA;
      const contexto = respuesta == null ? contextoObjetoActivo : null;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      btnEnviar.hidden = true;
      btnAudio.hidden = false;
      contextoEl.hidden = true;
      respondiendoA = null;
      contextoObjetoActivo = null;
      inputEl.focus();

      await MensajeRepository.enviarMensaje({
        otroUsuarioId,
        otroNombre,
        otroNombreUsuario,
        otroAvatarUrl,
        contenido: texto,
        tipo: TipoMensaje.TEXTO,
        respuestaAMensajeId: respuesta?.mensajeId ?? null,
        respuestaAContenido: respuesta ? _snippetPara(respuesta) : null,
        respuestaATipo: respuesta?.tipo ?? null,
        respuestaAEmisorId: respuesta?.emisorId ?? null,
        contextoDescripcion: contexto?.descripcion ?? null,
        contextoImagenUrl: contexto?.imagenUrl ?? null,
        contextoLugar: contexto?.lugar ?? null,
        contextoObjetoId: contexto?.id ?? null,
        contextoTipo: contexto ? (contexto.tipo || 'objeto_perdido') : null,
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Si el envío falla antes de que el repositorio pueda crear su estado
      // optimista, devolvemos el texto al composer para no perderlo.
      if (!inputEl.value) inputEl.value = texto;
      inputEl.dispatchEvent(new Event('input'));
      alert('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      const vacio = inputEl.value.trim().length === 0;
      btnEnviar.disabled = vacio;
      btnEnviar.hidden = vacio;
      btnAudio.hidden = !vacio;
    }
  });

  // ── Adjuntos, multimedia, emojis y stickers ──
  const adjuntosController = crearControladorAdjuntos({
    root,
    inputEl,
    panelEmoji,
    otroUsuarioId,
    otroNombre,
    otroNombreUsuario,
    otroAvatarUrl,
    obtenerRespuesta: () => respondiendoA,
    consumirRespuesta: () => {
      contextoEl.hidden = true;
      respondiendoA = null;
    },
    snippetPara: _snippetPara,
    mostrarSubiendo: _mostrarSubiendo,
    ocultarSubiendo: _ocultarSubiendo,
  });

  // ── Notas de voz ──
  const audioController = crearControladorAudio({
    boton: btnAudio,
    indicador: grabandoEl,
    tiempoEl: grabandoTiempoEl,
    panelEmoji,
    onAudioListo: async ({ file, duracionMs }) => {
      const respuesta = respondiendoA;
      contextoEl.hidden = true;
      respondiendoA = null;
      _mostrarSubiendo('Enviando nota de voz...');
      try {
        await ChatMediaService.enviarAudio({
          file, duracionMs, otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl,
          respuestaAMensajeId: respuesta?.mensajeId ?? null,
          respuestaAContenido: respuesta ? _snippetPara(respuesta) : null,
          respuestaATipo: respuesta?.tipo ?? null,
          respuestaAEmisorId: respuesta?.emisorId ?? null,
        });
      } finally {
        _ocultarSubiendo();
      }
    },
    onError: (error, mensaje) => {
      console.error('Nota de voz:', error);
      alert(mensaje);
    },
  });

  btnAudio.addEventListener('click', audioController.alternar);

  async function _abrirReenviar(msg) {
    abrirSelectorReenvio(msg, async (perfil) => {
      await MensajeRepository.enviarMensaje({
        otroUsuarioId: perfil.id,
        otroNombre: perfil.nombre || 'Usuario',
        otroNombreUsuario: perfil.nombre_usuario ?? null,
        otroAvatarUrl: perfil.cdn_foto_perfil ?? null,
        contenido: msg.contenido ?? null,
        tipo: msg.tipo,
        mediaUrlRemota: msg.mediaUrlRemota ?? null,
        mediaNombreArchivo: msg.mediaNombreArchivo ?? null,
        mediaTamanioBytes: msg.mediaTamanioBytes ?? null,
        mediaDuracionMs: msg.mediaDuracionMs ?? null,
        mediaAncho: msg.mediaAncho ?? null,
        mediaAlto: msg.mediaAlto ?? null,
        mediaThumbnailUrl: msg.mediaThumbnailUrl ?? null,
      });
    });
  }

  cuerpoEl.innerHTML = `<p class="conv-vacio">Cargando conversación...</p>`;

  return () => {
    adjuntosController.destruir();
    audioController.destruir();
    unsubPresence?.();
    unsubMensajes?.();
    // Por si el chat se cierra con un menú/emoji-picker todavía abierto
    // (ambos se cuelgan de document.body, no de `root`, para poder
    // posicionarse libremente sin que el overflow del chat los recorte).
    document.querySelectorAll('.conv-menu-acciones, .conv-emoji-picker, .conv-perfil-overlay, .conv-reenviar-overlay').forEach((el) => el.remove());
  };
}

/// Abre la conversación como pushed-screen sobre document.body — mismo
/// patrón que conoce-plantel.js / mapa-interactivo.js. Se usa en
/// mobile/tablet (<900px), donde no cabe una lista + conversación
/// lado a lado.
export function abrirConversacion(params) {
  _injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen';
  document.body.appendChild(overlay);

  const root = document.createElement('div');
  root.className = 'conv-pantalla conv-modo-pantalla-completa';
  overlay.appendChild(root);

  let cleanup = null;
  cleanup = _montarConversacion(root, params, {
    mostrarVolver: true,
    onVolver: () => {
      cleanup?.();
      overlay.remove();
    },
  });
}

/// Monta la conversación DENTRO de un contenedor ya existente (panel
/// embebido junto a la lista de chats) en vez de una pantalla
/// completa — usado en desktop (≥900px, ver chats-screen.js), así la
/// barra principal de la app y la lista de chats nunca se tapan.
/// Devuelve una función de limpieza — llámala antes de montar otra
/// conversación en el mismo panel.
export function montarConversacionEnPanel(container, params) {
  _injectStyles();
  const root = document.createElement('div');
  root.className = 'conv-pantalla';
  container.innerHTML = '';
  container.appendChild(root);
  return _montarConversacion(root, params, { mostrarVolver: false });
}

async function _abrirPerfilPreview({ otroUsuarioId, otroNombre, otroNombreUsuario, otroAvatarUrl }) {
  const overlay=document.createElement('div'); overlay.className='conv-perfil-overlay';
  overlay.innerHTML=`<div class="conv-perfil-card"><div class="conv-perfil-cab"><button class="conv-overlay-cerrar" type="button">✕</button></div><div class="conv-perfil-contenido"><div style="color:var(--texto-bajo);padding:30px">Cargando perfil...</div></div></div>`;
  document.body.appendChild(overlay); const cerrar=()=>overlay.remove();
  overlay.addEventListener('click',(e)=>{if(e.target===overlay) cerrar();}); overlay.querySelector('.conv-overlay-cerrar').addEventListener('click',cerrar);
  let perfil={};
  try { const {data}=await supabase.from('perfiles').select('carrera, semestre, creado_en, cdn_foto_perfil, nombre, nombre_usuario').eq('id',otroUsuarioId).maybeSingle(); perfil=data||{}; } catch {}
  const nombre=perfil.nombre||otroNombre||'Usuario', user=perfil.nombre_usuario||otroNombreUsuario, foto=perfil.cdn_foto_perfil||otroAvatarUrl;
  const inicial=(nombre||'?').trim().charAt(0).toUpperCase();
  overlay.querySelector('.conv-perfil-contenido').innerHTML=`<div class="conv-perfil-foto">${foto?`<img src="${_escapeAttr(foto)}" alt="">`:_escapeHtml(inicial)}</div><div class="conv-perfil-nombre">${_escapeHtml(nombre)}</div>${user?`<div class="conv-perfil-user">@${_escapeHtml(user)}</div>`:''}<div class="conv-perfil-datos">${perfil.carrera?`<div class="conv-perfil-dato">🎓 ${_escapeHtml(perfil.carrera)}${perfil.semestre?` · ${perfil.semestre}° sem.`:''}</div>`:''}${perfil.creado_en?`<div class="conv-perfil-dato">📅 En Comunidad ITVH desde ${new Date(perfil.creado_en).toLocaleDateString('es-MX',{month:'long',year:'numeric'})}</div>`:''}<div class="conv-perfil-dato">${PresenceService.estaEnLinea(otroUsuarioId)?'🟢 En línea':'⚫ Desconectado'}</div></div>`;
}
