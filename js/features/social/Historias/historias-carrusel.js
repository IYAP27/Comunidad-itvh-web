// ═════════════════════════════════════════════════════════════════
// historias-carrusel.js — Fase 2 (parcial)
//
// Traducción web del carrusel de historias que vive dentro de
// _SeccionSuperior en pantalla_principal.dart. Se monta debajo del
// composer en feed.js, en el <div id="historias-carrusel"></div>.
//
// RESPONSABILIDAD:
//   • Trae los datos vía el mismo RPC que usa la app: get_feed_stories.
//   • Agrupa historias por autor (un grupo = un anillo), separa las
//     propias, calcula si cada grupo ya se vio por completo, y
//     ordena a los autores silenciados al final — igual que
//     _cargarStories() en Dart.
//   • Pinta la celda fija "Tu historia" + una celda por cada grupo
//     ajeno, con el mismo sistema de anillo:
//       - anillo-nuevo  (gradiente): hay contenido sin ver
//       - anillo-visto  (gris):      ya se vio todo
//       - sin-anillo:                (solo "Tu historia" sin story)
//   • Silenciar/reactivar autor: escritura real en
//     `historias_silenciadas`, con actualización optimista (mismo
//     patrón que _silenciarAutor/_reactivarAutor en Dart: se mueve
//     el grupo en memoria antes de esperar la respuesta del server).
//
// PENDIENTE (screens que aún no existen en la web — quedan con TODO
// y console.info, mismo criterio que usa feed.js para "ir a mi
// perfil"):
//   • Visor de historias pantalla completa (VerHistoria.dart)
//   • Wizard de crear historia (Crear Historias.dart → SeleccionarTipoHistoria.dart)
//   • Perfil público de otro usuario (desde el menú de opciones)
// Cuando existan, solo hay que reemplazar el cuerpo de _abrirVisor(),
// _crearHistoria() y _verPerfilAutor() — el resto del carrusel no
// cambia.
//
// USO (desde feed.js):
//   import * as HistoriasCarrusel from './historias-carrusel.js';
//   await HistoriasCarrusel.render(contenedor.querySelector('#historias-carrusel'));
//   // ...
//   HistoriasCarrusel.destruir();
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../../core/html-utils.js';
import { supabase } from '../../../core/supabase-client.js';
import { usuarioActual } from '../../../core/auth.js';
import { resolverUrlPerfil } from '../../../core/url-helper.js';
import { abrirPerfil } from '../../perfil/mi-perfil.js';
import { abrirVisorHistorias } from './visor-historias.js';
import { abrir as abrirCrearHistoria } from './index.js';

const LONG_PRESS_MS = 450;

let _contenedor = null;

// Estado en memoria, igual que los campos del State en Flutter.
let _stories = [];
let _miNombre = null;
let _miFoto = null;
let _misHistorias = [];
let _yoTengoStory = false;
let _yoViMisHistorias = false;
let _autoresSilenciados = new Set();

let _menuAbierto = null; // referencia al popup de opciones, si hay uno abierto

export async function render(contenedor) {
  _contenedor = contenedor;
  console.info('historias-carrusel.js: render() — contenedor=', contenedor);
  _pintarSkeleton();
  try {
    await _cargar();
    console.info('historias-carrusel.js: _cargar() completado — historias=', _stories.length);
  } catch (e) {
    console.error('historias-carrusel.js: error en _cargar()', e);
    throw e;
  }
}

/// Vuelve a traer todo y repintar. Es el gancho que feed.js debe
/// llamar tras crear una historia nueva (equivalente a
/// _cargarTodo(refresh: true) en Dart) — hoy no hay wizard de
/// creación en la web, pero la función ya queda lista.
export async function refrescar() {
  await _cargar();
}

export function destruir() {
  _cerrarMenu();
  _contenedor = null;
}

// ── Carga de datos ────────────────────────────────────────────────

async function _cargar() {
  const uid = usuarioActual()?.id;
  if (!uid || !_contenedor) return;
  console.info('historias-carrusel.js: _cargar() — uid=', uid);

  try {
    const [{ data: perfil }, { data: rpcData, error }] = await Promise.all([
      supabase.from('perfiles').select('nombre, cdn_foto_perfil').eq('id', uid).maybeSingle(),
      supabase.rpc('get_feed_stories', { p_uid: uid }),
    ]);
    if (error) throw error;

    console.info('historias-carrusel.js: RPC get_feed_stories result', rpcData);

    _miNombre = perfil?.nombre ?? null;
    _miFoto = perfil ? resolverUrlPerfil(perfil) : null;

    const historias = rpcData?.historias ?? [];
    const silenciados = new Set(rpcData?.silenciados ?? []);
    const vistas = new Set(rpcData?.vistas ?? []);

    const porAutor = new Map();
    let yoTengo = false;
    const misIds = [];
    _misHistorias = [];

    for (const h of historias) {
      if (h.autor_id === uid) {
        yoTengo = true;
        misIds.push(h.id);
        _misHistorias.push(h);
        continue;
      }
      if (!porAutor.has(h.autor_id)) {
        porAutor.set(h.autor_id, {
          autor_id: h.autor_id,
          nombre: h.perfiles?.nombre ?? '',
          fotoRaw: h.perfiles?.cdn_foto_perfil ?? null,
          ids: [],
          stories: [],
        });
      }
      porAutor.get(h.autor_id).ids.push(h.id);
      porAutor.get(h.autor_id).stories.push(h);
    }

    const grupos = [...porAutor.values()].map((g) => ({
      ...g,
      foto: g.fotoRaw ? resolverUrlPerfil({ cdn_foto_perfil: g.fotoRaw }) : null,
      todasVistas: g.ids.length > 0 && g.ids.every((id) => vistas.has(id)),
    }));

    // Silenciados al final, sin quitarlos — mismo criterio que Dart.
    const normales = grupos.filter((g) => !silenciados.has(g.autor_id));
    const alFinal = grupos.filter((g) => silenciados.has(g.autor_id));

    _stories = [...normales, ...alFinal];
    _autoresSilenciados = silenciados;
    _yoTengoStory = yoTengo;
    _yoViMisHistorias = misIds.length > 0 && misIds.every((id) => vistas.has(id));

    _pintar();
  } catch (e) {
    console.error('historias-carrusel.js – cargar:', e);
    // Silencioso a propósito: si falla, el carrusel simplemente no
    // aparece — no queremos tumbar el resto del feed por esto.
    if (_contenedor) _contenedor.innerHTML = '';
  }
}

// ── Render ───────────────────────────────────────────────────────

function _pintarSkeleton() {
  if (!_contenedor) return;
  const celdas = Array.from({ length: 5 })
    .map(
      () => `
      <div class="historia-item historia-skeleton">
        <div class="historia-anillo sin-anillo">
          <div class="historia-avatar-bg historia-skeleton-shimmer"></div>
        </div>
        <span class="historia-label historia-skeleton-shimmer historia-skeleton-label"></span>
      </div>`,
    )
    .join('');

  _contenedor.innerHTML = `
    <div class="historias-wrap">
      <div class="historias-card">
        <div class="historias-track">${celdas}</div>
      </div>
    </div>
  `;
}

function _pintar() {
  if (!_contenedor) return;

  _contenedor.innerHTML = `
    <div class="historias-wrap">
      <div class="historias-card">
        <div class="historias-track" id="historias-track"></div>
      </div>
    </div>
  `;

  const track = _contenedor.querySelector('#historias-track');
  track.appendChild(_celdaTuHistoria());
  for (const story of _stories) track.appendChild(_celdaAjena(story));
}

function _celdaTuHistoria() {
  const item = document.createElement('div');
  item.className = 'historia-item';

  let anilloClase = 'sin-anillo';
  if (_yoTengoStory && !_yoViMisHistorias) anilloClase = 'anillo-nuevo';
  else if (_yoTengoStory && _yoViMisHistorias) anilloClase = 'anillo-visto';

  item.innerHTML = `
    <div class="historia-stack">
      <button type="button" class="historia-avatar-btn" aria-label="Tu historia">
        <div class="historia-anillo ${anilloClase}">
          <div class="historia-avatar-bg">${_avatarHtml(_miFoto, _miNombre)}</div>
        </div>
      </button>
      <button type="button" class="historia-boton-mas" aria-label="Crear historia">+</button>
    </div>
    <span class="historia-label">Tu historia</span>
  `;

  item.querySelector('.historia-avatar-btn').addEventListener('click', () => {
    _yoTengoStory ? _verMisHistorias() : _crearHistoria();
  });
  item.querySelector('.historia-boton-mas').addEventListener('click', (e) => {
    e.stopPropagation();
    _crearHistoria();
  });

  return item;
}

function _celdaAjena(story) {
  const item = document.createElement('div');
  item.className = 'historia-item';
  if (_autoresSilenciados.has(story.autor_id)) item.classList.add('historia-silenciada');

  const anilloClase = story.todasVistas ? 'anillo-visto' : 'anillo-nuevo';
  const nombreCorto = (story.nombre || '').split(' ')[0] || '';

  item.innerHTML = `
    <button type="button" class="historia-avatar-btn" aria-label="Historia de ${_escapeHtml(story.nombre)}">
      <div class="historia-anillo ${anilloClase}">
        <div class="historia-avatar-bg">${_avatarHtml(story.foto, story.nombre)}</div>
      </div>
    </button>
    <span class="historia-label">${_escapeHtml(nombreCorto)}</span>
  `;

  const btn = item.querySelector('.historia-avatar-btn');
  _wireTapYLongPress(
    btn,
    () => _abrirVisor(story),
    (x, y) => _mostrarOpciones(story, x, y),
  );

  return item;
}

/// Mismo criterio de fallback que _cargarAvatarComposer() en
/// feed.js: si no hay foto, se muestra la inicial del nombre.
function _avatarHtml(fotoUrl, nombre) {
  if (fotoUrl) {
    return `<img class="historia-avatar-img" src="${_escapeAttr(fotoUrl)}" alt="" loading="lazy" />`;
  }
  const inicial = nombre ? nombre.trim()[0]?.toUpperCase() ?? '' : '';
  return `<span class="historia-avatar-fallback">${_escapeHtml(inicial)}</span>`;
}

// ── Acciones (paridad con los métodos del State en Dart) ──────────

function _verMisHistorias() {
  abrirVisorHistorias({
    grupos: [
      {
        autor_id: usuarioActual()?.id,
        nombre: _miNombre ?? 'Tu historia',
        foto: _miFoto,
        stories: _misHistorias,
      },
      ..._stories,
    ],
    indiceGrupo: 0,
  });
}

function _crearHistoria() {
  abrirCrearHistoria(() => refrescar());
}

function _abrirVisor(story) {
  const indiceGrupo = Math.max(0, _stories.findIndex((g) => g.autor_id === story.autor_id));
  abrirVisorHistorias({ grupos: _stories, indiceGrupo });
}

function _verPerfilAutor(autorId) {
  abrirPerfil(autorId);
}

/// Silencia las historias de [autorId]: actualización optimista
/// (mueve el grupo al final y lo marca silenciado de inmediato) +
/// escritura real en `historias_silenciadas`. No revierte el estado
/// local si la escritura falla — mismo criterio que Dart.
async function _silenciarAutor(autorId) {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  _autoresSilenciados = new Set([..._autoresSilenciados, autorId]);
  const idx = _stories.findIndex((g) => g.autor_id === autorId);
  if (idx !== -1) {
    const [grupo] = _stories.splice(idx, 1);
    _stories.push(grupo);
  }
  _pintar();

  try {
    const { error } = await supabase
      .from('historias_silenciadas')
      .upsert({ usuario_id: uid, autor_silenciado_id: autorId });
    if (error) throw error;
  } catch (e) {
    console.error('historias-carrusel.js – silenciar autor:', e);
  }
}

/// Reactiva (deja de silenciar) las historias de [autorId], con el
/// mismo patrón optimista + escritura real (delete).
async function _reactivarAutor(autorId) {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  const nuevosSilenciados = new Set(_autoresSilenciados);
  nuevosSilenciados.delete(autorId);
  _autoresSilenciados = nuevosSilenciados;

  const normales = _stories.filter((g) => !nuevosSilenciados.has(g.autor_id));
  const alFinal = _stories.filter((g) => nuevosSilenciados.has(g.autor_id));
  _stories = [...normales, ...alFinal];
  _pintar();

  try {
    const { error } = await supabase
      .from('historias_silenciadas')
      .delete()
      .eq('usuario_id', uid)
      .eq('autor_silenciado_id', autorId);
    if (error) throw error;
  } catch (e) {
    console.error('historias-carrusel.js – reactivar autor:', e);
  }
}

// ── Menú de opciones (long-press en historia ajena) ────────────────
// Equivalente al showModalBottomSheet de _mostrarOpcionesHistoria en
// Dart: "Ver perfil" + "Silenciar"/"Reactivar" según el estado
// actual. Aquí como popup flotante posicionado junto al dedo/cursor.

function _mostrarOpciones(story, x, y) {
  _cerrarMenu();

  const yaSilenciado = _autoresSilenciados.has(story.autor_id);

  const backdrop = document.createElement('div');
  backdrop.className = 'historia-menu-backdrop';
  backdrop.addEventListener('click', _cerrarMenu);

  const menu = document.createElement('div');
  menu.className = 'historia-menu';
  menu.innerHTML = `
    <div class="historia-menu-item" data-accion="perfil">Ver perfil</div>
    <div class="historia-menu-item" data-accion="silenciar">
      ${yaSilenciado ? 'Reactivar historia' : 'Silenciar'}
    </div>
  `;

  menu.querySelector('[data-accion="perfil"]').addEventListener('click', () => {
    _cerrarMenu();
    _verPerfilAutor(story.autor_id);
  });
  menu.querySelector('[data-accion="silenciar"]').addEventListener('click', () => {
    _cerrarMenu();
    yaSilenciado ? _reactivarAutor(story.autor_id) : _silenciarAutor(story.autor_id);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);

  // Se posiciona junto al punto de long-press, ajustando si se
  // sale de la pantalla por la derecha o por abajo.
  const menuAncho = 190;
  const left = Math.min(x, window.innerWidth - menuAncho - 12);
  const top = Math.min(y, window.innerHeight - 120);
  menu.style.left = `${Math.max(12, left)}px`;
  menu.style.top = `${Math.max(12, top)}px`;

  _menuAbierto = { backdrop, menu };
}

function _cerrarMenu() {
  if (!_menuAbierto) return;
  _menuAbierto.backdrop.remove();
  _menuAbierto.menu.remove();
  _menuAbierto = null;
}

// ── Tap normal + long-press (mouse y touch) ─────────────────────────

function _wireTapYLongPress(el, onTap, onLongPress) {
  let timer = null;
  let disparado = false;

  const coordsDe = (e) => {
    const p = e.touches?.[0] ?? e;
    return { x: p.clientX, y: p.clientY };
  };

  const empezar = (e) => {
    disparado = false;
    const { x, y } = coordsDe(e);
    timer = setTimeout(() => {
      disparado = true;
      onLongPress(x, y);
    }, LONG_PRESS_MS);
  };
  const cancelar = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  el.addEventListener('mousedown', empezar);
  el.addEventListener('touchstart', empezar, { passive: true });
  el.addEventListener('mouseup', cancelar);
  el.addEventListener('mouseleave', cancelar);
  el.addEventListener('touchend', cancelar);
  el.addEventListener('touchcancel', cancelar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  el.addEventListener('click', (e) => {
    if (disparado) {
      e.preventDefault();
      e.stopPropagation();
      disparado = false;
      return;
    }
    onTap();
  });
}

// ── Helpers ──────────────────────────────────────────────────────


