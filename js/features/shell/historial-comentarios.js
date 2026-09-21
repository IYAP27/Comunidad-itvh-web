// ═════════════════════════════════════════════════════════════════
// historial-comentarios.js — adaptado de Aspirantes ITVH web
// Mismos cambios que historial-reacciones.js: tabla `perfiles`,
// campo `carrera` directo, imports desde features/social/ (Fase 1,
// pendiente de construir en Comunidad ITVH web).
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';

// Ver historial-reacciones.js para la explicación de por qué esto
// es un import dinámico y no estático.
async function _cargarComponentesSocial() {
  const [tarjeta, comentarios, reacciones] = await Promise.all([
    import('../social/tarjeta-publicacion.js'),
    import('../social/hoja-comentarios.js'),
    import('../social/hoja-reacciones.js'),
  ]);
  return {
    crearTarjetaPublicacion: tarjeta.crearTarjetaPublicacion,
    abrirHojaComentarios: comentarios.abrirHojaComentarios,
    abrirHojaReacciones: reacciones.abrirHojaReacciones,
  };
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - fecha.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const dias = Math.floor(diff / 86400);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} d`;
  return fecha.toLocaleDateString('es-MX');
}

function agruparPorFecha(items) {
  const hoy = [], semana = [], antiguas = [];
  const ahora = Date.now();
  items.forEach((it) => {
    const diffH = (ahora - it.creadoEn.getTime()) / 3600000;
    if (diffH < 24) hoy.push(it);
    else if (diffH < 24 * 7) semana.push(it);
    else antiguas.push(it);
  });
  const grupos = {};
  if (hoy.length) grupos['Hoy'] = hoy;
  if (semana.length) grupos['Esta semana'] = semana;
  if (antiguas.length) grupos['Anteriores'] = antiguas;
  return grupos;
}

export function abrirHistorialComentarios() {
  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen';
  overlay.innerHTML = `
    <header class="appbar-simple"><button class="btn-volver">‹</button><h2>Mis comentarios</h2></header>
    <div id="lista-historial-com"><div class="spinner"></div></div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.btn-volver').addEventListener('click', () => overlay.remove());

  cargar(overlay);
}

async function cargar(overlay) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const lista = overlay.querySelector('#lista-historial-com');

  let social;
  try {
    social = await _cargarComponentesSocial();
  } catch (_e) {
    lista.innerHTML = `<div class="estado-vacio">🚧<p class="vacio-titulo">Próximamente</p><p class="vacio-msg">Esta sección estará disponible cuando el feed social esté listo.</p></div>`;
    return;
  }
  const { crearTarjetaPublicacion, abrirHojaComentarios, abrirHojaReacciones } = social;

  const { data, error } = await supabase
    .from('comentarios')
    .select(`
      id, contenido, creado_en, publicacion_id, parent_id,
      publicaciones!comentarios_publicacion_id_fkey (
        autor_id, contenido, tipo, total_reacciones, total_comentarios,
        perfiles!publicaciones_autor_id_fkey ( nombre, nombre_usuario, cdn_foto_perfil, carrera ),
        publicacion_medios ( url, cdn_url, tipo_medio, orden )
      )
    `)
    .eq('autor_id', user.id)
    .order('creado_en', { ascending: false })
    .limit(200);

  if (error) { lista.innerHTML = '<p class="texto-vacio">No se pudo cargar tu historial.</p>'; return; }

  if (!data.length) {
    lista.innerHTML = `<div class="estado-vacio">💬<p class="vacio-titulo">Sin actividad</p><p class="vacio-msg">No has comentado en ninguna publicación aún.</p></div>`;
    return;
  }

  const items = data.map((m) => {
    const pub = m.publicaciones ?? {};
    const medios = (pub.publicacion_medios ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return {
      id: m.id,
      contenido: m.contenido,
      creadoEn: new Date(m.creado_en),
      publicacionId: m.publicacion_id,
      esRespuesta: !!m.parent_id,
      postData: { ...pub, id: m.publicacion_id, publicacion_medios: medios },
    };
  });

  const grupos = agruparPorFecha(items);
  lista.innerHTML = '';

  Object.entries(grupos).forEach(([label, arr]) => {
    const h = document.createElement('p');
    h.className = 'grupo-fecha-label';
    h.textContent = label;
    lista.appendChild(h);

    arr.forEach((item) => {
      const wrap = document.createElement('div');
      wrap.className = 'historial-item';
      wrap.innerHTML = `
        <p class="historial-etiqueta">${item.esRespuesta ? '↩︎ Respondiste' : '💬 Comentaste'}</p>
        <div class="burbuja-mi-comentario">${item.contenido}</div>
        <p class="historial-tiempo">${tiempoRelativo(item.creadoEn)}</p>
      `;
      const card = crearTarjetaPublicacion(item.postData, item.postData.publicacion_medios, {
        yaReacciono: false,
        onReaccionar: (nuevoEstado) => toggleReaccion(item.publicacionId, nuevoEstado),
        onComentar: () => abrirHojaComentarios(item.publicacionId),
        onVerReacciones: () => abrirHojaReacciones(item.publicacionId),
      });
      wrap.appendChild(card);
      lista.appendChild(wrap);
    });
  });
}

async function toggleReaccion(publicacionId, nuevoEstado) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (nuevoEstado) {
    const { data: existe } = await supabase.from('reacciones').select('id')
      .eq('usuario_id', user.id).eq('publicacion_id', publicacionId).maybeSingle();
    if (!existe) await supabase.from('reacciones').insert({ usuario_id: user.id, publicacion_id: publicacionId, tipo: 'like' });
  } else {
    await supabase.from('reacciones').delete().eq('usuario_id', user.id).eq('publicacion_id', publicacionId);
  }
}