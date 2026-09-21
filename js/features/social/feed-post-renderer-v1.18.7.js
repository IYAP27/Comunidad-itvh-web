import { escapeHtml, escapeAttr } from '../../core/html-utils.js';
import { resolverUrlMedio, resolverUrlPerfil } from '../../core/url-helper.js';

export function htmlFeedPost(post, currentUid = null) {
  const perfil = post.perfiles ?? {};
  const foto = resolverUrlPerfil(perfil);
  const nombre = perfil.nombre ?? 'Usuario';
  const usuario = perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : '@usuario';
  const tiempo = tiempoRelativo(post.creado_en);
  const medios = post.publicacion_medios ?? [];
  const reaccion = post.mi_reaccion;
  const totalReacciones = post.total_reacciones_real ?? post.total_reacciones ?? 0;
  const totalComentarios = post.total_comentarios_real ?? post.total_comentarios ?? 0;

  return `
    <article class="post-card" data-post-id="${escapeAttr(post.id)}">
      <header class="post-header">
        <button type="button" class="post-avatar" data-accion="autor">
          ${foto ? `<img src="${escapeAttr(foto)}" alt="" loading="lazy" />` : `<span>${escapeHtml(nombre[0] ?? '')}</span>`}
        </button>
        <div class="post-autor">
          <button type="button" class="post-nombre" data-accion="autor">${escapeHtml(nombre)}</button>
          <p>${escapeHtml(usuario)} · ${escapeHtml(tiempo)}</p>
          ${htmlEtiquetados(post.etiquetados ?? [])}
        </div>
        <details class="post-opciones-nativas">
          <summary class="post-mas" aria-label="Opciones">•••</summary>
          <div class="post-opciones-nativas-menu">
            ${currentUid === post.autor_id
              ? `<button type="button" data-accion="eliminar">🗑️ Eliminar publicación</button>`
              : `<button type="button" data-accion="reportar">🚩 Reportar publicación</button>`}
          </div>
        </details>
      </header>

      ${post.contenido ? `<p class="post-contenido">${escapeHtml(post.contenido)}</p>` : ''}
      ${medios.length ? htmlMedios(medios) : ''}

      <footer class="post-footer">
        <button type="button" class="post-pill ${reaccion ? 'activo' : ''}" data-accion="reaccion">
          <span>${reaccion ? escapeHtml(reaccion) : '♡'}</span>
          ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : ''}
        </button>
        <button type="button" class="post-pill" data-accion="comentarios">
          <span>💬</span>
          ${totalComentarios > 0 ? `<strong>${totalComentarios}</strong>` : ''}
        </button>
        <button type="button" class="post-reacciones-resumen" data-accion="ver-reacciones">
          ${htmlTopEmojis(post.top_emojis ?? [])}
          ${totalReacciones > 0 ? `<strong>${totalReacciones}</strong>` : ''}
        </button>
      </footer>
    </article>
  `;
}

function htmlEtiquetados(etiquetados) {
  if (!etiquetados.length) return '';
  const visibles = etiquetados.slice(0, 2).map((u) => u.nombre).filter(Boolean);
  const restantes = etiquetados.length - visibles.length;
  const texto = `Con ${visibles.join(', ')}${restantes > 0 ? ` y ${restantes} ${restantes === 1 ? 'persona más' : 'personas más'}` : ''}`;
  return `<p class="post-etiquetados">${escapeHtml(texto)}</p>`;
}

function htmlMedios(medios) {
  const clase = medios.length === 1 ? 'uno' : medios.length === 2 ? 'dos' : 'varios';
  return `
    <div class="post-media-grid ${clase}">
      ${medios.slice(0, 4).map((m, i) => {
        const url = resolverUrlMedio(m);
        const esVideo = m.tipo_medio === 'video';
        const indiceReal = medios.length > 4 && i === 3 ? 4 : i;
        const resto = medios.length > 4 && i === 3 ? `<span class="post-media-resto">+${medios.length - 4}</span>` : '';
        return `
          <button type="button" class="post-media-item" data-accion="media" data-index="${indiceReal}">
            ${
              esVideo
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
