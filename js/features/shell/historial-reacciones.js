// ═════════════════════════════════════════════════════════════════
// historial-reacciones.js — adaptado de Aspirantes ITVH web
//
// Cambios respecto al original:
//   • perfiles_aspirantes → perfiles
//   • carreras (nombre) → carrera (campo de texto directo)
//   • Importa tarjeta-publicacion.js / hoja-comentarios.js /
//     hoja-reacciones.js desde features/social/ — estos módulos son
//     Fase 1 y todavía no existen en Comunidad ITVH web. Este
//     archivo queda listo pero no funcional hasta que Fase 1 esté
//     construida.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';

// Import dinámico y perezoso: tarjeta-publicacion.js, hoja-comentarios.js
// y hoja-reacciones.js son de Fase 1 (Social), aún no construida. Si un
// import estático fallara aquí, rompería la carga de TODO este módulo
// (y en cascada, la de ajustes-screen.js y drawer.js que lo importan) —
// por eso se cargan solo cuando realmente se necesitan, con fallback.
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

const EMOJI_TIPO = { like: '❤️', love: '❤️', funny: '😂', support: '🤝' };

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

export function abrirHistorialReacciones() {
  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen';
  overlay.innerHTML = `
    <header class="appbar-simple"><button class="btn-volver">‹</button><h2>Mis reacciones</h2></header>
    <div id="lista-historial-reac"><div class="spinner"></div></div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.btn-volver').addEventListener('click', () => overlay.remove());

  cargar(overlay);
}

async function cargar(overlay) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const lista = overlay.querySelector('#lista-historial-reac');

  // Fase 1 (Social) todavía no existe: mostrar aviso en vez de
  // intentar renderizar tarjetas que no se pueden construir.
  let social;
  try {
    social = await _cargarComponentesSocial();
  } catch (_e) {
    lista.innerHTML = `<div class="estado-vacio">🚧<p class="vacio-titulo">Próximamente</p><p class="vacio-msg">Esta sección estará disponible cuando el feed social esté listo.</p></div>`;
    return;
  }
  const { crearTarjetaPublicacion, abrirHojaComentarios, abrirHojaReacciones } = social;

  const { data, error } = await supabase
    .from('reacciones')
    .select(`
      id, tipo, creado_en, publicacion_id,
      publicaciones!reacciones_publicacion_id_fkey (
        autor_id, contenido, tipo, total_reacciones, total_comentarios,
        perfiles!publicaciones_autor_id_fkey ( nombre, nombre_usuario, cdn_foto_perfil, carrera ),
        publicacion_medios ( url, cdn_url, tipo_medio, orden )
      )
    `)
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })
    .limit(200);

  if (error) { lista.innerHTML = '<p class="texto-vacio">No se pudo cargar tu historial.</p>'; return; }

  if (!data.length) {
    lista.innerHTML = `<div class="estado-vacio">🤍<p class="vacio-titulo">Sin actividad</p><p class="vacio-msg">No has reaccionado a ninguna publicación aún.</p></div>`;
    return;
  }

  const items = data.map((r) => {
    const pub = r.publicaciones ?? {};
    const medios = (pub.publicacion_medios ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return {
      id: r.id,
      tipo: r.tipo,
      creadoEn: new Date(r.creado_en),
      publicacionId: r.publicacion_id,
      postData: { ...pub, id: r.publicacion_id, publicacion_medios: medios },
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
        <p class="historial-etiqueta">${EMOJI_TIPO[item.tipo] ?? '👍'}  Reaccionaste a una publicación</p>
        <p class="historial-tiempo">${tiempoRelativo(item.creadoEn)}</p>
      `;
      const card = crearTarjetaPublicacion(item.postData, item.postData.publicacion_medios, {
        yaReacciono: true,
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