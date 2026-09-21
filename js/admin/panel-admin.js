// ═════════════════════════════════════════════════════════════════
// panel-admin.js — Panel de administración web de Comunidad ITVH
// Paridad funcional con PanelAdmin de la app móvil + reportes globales web.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../core/supabase-client.js';
import { usuarioActual } from '../core/auth.js';
import { eliminarDeR2 } from '../core/storage-r2.js';
import { BUCKETS, DOMINIOS } from '../core/r2-config.js';
import { auditoriaDisponible, registrarAuditoria, listarAuditoria } from './admin-audit.js';
import { ejecutarAccionAdmin } from './admin-actions-service.js';

let _root = null;
let _tab = 'dashboard';
let _adminRow = null;
let _usuarios = [];
let _adminIds = new Set();
let _marketPubs = [];
let _emprendedores = [];
let _reportesSocial = [];
let _reportesGenericos = [];
let _filtroUsuarios = 'todos';
let _filtroReportes = 'pendiente';
let _subtabMarket = 'publicaciones';
let _busquedaUsuarios = '';
let _busquedaMarket = '';
let _busquedaTimer = null;

const ACCENT = '#007AFF';
const EMOJIS = ['🏆','⭐','💡','🚀','🎯','🏅','🔥','👑','💎','🌟','🎖️','🤝','📚','🛠️','🎨','💪','🌱','⚡','🏗️','🎤'];

const NIVEL_RANGO = Object.freeze({ moderador: 1, admin: 2 });

function _nivelActual() {
  return String(_adminRow?.nivel || '').toLowerCase();
}

function _tieneNivel(minimo = 'moderador') {
  return (NIVEL_RANGO[_nivelActual()] || 0) >= (NIVEL_RANGO[minimo] || 999);
}


async function _revalidarNivel(minimo = 'moderador', accion = 'realizar esta acción') {
  const uid = usuarioActual()?.id;
  if (!uid) {
    _toast('Tu sesión ya no está disponible. Inicia sesión nuevamente.', 'error');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('tabla_admins')
      .select('id,nivel,perfil_id')
      .eq('perfil_id', uid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      _adminRow = null;
      _toast('Tu acceso administrativo fue revocado.', 'error');
      return false;
    }

    _adminRow = data;
    if (!_tieneNivel(minimo)) {
      _toast(`No tienes permisos suficientes para ${accion}.`, 'error');
      return false;
    }
    return true;
  } catch (e) {
    console.error('panel-admin – revalidar permisos:', e);
    _toast('No se pudieron verificar tus permisos. La acción fue cancelada.', 'error');
    return false;
  }
}

function _esUsuarioActual(id) {
  return Boolean(id && id === usuarioActual()?.id);
}

// `reportes_contenido` es opcional hasta ejecutar la migración SQL.
// El servicio de reportes marca esta bandera cuando logra guardar un
// reporte global; así el panel no dispara 404 continuamente si la tabla
// todavía no existe en Supabase.
function _reportesGlobalesHabilitados(){
  try { return localStorage.getItem('reportes_globales_sql_ok') === '1'; } catch { return false; }
}

async function _detectarReportesGlobales() {
  try {
    const { error } = await supabase
      .from('reportes_contenido')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    try { localStorage.setItem('reportes_globales_sql_ok', '1'); } catch {}
    return true;
  } catch (e) {
    const msg = String(e?.message || '');
    const code = String(e?.code || '');
    const noDisponible = code === '42P01' || code === '42501' ||
      /does not exist|schema cache|permission denied|row-level security/i.test(msg);

    if (!noDisponible) console.warn('panel-admin – detectar reportes globales:', e);
    try { localStorage.setItem('reportes_globales_sql_ok', '0'); } catch {}
    return false;
  }
}

export async function render(contenedor) {
  _root = contenedor;
  _inyectarCss();
  _root.innerHTML = `<div class="admin-cargando"><div class="admin-spinner"></div><p>Verificando permisos…</p></div>`;

  const uid = usuarioActual()?.id;
  if (!uid) return _accesoDenegado('No hay una sesión activa.');

  try {
    const { data, error } = await supabase
      .from('tabla_admins')
      .select('id, nivel, perfil_id')
      .eq('perfil_id', uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return _accesoDenegado('No tienes permisos de administrador para acceder a este panel.');
    _adminRow = data;
    await _detectarReportesGlobales();
  } catch (e) {
    console.error('panel-admin – verificar:', e);
    return _accesoDenegado('No se pudo verificar tu acceso de administrador.');
  }

  _pintarShell();
  await _cambiarTab('dashboard');
}

function _inyectarCss() {
  if (document.getElementById('admin-web-css')) return;
  const link = document.createElement('link');
  link.id = 'admin-web-css';
  link.rel = 'stylesheet';
  link.href = 'css/admin.css';
  document.head.appendChild(link);
}

function _accesoDenegado(msg) {
  if (!_root) return;
  _root.innerHTML = `<section class="admin-denegado"><div class="admin-denegado-icon">🔒</div><h2>Acceso restringido</h2><p>${_html(msg)}</p></section>`;
}

function _pintarShell() {
  _root.innerHTML = `
    <section class="admin-root">
      <header class="admin-header">
        <div class="admin-title-wrap">
          <span class="admin-role">🛡️ ${_html(_adminRow?.nivel || 'Admin')}</span>
          <div><h1>Panel de Control</h1><p>Comunidad ITVH</p></div>
        </div>
        <button type="button" class="admin-refresh" id="admin-refrescar" title="Actualizar">↻</button>
      </header>
      <nav class="admin-tabs ${_tieneNivel('admin') ? 'con-auditoria' : ''}" aria-label="Secciones del panel">
        ${_tabBtn('dashboard','▦','Dashboard')}
        ${_tabBtn('usuarios','👥','Usuarios')}
        ${_tabBtn('marketplace','🏪','Marketplace')}
        ${_tabBtn('reportes','⚑','Reportes', true)}
        ${_tieneNivel('admin') ? _tabBtn('auditoria','🧾','Auditoría') : ''}
      </nav>
      <main class="admin-body" id="admin-body"></main>
    </section>`;

  _root.querySelectorAll('[data-admin-tab]').forEach((btn) => btn.addEventListener('click', () => _cambiarTab(btn.dataset.adminTab)));
  _root.querySelector('#admin-refrescar').addEventListener('click', () => _cambiarTab(_tab, true));
}

function _tabBtn(id, icono, label, badge = false) {
  return `<button type="button" class="admin-tab" data-admin-tab="${id}"><span>${icono}</span><small>${label}</small>${badge ? '<b id="admin-badge-reportes" hidden>0</b>' : ''}</button>`;
}

async function _cambiarTab(tab, force = false) {
  _tab = tab;
  _root?.querySelectorAll('[data-admin-tab]').forEach((b) => b.classList.toggle('activo', b.dataset.adminTab === tab));
  const body = _root?.querySelector('#admin-body');
  if (!body) return;
  body.innerHTML = `<div class="admin-cargando"><div class="admin-spinner"></div></div>`;
  try {
    if (tab === 'dashboard') await _dashboard(body);
    else if (tab === 'usuarios') await _usuariosTab(body, force);
    else if (tab === 'marketplace') await _marketplaceTab(body, force);
    else if (tab === 'reportes') await _reportesTab(body, force);
    else if (tab === 'auditoria') await _auditoriaTab(body);
  } catch (e) {
    console.error('panel-admin – tab:', tab, e);
    body.innerHTML = _errorBox(e);
  }
}

// ═════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════
async function _dashboard(body) {
  const [activos, pubs, repSocial, emp, suspendidos, expulsados, repGen] = await Promise.all([
    _count('perfiles', (q) => q.eq('estado_cuenta','activo')),
    _count('marketplace_publicaciones', (q) => q.eq('esta_activa', true)),
    _count('reportes', (q) => q.eq('estado','pendiente')),
    _count('emprendedores', (q) => q.eq('estado','pendiente')),
    _count('perfiles', (q) => q.eq('estado_cuenta','suspendido')),
    _count('perfiles', (q) => q.eq('estado_cuenta','expulsado')),
    _reportesGlobalesHabilitados() ? _countSeguro('reportes_contenido', (q) => q.eq('estado','pendiente')) : Promise.resolve(0),
  ]);
  const totalReportes = repSocial + repGen;
  _setBadgeReportes(totalReportes);

  body.innerHTML = `
    <div class="admin-section-head"><div><h2>Resumen</h2><p>Estado general de la comunidad.</p></div></div>
    <div class="admin-metric-grid">
      ${_metric('👥','Usuarios activos', activos, '#34C759','usuarios')}
      ${_metric('🛍️','Publicaciones activas', pubs, '#007AFF','marketplace')}
      ${_metric('🚩','Reportes pendientes', totalReportes, '#FF9500','reportes', totalReportes > 0)}
      ${_metric('🏪','Emprendedores pendientes', emp, '#AF52DE','marketplace', emp > 0)}
      ${_metric('🔒','Cuentas suspendidas', suspendidos, '#FF9500','usuarios', suspendidos > 0)}
      ${_metric('⛔','Cuentas expulsadas', expulsados, '#FF3B30','usuarios', expulsados > 0)}
    </div>
    <h3 class="admin-subtitle">Accesos rápidos</h3>
    <div class="admin-quick-grid">
      ${_quick('👥','Gestionar usuarios','Estados, roles e insignias','usuarios')}
      ${_quick('🏪','Revisar Marketplace','Publicaciones y emprendedores','marketplace')}
      ${_quick('🚩','Moderar reportes', totalReportes ? `${totalReportes} requieren atención` : 'Sin pendientes','reportes')}
    </div>`;

  body.querySelectorAll('[data-ir-tab]').forEach((el) => el.addEventListener('click', () => _cambiarTab(el.dataset.irTab)));
}

function _metric(emoji, label, valor, color, tab, alerta = false) {
  return `<button class="admin-metric ${alerta ? 'alerta' : ''}" style="--metric:${color}" data-ir-tab="${tab}"><span>${emoji}</span><strong>${valor}</strong><small>${label}</small></button>`;
}
function _quick(emoji, titulo, sub, tab) {
  return `<button class="admin-quick" data-ir-tab="${tab}"><span>${emoji}</span><div><strong>${titulo}</strong><small>${sub}</small></div><i>›</i></button>`;
}
async function _count(tabla, aplicar) {
  let q = supabase.from(tabla).select('id', { count: 'exact', head: true });
  q = aplicar ? aplicar(q) : q;
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}
async function _countSeguro(tabla, aplicar) {
  try { return await _count(tabla, aplicar); } catch { return 0; }
}
function _setBadgeReportes(n) {
  const b = _root?.querySelector('#admin-badge-reportes');
  if (!b) return;
  b.hidden = n <= 0;
  b.textContent = String(n);
}

// ═════════════════════════════════════════════════════════════════
// AUDITORÍA ADMINISTRATIVA
// ═════════════════════════════════════════════════════════════════
async function _auditoriaTab(body) {
  if (!await _revalidarNivel('admin', 'consultar la auditoría administrativa')) {
    body.innerHTML = _vacio('🔒', 'No tienes permisos para consultar la auditoría administrativa.');
    return;
  }

  body.innerHTML = `
    <div class="admin-section-head">
      <div><h2>Auditoría administrativa</h2><p>Historial inmutable de acciones sensibles realizadas desde el panel web.</p></div>
      <button class="admin-btn secundario" id="admin-auditoria-refrescar">↻ Actualizar</button>
    </div>
    <div id="admin-auditoria-lista" class="admin-lista"><div class="admin-cargando"><div class="admin-spinner"></div></div></div>`;

  body.querySelector('#admin-auditoria-refrescar')?.addEventListener('click', () => _cargarAuditoria(body, true));
  await _cargarAuditoria(body, false);
}

async function _cargarAuditoria(body, refrescar = false) {
  const lista = body.querySelector('#admin-auditoria-lista');
  if (!lista) return;
  lista.innerHTML = `<div class="admin-cargando"><div class="admin-spinner"></div></div>`;

  try {
    const disponible = await auditoriaDisponible({ refrescar });
    if (!disponible) {
      lista.innerHTML = `<div class="admin-error"><strong>Auditoría aún no habilitada</strong><p>Ejecuta <code>supabase/2026-09-13_auditoria_admin.sql</code> en Supabase. La tabla es nueva y no modifica datos usados por la app móvil.</p></div>`;
      return;
    }

    const rows = await listarAuditoria({ limite: 150 });
    if (!rows.length) {
      lista.innerHTML = _vacio('🧾', 'Todavía no hay acciones administrativas registradas.');
      return;
    }

    const ids = [...new Set(rows.map((r) => r.admin_perfil_id).filter(Boolean))];
    const nombres = new Map();
    if (ids.length) {
      const { data: perfiles, error } = await supabase
        .from('perfiles')
        .select('id,nombre,nombre_usuario')
        .in('id', ids);
      if (!error) (perfiles || []).forEach((p) => nombres.set(p.id, p));
    }

    lista.innerHTML = rows.map((r) => {
      const actor = nombres.get(r.admin_perfil_id);
      const actorTxt = actor?.nombre_usuario ? `@${actor.nombre_usuario}` : (actor?.nombre || `${String(r.admin_perfil_id || '').slice(0, 8)}…`);
      const meta = r.metadata && Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : '';
      return `<article class="admin-card admin-audit-row">
        <div class="admin-audit-head"><strong>${_html(_accionAuditoriaLabel(r.accion))}</strong><span class="admin-chip azul">${_html(r.admin_nivel || 'admin')}</span></div>
        <p><b>${_html(actorTxt)}</b>${r.objetivo_tipo ? ` · ${_html(r.objetivo_tipo)}` : ''}${r.objetivo_id ? ` · <code>${_html(String(r.objetivo_id).slice(0, 36))}</code>` : ''}</p>
        ${r.motivo ? `<p class="muted">${_html(r.motivo)}</p>` : ''}
        ${meta ? `<details><summary>Detalles</summary><pre class="admin-pre">${_html(meta)}</pre></details>` : ''}
        <small>${_html(_fechaHora(r.creado_en))}</small>
      </article>`;
    }).join('');
  } catch (e) {
    lista.innerHTML = _errorBox(e);
  }
}

function _accionAuditoriaLabel(a) {
  return {
    usuario_estado_cambiado: 'Estado de usuario modificado',
    admin_asignado: 'Acceso administrativo asignado',
    admin_revocado: 'Acceso administrativo revocado',
    insignia_asignada: 'Insignia asignada',
    insignia_eliminada: 'Insignia eliminada',
    marketplace_publicacion_eliminada: 'Publicación de Marketplace eliminada',
    emprendedor_estado_cambiado: 'Estado de emprendedor modificado',
    reporte_resuelto: 'Reporte actualizado',
    autor_reporte_suspendido: 'Autor reportado suspendido',
    contenido_reportado_eliminado: 'Contenido reportado eliminado',
  }[a] || _cap(a || 'Acción administrativa');
}

// ═════════════════════════════════════════════════════════════════
// USUARIOS
// ═════════════════════════════════════════════════════════════════
async function _usuariosTab(body) {
  body.innerHTML = `
    <div class="admin-section-head"><div><h2>Usuarios</h2><p>Gestiona cuentas, roles e insignias.</p></div><button class="admin-btn secundario" id="admin-ver-insignias">🏅 Ver insignias</button></div>
    <div class="admin-toolbar">
      <label class="admin-search"><span>⌕</span><input id="admin-buscar-usuario" value="${_attr(_busquedaUsuarios)}" placeholder="Buscar por nombre, @usuario o UUID"></label>
      <div class="admin-chips" id="admin-filtros-usuarios">
        ${['todos','activo','suspendido','expulsado'].map((x)=>`<button data-estado="${x}" class="${_filtroUsuarios===x?'activo':''}">${_cap(x)}</button>`).join('')}
      </div>
    </div>
    <div id="admin-lista-usuarios" class="admin-lista"></div>`;

  body.querySelector('#admin-buscar-usuario').addEventListener('input', (e) => {
    clearTimeout(_busquedaTimer); _busquedaUsuarios = e.target.value.trim();
    _busquedaTimer = setTimeout(() => _cargarUsuarios(body), 280);
  });
  body.querySelectorAll('#admin-filtros-usuarios [data-estado]').forEach((b)=>b.addEventListener('click', async()=>{
    _filtroUsuarios=b.dataset.estado;
    body.querySelectorAll('#admin-filtros-usuarios button').forEach((x)=>x.classList.toggle('activo',x===b));
    await _cargarUsuarios(body);
  }));
  body.querySelector('#admin-ver-insignias').addEventListener('click', _verInsignias);
  await _cargarUsuarios(body);
}

async function _cargarUsuarios(body) {
  const lista = body.querySelector('#admin-lista-usuarios');
  if (!lista) return;
  lista.innerHTML = `<div class="admin-cargando"><div class="admin-spinner"></div></div>`;
  try {
    let q = supabase.from('perfiles').select('id,nombre,nombre_usuario,cdn_foto_perfil,creado_en,estado_cuenta,carrera').order('creado_en',{ascending:false}).limit(80);
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(_busquedaUsuarios);
    if (esUuid) q=q.eq('id',_busquedaUsuarios);
    else if (_busquedaUsuarios) q=q.or(`nombre.ilike.%${_limpiarFiltro(_busquedaUsuarios)}%,nombre_usuario.ilike.%${_limpiarFiltro(_busquedaUsuarios)}%`);
    if (_filtroUsuarios !== 'todos') q=q.eq('estado_cuenta',_filtroUsuarios);
    const { data, error } = await q; if (error) throw error;
    _usuarios = data || [];
    _adminIds = new Set();
    if (_usuarios.length) {
      const { data: admins, error: adminsError } = await supabase
        .from('tabla_admins')
        .select('perfil_id,nivel')
        .in('perfil_id', _usuarios.map(u=>u.id));
      if (adminsError) throw adminsError;
      (admins||[]).forEach((a) => {
        _adminIds.add(a.perfil_id);
      });
    }
    _pintarUsuarios(lista);
  } catch (e) { lista.innerHTML = _errorBox(e); }
}

function _pintarUsuarios(lista) {
  if (!_usuarios.length) { lista.innerHTML = _vacio('👥','No se encontraron usuarios.'); return; }
  lista.innerHTML = _usuarios.map((u)=>{
    const estado=u.estado_cuenta||'activo', esAdmin=_adminIds.has(u.id), inicial=(u.nombre||'?')[0].toUpperCase();
    return `<article class="admin-card admin-user" data-id="${u.id}">
      <div class="admin-avatar">${u.cdn_foto_perfil?`<img src="${_attr(u.cdn_foto_perfil)}" alt="">`:_html(inicial)}</div>
      <div class="admin-user-info"><div class="admin-user-title"><strong>${_html(u.nombre||'Usuario')}</strong>${esAdmin?'<span class="admin-chip azul">Admin</span>':''}<span class="admin-chip ${estado}">${_cap(estado)}</span></div><small>@${_html(u.nombre_usuario||'sin_usuario')}</small><p>${_html(u.carrera||'Sin carrera')} · ${_fecha(u.creado_en)}</p></div>
      <button class="admin-kebab" data-accion="menu" title="Acciones">•••</button>
    </article>`;
  }).join('');
  lista.querySelectorAll('.admin-user').forEach((card)=>{
    const u=_usuarios.find(x=>x.id===card.dataset.id);
    card.querySelector('[data-accion="menu"]').addEventListener('click',(e)=>_menuUsuario(e.currentTarget,u));
    card.querySelector('.admin-user-info').addEventListener('click',()=>_abrirPerfil(u.id));
  });
}

function _menuUsuario(ancla, u) {
  _cerrarMenus();
  const estado=u.estado_cuenta||'activo', esAdmin=_adminIds.has(u.id), esYo=_esUsuarioActual(u.id);
  const puedeGestionarAdmins=_tieneNivel('admin');
  const objetivoAdminProtegido=esAdmin && !_tieneNivel('admin');
  const puedeGestionarEstado=_tieneNivel('moderador') && !esYo && !objetivoAdminProtegido;
  const menu=document.createElement('div'); menu.className='admin-popover';
  menu.innerHTML=`
    <button data-a="perfil">👤 Ver perfil</button>
    <button data-a="insignia" ${_tieneNivel('admin')?'':'disabled'}>🏅 Asignar insignia</button>
    ${esAdmin?`<button data-a="quitar-admin" ${(!puedeGestionarAdmins||esYo)?'disabled':''}>🛡️ Quitar admin</button>`:`<button data-a="hacer-admin" ${puedeGestionarAdmins?'':'disabled'}>🛡️ Hacer admin</button>`}
    ${estado==='activo'?`<button data-a="suspender" ${puedeGestionarEstado?'':'disabled'}>🔒 Suspender</button><button class="danger" data-a="expulsar" ${(_tieneNivel('admin')&&!esYo)?'':'disabled'}>⛔ Expulsar</button>`:`<button data-a="reactivar" ${puedeGestionarEstado?'':'disabled'}>✅ Reactivar</button>`}`;
  document.body.appendChild(menu); _posicionar(menu,ancla);
  menu.addEventListener('click', async(e)=>{
    const a=e.target.closest('button')?.dataset.a; if(!a)return; menu.remove();
    if(a==='perfil') return _abrirPerfil(u.id);
    if(a==='insignia') return _asignarInsignia(u);
    if(a==='hacer-admin') return _hacerAdmin(u);
    if(a==='quitar-admin') return _quitarAdmin(u);
    if(a==='suspender') return _cambiarEstadoUsuario(u,'suspendido');
    if(a==='expulsar') return _cambiarEstadoUsuario(u,'expulsado');
    if(a==='reactivar') return _cambiarEstadoUsuario(u,'activo');
  });
  _cerrarFuera(menu, ancla);
}

async function _cambiarEstadoUsuario(u, nuevo) {
  const txt = nuevo==='suspendido'?'Suspender':nuevo==='expulsado'?'Expulsar':'Reactivar';
  if (_esUsuarioActual(u.id)) return _toast('No puedes cambiar el estado de tu propia cuenta desde el panel.', 'error');
  const minimo = nuevo === 'expulsado' ? 'admin' : 'moderador';
  if (!await _revalidarNivel(minimo, `${txt.toLowerCase()} usuarios`)) return;

  const { data: objetivoAdmin, error: objetivoError } = await supabase
    .from('tabla_admins')
    .select('nivel')
    .eq('perfil_id', u.id)
    .maybeSingle();
  if (objetivoError) return _toast('No se pudo verificar el nivel del usuario. Acción cancelada.', 'error');
  if (objetivoAdmin && !_tieneNivel('admin')) {
    return _toast('Un moderador no puede cambiar el estado de una cuenta administrativa.', 'error');
  }

  let motivo = nuevo === 'activo' ? 'Reactivación manual desde el panel.' : '';
  if (nuevo !== 'activo') {
    const entrada = prompt(`Motivo para ${txt.toLowerCase()} a ${u.nombre || 'este usuario'}:`);
    if (entrada === null) return;
    motivo = entrada.trim();
    if (!motivo) return _toast('Debes indicar un motivo para esta acción.', 'error');
  }

  if (!confirm(`¿${txt} a ${u.nombre || 'este usuario'}?`)) return;
  const estadoAnterior = u.estado_cuenta || 'activo';
  const backend = await ejecutarAccionAdmin('cambiar_estado_usuario', { perfil_id: u.id, estado: nuevo, motivo });
  if (backend.usadoBackend) {
    if (backend.error) return _toast(backend.error.message || 'No se pudo ejecutar la acción.', 'error');
  } else {
    const { error } = await supabase.from('perfiles').update({estado_cuenta:nuevo}).eq('id',u.id);
    if(error) return _toast(error.message,'error');
    await registrarAuditoria({
      accion: 'usuario_estado_cambiado',
      objetivoTipo: 'perfil',
      objetivoId: u.id,
      motivo,
      metadata: { estado_anterior: estadoAnterior, estado_nuevo: nuevo, nombre_usuario: u.nombre_usuario || null },
    });
  }
  _toast(`${txt} exitoso.`,'ok');
  await _cargarUsuarios(_root.querySelector('#admin-body'));
}

async function _hacerAdmin(u) {
  if (!await _revalidarNivel('admin', 'asignar administradores')) return;
  if (_esUsuarioActual(u.id)) return _toast('Tu propio nivel administrativo no se modifica desde este menú.', 'error');
  const nivel = await _modalSeleccion('Dar acceso administrativo', `Selecciona el nivel para ${u.nombre||'el usuario'}.`, [
    {value:'moderador',label:'Moderador'},{value:'admin',label:'Admin'}
  ]);
  if(!nivel)return;
  const backend = await ejecutarAccionAdmin('asignar_admin', { perfil_id:u.id, nivel });
  if (backend.usadoBackend) {
    if (backend.error) return _toast(backend.error.message || 'No se pudo asignar el acceso administrativo.', 'error');
  } else {
    const { error }=await supabase.from('tabla_admins').insert({perfil_id:u.id,nivel});
    if(error)return _toast(error.message,'error');
    await registrarAuditoria({ accion:'admin_asignado', objetivoTipo:'perfil', objetivoId:u.id, motivo:'Asignación manual desde el panel.', metadata:{ nivel, nombre_usuario:u.nombre_usuario||null } });
  }
  _toast(`${u.nombre||'Usuario'} ahora es ${nivel}.`,'ok');
  await _cargarUsuarios(_root.querySelector('#admin-body'));
}
async function _quitarAdmin(u) {
  if (!await _revalidarNivel('admin', 'revocar administradores')) return;
  if (_esUsuarioActual(u.id)) return _toast('No puedes quitarte tus propios permisos administrativos.', 'error');
  if(!confirm(`¿Quitar acceso administrativo a ${u.nombre||'este usuario'}?`))return;
  const nivelPrevio = [..._adminIds].includes(u.id) ? 'administrativo' : null;
  const backend = await ejecutarAccionAdmin('revocar_admin', { perfil_id:u.id });
  if (backend.usadoBackend) {
    if (backend.error) return _toast(backend.error.message || 'No se pudo revocar el acceso administrativo.', 'error');
  } else {
    const { error }=await supabase.from('tabla_admins').delete().eq('perfil_id',u.id);
    if(error)return _toast(error.message,'error');
    await registrarAuditoria({ accion:'admin_revocado', objetivoTipo:'perfil', objetivoId:u.id, motivo:'Revocación manual desde el panel.', metadata:{ nivel_previo:nivelPrevio, nombre_usuario:u.nombre_usuario||null } });
  }
  _toast('Acceso de administrador revocado.','ok');
  await _cargarUsuarios(_root.querySelector('#admin-body'));
}

async function _asignarInsignia(u) {
  if (!await _revalidarNivel('admin', 'asignar insignias')) return;
  const html=`<div class="admin-insignia-fijas"><button data-tipo="✅ Emprendedor verificado">✅ Emprendedor verificado</button><button data-tipo="🎓 Estudiante verificado">🎓 Estudiante verificado</button></div>
  <h4>Personalizada</h4><div class="admin-emoji-grid">${EMOJIS.map((e,i)=>`<button data-emoji="${_attr(e)}" class="${i===0?'activo':''}">${e}</button>`).join('')}</div><input id="admin-insignia-texto" class="admin-input" placeholder="Nombre de la insignia…">`;
  const modal=_modalBase(`Asignar insignia a ${u.nombre||'usuario'}`,html,'Asignar');
  let elegido=null, emoji=EMOJIS[0];
  modal.box.querySelectorAll('[data-tipo]').forEach(b=>b.addEventListener('click',()=>{elegido=b.dataset.tipo; modal.box.querySelectorAll('[data-tipo]').forEach(x=>x.classList.toggle('activo',x===b));}));
  modal.box.querySelectorAll('[data-emoji]').forEach(b=>b.addEventListener('click',()=>{emoji=b.dataset.emoji; modal.box.querySelectorAll('[data-emoji]').forEach(x=>x.classList.toggle('activo',x===b));}));
  modal.confirm.addEventListener('click',async()=>{
    const texto=modal.box.querySelector('#admin-insignia-texto').value.trim(); const tipo=texto?`${emoji} ${texto}`:elegido;
    if(!tipo)return _toast('Selecciona o escribe una insignia.','error');
    const backend = await ejecutarAccionAdmin('asignar_insignia', { perfil_id:u.id, tipo });
    if (backend.usadoBackend) {
      if (backend.error) return _toast(backend.error.message || 'No se pudo asignar la insignia.', 'error');
    } else {
      const { data: adm,error:e1 }=await supabase.from('tabla_admins').select('id').eq('perfil_id',usuarioActual().id).single(); if(e1)return _toast(e1.message,'error');
      const { error }=await supabase.from('insignias').insert({perfil_id:u.id,tipo,otorgada_por:adm.id}); if(error)return _toast(error.message,'error');
      await registrarAuditoria({ accion:'insignia_asignada', objetivoTipo:'perfil', objetivoId:u.id, motivo:'Asignación manual de insignia.', metadata:{ tipo } });
    }
    modal.close(); _toast(`Insignia asignada a ${u.nombre||'usuario'}.`,'ok');
  });
}

async function _verInsignias() {
  const m=_modalBase('Perfiles con insignias','<div class="admin-cargando"><div class="admin-spinner"></div></div>',null,true);
  try{
    const {data,error}=await supabase.from('insignias').select('id,tipo,otorgada_en,perfil_id,perfiles!insignias_perfil_id_fkey(id,nombre,nombre_usuario,cdn_foto_perfil)').order('otorgada_en',{ascending:false}).limit(150); if(error)throw error;
    const content=m.box.querySelector('.admin-modal-content');
    content.innerHTML=(data||[]).length?(data||[]).map(i=>`<div class="admin-insignia-row" data-id="${_attr(i.id)}"><span>${_html(i.tipo||'🏅')}</span><div><strong>${_html(i.perfiles?.nombre||'Usuario')}</strong><small>@${_html(i.perfiles?.nombre_usuario||'')}${i.otorgada_en?` · ${_fecha(i.otorgada_en)}`:''}</small></div><button class="danger" title="Quitar">✕</button></div>`).join(''):_vacio('🏅','Sin insignias asignadas.');
    content.querySelectorAll('.admin-insignia-row').forEach(r=>r.querySelector('button').addEventListener('click',async()=>{
      if(!await _revalidarNivel('admin','quitar insignias'))return;
      if(!confirm('¿Quitar esta insignia?'))return;
      const insignia=(data||[]).find((x)=>String(x.id)===String(r.dataset.id));
      const backend = await ejecutarAccionAdmin('eliminar_insignia', { insignia_id:r.dataset.id });
      if (backend.usadoBackend) {
        if (backend.error) return _toast(backend.error.message || 'No se pudo eliminar la insignia.', 'error');
      } else {
        const {error}=await supabase.from('insignias').delete().eq('id',r.dataset.id);
        if(error)return _toast(error.message,'error');
        await registrarAuditoria({ accion:'insignia_eliminada', objetivoTipo:'insignia', objetivoId:r.dataset.id, motivo:'Eliminación manual de insignia.', metadata:{ perfil_id:insignia?.perfil_id||null, tipo:insignia?.tipo||null } });
      }
      r.remove();
      if(!content.querySelector('.admin-insignia-row')) content.innerHTML=_vacio('🏅','Sin insignias asignadas.');
      _toast('Insignia eliminada.','ok');
    }));
  }catch(e){m.box.querySelector('.admin-modal-content').innerHTML=_errorBox(e);}
}

async function _abrirPerfil(id){ try{const {abrirPerfil}=await import('../features/perfil/mi-perfil.js'); abrirPerfil(id);}catch(e){_toast(e.message,'error');} }

// ═════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═════════════════════════════════════════════════════════════════
async function _marketplaceTab(body) {
  body.innerHTML=`
    <div class="admin-section-head"><div><h2>Marketplace</h2><p>Modera publicaciones y emprendedores.</p></div></div>
    <div class="admin-subtabs"><button data-sub="publicaciones" class="${_subtabMarket==='publicaciones'?'activo':''}">Publicaciones</button><button data-sub="emprendedores" class="${_subtabMarket==='emprendedores'?'activo':''}">Emprendedores</button></div>
    <div class="admin-toolbar"><label class="admin-search"><span>⌕</span><input id="admin-buscar-market" value="${_attr(_busquedaMarket)}" placeholder="Buscar…"></label></div>
    <div id="admin-market-lista" class="admin-lista"></div>`;
  body.querySelectorAll('[data-sub]').forEach(b=>b.addEventListener('click',async()=>{_subtabMarket=b.dataset.sub; body.querySelectorAll('[data-sub]').forEach(x=>x.classList.toggle('activo',x===b)); await _cargarMarket(body);}));
  body.querySelector('#admin-buscar-market').addEventListener('input',(e)=>{clearTimeout(_busquedaTimer);_busquedaMarket=e.target.value.trim();_busquedaTimer=setTimeout(()=>_cargarMarket(body),250);});
  await _cargarMarket(body);
}
async function _cargarMarket(body){ if(_subtabMarket==='publicaciones')return _cargarPubsMarket(body); return _cargarEmprendedores(body); }

async function _cargarPubsMarket(body){
  const lista=body.querySelector('#admin-market-lista'); lista.innerHTML=`<div class="admin-cargando"><div class="admin-spinner"></div></div>`;
  try{
    let q=supabase.from('marketplace_publicaciones').select('id,titulo,descripcion,precio,esta_activa,creado_en,emprendedor_id,marketplace_imagenes(id,r2_url,r2_path,orden),emprendedores(id,nombre_negocio,perfil_id,perfiles(nombre,nombre_usuario,cdn_foto_perfil))').eq('esta_activa',true).order('creado_en',{ascending:false}).limit(80);
    if(_busquedaMarket)q=q.or(`titulo.ilike.%${_limpiarFiltro(_busquedaMarket)}%,descripcion.ilike.%${_limpiarFiltro(_busquedaMarket)}%`);
    const {data,error}=await q;if(error)throw error;_marketPubs=data||[];
    lista.innerHTML=_marketPubs.length?_marketPubs.map(p=>{const img=[...(p.marketplace_imagenes||[])].sort((a,b)=>(a.orden||0)-(b.orden||0))[0];return `<article class="admin-card admin-market-card" data-id="${p.id}">${img?`<img class="admin-thumb" src="${_attr(img.r2_url||'')}" alt="">`:'<div class="admin-thumb vacio">🛍️</div>'}<div><strong>${_html(p.titulo||'Sin título')}</strong><small>${_moneda(p.precio)} · ${_html(p.emprendedores?.nombre_negocio||'Negocio')}</small><p>${_html((p.descripcion||'').slice(0,160))}</p></div><div class="admin-actions"><button data-a="ver">Ver</button><button class="danger" data-a="eliminar">Eliminar</button></div></article>`;}).join(''):_vacio('🏪','Sin publicaciones activas.');
    lista.querySelectorAll('.admin-market-card').forEach(c=>{const p=_marketPubs.find(x=>x.id===c.dataset.id);c.querySelector('[data-a="ver"]').addEventListener('click',()=>_verPubMarket(p));c.querySelector('[data-a="eliminar"]').addEventListener('click',()=>_eliminarPubMarket(p));});
  }catch(e){lista.innerHTML=_errorBox(e);}
}
async function _verPubMarket(pub){try{const {abrirDetallePublicacion}=await import('../features/marketplace/marketplace-publicacion-detalle.js');abrirDetallePublicacion(pub);}catch(e){_toast(e.message,'error');}}
async function _eliminarPubMarket(pub){
  if(!await _revalidarNivel('moderador','eliminar publicaciones del Marketplace'))return;
  if(!confirm(`¿Eliminar “${pub.titulo||'esta publicación'}”?`))return;
  try{
    for(const img of pub.marketplace_imagenes||[]){if(img.r2_path){try{await eliminarDeR2(BUCKETS.marketplace,img.r2_path);}catch{}}}
    const {error}=await supabase.from('marketplace_publicaciones').delete().eq('id',pub.id);
    if(error)throw error;
    await registrarAuditoria({ accion:'marketplace_publicacion_eliminada', objetivoTipo:'marketplace_publicacion', objetivoId:pub.id, motivo:'Eliminación manual desde moderación.', metadata:{ titulo:pub.titulo||null, emprendedor_id:pub.emprendedor_id||null } });
    _toast('Publicación eliminada.','ok');
    await _cargarPubsMarket(_root.querySelector('#admin-body'));
  }catch(e){_toast(e.message,'error');}
}


async function _cargarEmprendedores(body){
  const lista=body.querySelector('#admin-market-lista');lista.innerHTML=`<div class="admin-cargando"><div class="admin-spinner"></div></div>`;
  try{let q=supabase.from('emprendedores').select('id,nombre_negocio,descripcion,estado,verificado_en,verificado_por,creado_en,perfil_id,perfiles!emprendedores_perfil(nombre,nombre_usuario,cdn_foto_perfil)').order('creado_en',{ascending:false}).limit(100);if(_busquedaMarket)q=q.or(`nombre_negocio.ilike.%${_limpiarFiltro(_busquedaMarket)}%,descripcion.ilike.%${_limpiarFiltro(_busquedaMarket)}%`);const {data,error}=await q;if(error)throw error;_emprendedores=data||[];
    lista.innerHTML=_emprendedores.length?_emprendedores.map(e=>`<article class="admin-card admin-emp" data-id="${e.id}"><div class="admin-avatar">${e.perfiles?.cdn_foto_perfil?`<img src="${_attr(e.perfiles.cdn_foto_perfil)}" alt="">`:_html((e.nombre_negocio||'?')[0])}</div><div class="admin-user-info"><div class="admin-user-title"><strong>${_html(e.nombre_negocio||'Negocio')}</strong><span class="admin-chip ${_attr(e.estado||'pendiente')}">${_cap(e.estado||'pendiente')}</span></div><small>@${_html(e.perfiles?.nombre_usuario||'')}</small><p>${_html(e.descripcion||'')}</p>${e.verificado_por?`<em>Verificado por @${_html(e.verificado_por)} · ${_fecha(e.verificado_en)}</em>`:''}</div><div class="admin-actions">${e.estado!=='verificado'?'<button class="ok" data-a="verificar">Verificar</button>':''}${e.estado!=='suspendido'?'<button class="danger" data-a="suspender">Suspender</button>':''}</div></article>`).join(''):_vacio('🏪','Sin emprendedores.');
    lista.querySelectorAll('.admin-emp').forEach(c=>{const e=_emprendedores.find(x=>x.id===c.dataset.id);c.querySelector('[data-a="verificar"]')?.addEventListener('click',()=>_cambiarEmp(e,'verificado'));c.querySelector('[data-a="suspender"]')?.addEventListener('click',()=>_cambiarEmp(e,'suspendido'));c.querySelector('.admin-user-info').addEventListener('click',()=>e.perfil_id&&_abrirPerfil(e.perfil_id));});
  }catch(e){lista.innerHTML=_errorBox(e);}
}
async function _cambiarEmp(e,estado){
  if(!await _revalidarNivel('moderador','moderar emprendedores'))return;
  if(!confirm(`¿Cambiar “${e.nombre_negocio||'negocio'}” a ${estado}?`))return;
  const estadoAnterior=e.estado||'pendiente';
  const updates={estado};
  if(estado==='verificado'){
    const {data:p}=await supabase.from('perfiles').select('nombre_usuario').eq('id',usuarioActual().id).maybeSingle();
    updates.verificado_en=new Date().toISOString();
    updates.verificado_por=p?.nombre_usuario||'admin';
  }
  const {error}=await supabase.from('emprendedores').update(updates).eq('id',e.id);
  if(error)return _toast(error.message,'error');
  await registrarAuditoria({ accion:'emprendedor_estado_cambiado', objetivoTipo:'emprendedor', objetivoId:e.id, motivo:'Moderación manual de emprendedor.', metadata:{ estado_anterior:estadoAnterior, estado_nuevo:estado, nombre_negocio:e.nombre_negocio||null, perfil_id:e.perfil_id||null } });
  _toast(`Emprendedor ${estado}.`,'ok');
  await _cargarEmprendedores(_root.querySelector('#admin-body'));
}


// ═════════════════════════════════════════════════════════════════
// REPORTES
// ═════════════════════════════════════════════════════════════════
async function _reportesTab(body){
  body.innerHTML=`<div class="admin-section-head"><div><h2>Reportes</h2><p>Moderación de contenido de toda la plataforma.</p></div></div><div class="admin-chips admin-report-filtros">${['pendiente','resuelto','ignorado','todos'].map(x=>`<button data-est="${x}" class="${_filtroReportes===x?'activo':''}">${_cap(x)}</button>`).join('')}</div><div id="admin-lista-reportes" class="admin-lista"></div>`;
  body.querySelectorAll('[data-est]').forEach(b=>b.addEventListener('click',async()=>{_filtroReportes=b.dataset.est;body.querySelectorAll('[data-est]').forEach(x=>x.classList.toggle('activo',x===b));await _cargarReportes(body);}));
  await _cargarReportes(body);
}
async function _cargarReportes(body){
  const lista=body.querySelector('#admin-lista-reportes');lista.innerHTML=`<div class="admin-cargando"><div class="admin-spinner"></div></div>`;
  try{
    let qs=supabase.from('reportes').select('id,motivo,detalle,creado_en,estado,publicacion_id,autor_id,reportado_por,perfiles!reportes_reportado_por_fkey(nombre,nombre_usuario,cdn_foto_perfil)').order('creado_en',{ascending:false}).limit(100);if(_filtroReportes!=='todos')qs=qs.eq('estado',_filtroReportes);const rs=await qs;if(rs.error)throw rs.error;_reportesSocial=(rs.data||[]).map(r=>({...r,__tipo:'publicacion_social'}));
    _reportesGenericos=[];
    if(_reportesGlobalesHabilitados()){
      try{
        let qg=supabase.from('reportes_contenido').select('id,tipo_contenido,contenido_id,reportado_por,autor_id,motivo,detalle,metadata,estado,creado_en,resuelto_por,resuelto_en').order('creado_en',{ascending:false}).limit(120);
        if(_filtroReportes!=='todos')qg=qg.eq('estado',_filtroReportes);
        const rg=await qg;
        if(rg.error)throw rg.error;
        _reportesGenericos=(rg.data||[]).map(r=>({...r,__tipo:'generico'}));
      }catch(e){
        // Si la migración fue retirada/no existe, deja de consultarla para
        // no llenar la consola con 404 en cada cambio de pestaña.
        try{ localStorage.setItem('reportes_globales_sql_ok','0'); }catch{}
      }
    }
    const todos=[..._reportesSocial,..._reportesGenericos].sort((a,b)=>new Date(b.creado_en)-new Date(a.creado_en));
    const pendientes=todos.filter(x=>x.estado==='pendiente').length; if(_filtroReportes==='pendiente')_setBadgeReportes(pendientes);
    lista.innerHTML=todos.length?todos.map(_cardReporte).join(''):_vacio('✅',_filtroReportes==='pendiente'?'¡Sin reportes pendientes!':'Sin reportes aquí.');
    lista.querySelectorAll('.admin-report-card').forEach(c=>{const arr=[..._reportesSocial,..._reportesGenericos];const r=arr.find(x=>x.id===c.dataset.id && x.__tipo===c.dataset.fuente);c.querySelector('[data-a="ver"]')?.addEventListener('click',()=>_verContenidoReporte(r));c.querySelector('[data-a="ignorar"]')?.addEventListener('click',()=>_resolverReporte(r,'ignorado'));c.querySelector('[data-a="resolver"]')?.addEventListener('click',()=>_resolverReporte(r,'resuelto'));c.querySelector('[data-a="suspender"]')?.addEventListener('click',()=>_suspenderAutorReporte(r));c.querySelector('[data-a="eliminar"]')?.addEventListener('click',()=>_eliminarContenidoReporte(r));});
  }catch(e){lista.innerHTML=_errorBox(e);}
}
function _cardReporte(r){
  const social=r.__tipo==='publicacion_social';const estado=r.estado||'pendiente';const tipo=social?'Publicación social':_labelTipo(r.tipo_contenido);const reporter=social?(r.perfiles?.nombre_usuario?`@${r.perfiles.nombre_usuario}`:'Usuario'):`${String(r.reportado_por||'').slice(0,8)}…`;const meta=!social&&r.metadata?Object.values(r.metadata).filter(v=>typeof v==='string'&&v).slice(0,2).join(' · '):'';
  return `<article class="admin-card admin-report-card" data-id="${r.id}" data-fuente="${r.__tipo}"><div class="admin-report-head"><div><span class="admin-report-type">🚩 ${_html(tipo)}</span><strong>${_html(_motivoLabel(r.motivo))}</strong></div><span class="admin-chip ${estado}">${_cap(estado)}</span></div>${r.detalle?`<p>${_html(r.detalle)}</p>`:''}${meta?`<p class="muted">${_html(meta)}</p>`:''}<small>Reportado por ${_html(reporter)} · ${_fecha(r.creado_en)}</small>${estado==='pendiente'?`<div class="admin-actions report"><button data-a="ver">Ver</button><button data-a="ignorar">Ignorar</button>${r.autor_id?'<button class="warn" data-a="suspender">Suspender autor</button>':''}<button class="danger" data-a="eliminar">Eliminar contenido</button><button class="ok" data-a="resolver">Resolver</button></div>`:'<div class="admin-actions report"><button data-a="ver">Ver contenido</button></div>'}</article>`;
}
async function _resolverReporte(r,estado){
  if(!await _revalidarNivel('moderador','resolver reportes'))return;
  if(!confirm(`¿Marcar este reporte como ${estado}?`))return;
  const tabla=r.__tipo==='publicacion_social'?'reportes':'reportes_contenido';
  const update={estado};
  if(tabla==='reportes_contenido'){update.resuelto_por=usuarioActual().id;update.resuelto_en=new Date().toISOString();}
  const backend = await ejecutarAccionAdmin('resolver_reporte', { tabla, reporte_id:r.id, estado });
  if (backend.usadoBackend) {
    if (backend.error) return _toast(backend.error.message || 'No se pudo resolver el reporte.', 'error');
  } else {
    const {error}=await supabase.from(tabla).update(update).eq('id',r.id);
    if(error)return _toast(error.message,'error');
    await registrarAuditoria({ accion:'reporte_resuelto', objetivoTipo:tabla, objetivoId:r.id, motivo:`Reporte marcado como ${estado}.`, metadata:{ estado, motivo_reporte:r.motivo||null, contenido_id:r.contenido_id||r.publicacion_id||null } });
  }
  _toast(`Reporte ${estado}.`,'ok');
  await _cargarReportes(_root.querySelector('#admin-body'));
}

async function _suspenderAutorReporte(r){
  if(!r.autor_id)return;
  if(!await _revalidarNivel('moderador','suspender autores reportados'))return;
  if(_esUsuarioActual(r.autor_id))return _toast('No puedes suspender tu propia cuenta desde un reporte.','error');
  if(!confirm('¿Suspender al autor del contenido reportado?'))return;
  const {error}=await supabase.from('perfiles').update({estado_cuenta:'suspendido'}).eq('id',r.autor_id);
  if(error)return _toast(error.message,'error');
  await _resolverReporteSinConfirmar(r,'resuelto');
  await registrarAuditoria({ accion:'autor_reporte_suspendido', objetivoTipo:'perfil', objetivoId:r.autor_id, motivo:`Suspensión derivada del reporte ${r.id}.`, metadata:{ reporte_id:r.id, motivo_reporte:r.motivo||null, contenido_id:r.contenido_id||r.publicacion_id||null } });
  _toast('Autor suspendido y reporte resuelto.','ok');
}

async function _resolverReporteSinConfirmar(r,estado){const tabla=r.__tipo==='publicacion_social'?'reportes':'reportes_contenido';const up={estado};if(tabla==='reportes_contenido'){up.resuelto_por=usuarioActual().id;up.resuelto_en=new Date().toISOString();}const {error}=await supabase.from(tabla).update(up).eq('id',r.id);if(error)throw error;await _cargarReportes(_root.querySelector('#admin-body'));}

async function _verContenidoReporte(r){
  try{
    if(r.__tipo==='publicacion_social'){const {abrirPublicacionDesdeNotificacion}=await import('../features/social/ver-publicacion-notificacion.js');return abrirPublicacionDesdeNotificacion(r.publicacion_id);}
    if(r.tipo_contenido==='marketplace'){const {data,error}=await supabase.from('marketplace_publicaciones').select('*,marketplace_imagenes(*),emprendedores(*,perfiles(*))').eq('id',r.contenido_id).maybeSingle();if(error)throw error;if(!data)throw new Error('Contenido no disponible.');return _verPubMarket(data);}
    if(r.tipo_contenido==='objeto_perdido'){const {abrirDetalleObjetoPerdido}=await import('../features/chat/cosas-perdidas-screen.js');return abrirDetalleObjetoPerdido(r.contenido_id);}
    if(r.tipo_contenido==='evaluacion_maestro')return _modalTexto('Evaluación reportada',JSON.stringify(r.metadata||{},null,2));
    if(r.autor_id)return _abrirPerfil(r.autor_id);
    _modalTexto('Reporte',JSON.stringify(r.metadata||{},null,2));
  }catch(e){_toast(e.message,'error');}
}

async function _eliminarContenidoReporte(r){
  if(!await _revalidarNivel('moderador','eliminar contenido reportado'))return;
  if(!confirm('¿Eliminar definitivamente el contenido reportado?'))return;
  try{
    const contenidoId=r.publicacion_id||r.contenido_id||null;
    if(r.__tipo==='publicacion_social') await _eliminarPublicacionSocial(r.publicacion_id);
    else if(r.tipo_contenido==='marketplace') await _eliminarMarketplacePorId(r.contenido_id);
    else if(r.tipo_contenido==='objeto_perdido') await _eliminarObjetoPorId(r.contenido_id);
    else if(r.tipo_contenido==='evaluacion_maestro'){const {error}=await supabase.from('evaluaciones').delete().eq('id',r.contenido_id);if(error)throw error;}
    else throw new Error('Este tipo de contenido no tiene borrado automático configurado.');
    await _resolverReporteSinConfirmar(r,'resuelto');
    await registrarAuditoria({ accion:'contenido_reportado_eliminado', objetivoTipo:r.__tipo==='publicacion_social'?'publicacion_social':(r.tipo_contenido||'contenido'), objetivoId:contenidoId, motivo:`Contenido eliminado por el reporte ${r.id}.`, metadata:{ reporte_id:r.id, motivo_reporte:r.motivo||null, autor_id:r.autor_id||null } });
    _toast('Contenido eliminado y reporte resuelto.','ok');
  }catch(e){_toast(e.message,'error');}
}

async function _eliminarPublicacionSocial(id){const {data:medios}=await supabase.from('publicacion_medios').select('cdn_url,url').eq('publicacion_id',id);const {error}=await supabase.from('publicaciones').delete().eq('id',id);if(error)throw error;for(const m of medios||[]){const url=m.cdn_url||m.url;if(url?.startsWith(DOMINIOS.publicaciones)){const path=url.replace(`${DOMINIOS.publicaciones}/`,'');try{await eliminarDeR2(BUCKETS.publicaciones,path);}catch{}}}}
async function _eliminarMarketplacePorId(id){const {data:imgs}=await supabase.from('marketplace_imagenes').select('r2_path').eq('publicacion_id',id);for(const i of imgs||[]){if(i.r2_path)try{await eliminarDeR2(BUCKETS.marketplace,i.r2_path);}catch{}}const {error}=await supabase.from('marketplace_publicaciones').delete().eq('id',id);if(error)throw error;}
async function _eliminarObjetoPorId(id){const {data:o,error:e}=await supabase.from('objetos_perdidos').select('r2_path').eq('id',id).maybeSingle();if(e)throw e;const {error}=await supabase.from('objetos_perdidos').delete().eq('id',id);if(error)throw error;if(o?.r2_path)try{await eliminarDeR2(BUCKETS.cosasPerdidas,o.r2_path);}catch{}}

// ═════════════════════════════════════════════════════════════════
// UI HELPERS
// ═════════════════════════════════════════════════════════════════
function _modalBase(titulo, contenido, confirmText='Aceptar', large=false){
  const ov=document.createElement('div');ov.className='admin-modal-overlay';ov.innerHTML=`<div class="admin-modal ${large?'large':''}"><header><h3>${_html(titulo)}</h3><button data-close>✕</button></header><div class="admin-modal-content">${contenido}</div>${confirmText?`<footer><button class="admin-btn primario" data-confirm>${_html(confirmText)}</button></footer>`:''}</div>`;document.body.appendChild(ov);const box=ov.querySelector('.admin-modal');const close=()=>ov.remove();ov.querySelector('[data-close]').addEventListener('click',close);ov.addEventListener('click',e=>{if(e.target===ov)close();});return{overlay:ov,box,confirm:ov.querySelector('[data-confirm]'),close};
}
function _modalSeleccion(titulo,sub,ops){return new Promise(resolve=>{const m=_modalBase(titulo,`<p>${_html(sub)}</p><div class="admin-choice-list">${ops.map(o=>`<button data-v="${_attr(o.value)}">${_html(o.label)}</button>`).join('')}</div>`,null);m.box.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{resolve(b.dataset.v);m.close();}));m.overlay.addEventListener('click',e=>{if(e.target===m.overlay)resolve(null);},{once:true});});}
function _modalTexto(titulo,texto){_modalBase(titulo,`<pre class="admin-pre">${_html(texto)}</pre>`,null);}
function _cerrarMenus(){document.querySelectorAll('.admin-popover').forEach(x=>x.remove());}
function _posicionar(el,ancla){const r=ancla.getBoundingClientRect();requestAnimationFrame(()=>{const w=el.offsetWidth,h=el.offsetHeight;el.style.left=`${Math.max(8,Math.min(r.right-w,innerWidth-w-8))}px`;el.style.top=`${Math.max(8,Math.min(r.bottom+6,innerHeight-h-8))}px`;});}
function _cerrarFuera(menu,ancla){setTimeout(()=>document.addEventListener('click',function f(e){if(!menu.contains(e.target)&&e.target!==ancla){menu.remove();document.removeEventListener('click',f);}},0));}
function _toast(msg,tipo='ok'){let el=document.querySelector('.admin-toast');if(el)el.remove();el=document.createElement('div');el.className=`admin-toast ${tipo}`;el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),3000);}
function _vacio(icono,msg){return `<div class="admin-empty"><span>${icono}</span><p>${_html(msg)}</p></div>`;}
function _errorBox(e){return `<div class="admin-error"><strong>No se pudo cargar</strong><p>${_html(e?.message||String(e))}</p></div>`;}
function _cap(s){return String(s||'').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());}
function _fecha(s){if(!s)return'';try{return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(s));}catch{return'';}}
function _fechaHora(s){if(!s)return'';try{return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s));}catch{return'';}}
function _moneda(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0));}
function _motivoLabel(m){return {spam:'Spam',acoso_bullying:'Acoso o bullying',contenido_inapropiado:'Contenido inapropiado',desinformacion:'Desinformación',violencia:'Violencia o contenido peligroso',otro:'Otro motivo'}[m]||_cap(m||'Sin motivo');}
function _labelTipo(t){return {marketplace:'Marketplace',objeto_perdido:'Cosas Perdidas',evaluacion_maestro:'Evaluación de maestro',perfil:'Perfil',comentario:'Comentario'}[t]||_cap(t||'Contenido');}
function _limpiarFiltro(s){return String(s||'').replace(/[,%()]/g,' ').trim();}
function _html(s){const d=document.createElement('div');d.textContent=s??'';return d.innerHTML;}
function _attr(s){return _html(s).replace(/"/g,'&quot;');}
