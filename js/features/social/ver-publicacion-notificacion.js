// Vista puntual de una publicación abierta desde Notificaciones.
// Mantiene la publicación sobre el shell y reutiliza comentarios / visor media.

import { supabase } from '../../core/supabase-client.js';
import { resolverUrlPerfil, resolverUrlMedio } from '../../core/url-helper.js';
import { abrirPerfil } from '../perfil/mi-perfil.js';
import { abrirHojaComentarios } from './hoja-comentarios.js';
import { abrirVisorMedia } from './visor-media.js';

let _overlay = null;

export async function abrirPublicacionDesdeNotificacion(postId) {
  if (!postId) return;
  if (_overlay) _overlay.remove();

  const loading = document.createElement('div');
  loading.className = 'pushed-screen notif-publicacion-screen';
  loading.innerHTML = `<header class="appbar-simple"><button class="btn-volver">‹</button><h2>Publicación</h2></header><div class="notif-pub-loading"><div class="spinner"></div></div>`;
  document.body.appendChild(loading);
  _overlay = loading;
  loading.querySelector('.btn-volver').addEventListener('click', cerrarPublicacionNotificacion);

  try {
    const { data, error } = await supabase
      .from('publicaciones')
      .select(`
        id, contenido, tipo, creado_en, total_reacciones, total_comentarios, autor_id,
        perfiles!publicaciones_autor_id_fkey(id, nombre, nombre_usuario, cdn_foto_perfil),
        publicacion_medios(url, cdn_url, tipo_medio, orden)
      `)
      .eq('id', postId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      _overlay.innerHTML = `<header class="appbar-simple"><button class="btn-volver">‹</button><h2>Publicación</h2></header><div class="notif-pub-vacio"><strong>Publicación no disponible</strong><p>Es posible que haya sido eliminada.</p></div>`;
      _overlay.querySelector('.btn-volver').addEventListener('click', cerrarPublicacionNotificacion);
      return;
    }

    data.publicacion_medios = [...(data.publicacion_medios ?? [])].sort((a,b)=>(a.orden??0)-(b.orden??0));
    _renderPost(data);
  } catch (e) {
    console.error('ver-publicacion-notificacion:', e);
    _overlay.innerHTML = `<header class="appbar-simple"><button class="btn-volver">‹</button><h2>Publicación</h2></header><div class="notif-pub-vacio"><strong>No se pudo cargar</strong><p>Intenta de nuevo.</p></div>`;
    _overlay.querySelector('.btn-volver').addEventListener('click', cerrarPublicacionNotificacion);
  }
}

export function cerrarPublicacionNotificacion() {
  _overlay?.remove();
  _overlay = null;
}

function _renderPost(post) {
  if (!_overlay) return;
  const perfil = post.perfiles ?? {};
  const nombre = perfil.nombre ?? 'Usuario';
  const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '';
  const foto = resolverUrlPerfil(perfil);
  const medios = post.publicacion_medios ?? [];

  _overlay.innerHTML = `
    <header class="appbar-simple">
      <button class="btn-volver">‹</button><h2>Publicación</h2>
    </header>
    <main class="notif-pub-body">
      <article class="notif-pub-card">
        <button type="button" class="notif-pub-autor" data-accion="autor">
          <span class="notif-pub-avatar">${foto ? `<img src="${_esc(foto)}" alt="">` : _html(nombre[0] ?? '')}</span>
          <span><strong>${_html(nombre)}</strong><small>${_html(usuario)} · ${_html(_tiempo(post.creado_en))}</small></span>
        </button>
        ${post.contenido ? `<p class="notif-pub-contenido">${_html(post.contenido)}</p>` : ''}
        ${medios.length ? `<div class="notif-pub-media ${medios.length === 1 ? 'uno' : ''}">${medios.slice(0,4).map((m,i)=>{
          const url=resolverUrlMedio(m);
          const vid=m.tipo_medio==='video';
          return `<button type="button" data-media-index="${i}">${vid ? `<video src="${_esc(url)}" muted playsinline preload="metadata"></video><span>▶</span>` : `<img src="${_esc(url)}" alt="">`}</button>`;
        }).join('')}</div>` : ''}
        <div class="notif-pub-acciones">
          <span>♡ ${Number(post.total_reacciones ?? 0)}</span>
          <button type="button" data-accion="comentarios">💬 ${Number(post.total_comentarios ?? 0)} Comentarios</button>
        </div>
      </article>
    </main>`;

  _overlay.querySelector('.btn-volver').addEventListener('click', cerrarPublicacionNotificacion);
  _overlay.querySelector('[data-accion="autor"]')?.addEventListener('click', () => abrirPerfil(post.autor_id));
  _overlay.querySelector('[data-accion="comentarios"]')?.addEventListener('click', () => abrirHojaComentarios(post));
  _overlay.querySelectorAll('[data-media-index]').forEach((btn)=>btn.addEventListener('click',()=>abrirVisorMedia({ post, indiceInicial:Number(btn.dataset.mediaIndex)||0 })));
}

function _tiempo(raw) {
  const f = new Date(raw);
  if (Number.isNaN(f.getTime())) return '';
  const min = Math.floor((Date.now()-f.getTime())/60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h=Math.floor(min/60); if(h<24) return `hace ${h} h`;
  const d=Math.floor(h/24); if(d<7) return `hace ${d} d`;
  return f.toLocaleDateString('es-MX');
}
function _html(v){const d=document.createElement('div');d.textContent=v??'';return d.innerHTML;}
function _esc(v){return _html(v).replace(/"/g,'&quot;');}
