// ═════════════════════════════════════════════════════════════════
// marketplace-perfil-publico.js
//
// Perfil público del negocio de un emprendedor:
//   • Información del negocio
//   • Publicaciones activas
//   • Calificaciones y opiniones
//   • Opción de contactar
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlMarketplace } from '../../core/url-helper.js';
import { abrirConversacion } from '../chat/conversacion-screen.js?v=1.9.3';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _contenedor = null;
let _emprendedorId = null;
let _emprendedor = null;
let _publicaciones = [];
let _valoraciones = [];
let _miValoracion = null;
let _cargando = true;
let _onCerrar = null;

export async function render(contenedor, emprendedorId, onCerrar) {
  destruir();
  _contenedor = contenedor;
  _emprendedorId = emprendedorId;
  _onCerrar = onCerrar;
  _cargando = true;

  contenedor.innerHTML = '<div class="marketplace-cargando">Cargando perfil...</div>';

  try {
    await _cargarDatos();
    _renderContenido();
  } catch (e) {
    console.error('Error cargando perfil público:', e);
    _mostrarError(e.message);
  }
}

export function destruir() {
  _contenedor = null;
}

// ─────────────────────────────────────────────────────────────────
// Cargar datos
// ─────────────────────────────────────────────────────────────────
async function _cargarDatos() {
  // Cargar emprendedor
  const { data: empData, error: empError } = await supabase
    .from('emprendedores')
    .select(`
      id, perfil_id, nombre_negocio, descripcion, estado,
      calificacion_promedio, total_valoraciones,
      total_contactos, total_visualizaciones, creado_en,
      perfiles!left ( id, nombre, nombre_usuario, cdn_foto_perfil, carrera )
    `)
    .eq('id', _emprendedorId)
    .single();

  if (empError) throw empError;
  _emprendedor = empData;

  // Cargar publicaciones
  const { data: pubData, error: pubError } = await supabase
    .from('marketplace_publicaciones')
    .select(`
      id, titulo, descripcion, precio, tipo, creado_en, expira_en, categoria_id, total_contactos, total_visualizaciones,
      marketplace_categorias!left ( nombre, emoji ),
      marketplace_imagenes!left ( r2_url, orden )
    `)
    .eq('emprendedor_id', _emprendedorId)
    .eq('esta_activa', true)
    .gt('expira_en', new Date().toISOString())
    .order('creado_en', { ascending: false });

  if (pubError) throw pubError;
  _publicaciones = pubData || [];

  // Cargar valoraciones
  const { data: valData, error: valError } = await supabase
    .from('marketplace_valoraciones')
    .select(`
      id, promedio, comentario, creado_en,
      atencion, amabilidad, rapidez, cumplimiento, experiencia,
      perfiles:autor_id ( nombre, nombre_usuario, cdn_foto_perfil )
    `)
    .eq('emprendedor_id', _emprendedorId)
    .order('creado_en', { ascending: false });

  if (valError) throw valError;
  _valoraciones = valData || [];

  const uid = usuarioActual()?.id;
  _miValoracion = null;
  if (uid && uid !== _emprendedor?.perfil_id) {
    const { data: mia, error: miaError } = await supabase
      .from('marketplace_valoraciones')
      .select('id, atencion, amabilidad, rapidez, cumplimiento, experiencia, comentario')
      .eq('emprendedor_id', _emprendedorId)
      .eq('autor_id', uid)
      .maybeSingle();
    if (!miaError) _miValoracion = mia;
  }

  _cargando = false;
}

// ─────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────
function _renderContenido() {
  if (!_emprendedor) {
    _mostrarError('Emprendedor no encontrado');
    return;
  }

  const perfil = _emprendedor.perfiles;

  _contenedor.innerHTML = `
    <div class="marketplace-perfil-publico">
      <!-- Header -->
      <div class="marketplace-perfil-header">
        <button type="button" class="marketplace-perfil-cerrar" aria-label="Cerrar">✕</button>
        <div class="marketplace-perfil-avatar">
          ${perfil?.cdn_foto_perfil ? `
            <img src="${_escapeAttr(perfil.cdn_foto_perfil)}" alt="" />
          ` : `
            <div class="marketplace-avatar-placeholder">${perfil?.nombre?.charAt(0) || '👤'}</div>
          `}
        </div>
        <h2 class="marketplace-perfil-nombre">${_escapeHtml(_emprendedor.nombre_negocio)}</h2>
        <p class="marketplace-perfil-usuario">@${_escapeHtml(perfil?.nombre_usuario || 'usuario')}</p>
        
        ${_emprendedor.estado === 'verificado' ? `
          <div class="marketplace-perfil-verificado">✅ Verificado</div>
        ` : ''}
      </div>

      <!-- Descripción -->
      ${_emprendedor.descripcion ? `
        <div class="marketplace-perfil-descripcion">
          <p>${_escapeHtml(_emprendedor.descripcion)}</p>
        </div>
      ` : ''}

      <!-- Estadísticas -->
      <div class="marketplace-perfil-estadisticas">
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.total_visualizaciones || 0}</div>
          <div class="marketplace-stat-label">Visualizaciones</div>
        </div>
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.total_contactos || 0}</div>
          <div class="marketplace-stat-label">Contactos</div>
        </div>
        <div class="marketplace-stat">
          <div class="marketplace-stat-valor">${_emprendedor.calificacion_promedio ? _emprendedor.calificacion_promedio.toFixed(1) : 'N/A'}</div>
          <div class="marketplace-stat-label">⭐ (${_emprendedor.total_valoraciones || 0})</div>
        </div>
      </div>

      <!-- Publicaciones -->
      <div class="marketplace-perfil-publicaciones">
        <h3 class="marketplace-section-title">Publicaciones (${_publicaciones.length})</h3>
        <div class="marketplace-perfil-pub-lista">
          ${_renderPublicaciones()}
        </div>
      </div>

      <!-- Valoraciones -->
      <div class="marketplace-perfil-valoraciones">
        <h3 class="marketplace-section-title">Opiniones (${_valoraciones.length})</h3>
        <div class="marketplace-perfil-val-lista">
          ${_renderValoraciones()}
        </div>
      </div>

      <!-- Acciones -->
      <div class="marketplace-perfil-acciones">
        ${usuarioActual()?.id && usuarioActual()?.id !== _emprendedor.perfil_id ? `
          <button type="button" id="btn-calificar-emprendedor" class="marketplace-btn-secundario">
            ⭐ ${_miValoracion ? 'Editar valoración' : 'Calificar negocio'}
          </button>
          <button type="button" id="btn-contactar-emprendedor" class="marketplace-btn-principal">
            📬 Contactar Emprendedor
          </button>
        ` : ''}
      </div>
    </div>
  `;

  _wireEventos();
}

function _renderPublicaciones() {
  if (_publicaciones.length === 0) {
    return '<p class="marketplace-empty-text">No hay publicaciones disponibles</p>';
  }

  return _publicaciones.map(pub => {
    const imagenes = pub.marketplace_imagenes || [];
    const sorted = [...imagenes].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const imagen = sorted[0]?.r2_url ? resolverUrlMarketplace(sorted[0]) : null;

    return `
      <button type="button" class="marketplace-perfil-pub-item" data-pub-id="${_escapeAttr(pub.id)}">
        ${imagen ? `
          <img src="${_escapeAttr(imagen)}" alt="${_escapeAttr(pub.titulo || 'Publicación')}" class="marketplace-perfil-pub-imagen" />
        ` : `
          <div class="marketplace-perfil-pub-placeholder">📦</div>
        `}
        <div class="marketplace-perfil-pub-overlay">
          <h4 class="marketplace-perfil-pub-titulo">${_escapeHtml(pub.titulo)}</h4>
          <p class="marketplace-perfil-pub-precio">$${parseFloat(pub.precio).toFixed(2)}</p>
        </div>
      </button>
    `;
  }).join('');
}

function _renderValoraciones() {
  if (_valoraciones.length === 0) {
    return '<p class="marketplace-empty-text">Sin opiniones aún</p>';
  }

  return _valoraciones.map(val => {
    const autor = val.perfiles;
    const promedio = val.promedio || 0;
    const estrellas = '⭐'.repeat(Math.round(promedio));

    return `
      <div class="marketplace-valoracion-item">
        <div class="marketplace-valoracion-header">
          <div class="marketplace-valoracion-autor">
            ${autor?.cdn_foto_perfil ? `
              <img src="${_escapeAttr(autor.cdn_foto_perfil)}" alt="" class="marketplace-valoracion-avatar" />
            ` : `
              <div class="marketplace-valoracion-avatar-placeholder">${autor?.nombre?.charAt(0) || '👤'}</div>
            `}
            <div class="marketplace-valoracion-info">
              <p class="marketplace-valoracion-nombre">${_escapeHtml(autor?.nombre || 'Usuario')}</p>
              <p class="marketplace-valoracion-tiempo">${_formatearTiempo(val.creado_en)}</p>
            </div>
          </div>
          <div class="marketplace-valoracion-calificacion">${estrellas} ${promedio}</div>
        </div>
        ${val.comentario ? `
          <p class="marketplace-valoracion-comentario">${_escapeHtml(val.comentario)}</p>
        ` : ''}
        <div class="marketplace-valoracion-criterios">
          <span>Atención: ${_renderCriterio(val.atencion)}</span>
          <span>Amabilidad: ${_renderCriterio(val.amabilidad)}</span>
          <span>Rapidez: ${_renderCriterio(val.rapidez)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function _renderCriterio(valor) {
  if (!valor) return 'N/A';
  return '⭐'.repeat(Math.round(valor));
}

// ─────────────────────────────────────────────────────────────────
// Eventos
// ─────────────────────────────────────────────────────────────────
function _wireEventos() {
  _contenedor.querySelector('.marketplace-perfil-cerrar')?.addEventListener('click', () => {
    if (_onCerrar) _onCerrar();
  });

  _contenedor.querySelector('#btn-contactar-emprendedor')?.addEventListener('click', () => _contactar());
  _contenedor.querySelector('#btn-calificar-emprendedor')?.addEventListener('click', () => _abrirCalificacion());

  _contenedor.querySelectorAll('.marketplace-perfil-pub-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pub = _publicaciones.find((p) => p.id === btn.dataset.pubId);
      if (!pub) return;
      pub.emprendedores = _emprendedor;
      const { abrirDetallePublicacion } = await import('./marketplace-publicacion-detalle.js');
      abrirDetallePublicacion(pub, {
        onContactar: () => _contactar(pub),
        onVerEmprendedor: () => {},
      });
    });
  });
}

function _contactar(pub = null) {
  const usuario = usuarioActual();
  if (!usuario) { alert('Debes iniciar sesión para contactar'); return; }
  if (usuario.id === _emprendedor?.perfil_id) { alert('Esta es tu cuenta'); return; }
  const perfil = _emprendedor?.perfiles;
  if (!perfil) return;

  const contextoPub = pub || _publicaciones[0] || null;
  let contextoObjeto = null;
  if (contextoPub) {
    const imgs = [...(contextoPub.marketplace_imagenes || [])].sort((a,b)=>(a.orden||0)-(b.orden||0));
    contextoObjeto = {
      id: contextoPub.id,
      descripcion: contextoPub.titulo || 'Publicación',
      imagenUrl: imgs[0]?.r2_url ? resolverUrlMarketplace(imgs[0]) : null,
      lugar: contextoPub.precio != null ? `$${Number(contextoPub.precio).toFixed(2)} MXN` : null,
      tipo: 'marketplace',
    };
  }

  abrirConversacion({
    otroUsuarioId: _emprendedor.perfil_id,
    otroNombre: perfil.nombre || 'Emprendedor',
    otroNombreUsuario: perfil.nombre_usuario || null,
    otroAvatarUrl: perfil.cdn_foto_perfil || null,
    contextoObjeto,
  });
}

function _abrirCalificacion() {
  const modal = document.createElement('div');
  modal.className = 'marketplace-rating-overlay';
  const actual = _miValoracion || {};
  const criterios = [
    ['atencion','Atención'], ['amabilidad','Amabilidad'], ['rapidez','Rapidez'],
    ['cumplimiento','Cumplimiento'], ['experiencia','Experiencia'],
  ];
  modal.innerHTML = `
    <section class="marketplace-rating-card" role="dialog" aria-modal="true">
      <button type="button" class="marketplace-rating-cerrar">✕</button>
      <h2>${_miValoracion ? 'Editar valoración' : 'Calificar negocio'}</h2>
      <p>${_escapeHtml(_emprendedor?.nombre_negocio || '')}</p>
      <form id="marketplace-rating-form">
        ${criterios.map(([key,label]) => `
          <div class="marketplace-rating-row" data-key="${key}">
            <span>${label}</span>
            <div class="marketplace-rating-stars">
              ${[1,2,3,4,5].map(n => `<button type="button" class="marketplace-rating-star ${Number(actual[key]||0)>=n?'activa':''}" data-value="${n}">★</button>`).join('')}
            </div>
            <input type="hidden" name="${key}" value="${Number(actual[key]||0)}">
          </div>
        `).join('')}
        <textarea id="marketplace-rating-comentario" class="marketplace-form-textarea" maxlength="400" rows="3" placeholder="Comentario opcional">${_escapeHtml(actual.comentario || '')}</textarea>
        <button type="submit" class="marketplace-btn-principal">Guardar valoración</button>
      </form>
    </section>`;
  document.body.appendChild(modal);
  const cerrar=()=>modal.remove();
  modal.querySelector('.marketplace-rating-cerrar')?.addEventListener('click',cerrar);
  modal.addEventListener('click',(e)=>{if(e.target===modal) cerrar();});
  modal.querySelectorAll('.marketplace-rating-row').forEach(row=>{
    row.querySelectorAll('.marketplace-rating-star').forEach(star=>star.addEventListener('click',()=>{
      const val=Number(star.dataset.value); row.querySelector('input').value=String(val);
      row.querySelectorAll('.marketplace-rating-star').forEach((s,i)=>s.classList.toggle('activa',i<val));
    }));
  });
  modal.querySelector('#marketplace-rating-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const form=e.currentTarget;
    const vals={};
    for(const [key] of criterios) vals[key]=Number(form.elements[key].value||0);
    if(Object.values(vals).some(v=>v<1)){ alert('Califica los 5 criterios'); return; }
    const btn=form.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent='Guardando...';
    try{
      await _guardarValoracion({...vals, comentario: modal.querySelector('#marketplace-rating-comentario').value.trim() || null});
      cerrar();
      await _cargarDatos();
      _renderContenido();
    }catch(err){ console.error(err); alert(`No se pudo guardar la valoración: ${err.message}`); btn.disabled=false; btn.textContent='Guardar valoración'; }
  });
}

async function _guardarValoracion({atencion,amabilidad,rapidez,cumplimiento,experiencia,comentario}) {
  const uid=usuarioActual()?.id;
  if(!uid) throw new Error('No hay sesión activa');
  const promedio=(atencion+amabilidad+rapidez+cumplimiento+experiencia)/5;
  const payload={atencion,amabilidad,rapidez,cumplimiento,experiencia,promedio,comentario};
  if(_miValoracion?.id){
    const {error}=await supabase.from('marketplace_valoraciones').update(payload).eq('id',_miValoracion.id); if(error) throw error;
  }else{
    const {error}=await supabase.from('marketplace_valoraciones').insert({
      ...payload, emprendedor_id:_emprendedorId, autor_id:uid, conversacion_id:crypto.randomUUID(),
    }); if(error) throw error;
  }
  const {data:vals,error:err}=await supabase.from('marketplace_valoraciones').select('promedio').eq('emprendedor_id',_emprendedorId);
  if(err) throw err;
  const total=(vals||[]).length;
  const promedioGeneral=total?(vals.reduce((a,v)=>a+Number(v.promedio||0),0)/total):0;
  const {error:upErr}=await supabase.from('emprendedores').update({calificacion_promedio:promedioGeneral,total_valoraciones:total}).eq('id',_emprendedorId);
  if(upErr) throw upErr;
}

function _mostrarError(mensaje) {
  _contenedor.innerHTML = `
    <div class="marketplace-error">
      <p>${_escapeHtml(mensaje)}</p>
      <button type="button" id="btn-cerrar-error" class="marketplace-btn-principal">Cerrar</button>
    </div>
  `;

  _contenedor.querySelector('#btn-cerrar-error')?.addEventListener('click', () => {
    if (_onCerrar) _onCerrar();
  });
}

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────
function _formatearTiempo(fecha) {
  const d = new Date(fecha);
  const ahora = new Date();
  const diff = ahora - d;

  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'Hace poco';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;

  return d.toLocaleDateString('es-MX');
}


