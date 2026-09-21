// ═════════════════════════════════════════════════════════════════
// mi-perfil.js
//
// Perfil propio y perfil público para la web. Primera traducción
// funcional de MiPerfilScreen / PerfilPublicoScreen:
//   • Header, avatar, conteos, bio/carrera/semestre/redes.
//   • Seguir/dejar de seguir en perfil público.
//   • Grid de publicaciones.
//   • Apertura como pestaña propia o como pantalla empujada.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import { abrirHojaComentarios } from '../social/hoja-comentarios.js';
import { abrirVisorMedia } from '../social/visor-media.js';
import { abrirHojaReacciones, abrirSelectorReaccion, emojiRapido } from '../social/reacciones.js';
import { abrirEditarPerfil } from './editar-perfil.js';
import { abrirConversacion } from '../chat/conversacion-screen.js?v=1.9.3';
import { abrirVisorHistorias } from '../social/Historias/visor-historias.js';
import { renderAjustes } from '../shell/ajustes-screen.js';
import { htmlPerfilPrincipal, htmlPerfilPostCard } from './mi-perfil-renderer.js';

export async function render(root) {
  const uid = usuarioActual()?.id;
  if (!uid) {
    root.innerHTML = `<div class="perfil-estado">Inicia sesión para ver tu perfil.</div>`;
    return;
  }
  await _renderPerfil(root, uid, { propio: true, onVolver: null });
}

export async function abrirPerfil(usuarioId) {
  const uid = usuarioActual()?.id;
  if (!usuarioId) return;
  if (uid && usuarioId === uid) {
    const shellTab = document.querySelector('.shell-tab[data-tab="perfil"]');
    shellTab?.click();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen perfil-screen';
  document.body.appendChild(overlay);
  await _renderPerfil(overlay, usuarioId, { propio: false, onVolver: () => overlay.remove() });
}

async function _renderPerfil(root, usuarioId, { propio, onVolver }) {
  root.classList.add('perfil-screen');
  root.innerHTML = `<div class="perfil-cargando"><div class="spinner"></div></div>`;

  try {
    const data = await _cargarTodo(usuarioId);
    _pintar(root, usuarioId, data, { propio, onVolver });
  } catch (e) {
    console.error('mi-perfil.js – cargar perfil:', e);
    root.innerHTML = `
      <div class="perfil-estado">
        <p>No se pudo cargar el perfil.</p>
        <button type="button" class="btn-accion-accent" id="perfil-reintentar">Reintentar</button>
      </div>
    `;
    root.querySelector('#perfil-reintentar')?.addEventListener('click', () => _renderPerfil(root, usuarioId, { propio, onVolver }));
  }
}

async function _cargarTodo(usuarioId) {
  const uid = usuarioActual()?.id;
  const [perfilRes, publicacionesRes, seguidores, seguidos, insignias, destacadas, follow] = await Promise.all([
    supabase.from('perfiles').select('*').eq('id', usuarioId).single(),
    supabase
      .from('publicaciones')
      .select(`
        id, contenido, tipo, creado_en,
        total_reacciones, total_comentarios, autor_id,
        perfiles!publicaciones_autor_id_fkey
          (id, nombre, nombre_usuario, cdn_foto_perfil),
        publicacion_medios(url, cdn_url, tipo_medio, orden)
      `)
      .eq('autor_id', usuarioId)
      .order('creado_en', { ascending: false }),
    _consultaOpcional('seguidores', supabase.from('seguidores').select('id').eq('seguido_id', usuarioId), []),
    _consultaOpcional('seguidos', supabase.from('seguidores').select('id').eq('seguidor_id', usuarioId), []),
    _consultaOpcional('insignias', supabase.from('insignias').select('tipo, otorgada_en').eq('perfil_id', usuarioId).order('otorgada_en', { ascending: true }), []),
    _consultaOpcional('historias destacadas', supabase.from('historias_destacadas').select('id, nombre, portada_url').eq('autor_id', usuarioId).order('creado_en', { ascending: true }), []),
    uid && uid !== usuarioId
      ? _consultaOpcional('estado de seguimiento', supabase.from('seguidores').select('id').eq('seguidor_id', uid).eq('seguido_id', usuarioId).maybeSingle(), null)
      : Promise.resolve(null),
  ]);

  if (perfilRes.error) throw perfilRes.error;
  if (publicacionesRes.error) throw publicacionesRes.error;

  const posts = await _enriquecerPosts(publicacionesRes.data ?? []);
  return {
    perfil: perfilRes.data,
    seguidores: seguidores.length,
    seguidos: seguidos.length,
    publicaciones: posts,
    insignias,
    destacadas,
    siguiendo: !!follow,
  };
}

async function _consultaOpcional(nombre, consulta, fallback) {
  try {
    const { data, error } = await consulta;
    if (error) throw error;
    return data ?? fallback;
  } catch (error) {
    console.warn(`mi-perfil.js – ${nombre}:`, error);
    return fallback;
  }
}

async function _enriquecerPosts(posts) {
  const uid = usuarioActual()?.id;
  const ids = posts.map((p) => p.id);
  if (!ids.length) return [];

  const [reacciones, comentarios] = await Promise.all([
    _consultaOpcional('reacciones del perfil', supabase.from('reacciones').select('publicacion_id, usuario_id, tipo').in('publicacion_id', ids), []),
    _consultaOpcional('comentarios del perfil', supabase.from('comentarios').select('publicacion_id, id').in('publicacion_id', ids), []),
  ]);

  return posts.map((post) => {
    const propias = reacciones.filter((r) => r.publicacion_id === post.id);
    return {
      ...post,
      publicacion_medios: [...(post.publicacion_medios ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
      mi_reaccion: propias.find((r) => r.usuario_id === uid)?.tipo ?? null,
      total_reacciones_real: propias.length,
      total_comentarios_real: comentarios.filter((c) => c.publicacion_id === post.id).length,
    };
  });
}

function _pintar(root, usuarioId, data, { propio, onVolver }) {
  const { perfil, publicaciones } = data;
  const foto = resolverUrlPerfil(perfil);

  root.innerHTML = htmlPerfilPrincipal(data, { propio, mostrarVolver: !!onVolver });

  root.querySelector('#perfil-volver')?.addEventListener('click', onVolver);
  root.querySelector('#perfil-ajustes')?.addEventListener('click', () => _abrirAjustes());
  root.querySelector('#perfil-editar')?.addEventListener('click', () => {
    abrirEditarPerfil({ onGuardado: () => _renderPerfil(root, usuarioId, { propio, onVolver }) });
  });
  root.querySelector('#perfil-compartir')?.addEventListener('click', () => _compartirPerfil(perfil));
  root.querySelector('#perfil-mensaje')?.addEventListener('click', () => {
    abrirConversacion({
      otroUsuarioId: usuarioId,
      otroNombre: perfil.nombre ?? 'Usuario',
      otroNombreUsuario: perfil.nombre_usuario ?? null,
      otroAvatarUrl: foto || null,
    });
  });
  root.querySelector('#perfil-follow')?.addEventListener('click', (e) => _toggleFollow(usuarioId, e.currentTarget, data));
  root.querySelector('#perfil-avatar')?.addEventListener('click', () => {
    if (foto) _abrirFoto(foto);
  });
  root.querySelectorAll('.perfil-red').forEach((btn) => {
    btn.addEventListener('click', () => _abrirUrl(btn.dataset.url));
  });
  root.querySelector('#perfil-seguidores')?.addEventListener('click', () => _abrirListaSeguidores(usuarioId, 'seguidores', perfil));
  root.querySelector('#perfil-seguidos')?.addEventListener('click', () => _abrirListaSeguidores(usuarioId, 'seguidos', perfil));
  root.querySelectorAll('.perfil-destacada').forEach((btn) => {
    btn.addEventListener('click', () => _abrirDestacada(btn.dataset.id));
  });
  root.querySelectorAll('.perfil-grid-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      _abrirPublicacionesPerfil(publicaciones, Number(btn.dataset.index), {
        onRefrescar: () => _renderPerfil(root, usuarioId, { propio, onVolver }),
      });
    });
  });
}

function _abrirPublicacionesPerfil(publicaciones, indiceInicial = 0, { onRefrescar } = {}) {
  if (!publicaciones.length) return;
  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen perfil-posts-screen';
  document.body.appendChild(overlay);

  const repintar = () => {
    overlay.innerHTML = `
      <header class="perfil-appbar perfil-posts-appbar">
        <button type="button" class="btn-volver" id="perfil-posts-volver">‹</button>
        <h1><span>Publicación</span><strong>Perfil</strong></h1>
      </header>
      <main class="perfil-posts-list">
        ${publicaciones.map((post, i) => htmlPerfilPostCard(post, i)).join('')}
      </main>
    `;
    overlay.querySelector('#perfil-posts-volver')?.addEventListener('click', () => overlay.remove());
    _wirePerfilPostCards(overlay, publicaciones, repintar, onRefrescar);
  };

  repintar();
  requestAnimationFrame(() => {
    overlay.querySelector(`.perfil-post-card[data-index="${indiceInicial}"]`)?.scrollIntoView({ block: 'start' });
  });
}

function _wirePerfilPostCards(overlay, publicaciones, repintar, onRefrescar) {
  overlay.querySelectorAll('.perfil-post-card').forEach((card) => {
    const post = publicaciones[Number(card.dataset.index)];
    if (!post) return;

    card.querySelectorAll('[data-accion="autor"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirPerfil(post.autor_id));
    });

    card.querySelectorAll('[data-accion="media"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        abrirVisorMedia({
          post,
          indiceInicial: Number(btn.dataset.index) || 0,
          onReaccionar: async (emoji) => {
            await _toggleReaccionPost(post, emoji);
            repintar();
          },
          onRefrescar: onRefrescar ?? repintar,
        });
      });
    });

    card.querySelector('[data-accion="comentarios"]')?.addEventListener('click', () => abrirHojaComentarios(post, onRefrescar ?? repintar));
    card.querySelector('[data-accion="reacciones"]')?.addEventListener('click', () => abrirHojaReacciones(post));

    const btnReaccion = card.querySelector('[data-accion="reaccionar"]');
    btnReaccion?.addEventListener('click', async () => {
      await _toggleReaccionPost(post);
      repintar();
    });
    _wireSelectorReaccion(btnReaccion, post, async (emoji) => {
      await _toggleReaccionPost(post, emoji);
      repintar();
    });
  });
}

function _wireSelectorReaccion(btn, post, onSeleccionar) {
  if (!btn) return;
  let timer = null;
  let abierto = false;
  const abrir = (e) => {
    e.preventDefault();
    abierto = true;
    abrirSelectorReaccion(btn, { actual: post.mi_reaccion, onSeleccionar });
  };
  btn.addEventListener('contextmenu', abrir);
  btn.addEventListener('touchstart', () => {
    abierto = false;
    timer = setTimeout(() => abrir(new Event('longpress')), 420);
  }, { passive: true });
  btn.addEventListener('touchend', (e) => {
    if (timer) clearTimeout(timer);
    if (abierto) e.preventDefault();
  });
  btn.addEventListener('touchcancel', () => {
    if (timer) clearTimeout(timer);
  });
}


function _actualizarContadorSeguidores(total) {
  document.querySelectorAll('#perfil-seguidores-count').forEach((el) => {
    el.textContent = String(Math.max(0, total ?? 0));
  });
}

async function _abrirListaSeguidores(usuarioId, tipo, perfilBase) {
  const overlay = document.createElement('div');
  overlay.className = 'perfil-lista-overlay';
  overlay.innerHTML = `
    <section class="perfil-lista-sheet">
      <header class="perfil-lista-header">
        <button type="button" class="perfil-lista-cerrar" aria-label="Cerrar">✕</button>
        <div>
          <h3>${tipo === 'seguidores' ? 'Seguidores' : 'Seguidos'}</h3>
          <small>${_escapeHtml(perfilBase?.nombre_usuario ? '@' + perfilBase.nombre_usuario : perfilBase?.nombre || '')}</small>
        </div>
      </header>
      <div class="perfil-lista-busqueda"><input type="search" placeholder="Buscar usuario..." /></div>
      <div class="perfil-lista-body"><div class="perfil-lista-cargando">Cargando...</div></div>
    </section>
  `;
  document.body.appendChild(overlay);
  const cerrar = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.perfil-lista-cerrar')?.addEventListener('click', cerrar);
  const body = overlay.querySelector('.perfil-lista-body');
  const input = overlay.querySelector('input');

  try {
    const select = tipo === 'seguidores'
      ? 'seguidor_id, perfiles!seguidores_seguidor_id_fkey(id, nombre, nombre_usuario, cdn_foto_perfil, carrera, semestre)'
      : 'seguido_id, perfiles!seguidores_seguido_id_fkey(id, nombre, nombre_usuario, cdn_foto_perfil, carrera, semestre)';
    const query = tipo === 'seguidores'
      ? supabase.from('seguidores').select(select).eq('seguido_id', usuarioId)
      : supabase.from('seguidores').select(select).eq('seguidor_id', usuarioId);
    const { data, error } = await query;
    if (error) throw error;
    const perfiles = (data ?? []).map((r) => r.perfiles).filter(Boolean);

    const pintar = (filtro = '') => {
      const q = _normalizarTexto(filtro);
      const filtrados = perfiles.filter((p) => {
        const texto = _normalizarTexto(`${p.nombre ?? ''} ${p.nombre_usuario ?? ''} ${p.carrera ?? ''}`);
        return !q || texto.includes(q);
      });
      body.innerHTML = filtrados.length ? filtrados.map((p) => {
        const foto = resolverUrlPerfil(p);
        const carrera = p.carrera ? `${p.carrera}${p.semestre ? ` · ${p.semestre}° sem.` : ''}` : '';
        return `
          <button type="button" class="perfil-lista-item" data-uid="${_escapeAttr(p.id)}">
            <span class="perfil-lista-avatar">${foto ? `<img src="${_escapeAttr(foto)}" alt="">` : _escapeHtml((p.nombre || '?')[0])}</span>
            <span class="perfil-lista-meta">
              <strong>${_escapeHtml(p.nombre || 'Usuario')}</strong>
              <small>${_escapeHtml(p.nombre_usuario ? '@' + p.nombre_usuario : '')}</small>
              ${carrera ? `<em>${_escapeHtml(carrera)}</em>` : ''}
            </span>
            <span class="perfil-lista-chevron">›</span>
          </button>`;
      }).join('') : `<div class="perfil-lista-vacio">${q ? 'No hay coincidencias.' : (tipo === 'seguidores' ? 'Aún no tiene seguidores.' : 'Aún no sigue a nadie.')}</div>`;
      body.querySelectorAll('.perfil-lista-item').forEach((item) => item.addEventListener('click', () => {
        const uid = item.dataset.uid;
        cerrar();
        abrirPerfil(uid);
      }));
    };
    pintar();
    input?.addEventListener('input', () => pintar(input.value));
    input?.focus();
  } catch (e) {
    console.error('mi-perfil.js – lista seguidores:', e);
    body.innerHTML = '<div class="perfil-lista-vacio">No se pudo cargar la lista.</div>';
  }
}

async function _abrirDestacada(destacadaId) {
  if (!destacadaId) return;
  try {
    const [destRes, itemsRes] = await Promise.all([
      supabase.from('historias_destacadas')
        .select('id, nombre, autor_id, portada_url, perfiles!historias_destacadas_autor_id_fkey(nombre, nombre_usuario, cdn_foto_perfil)')
        .eq('id', destacadaId).single(),
      supabase.from('historias_destacadas_items')
        .select('orden, historias!historias_destacadas_items_historia_id_fkey(id, autor_id, media_url, cdn_url, tipo, creado_en, preview_url, track_titulo, track_artista, track_cover, track_inicio_ms)')
        .eq('destacada_id', destacadaId),
    ]);
    if (destRes.error) throw destRes.error;
    if (itemsRes.error) throw itemsRes.error;
    const historias = (itemsRes.data ?? []).map((x) => x.historias).filter(Boolean).sort((a,b) => new Date(a.creado_en || 0) - new Date(b.creado_en || 0));
    if (!historias.length) return alert('Esta destacada no tiene historias disponibles.');
    const p = destRes.data.perfiles ?? {};
    abrirVisorHistorias({ grupos: [{
      autor_id: destRes.data.autor_id,
      nombre: destRes.data.nombre || p.nombre || 'Destacada',
      fotoRaw: p.cdn_foto_perfil || null,
      stories: historias,
    }] });
  } catch (e) {
    console.error('mi-perfil.js – abrir destacada:', e);
    alert('No se pudo abrir esta historia destacada.');
  }
}

function _abrirAjustes() {
  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen';
  document.body.appendChild(overlay);
  renderAjustes(overlay, () => overlay.remove(), () => overlay.remove());
}

function _normalizarTexto(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function _toggleFollow(usuarioId, btn, data) {
  const uid = usuarioActual()?.id;
  if (!uid || uid === usuarioId || btn.disabled) return;
  const antes = data.siguiendo;
  data.siguiendo = !antes;
  data.seguidores += antes ? -1 : 1;
  btn.disabled = true;
  btn.textContent = data.siguiendo ? 'Siguiendo' : 'Seguir';
  btn.classList.toggle('siguiendo', data.siguiendo);
  _actualizarContadorSeguidores(data.seguidores);

  try {
    const res = antes
      ? await supabase.from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', usuarioId)
      : await supabase.from('seguidores').insert({ seguidor_id: uid, seguido_id: usuarioId });
    if (res.error) throw res.error;
  } catch (e) {
    console.error('mi-perfil.js – follow:', e);
    data.siguiendo = antes;
    data.seguidores += antes ? 1 : -1;
    btn.textContent = data.siguiendo ? 'Siguiendo' : 'Seguir';
    btn.classList.toggle('siguiendo', data.siguiendo);
    _actualizarContadorSeguidores(data.seguidores);
  } finally {
    btn.disabled = false;
  }
}

async function _toggleReaccionPost(post, emoji = undefined) {
  const uid = usuarioActual()?.id;
  if (!uid) return;
  const antes = post.mi_reaccion;
  const despues = emoji === undefined ? (antes ? null : emojiRapido()) : emoji;
  post.mi_reaccion = despues;
  post.total_reacciones_real = Math.max(0, (post.total_reacciones_real ?? 0) +
    (antes == null && despues != null ? 1 : 0) -
    (antes != null && despues == null ? 1 : 0));
  if (despues == null) {
    const { error } = await supabase.from('reacciones').delete().eq('publicacion_id', post.id).eq('usuario_id', uid);
    if (error) throw error;
  } else if (antes == null) {
    const { error } = await supabase.from('reacciones').insert({ publicacion_id: post.id, usuario_id: uid, tipo: despues });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reacciones').update({ tipo: despues }).eq('publicacion_id', post.id).eq('usuario_id', uid);
    if (error) throw error;
  }
}

function _abrirFoto(url) {
  const overlay = document.createElement('div');
  overlay.className = 'perfil-foto-viewer';
  overlay.innerHTML = `<button type="button" aria-label="Cerrar">✕</button><img src="${_escapeAttr(url)}" alt="" />`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', () => overlay.remove());
}

function _abrirUrl(url) {
  if (!url) return;
  const final = String(url).startsWith('http') ? url : `https://${url}`;
  window.open(final, '_blank');
}

async function _compartirPerfil(perfil) {
  const usuario = perfil.nombre_usuario ?? '';
  const url = `${location.origin}/#/u/${usuario}`;
  if (navigator.share) {
    try { await navigator.share({ text: url }); return; } catch (_e) {}
  }
  await navigator.clipboard?.writeText(url);
  alert('Enlace de perfil copiado.');
}


