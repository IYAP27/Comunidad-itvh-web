// ═════════════════════════════════════════════════════════════════
// notificaciones.js — traducción web de notificaciones.dart (v11)
//
// Overlay tipo "pushed screen" con:
//   • Filtros por categoría (Todas / Reacciones / Comentarios /
//     Menciones / Seguimientos) — 100% en cliente, sobre la lista
//     ya cargada, mismo mapeo tipo→categoría que _coincideCategoria().
//   • Agrupado por fecha (Hoy / Ayer / "Sábado 20 julio") con
//     _etiquetaDia(), sin librería intl, igual que en Flutter.
//   • Auto-marcado como leídas AL CERRAR el overlay (no al abrir),
//     para que el usuario alcance a ver el punto azul mientras está
//     parado aquí — mismo criterio que v10 en Flutter.
//   • Suscripción Realtime a inserts de `notificaciones` mientras el
//     overlay está abierto, para refrescar la lista en vivo.
//
// PENDIENTE: al tocar una notificación debería abrir la publicación
// o historia correspondiente, y tocar el avatar debería ir al
// perfil público — ninguna de esas pantallas existe todavía en el
// proyecto web, así que por ahora solo marcan como leída y loguean
// en consola (ver _onTapNotificacion / _onTapAvatar).
//
// Miniaturas de publicación/historia resueltas con resolverUrlMedio
// / resolverUrlHistoria de url-helper.js (mismo criterio que la app:
// cdn_url primero, si no hay cae a Supabase Storage con el path).
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil, resolverUrlMedio, resolverUrlHistoria } from '../../core/url-helper.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { abrirVisorHistorias } from './Historias/visor-historias.js';
import { abrirPublicacionDesdeNotificacion } from './ver-publicacion-notificacion.js';
import { escapeHtml as _escapar, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

const _diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const _meses = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const _CATEGORIAS = [
  { id: 'todas',        etiqueta: 'Todas' },
  { id: 'reacciones',   etiqueta: 'Reacciones' },
  { id: 'comentarios',  etiqueta: 'Comentarios' },
  { id: 'menciones',    etiqueta: 'Menciones' },
  { id: 'seguimientos', etiqueta: 'Seguimientos' },
];

const _TIPOS_POR_CATEGORIA = {
  reacciones:   ['like', 'like_comentario', 'like_historia'],
  comentarios:  ['comentario', 'respuesta', 'comentario_historia'],
  menciones:    ['mencion', 'etiqueta'],
  seguimientos: ['seguidor'],
};

const _ICONOS = {
  like:                  { icono: '❤️', clase: 'rojo' },
  like_comentario:       { icono: '❤️', clase: 'rojo' },
  like_historia:         { icono: '❤️', clase: 'rojo' },
  comentario:            { icono: '💬', clase: 'azul' },
  respuesta:             { icono: '💬', clase: 'azul' },
  comentario_historia:   { icono: '💬', clase: 'azul' },
  seguidor:              { icono: '➕', clase: 'verde' },
  verificado_emprendedor:{ icono: '🏪', clase: 'amarillo' },
  mencion:               { icono: '@',  clase: 'azul' },
  etiqueta:              { icono: '🏷️', clase: 'naranja' },
};

let _overlayEl   = null;
let _notifs      = [];
let _cargando    = true;
let _filtro      = 'todas';
let _canal       = null;
let _onCerrarCb  = null;

/// Punto de entrada. [onCerrar] se llama al cerrar el overlay (útil
/// para que feed.js refresque el número del badge de la campana,
/// igual que hace pantalla_principal.dart tras volver de
/// NotificacionesScreen).
export function abrir(onCerrar) {
  if (_overlayEl) return;
  _onCerrarCb = onCerrar ?? null;
  _filtro   = 'todas';
  _cargando = true;
  _render();
  _cargar();
  _suscribir();
}

function _uid() {
  return usuarioActual()?.id ?? null;
}

async function _cerrar() {
  _canal?.unsubscribe();
  _canal = null;

  // Auto-marcado al salir, igual que _marcarTodasLeidasAlSalir() en
  // Flutter — no repinta la lista, el overlay ya se está destruyendo.
  await _marcarTodasLeidas({ repintar: false });

  _overlayEl?.remove();
  _overlayEl = null;
  _onCerrarCb?.();
}

// ─────────────────────────────────────────────────────────────────
// CARGA + REALTIME
// ─────────────────────────────────────────────────────────────────

async function _cargar() {
  const uid = _uid();
  if (!uid) return;

  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select(
        'id, tipo, leida, creado_en, contenido, origen_id, publicacion_id, historia_id, ' +
        'perfiles!notificaciones_origen_id_fkey(nombre, nombre_usuario, cdn_foto_perfil), ' +
        'publicaciones!notificaciones_publicacion_id_fkey(publicacion_medios(url, cdn_url, orden)), ' +
        'historias!notificaciones_historia_id_fkey(media_url, cdn_url)',
      )
      .eq('destinatario_id', uid)
      .neq('tipo', 'mensaje')
      .order('creado_en', { ascending: false })
      .limit(100);
    if (error) throw error;

    _notifs = (data ?? []).map(_normalizar);
  } catch (e) {
    console.error('notificaciones.js – cargar:', e);
  } finally {
    _cargando = false;
    _pintarBody();
  }
}

function _normalizar(row) {
  const perfil = row.perfiles ?? {};
  const pub    = row.publicaciones ?? null;
  const hist   = row.historias ?? null;

  let thumb = null;
  const medios = (pub?.publicacion_medios ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  if (medios.length > 0) thumb = resolverUrlMedio(medios[0]) || null;
  if (!thumb && hist) thumb = resolverUrlHistoria(hist) || null;

  return {
    id: row.id,
    tipo: row.tipo ?? 'desconocido',
    leida: !!row.leida,
    creadoEn: new Date(row.creado_en),
    remitenteId: row.origen_id ?? null,
    remitenteNombre: perfil.nombre ?? null,
    remitenteFoto: resolverUrlPerfil(perfil) || '',
    publicacionId: row.publicacion_id ?? null,
    historiaId: row.historia_id ?? null,
    contenido: row.contenido ?? null,
    thumb,
    esDePublicacion: !!row.publicacion_id && !row.historia_id,
  };
}

function _suscribir() {
  const uid = _uid();
  if (!uid) return;

  _canal = supabase
    .channel(`notificaciones-overlay-${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `destinatario_id=eq.${uid}` },
      () => _cargar(),
    )
    .subscribe();
}

// ─────────────────────────────────────────────────────────────────
// ACCIONES
// ─────────────────────────────────────────────────────────────────

async function _marcarLeida(id) {
  try {
    const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    if (error) throw error;
    const n = _notifs.find((x) => x.id === id);
    if (n) n.leida = true;
  } catch (e) {
    console.error('notificaciones.js – marcarLeida:', e);
  }
}

async function _marcarTodasLeidas({ repintar = true } = {}) {
  const uid = _uid();
  if (!uid) return;
  if (!_notifs.some((n) => !n.leida)) return;

  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('destinatario_id', uid)
      .eq('leida', false);
    if (error) throw error;
    _notifs.forEach((n) => (n.leida = true));
    if (repintar) _pintarBody();
  } catch (e) {
    console.error('notificaciones.js – marcarTodas:', e);
  }
}

async function _onTapNotificacion(n) {
  if (!n.leida) await _marcarLeida(n.id);
  _pintarBody();

  try {
    if (n.tipo === 'seguidor') {
      if (n.remitenteId) abrirPerfil(n.remitenteId);
      return;
    }

    if (n.tipo === 'verificado_emprendedor') {
      // El shell escucha este evento, cambia a Marketplace y abre "Publicar".
      window.dispatchEvent(new CustomEvent('comunidad:marketplace-publicar'));
      await _cerrarSinMarcar();
      return;
    }

    if (['like_historia', 'comentario_historia'].includes(n.tipo) && n.historiaId) {
      await _abrirHistoria(n.historiaId);
      return;
    }

    if (n.publicacionId) {
      await abrirPublicacionDesdeNotificacion(n.publicacionId);
    }
  } catch (e) {
    console.error('notificaciones.js – abrir destino:', e);
  }
}

async function _cerrarSinMarcar() {
  _canal?.unsubscribe();
  _canal = null;
  _overlayEl?.remove();
  _overlayEl = null;
  _onCerrarCb?.();
}

async function _abrirHistoria(historiaId) {
  const { data, error } = await supabase
    .from('historias')
    .select(`
      id, media_url, cdn_url, tipo, creado_en, autor_id,
      preview_url, track_titulo, track_artista, track_cover,
      track_inicio_ms, video_inicio_ms, video_fin_ms,
      perfiles!historias_autor_id_fkey(nombre, cdn_foto_perfil)
    `)
    .eq('id', historiaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const perfil = data.perfiles ?? {};
  abrirVisorHistorias({
    grupos: [{
      autor_id: data.autor_id,
      nombre: perfil.nombre ?? '',
      foto: resolverUrlPerfil(perfil),
      stories: [{
        id: data.id,
        media_url: data.media_url,
        cdn_url: data.cdn_url,
        tipo: data.tipo,
        creado_en: data.creado_en,
        preview_url: data.preview_url,
        track_titulo: data.track_titulo,
        track_artista: data.track_artista,
        track_cover: data.track_cover,
        track_inicio_ms: data.track_inicio_ms,
        video_inicio_ms: data.video_inicio_ms,
        video_fin_ms: data.video_fin_ms,
      }],
    }],
    indiceGrupo: 0,
    indiceHistoria: 0,
  });
}

function _onTapAvatar(n, ev) {
  ev.stopPropagation();
  if (!n.remitenteId) return;
  abrirPerfil(n.remitenteId);
}

// ─────────────────────────────────────────────────────────────────
// HELPERS DE TEXTO / FECHA
// ─────────────────────────────────────────────────────────────────

function _coincideCategoria(n, filtro) {
  if (filtro === 'todas') return true;
  return (_TIPOS_POR_CATEGORIA[filtro] ?? []).includes(n.tipo);
}

function _notifsFiltradas() {
  return _notifs.filter((n) => _coincideCategoria(n, _filtro));
}

function _texto(n) {
  const nombre = (n.remitenteNombre ?? 'Alguien').split(' ')[0];
  switch (n.tipo) {
    case 'like':                  return `${nombre} reaccionó a tu publicación.`;
    case 'comentario':            return `${nombre} comentó en tu publicación.`;
    case 'respuesta':             return `${nombre} respondió a tu comentario.`;
    case 'seguidor':              return `${nombre} comenzó a seguirte.`;
    case 'like_comentario':       return `${nombre} reaccionó a tu comentario.`;
    case 'like_historia':         return `${nombre} reaccionó a tu historia.`;
    case 'comentario_historia':   return `${nombre} comentó en tu historia.`;
    case 'verificado_emprendedor':return '¡Felicidades! Ya eres Emprendedor Verificado. Ya puedes publicar en el Marketplace.';
    case 'mencion':               return `${nombre} te mencionó en un comentario.`;
    case 'etiqueta': {
      const acompanantes = parseInt(n.contenido ?? '0', 10) || 0;
      if (acompanantes <= 0) return `${nombre} te etiquetó en una publicación.`;
      const sufijo = acompanantes === 1 ? '1 persona más' : `${acompanantes} personas más`;
      return `${nombre} te etiquetó a ti y ${sufijo}.`;
    }
    default: return 'Tienes una nueva notificación.';
  }
}

function _tiempo(fecha) {
  const diffMs = Date.now() - fecha.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr  = Math.floor(min / 60);
  const dias = Math.floor(hr / 24);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (hr < 24) return `hace ${hr} h`;
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} d`;
  return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
}

function _etiquetaDia(fecha) {
  const hoy = new Date();
  const soloFecha = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDias = Math.round((soloFecha(hoy) - soloFecha(fecha)) / 86400000);

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';

  const nombreDia = _diasSemana[(fecha.getDay() + 6) % 7]; // getDay(): 0=domingo
  const nombreMes = _meses[fecha.getMonth()];
  return `${nombreDia} ${fecha.getDate()} ${nombreMes}`;
}

function _agruparPorFecha(lista) {
  const grupos = new Map();
  for (const n of lista) {
    const etiqueta = _etiquetaDia(n.creadoEn);
    if (!grupos.has(etiqueta)) grupos.set(etiqueta, []);
    grupos.get(etiqueta).push(n);
  }
  return grupos;
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────

function _render() {
  const el = document.createElement('div');
  el.className = 'pushed-screen';
  el.id = 'notificaciones-screen';
  el.innerHTML = `
    <header class="appbar-simple">
      <button type="button" class="btn-volver" id="btn-cerrar-notif" aria-label="Volver">‹</button>
      <h2>Notificaciones</h2>
      <button type="button" id="btn-leer-todo" class="btn-accion-accent" hidden>Leer todo</button>
    </header>
    <nav class="notif-filtros" id="notif-filtros">
      ${_CATEGORIAS.map((c) => `
        <button type="button" class="notif-filtro-chip ${c.id === _filtro ? 'activo' : ''}" data-categoria="${_escapeAttr(c.id)}">
          ${c.etiqueta}
        </button>
      `).join('')}
    </nav>
    <main class="notif-body" id="notif-body"></main>
  `;
  document.body.appendChild(el);
  _overlayEl = el;

  el.querySelector('#btn-cerrar-notif').addEventListener('click', _cerrar);
  el.querySelector('#btn-leer-todo').addEventListener('click', () => _marcarTodasLeidas());

  el.querySelectorAll('.notif-filtro-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (_filtro === btn.dataset.categoria) return;
      _filtro = btn.dataset.categoria;
      el.querySelectorAll('.notif-filtro-chip').forEach((b) =>
        b.classList.toggle('activo', b.dataset.categoria === _filtro));
      _pintarBody();
    });
  });

  _pintarBody();
}

function _pintarBody() {
  const body = _overlayEl?.querySelector('#notif-body');
  const btnLeerTodo = _overlayEl?.querySelector('#btn-leer-todo');
  if (!body) return;

  const noLeidas = _notifs.filter((n) => !n.leida).length;
  if (btnLeerTodo) btnLeerTodo.hidden = noLeidas === 0;

  if (_cargando) {
    body.innerHTML = `<div class="spinner"></div>`;
    return;
  }

  const filtradas = _notifsFiltradas();
  if (filtradas.length === 0) {
    body.innerHTML = _htmlEstadoVacio(_filtro);
    return;
  }

  const grupos = _agruparPorFecha(filtradas);
  let html = '';
  if (noLeidas > 0) {
    html += `<p class="notif-contador">${noLeidas} sin leer</p>`;
  }
  for (const [etiqueta, items] of grupos) {
    html += `<p class="notif-fecha-label">${etiqueta}</p>`;
    html += items.map(_htmlItemNotif).join('');
  }
  body.innerHTML = html;

  body.querySelectorAll('.item-notif').forEach((row) => {
    const n = _notifs.find((x) => x.id === row.dataset.id);
    row.addEventListener('click', () => _onTapNotificacion(n));
    row.querySelector('.item-notif-avatar')?.addEventListener('click', (ev) => _onTapAvatar(n, ev));
  });
}

function _htmlItemNotif(n) {
  const { icono, clase } = _ICONOS[n.tipo] ?? { icono: '🔔', clase: 'gris' };
  const foto = n.remitenteFoto;
  const tieneRemitente = !!n.remitenteNombre;
  const mostrarThumb = !!n.thumb || n.esDePublicacion;

  return `
    <div class="item-notif ${n.leida ? '' : 'no-leida'}" data-id="${_escapeAttr(n.id)}">
      <div class="item-notif-avatar">
        ${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : `<span>${tieneRemitente ? '👤' : icono}</span>`}
        <span class="item-notif-badge ${clase}">${icono}</span>
      </div>
      <div class="item-notif-texto">
        <p>${tieneRemitente ? `<strong>${_escapar(n.remitenteNombre)}</strong> ${_escapar(_texto(n).replace(n.remitenteNombre.split(' ')[0], '').trim())}` : _escapar(_texto(n))}</p>
        <span class="item-notif-tiempo">${_tiempo(n.creadoEn)}</span>
      </div>
      ${!n.leida ? `<span class="item-notif-punto"></span>` : ''}
      ${mostrarThumb ? `
        <div class="item-notif-thumb">
          ${n.thumb ? `<img src="${_escapeAttr(n.thumb)}" alt="" />` : `<span>📄</span>`}
        </div>` : ''}
    </div>
  `;
}

function _htmlEstadoVacio(filtro) {
  const textos = {
    todas:        ['Sin notificaciones', 'Cuando alguien interactúe contigo, verás las notificaciones aquí.'],
    reacciones:   ['Sin reacciones', 'Aquí verás cuando alguien reaccione a tus publicaciones, comentarios o historias.'],
    comentarios:  ['Sin comentarios', 'Aquí verás los comentarios y respuestas en tus publicaciones e historias.'],
    menciones:    ['Sin menciones', 'Aquí verás cuando alguien te mencione o te etiquete en una publicación.'],
    seguimientos: ['Sin seguidores nuevos', 'Aquí verás cuando alguien nuevo comience a seguirte.'],
  };
  const [titulo, sub] = textos[filtro] ?? textos.todas;
  return `
    <div class="notif-vacio">
      <p class="notif-vacio-titulo">${titulo}</p>
      <p class="notif-vacio-sub">${sub}</p>
    </div>
  `;
}
