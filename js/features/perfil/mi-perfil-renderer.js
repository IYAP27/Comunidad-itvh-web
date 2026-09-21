import { escapeHtml, escapeAttr } from '../../core/html-utils.js';
import { resolverUrlMedio, resolverUrlPerfil } from '../../core/url-helper.js';

export function htmlPerfilPrincipal(data, { propio, mostrarVolver }) {
  const { perfil, publicaciones, insignias, destacadas } = data;
  const foto = resolverUrlPerfil(perfil);
  const nombre = perfil.nombre ?? 'Usuario';
  const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '@usuario';
  const bio = perfil.presentacion ?? perfil.bio ?? '';
  const carrera = perfil.carrera ?? '';
  const semestre = perfil.semestre ? `${perfil.semestre}° semestre` : '';

  return `
    <div class="perfil-page">
      <header class="perfil-appbar">
        ${mostrarVolver ? `<button type="button" class="btn-volver" id="perfil-volver">‹</button>` : ''}
        <h1>${propio ? '<span>Mi</span><strong>Perfil</strong>' : escapeHtml(usuario)}</h1>
        ${propio ? `<button type="button" class="perfil-settings" id="perfil-ajustes">⚙</button>` : ''}
      </header>

      <section class="perfil-card">
        <div class="perfil-top">
          <button type="button" class="perfil-avatar" id="perfil-avatar">
            ${foto ? `<img src="${escapeAttr(foto)}" alt="" />` : `<span>${escapeHtml(nombre[0] ?? '')}</span>`}
          </button>
          <div class="perfil-stats">
            <div><strong>${publicaciones.length}</strong><span>Posts</span></div>
            <button type="button" id="perfil-seguidores"><strong id="perfil-seguidores-count">${data.seguidores}</strong><span>Seguidores</span></button>
            <button type="button" id="perfil-seguidos"><strong>${data.seguidos}</strong><span>Seguidos</span></button>
          </div>
        </div>

        <div class="perfil-info">
          <h2>${escapeHtml(nombre)}</h2>
          <p class="perfil-usuario">${escapeHtml(usuario)}</p>
          ${bio ? `<p class="perfil-bio">${escapeHtml(bio)}</p>` : ''}
          ${(carrera || semestre) ? `<p class="perfil-academico">${escapeHtml([carrera, semestre].filter(Boolean).join(' · '))}</p>` : ''}
          ${insignias.length ? `<div class="perfil-insignias">${insignias.map((i) => `<span>${escapeHtml(i.tipo ?? '')}</span>`).join('')}</div>` : ''}
        </div>

        <div class="perfil-actions">
          ${
            propio
              ? `<button type="button" class="perfil-btn primary" id="perfil-editar">Editar perfil</button>
                 <button type="button" class="perfil-btn secondary" id="perfil-compartir">Compartir perfil</button>`
              : `<button type="button" class="perfil-btn primary ${data.siguiendo ? 'siguiendo' : ''}" id="perfil-follow">
                   ${data.siguiendo ? 'Siguiendo' : 'Seguir'}
                 </button>
                 <button type="button" class="perfil-btn secondary" id="perfil-mensaje">Mensaje</button>`
          }
        </div>

        ${htmlRedes(perfil)}
      </section>

      ${destacadas.length ? htmlDestacadas(destacadas) : ''}

      <section class="perfil-section-title">
        <span>▦</span>
        <strong>Publicaciones</strong>
      </section>

      <section class="perfil-grid">
        ${
          publicaciones.length
            ? publicaciones.map((p, i) => htmlGridPost(p, i)).join('')
            : `<div class="perfil-empty-grid">Aún no hay publicaciones</div>`
        }
      </section>
    </div>
  `;
}

export function htmlPerfilPostCard(post, index) {
  const perfil = post.perfiles ?? {};
  const foto = resolverUrlPerfil(perfil);
  const nombre = perfil.nombre ?? 'Usuario';
  const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '@usuario';
  const medios = post.publicacion_medios ?? [];
  const reaccion = post.mi_reaccion;
  const totalReacciones = post.total_reacciones_real ?? post.total_reacciones ?? 0;
  const totalComentarios = post.total_comentarios_real ?? post.total_comentarios ?? 0;

  return `
    <article class="post-card perfil-post-card" data-index="${index}">
      <header class="post-header">
        <button type="button" class="post-avatar" data-accion="autor">
          ${foto ? `<img src="${escapeAttr(foto)}" alt="" loading="lazy" />` : `<span>${escapeHtml(nombre[0] ?? '')}</span>`}
        </button>
        <div class="post-autor">
          <button type="button" class="post-nombre" data-accion="autor">${escapeHtml(nombre)}</button>
          <p>${escapeHtml(usuario)} · ${escapeHtml(tiempoRelativo(post.creado_en))}</p>
        </div>
      </header>

      ${post.contenido ? `<p class="post-contenido">${escapeHtml(post.contenido)}</p>` : ''}
      ${medios.length ? htmlPerfilPostMedios(medios) : ''}

      <footer class="post-footer">
        <button type="button" class="post-pill ${reaccion ? 'activo' : ''}" data-accion="reaccionar">
          <span>${reaccion ? escapeHtml(reaccion) : '♡'}</span>
          ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : ''}
        </button>
        <button type="button" class="post-pill" data-accion="comentarios">
          <span>💬</span>
          ${totalComentarios > 0 ? `<strong>${totalComentarios}</strong>` : ''}
        </button>
        <button type="button" class="post-reacciones-resumen" data-accion="reacciones">
          ${htmlTopEmojis(post.top_emojis ?? [])}
          ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : '<strong>Reacciones</strong>'}
        </button>
      </footer>
    </article>
  `;
}

function htmlRedes(perfil) {
  const redes = [
    ['instagram_url', 'Instagram', 'assets/icons/instagram.webp'],
    ['facebook_url', 'Facebook', 'assets/icons/facebook.png'],
    ['tiktok_url', 'TikTok', 'assets/icons/tiktok.png'],
  ].filter(([key]) => perfil[key]);
  if (!redes.length) return '';
  return `
    <div class="perfil-redes">
      ${redes.map(([key, label, icon]) => `
        <button type="button" class="perfil-red" data-url="${escapeAttr(perfil[key])}" title="${label}">
          <img src="${icon}" alt="${label}" />
        </button>
      `).join('')}
    </div>
  `;
}

function htmlDestacadas(destacadas) {
  return `
    <section class="perfil-destacadas">
      <p>Destacadas</p>
      <div>
        ${destacadas.map((d) => `
          <button type="button" class="perfil-destacada" data-id="${escapeAttr(d.id)}">
            <span>${d.portada_url ? `<img src="${escapeAttr(d.portada_url)}" alt="" loading="lazy" />` : '★'}</span>
            <small>${escapeHtml(d.nombre ?? '')}</small>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function htmlGridPost(post, index) {
  const medio = post.publicacion_medios?.[0];
  const url = medio ? resolverUrlMedio(medio) : '';
  const esVideo = medio?.tipo_medio === 'video';
  return `
    <button type="button" class="perfil-grid-item" data-index="${index}">
      ${
        url
          ? esVideo
            ? `<video src="${escapeAttr(url)}" muted playsinline preload="metadata"></video><span class="perfil-grid-play">▶</span>`
            : `<img src="${escapeAttr(url)}" alt="" loading="lazy" />`
          : `<span class="perfil-grid-text">📝</span>`
      }
      ${post.publicacion_medios?.length > 1 ? `<span class="perfil-grid-multi">▣</span>` : ''}
    </button>
  `;
}

function htmlPerfilPostMedios(medios) {
  const visibles = medios.slice(0, 4);
  const clase = medios.length === 1 ? 'uno' : medios.length === 2 ? 'dos' : 'varios';
  return `
    <div class="post-media-grid ${clase}">
      ${visibles.map((medio, i) => {
        const url = resolverUrlMedio(medio);
        const indiceReal = medios.indexOf(medio);
        const resto = medios.length > 4 && i === 3 ? `<span class="post-media-resto">+${medios.length - 4}</span>` : '';
        return `
          <button type="button" class="post-media-item" data-accion="media" data-index="${indiceReal}">
            ${
              medio.tipo_medio === 'video'
                ? `<video src="${escapeAttr(url)}" muted playsinline preload="metadata"></video><span class="post-media-play">▶</span>`
                : `<img src="${escapeAttr(url)}" alt="" loading="lazy" />`
            }
            ${resto}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function htmlTopEmojis(emojis) {
  if (!emojis.length) return '';
  return `
    <span class="post-emojis-stack">
      ${emojis.map((emoji) => `<span>${escapeHtml(emoji)}</span>`).join('')}
    </span>
  `;
}

function tiempoRelativo(fechaStr) {
  const fecha = fechaStr ? new Date(fechaStr) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  const diff = Date.now() - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'numeric', year: 'numeric' });
}
