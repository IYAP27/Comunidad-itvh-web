// ═════════════════════════════════════════════════════════════════
// feed.js — Comunidad Tecnológica
//
// Traducción web de PantallaPrincipalSocial:
//   • Header + buscador + campana.
//   • Composer para crear publicaciones.
//   • Carrusel de historias usando el mismo RPC get_feed_stories.
//   • Feed paginado de publicaciones con autor, medios, etiquetados,
//     comentarios y reacciones.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import * as CrearPublicacion from './CrearPublicacion/index.js';
import * as HistoriasCarrusel from './Historias/historias-carrusel.js';
import { abrirHojaComentarios } from './hoja-comentarios.js';
import { abrirVisorMedia } from './visor-media.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { abrirHojaReacciones, abrirSelectorReaccion, emojiRapido } from './reacciones.js';
import { abrirReportePublicacion } from '../reportes/reportes-ui.js';
import { eliminarDeR2 } from '../../core/storage-r2.js';
import { BUCKETS, DOMINIOS } from '../../core/r2-config.js';
import { htmlFeedPost } from './feed-post-renderer.js?v=1.18.6';

const POSTS_PAGE_SIZE = 10;
const EMOJI_RAPIDO = '👍';

let _contenedor = null;
let _canalPosts = null;
let _posts = [];
let _cursorPosts = null;
let _cargandoPosts = false;
let _cargandoMas = false;
let _hayMasPosts = true;
let _scrollHandler = null;

export async function render(contenedor) {
  destruir();
  _contenedor = contenedor;
  _posts = [];
  _cursorPosts = null;
  _hayMasPosts = true;

  contenedor.innerHTML = `
    <div class="feed-social">
      <div class="feed-composer-wrap">
        <div class="feed-composer">
          <button type="button" id="btn-avatar-composer" class="feed-composer-avatar" aria-label="Mi perfil">
            <span id="feed-composer-avatar-fallback">👤</span>
          </button>
          <button type="button" id="btn-composer-input" class="feed-composer-input">
            ¿Qué está pasando en el plantel?
          </button>
          <button type="button" id="btn-composer-imagen" class="feed-composer-btn-imagen" aria-label="Agregar imagen">
            <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </button>
        </div>
      </div>

      <div id="historias-carrusel"></div>
      <section id="feed-lista" class="feed-lista"></section>
    </div>
  `;

  _wireEventos();

  // Cada bloque se recupera de forma independiente: un fallo en Historias no debe
  // impedir que el usuario vea publicaciones ni use el resto del feed.
  await Promise.allSettled([
    _cargarAvatarComposer(),
    _cargarHistoriasSeguro(),
    _cargarPosts({ refresh: true }),
  ]);

  if (_contenedor === contenedor) _suscribirRealtimePosts();
}


async function _cargarHistoriasSeguro() {
  const host = _contenedor?.querySelector('#historias-carrusel');
  if (!host) return;

  try {
    await HistoriasCarrusel.render(host);
  } catch (error) {
    console.error('feed.js – historias:', error);
    if (!host.isConnected) return;
    host.innerHTML = `
      <div class="feed-estado feed-estado-historias">
        <p class="feed-estado-sub">No se pudieron cargar las historias.</p>
        <button type="button" class="btn-accion-accent" data-reintentar-historias>Reintentar</button>
      </div>
    `;
    host.querySelector('[data-reintentar-historias]')?.addEventListener('click', () => {
      _cargarHistoriasSeguro();
    }, { once: true });
  }
}

export function destruir() {
  _canalPosts?.unsubscribe();
  _canalPosts = null;
  HistoriasCarrusel.destruir();

  if (_scrollHandler) {
    _contenedor?.closest('.shell-tab-contenido')?.removeEventListener('scroll', _scrollHandler);
    window.removeEventListener('scroll', _scrollHandler);
    _scrollHandler = null;
  }
}

function _wireEventos() {
  const abrirComposer = () => {
    CrearPublicacion.abrir(() => {
      _cargarPosts({ refresh: true });
    });
  };
  _contenedor.querySelector('#btn-composer-input').addEventListener('click', abrirComposer);
  _contenedor.querySelector('#btn-composer-imagen').addEventListener('click', abrirComposer);

  _contenedor.querySelector('#btn-avatar-composer').addEventListener('click', () => {
    abrirPerfil(usuarioActual()?.id);
  });

  const scrollEl = _contenedor.closest('.shell-tab-contenido');
  _scrollHandler = () => {
    const el = scrollEl ?? document.documentElement;
    const top = scrollEl ? el.scrollTop : window.scrollY;
    const alto = scrollEl ? el.clientHeight : window.innerHeight;
    const total = scrollEl ? el.scrollHeight : document.documentElement.scrollHeight;
    if (top + alto >= total - 320) _cargarMasPosts();
  };

  (scrollEl ?? window).addEventListener('scroll', _scrollHandler, { passive: true });
}

async function _cargarAvatarComposer() {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre, cdn_foto_perfil')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;

    const foto = resolverUrlPerfil(data);
    const avatarBtn = _contenedor?.querySelector('#btn-avatar-composer');
    if (!avatarBtn) return;

    if (foto) {
      avatarBtn.innerHTML = `<img src="${_escapeAttr(foto)}" alt="" />`;
    } else {
      const inicial = data.nombre ? data.nombre[0].toUpperCase() : '';
      avatarBtn.innerHTML = `<span>${_escapeHtml(inicial)}</span>`;
    }
  } catch (e) {
    console.error('feed.js – avatar composer:', e);
  }
}

function _suscribirRealtimePosts() {
  _canalPosts = supabase
    .channel('feed-posts-web')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => {
      _cargarPosts({ refresh: true });
    })
    .subscribe();
}

async function _cargarPosts({ refresh = false } = {}) {
  if (_cargandoPosts) return;
  _cargandoPosts = true;
  if (refresh) {
    _cursorPosts = null;
    _hayMasPosts = true;
    _pintarEstadoPosts('cargando');
  }

  try {
    // Feed global: no filtrar por la tabla `seguidores`.
    // Así la página principal solicita todas las publicaciones visibles
    // para el usuario según las políticas RLS de Supabase.
    let query = supabase
      .from('publicaciones')
      .select(`
        id, contenido, tipo, creado_en,
        total_reacciones, total_comentarios, autor_id,
        perfiles!publicaciones_autor_id_fkey
          (id, nombre, nombre_usuario, cdn_foto_perfil),
        publicacion_medios(url, cdn_url, tipo_medio, orden)
      `)
      .order('creado_en', { ascending: false })
      .limit(POSTS_PAGE_SIZE);

    if (!refresh && _cursorPosts) query = query.lt('creado_en', _cursorPosts);

    const { data, error } = await query;
    if (error) throw error;

    const nuevos = data ?? [];
    const enriquecidos = await _enriquecerPosts(nuevos);

    _hayMasPosts = nuevos.length === POSTS_PAGE_SIZE;
    _cursorPosts = nuevos.at(-1)?.creado_en ?? _cursorPosts;
    _posts = refresh
      ? enriquecidos
      : [..._posts.filter((p) => !enriquecidos.some((n) => n.id === p.id)), ...enriquecidos];

    _pintarPosts();
  } catch (e) {
    console.error('feed.js – cargar posts:', e);
    _pintarEstadoPosts('error');
  } finally {
    _cargandoPosts = false;
    _cargandoMas = false;
  }
}

function _cargarMasPosts() {
  if (_cargandoMas || _cargandoPosts || !_hayMasPosts) return;
  _cargandoMas = true;
  _pintarPosts();
  _cargarPosts({ refresh: false });
}

async function _enriquecerPosts(posts) {
  const uid = usuarioActual()?.id;
  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return [];

  const [reacciones, comentarios, etiquetas] = await Promise.all([
    _consultaMetadataFeed('reacciones', supabase.from('reacciones').select('publicacion_id, usuario_id, tipo').in('publicacion_id', ids)),
    _consultaMetadataFeed('comentarios', supabase.from('comentarios').select('publicacion_id, id').in('publicacion_id', ids)),
    _consultaMetadataFeed(
      'etiquetas',
      supabase
        .from('publicacion_etiquetas')
        .select('publicacion_id, usuario_id, perfiles!publicacion_etiquetas_usuario_fkey(id, nombre, nombre_usuario, cdn_foto_perfil)')
        .in('publicacion_id', ids),
    ),
  ]);

  return posts.map((post) => {
    const reaccionesPost = reacciones.filter((r) => r.publicacion_id === post.id);
    const conteo = {};
    for (const r of reaccionesPost) {
      const emoji = (r.tipo ?? '').trim();
      if (!emoji) continue;
      conteo[emoji] = (conteo[emoji] ?? 0) + 1;
    }
    const topEmojis = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([emoji]) => emoji);

    return {
      ...post,
      publicacion_medios: [...(post.publicacion_medios ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
      total_reacciones_real: reaccionesPost.length,
      total_comentarios_real: comentarios.filter((c) => c.publicacion_id === post.id).length,
      mi_reaccion: reaccionesPost.find((r) => r.usuario_id === uid)?.tipo ?? null,
      top_emojis: topEmojis,
      etiquetados: etiquetas
        .filter((e) => e.publicacion_id === post.id && e.perfiles)
        .map((e) => e.perfiles),
    };
  });
}

async function _consultaMetadataFeed(nombre, consulta) {
  try {
    const { data, error } = await consulta;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.warn(`feed.js – metadata ${nombre}:`, error);
    return [];
  }
}

function _pintarEstadoPosts(estado) {
  const lista = _contenedor?.querySelector('#feed-lista');
  if (!lista) return;

  if (estado === 'cargando') {
    lista.innerHTML = `
      <div class="feed-skeleton-card"></div>
      <div class="feed-skeleton-card corto"></div>
    `;
  } else if (estado === 'error') {
    lista.innerHTML = `
      <div class="feed-estado">
        <p class="feed-estado-titulo">No se pudo cargar el feed</p>
        <button type="button" id="btn-reintentar-feed" class="btn-accion-accent">Reintentar</button>
      </div>
    `;
    lista.querySelector('#btn-reintentar-feed')?.addEventListener('click', () => _cargarPosts({ refresh: true }));
  }
}

function _pintarPosts() {
  const lista = _contenedor?.querySelector('#feed-lista');
  if (!lista) return;

  if (_posts.length === 0) {
    lista.innerHTML = `
      <div class="feed-estado">
        <div class="feed-estado-icono">👥</div>
        <p class="feed-estado-titulo">Aún no hay publicaciones</p>
        <p class="feed-estado-sub">Crea tu primera publicación y sigue a compañeros.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = `
    ${_posts.map((post) => htmlFeedPost(post, usuarioActual()?.id ?? null)).join('')}
    ${
      _cargandoMas
        ? `<div class="feed-cargando-mas"><div class="spinner"></div></div>`
        : !_hayMasPosts
          ? `<p class="feed-fin">Ya viste todas las publicaciones disponibles.</p>`
          : ''
    }
  `;
  _wirePosts();
}

function _wirePosts() {
  _contenedor.querySelectorAll('.post-card').forEach((card) => {
    const postId = card.dataset.postId;
    const post = _posts.find((p) => p.id === postId);
    if (!post) return;

    card.querySelectorAll('[data-accion]').forEach((btn) => {
      btn.addEventListener('click', () => _manejarAccionPost(btn.dataset.accion, post, btn));
      if (btn.dataset.accion === 'reaccion') _wireSelectorReaccion(btn, post);
    });
  });
}

function _wireSelectorReaccion(btn, post) {
  let timer = null;
  let longPress = false;
  const abrir = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    longPress = true;
    abrirSelectorReaccion(btn, {
      actual: post.mi_reaccion,
      onSeleccionar: (emoji) => _aplicarReaccion(post.id, emoji),
    });
  };
  btn.addEventListener('pointerdown', () => {
    longPress = false;
    timer = setTimeout(() => abrir({ preventDefault() {}, stopPropagation() {} }), 450);
  });
  btn.addEventListener('pointerup', () => clearTimeout(timer));
  btn.addEventListener('pointerleave', () => clearTimeout(timer));
  btn.addEventListener('contextmenu', abrir);
  btn.addEventListener('click', (ev) => {
    if (longPress) {
      ev.preventDefault();
      ev.stopPropagation();
      longPress = false;
    }
  }, true);
}

async function _manejarAccionPost(accion, post, btn) {
  if (accion === 'reaccion') {
    await _toggleReaccion(post.id);
    return;
  }
  if (accion === 'autor') {
    abrirPerfil(post.autor_id);
    return;
  }
  if (accion === 'comentarios') {
    abrirHojaComentarios(post, () => _cargarPosts({ refresh: true }));
    return;
  }
  if (accion === 'ver-reacciones') {
    abrirHojaReacciones(post);
    return;
  }
  if (accion === 'media') {
    abrirVisorMedia({
      post,
      indiceInicial: Number(btn.dataset.index ?? 0),
      onReaccionar: (emoji) => emoji === undefined ? _toggleReaccion(post.id) : _aplicarReaccion(post.id, emoji),
      onRefrescar: () => _cargarPosts({ refresh: true }),
    });
    return;
  }
  if (accion === 'reportar') {
    btn.closest('details')?.removeAttribute('open');
    abrirReportePublicacion(post, { onEnviado: () => _cargarPosts({ refresh: true }) });
    return;
  }
  if (accion === 'eliminar') {
    btn.closest('details')?.removeAttribute('open');
    if (!confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return;
    await _eliminarPublicacion(post);
    return;
  }
}

/* Menú de opciones: desde v1.18.4 se renderiza como <details> nativo en cada post. */


async function _eliminarPublicacion(post) {
  if (!post?.id || post.autor_id !== usuarioActual()?.id) return;
  try {
    const medios = post.publicacion_medios ?? [];
    const { error } = await supabase.from('publicaciones').delete().eq('id', post.id);
    if (error) throw error;

    // La BD se elimina primero, igual que en móvil. La limpieza de R2 es best-effort.
    for (const medio of medios) {
      const cdn = medio.cdn_url || medio.url;
      if (!cdn || !cdn.startsWith(DOMINIOS.publicaciones)) continue;
      const path = cdn.replace(`${DOMINIOS.publicaciones}/`, '');
      try { await eliminarDeR2(BUCKETS.publicaciones, path); }
      catch (e) { console.warn('feed.js – limpiar R2:', e); }
    }

    _posts = _posts.filter((p) => p.id !== post.id);
    _pintarPosts();
  } catch (e) {
    console.error('feed.js – eliminar publicación:', e);
    alert('No se pudo eliminar la publicación.');
  }
}

async function _toggleReaccion(postId) {
  const post = _posts.find((p) => p.id === postId);
  const siguiente = post?.mi_reaccion ? null : emojiRapido();
  return _aplicarReaccion(postId, siguiente);
}

async function _aplicarReaccion(postId, emoji) {
  const uid = usuarioActual()?.id;
  if (!uid) return;
  const post = _posts.find((p) => p.id === postId);
  if (!post) return;

  const antes = post.mi_reaccion;
  const despues = emoji;
  post.mi_reaccion = despues;
  post.total_reacciones_real = Math.max(0, (post.total_reacciones_real ?? 0) +
    (antes == null && despues != null ? 1 : 0) -
    (antes != null && despues == null ? 1 : 0));
  _recalcularTopOptimista(post, antes, post.mi_reaccion);
  _pintarPosts();

  try {
    if (despues == null) {
      const { error } = await supabase
        .from('reacciones')
        .delete()
        .eq('publicacion_id', postId)
        .eq('usuario_id', uid);
      if (error) throw error;
    } else if (antes == null) {
      const { error } = await supabase
        .from('reacciones')
        .insert({ publicacion_id: postId, usuario_id: uid, tipo: despues });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('reacciones')
        .update({ tipo: despues })
        .eq('publicacion_id', postId)
        .eq('usuario_id', uid);
      if (error) throw error;
    }
  } catch (e) {
    console.error('feed.js – reaccionar:', e);
    await _cargarPosts({ refresh: true });
  }
}

function _recalcularTopOptimista(post, anterior, nuevo) {
  const conteo = {};
  for (const emoji of post.top_emojis ?? []) conteo[emoji] = (conteo[emoji] ?? 0) + 1;
  if (anterior) conteo[anterior] = Math.max(0, (conteo[anterior] ?? 1) - 1);
  if (nuevo) conteo[nuevo] = (conteo[nuevo] ?? 0) + 1;
  post.top_emojis = Object.entries(conteo)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([emoji]) => emoji);
}
