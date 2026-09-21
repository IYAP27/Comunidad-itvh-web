// visor-historias.js — visor completo de historias web.
// Paridad principal con la app móvil: navegación, vistas, like,
// comentarios, actividad propia, eliminar, música y autoavance.

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../../core/html-utils.js';
import { supabase } from '../../../core/supabase-client.js';
import { usuarioActual } from '../../../core/auth.js';
import { resolverUrlHistoria, resolverUrlPerfil } from '../../../core/url-helper.js';
import { abrirPerfil } from '../../perfil/mi-perfil.js';
import { eliminarDeR2 } from '../../../core/storage-r2.js';
import { BUCKETS, DOMINIOS } from '../../../core/r2-config.js';

const DURACION_IMAGEN_MS = 7000;

export function abrirVisorHistorias({ grupos = [], indiceGrupo = 0, indiceHistoria = 0 } = {}) {
  const limpios = grupos.filter((g) => (g.stories ?? []).length);
  if (!limpios.length) return;

  let grupoActual = Math.min(Math.max(indiceGrupo, 0), limpios.length - 1);
  let historiaActual = Math.max(indiceHistoria, 0);
  let timer = null;
  let pausado = false;

  const overlay = document.createElement('div');
  overlay.className = 'stories-viewer';
  document.body.appendChild(overlay);

  const limpiarTimer = () => { if (timer) clearTimeout(timer); timer = null; };
  const detenerAudio = () => { try { overlay._musicAudio?.pause(); } catch (_) {} overlay._musicAudio = null; };

  const cerrar = () => {
    limpiarTimer();
    detenerAudio();
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  const ir = (delta) => {
    limpiarTimer();
    detenerAudio();
    const grupo = limpios[grupoActual];
    historiaActual += delta;
    if (historiaActual >= grupo.stories.length) { grupoActual += 1; historiaActual = 0; }
    else if (historiaActual < 0) { grupoActual -= 1; if (grupoActual >= 0) historiaActual = limpios[grupoActual].stories.length - 1; }
    if (grupoActual < 0 || grupoActual >= limpios.length) return cerrar();
    pintar();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowRight') ir(1);
    if (e.key === 'ArrowLeft') ir(-1);
    if (e.key === ' ') { e.preventDefault(); pausado = !pausado; if (!pausado) programarAutoavance(); else limpiarTimer(); }
  };
  document.addEventListener('keydown', onKey);

  const programarAutoavance = () => {
    limpiarTimer();
    if (pausado) return;
    const grupo = limpios[grupoActual];
    const historia = grupo.stories[historiaActual];
    const url = resolverUrlHistoria(historia);
    if (!_esVideo(historia, url)) timer = setTimeout(() => ir(1), DURACION_IMAGEN_MS);
  };

  const pintar = async () => {
    limpiarTimer();
    detenerAudio();
    const grupo = limpios[grupoActual];
    historiaActual = Math.min(historiaActual, grupo.stories.length - 1);
    const historia = grupo.stories[historiaActual];
    const url = resolverUrlHistoria(historia);
    const foto = grupo.foto || resolverUrlPerfil({ cdn_foto_perfil: grupo.fotoRaw });
    const nombre = grupo.nombre || 'Historia';
    const esVideo = _esVideo(historia, url);
    const esDueno = usuarioActual()?.id === grupo.autor_id;

    overlay.innerHTML = `
      <div class="stories-progress">${grupo.stories.map((_, i) => `<span class="${i < historiaActual ? 'visto' : i === historiaActual ? 'actual' : ''}"></span>`).join('')}</div>
      <header class="stories-topbar">
        <button type="button" class="stories-author" data-accion="perfil">
          <span>${foto ? `<img src="${_escapeAttr(foto)}" alt="" />` : _escapeHtml(nombre[0] ?? '')}</span>
          <strong>${_escapeHtml(nombre)}</strong>
          <small>${_escapeHtml(_tiempoRelativo(historia.creado_en ?? historia.created_at))}</small>
        </button>
        <button type="button" class="stories-close" data-accion="cerrar" aria-label="Cerrar">✕</button>
      </header>
      <main class="stories-stage">
        ${url ? (esVideo ? `<video src="${_escapeAttr(url)}" autoplay playsinline></video>` : `<img src="${_escapeAttr(url)}" alt="" />`) : `<div class="stories-text-only">${_escapeHtml(historia.texto ?? historia.contenido ?? 'Historia')}</div>`}
      </main>
      <button type="button" class="stories-nav stories-prev" data-accion="prev" aria-label="Anterior"></button>
      <button type="button" class="stories-nav stories-next" data-accion="next" aria-label="Siguiente"></button>
      <footer class="stories-bottom-actions ${esDueno ? 'propia' : 'publica'}">
        ${esDueno ? `
          <button type="button" class="stories-action-btn" data-accion="actividad"><span>👥</span><span>Actividad</span></button>
          <button type="button" class="stories-action-btn stories-action-destructiva" data-accion="eliminar"><span>🗑️</span><span>Eliminar</span></button>
        ` : `
          <button type="button" class="stories-comment-open" data-accion="comentarios">Responder a la historia…</button>
          <button type="button" class="stories-like-btn" data-accion="like" aria-label="Me gusta"><span>♡</span><strong></strong></button>
        `}
      </footer>
    `;

    overlay.querySelector('[data-accion="cerrar"]')?.addEventListener('click', cerrar);
    overlay.querySelector('[data-accion="prev"]')?.addEventListener('click', () => ir(-1));
    overlay.querySelector('[data-accion="next"]')?.addEventListener('click', () => ir(1));
    overlay.querySelector('[data-accion="perfil"]')?.addEventListener('click', () => abrirPerfil(grupo.autor_id));
    overlay.querySelector('[data-accion="actividad"]')?.addEventListener('click', async () => { limpiarTimer(); await _abrirActividadHistoria(historia.id, programarAutoavance); });
    overlay.querySelector('[data-accion="comentarios"]')?.addEventListener('click', async () => { limpiarTimer(); await _abrirComentariosHistoria(historia.id, programarAutoavance); });
    overlay.querySelector('[data-accion="eliminar"]')?.addEventListener('click', () => _eliminarHistoria(historia, cerrar));

    const video = overlay.querySelector('.stories-stage video');
    if (video) video.addEventListener('ended', () => ir(1), { once: true });

    if (!esDueno) {
      _marcarVista(historia.id);
      const likeBtn = overlay.querySelector('[data-accion="like"]');
      await _cargarLikeHistoria(historia.id, likeBtn);
      likeBtn?.addEventListener('click', async () => _toggleLikeHistoria(historia.id, likeBtn));
    }

    _montarMusica(overlay, historia);
    programarAutoavance();
  };

  pintar();
}

async function _cargarLikeHistoria(historiaId, btn) {
  const uid = usuarioActual()?.id;
  if (!uid || !btn) return;
  try {
    const [{ data: mio }, { data: total }] = await Promise.all([
      supabase.from('reacciones_historias').select('id').eq('historia_id', historiaId).eq('usuario_id', uid).eq('tipo', 'like').maybeSingle(),
      supabase.from('reacciones_historias').select('id').eq('historia_id', historiaId).eq('tipo', 'like'),
    ]);
    btn.dataset.liked = mio ? '1' : '0';
    btn.classList.toggle('activo', !!mio);
    btn.querySelector('span').textContent = mio ? '♥' : '♡';
    btn.querySelector('strong').textContent = (total?.length ?? 0) > 0 ? String(total.length) : '';
  } catch (e) { console.warn('historias – cargar like:', e); }
}

async function _toggleLikeHistoria(historiaId, btn) {
  const uid = usuarioActual()?.id;
  if (!uid || !btn || btn.disabled) return;
  btn.disabled = true;
  const liked = btn.dataset.liked === '1';
  try {
    if (liked) {
      const { error } = await supabase.from('reacciones_historias').delete().eq('historia_id', historiaId).eq('usuario_id', uid).eq('tipo', 'like');
      if (error) throw error;
    } else {
      const { error } = await supabase.from('reacciones_historias').insert({ historia_id: historiaId, usuario_id: uid, tipo: 'like' });
      if (error) throw error;
    }
    await _cargarLikeHistoria(historiaId, btn);
  } catch (e) { console.error('historias – toggle like:', e); }
  finally { btn.disabled = false; }
}

async function _abrirComentariosHistoria(historiaId, onCerrar) {
  const uid = usuarioActual()?.id;
  const sheet = _crearSheet('Comentarios');
  const body = sheet.querySelector('.stories-sheet-body');
  const footer = document.createElement('form');
  footer.className = 'stories-sheet-composer';
  footer.innerHTML = `<input maxlength="500" placeholder="Escribe un comentario…"><button type="submit">Enviar</button>`;
  sheet.querySelector('.stories-sheet').appendChild(footer);

  const cargar = async () => {
    body.innerHTML = '<div class="spinner"></div>';
    try {
      const { data, error } = await supabase.from('comentarios_historias')
        .select('id, contenido, creado_en, autor_id, perfiles!comentarios_historias_autor_id_fkey(id,nombre,nombre_usuario,cdn_foto_perfil)')
        .eq('historia_id', historiaId).order('creado_en', { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      body.innerHTML = rows.length ? rows.map(_htmlComentarioHistoria).join('') : '<div class="stories-sheet-empty">Sin comentarios aún.</div>';
      body.querySelectorAll('[data-uid]').forEach((el) => el.addEventListener('click', () => abrirPerfil(el.dataset.uid)));
    } catch (e) { console.error('historias – comentarios:', e); body.innerHTML = '<div class="stories-sheet-empty">No se pudieron cargar los comentarios.</div>'; }
  };

  footer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = footer.querySelector('input');
    const texto = input.value.trim();
    if (!texto || !uid) return;
    footer.querySelector('button').disabled = true;
    try {
      const { error } = await supabase.from('comentarios_historias').insert({ historia_id: historiaId, autor_id: uid, contenido: texto });
      if (error) throw error;
      input.value = '';
      await cargar();
    } catch (err) { console.error('historias – enviar comentario:', err); alert('No se pudo enviar el comentario.'); }
    finally { footer.querySelector('button').disabled = false; }
  });
  _wireCerrarSheet(sheet, onCerrar);
  await cargar();
  footer.querySelector('input').focus();
}

async function _abrirActividadHistoria(historiaId, onCerrar) {
  const sheet = _crearSheet('Actividad');
  const body = sheet.querySelector('.stories-sheet-body');
  _wireCerrarSheet(sheet, onCerrar);
  try {
    const [{ data: vistas, error: e1 }, { data: likes, error: e2 }] = await Promise.all([
      supabase.from('historia_vistas').select('usuario_id,visto_en,perfiles!historia_vistas_usuario_id_fkey(id,nombre,nombre_usuario,cdn_foto_perfil)').eq('historia_id', historiaId).order('visto_en', { ascending:false }),
      supabase.from('reacciones_historias').select('usuario_id').eq('historia_id', historiaId).eq('tipo','like'),
    ]);
    if (e1) throw e1; if (e2) throw e2;
    const likeIds = new Set((likes ?? []).map((x) => x.usuario_id));
    const uid = usuarioActual()?.id;
    const rows = (vistas ?? []).filter((x) => x.usuario_id !== uid).sort((a,b) => Number(likeIds.has(b.usuario_id))-Number(likeIds.has(a.usuario_id)));
    body.innerHTML = rows.length ? rows.map((r) => _htmlActividad(r, likeIds.has(r.usuario_id))).join('') : '<div class="stories-sheet-empty">Nadie ha visto esta historia todavía.</div>';
    body.querySelectorAll('[data-uid]').forEach((el) => el.addEventListener('click', () => abrirPerfil(el.dataset.uid)));
  } catch (e) { console.error('historias – actividad:', e); body.innerHTML='<div class="stories-sheet-empty">No se pudo cargar la actividad.</div>'; }
}

function _crearSheet(titulo) {
  document.querySelector('.stories-sheet-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className='stories-sheet-overlay';
  overlay.innerHTML=`<div class="stories-sheet-backdrop"></div><section class="stories-sheet"><div class="stories-sheet-handle"></div><header><h3>${_escapeHtml(titulo)}</h3><button type="button" data-cerrar>✕</button></header><div class="stories-sheet-body"><div class="spinner"></div></div></section>`;
  document.body.appendChild(overlay);
  return overlay;
}

function _wireCerrarSheet(sheet, onCerrar) {
  const cerrar=()=>{sheet.remove(); onCerrar?.();};
  sheet.querySelector('.stories-sheet-backdrop').addEventListener('click', cerrar);
  sheet.querySelector('[data-cerrar]').addEventListener('click', cerrar);
}

function _htmlComentarioHistoria(c) {
  const p=c.perfiles??{}; const foto=resolverUrlPerfil(p); const nombre=p.nombre??'Usuario';
  return `<div class="stories-comment-row"><button type="button" class="stories-comment-avatar" data-uid="${_escapeAttr(p.id??c.autor_id)}">${foto?`<img src="${_escapeAttr(foto)}" alt="">`:_escapeHtml(nombre[0]??'')}</button><div><button type="button" class="stories-comment-name" data-uid="${_escapeAttr(p.id??c.autor_id)}">${_escapeHtml(nombre)}</button><p>${_escapeHtml(c.contenido??'')}</p><small>${_escapeHtml(_tiempoRelativo(c.creado_en))}</small></div></div>`;
}

function _htmlActividad(r, liked) {
  const p=r.perfiles??{}; const foto=resolverUrlPerfil(p); const nombre=p.nombre??'Usuario'; const user=p.nombre_usuario?`@${p.nombre_usuario}`:'';
  return `<button type="button" class="stories-activity-row" data-uid="${_escapeAttr(p.id??r.usuario_id)}"><span class="stories-activity-avatar">${foto?`<img src="${_escapeAttr(foto)}" alt="">`:_escapeHtml(nombre[0]??'')}</span><span><strong>${_escapeHtml(nombre)}</strong><small>${_escapeHtml(user)} · ${_escapeHtml(_tiempoRelativo(r.visto_en))}</small></span>${liked?'<b>♥</b>':''}</button>`;
}

async function _eliminarHistoria(historia, cerrar) {
  if (!confirm('¿Eliminar esta historia? Esta acción no se puede deshacer.')) return;
  try {
    const cdn = historia.cdn_url || historia.media_url;
    if (cdn?.startsWith(DOMINIOS.historias)) {
      const path = cdn.replace(`${DOMINIOS.historias}/`, '');
      try { await eliminarDeR2(BUCKETS.historias, path); } catch (e) { console.warn('historias – limpiar R2:', e); }
    }
    const { error } = await supabase.from('historias').delete().eq('id', historia.id);
    if (error) throw error;
    cerrar();
  } catch (e) { console.error('historias – eliminar:', e); alert('No se pudo eliminar la historia.'); }
}

async function _marcarVista(historiaId) {
  const uid=usuarioActual()?.id; if(!uid||!historiaId)return;
  try { const {error}=await supabase.from('historia_vistas').upsert({historia_id:historiaId,usuario_id:uid},{onConflict:'historia_id,usuario_id'}); if(error)throw error; }
  catch(e){console.warn('historias – marcar vista:',e);}
}

function _montarMusica(overlay, historia) {
  let previewUrl=historia.musica_preview_url??historia.preview_url??historia.musica_preview??null;
  let artwork=historia.musica_artwork??historia.track_cover??historia.cover??null;
  let titulo=historia.musica_titulo??historia.track_titulo??historia.titulo??'';
  let artista=historia.musica_artista??historia.track_artista??historia.artista??'';
  if(!previewUrl&&historia.musica_json){try{const m=typeof historia.musica_json==='string'?JSON.parse(historia.musica_json):historia.musica_json;previewUrl=m.previewUrl||m.preview_url||m.preview||null;artwork=artwork||m.artwork||m.cover||null;titulo=titulo||m.title||m.trackName||'';artista=artista||m.artist||m.artistName||'';}catch(_){}}
  if(!previewUrl)return;
  const chip=document.createElement('button'); chip.type='button'; chip.className='stories-music-chip';
  chip.innerHTML=`<div class="music-inner"><div class="music-cover">${artwork?`<img src="${_escapeAttr(artwork)}" alt="">`:'<div class="music-fallback">♪</div>'}</div><div class="music-meta"><div class="music-title">${_escapeHtml(titulo)}</div><div class="music-artist">${_escapeHtml(artista)}</div></div><div class="music-play">▶</div></div>`;
  overlay.appendChild(chip);
  try{const audio=new Audio(previewUrl);audio.loop=true;overlay._musicAudio=audio;chip.addEventListener('click',async()=>{if(audio.paused){await audio.play();chip.classList.add('playing');chip.querySelector('.music-play').textContent='⏸';}else{audio.pause();chip.classList.remove('playing');chip.querySelector('.music-play').textContent='▶';}});}catch(e){console.warn(e);}
}

function _esVideo(historia,url){const tipo=`${historia.tipo_medio??historia.media_type??historia.tipo??''}`.toLowerCase();return tipo.includes('video')||/\.(mp4|webm|mov)(\?|$)/i.test(url);}
function _tiempoRelativo(fecha){if(!fecha)return'';const diff=Date.now()-new Date(fecha).getTime();const min=Math.max(1,Math.floor(diff/60000));if(min<60)return`${min} min`;const h=Math.floor(min/60);if(h<24)return`${h} h`;const d=Math.floor(h/24);return d<7?`${d} d`:new Date(fecha).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});}
