// ═════════════════════════════════════════════════════════════════
// editar-perfil.js
//
// Traducción web de editar_perfil.dart (PerfilScreen). Se abre como
// "pushed screen" (overlay), igual que abrirPerfil() en mi-perfil.js.
//
// Uso desde mi-perfil.js:
//
//   import { abrirEditarPerfil } from './editar-perfil.js';
//   ...
//   root.querySelector('#perfil-editar')?.addEventListener('click', () => {
//     abrirEditarPerfil({ onGuardado: () => _renderPerfil(root, usuarioId, { propio, onVolver }) });
//   });
//
// Flujo (igual que el Dart original):
//   1. Carga el perfil actual desde `perfiles` y guarda un "snapshot"
//      original de cada valor.
//   2. El usuario edita campos; `_hayCambios(estado)` compara contra
//      ese snapshot para mostrar/ocultar el botón "Guardar" y para
//      confirmar antes de cerrar el overlay sin guardar.
//   3. Al guardar: valida, sube la foto nueva a R2 si aplica (mismo
//      path fijo `<uid>/avatar.jpg`, así que sobrescribe sola),
//      borra la foto en R2 solo si se eliminó sin reemplazo, y
//      actualiza la fila en `perfiles`.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';
import { supabase } from '../../core/supabase-client.js';
import { usuarioActual } from '../../core/auth.js';
import { resolverUrlPerfil } from '../../core/url-helper.js';
import { subirFotoPerfil, eliminarDeR2 } from '../../core/storage-r2.js';
import { BUCKETS, DOMINIOS } from '../../core/r2-config.js';

const CARRERAS = [
  'Ingeniería Ambiental',
  'Ingeniería Bioquímica',
  'Ingeniería Civil',
  'Ingeniería en Ciencia de Datos',
  'Ingeniería en Gestión Empresarial',
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería en Tecnologías de la Información y Comunicaciones',
  'Ingeniería Industrial',
  'Ingeniería Informática',
  'Ingeniería Petrolera',
  'Ingeniería Química',
  'Licenciatura en Administración',
];

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1);

// Misma regla que en el registro (crear_cuenta / su equivalente web):
// letras sin acentos/ñ, números, guion bajo y punto. Sin espacios.
// El punto no puede ir al inicio, al final, ni repetirse.
const REGEX_USUARIO = /^(?!\.)(?!.*\.\.)[A-Za-z0-9_.]{3,20}(?<!\.)$/;

// ─────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────
export function abrirEditarPerfil({ onGuardado } = {}) {
  const uid = usuarioActual()?.id;
  if (!uid) return;

  _inyectarEstilos();

  const overlay = document.createElement('div');
  overlay.className = 'pushed-screen editar-perfil-screen';
  document.body.appendChild(overlay);

  _render(overlay, uid, onGuardado);
}

// ─────────────────────────────────────────────────────────────────
// ESTILOS — inyectados desde JS en vez de depender de un <link>
// externo a editar-perfil.css. Así la pantalla nunca se ve "sin
// estilo" solo porque alguien olvidó enlazar la hoja de estilos en
// el HTML/bundle. Se inyecta una sola vez (id fijo evita duplicar
// el <style> si se abre el overlay varias veces en la sesión).
// ─────────────────────────────────────────────────────────────────
let _estilosInyectados = false;
function _inyectarEstilos() {
  if (_estilosInyectados || document.getElementById('ep-estilos')) return;
  _estilosInyectados = true;
  const style = document.createElement('style');
  style.id = 'ep-estilos';
  style.textContent = `
    .editar-perfil-screen { position: fixed; inset: 0; z-index: 60; overflow-y: auto; background: #121212; }
    .editar-perfil-body { max-width: 640px; margin: 0 auto; padding: 0 16px 48px; }
    .ep-guardar-appbar { margin-left: auto; padding: 6px 16px; font-size: 14px; }
    .ep-avatar-card { display: flex; flex-direction: column; align-items: center; padding: 20px 16px 18px; gap: 4px; }
    .ep-avatar { width: 92px; height: 92px; border-radius: 50%; border: 2.5px solid #007AFF; overflow: hidden; background: #2C2C2E; padding: 0; cursor: pointer; box-shadow: 0 5px 16px rgba(0, 0, 0, 0.35); flex-shrink: 0; }
    .ep-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ep-avatar-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 40px; color: #505050; }
    .ep-nombre-preview { margin-top: 10px; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #fff; }
    .ep-usuario-preview { font-size: 13px; color: #9E9E9E; }
    .ep-avatar-menu { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); display: flex; flex-direction: column; min-width: 220px; background: #1C1C1E; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5); z-index: 80; }
    .ep-avatar-menu button { padding: 14px 16px; border: none; background: none; border-bottom: 0.5px solid #2A2A2A; font-size: 15px; cursor: pointer; color: #fff; text-align: center; }
    .ep-avatar-menu button:last-child { border-bottom: none; }
    .ep-avatar-menu .ep-danger { color: #FF453A; }
    .ep-section-title { padding: 0 6px 8px; margin-top: 22px; font-size: 11px; font-weight: 600; letter-spacing: 1.1px; color: #9E9E9E; text-transform: uppercase; }
    .ep-section-subtitle { display: block; margin-top: 2px; font-size: 11px; font-weight: 400; letter-spacing: normal; text-transform: none; color: #505050; }
    .ep-form-card { padding: 4px 16px; }
    .ep-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
    .ep-row-label { width: 72px; flex-shrink: 0; font-size: 15px; color: #fff; }
    .ep-input, .ep-select { flex: 1; min-width: 0; border: none; outline: none; background: transparent; text-align: right; font-size: 15px; color: #fff; appearance: none; -webkit-appearance: none; }
    .ep-input::placeholder, .ep-textarea::placeholder { color: #505050; }
    .ep-select { text-align: left; padding-right: 4px; }
    .ep-select option { background: #1C1C1E; color: #fff; }
    .ep-readonly { flex: 1; text-align: right; font-size: 14px; color: #9E9E9E; }
    .ep-divider { height: 0.5px; background: #2A2A2A; margin-left: 0; }
    .ep-hint { padding: 8px 6px 0; font-size: 11px; color: #505050; }
    .ep-textarea { width: 100%; min-height: 90px; border: none; outline: none; resize: vertical; font-size: 14px; color: #fff; background: transparent; padding: 10px 0 4px; font-family: inherit; }
    .ep-counter { display: block; text-align: right; font-size: 11px; color: #505050; padding-bottom: 8px; }
    .ep-social-icon { width: 26px; height: 26px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .ep-guardar-full { width: 100%; height: 52px; margin-top: 32px; border: none; border-radius: 18px; background: #007AFF; color: #fff; font-size: 16px; font-weight: 600; letter-spacing: -0.2px; cursor: pointer; }
    .ep-guardar-full:disabled { opacity: 0.4; cursor: default; }
    .ep-logout-card { margin-top: 20px; display: flex; justify-content: center; padding: 12px; }
    .ep-logout { border: none; background: none; color: #FF453A; font-size: 15px; font-weight: 600; letter-spacing: -0.1px; cursor: pointer; }
    .ep-toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%); background: rgba(0, 0, 0, 0.9); color: #fff; padding: 10px 18px; border-radius: 12px; font-size: 13px; z-index: 100; }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────
// CARGA + ESTADO
// ─────────────────────────────────────────────────────────────────
async function _render(root, uid, onGuardado) {
  root.innerHTML = `<div class="perfil-cargando"><div class="spinner"></div></div>`;

  let perfil;
  try {
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', uid).single();
    if (error) throw error;
    perfil = data;
  } catch (e) {
    console.error('editar-perfil.js – cargar:', e);
    root.innerHTML = `
      <div class="perfil-estado">
        <p>No se pudo cargar el perfil.</p>
        <button type="button" class="btn-accion-accent" id="editar-perfil-reintentar">Reintentar</button>
      </div>
    `;
    root.querySelector('#editar-perfil-reintentar')?.addEventListener('click', () => _render(root, uid, onGuardado));
    return;
  }

  const email = perfil.email || usuarioActual()?.email || '';
  const carreraValida = CARRERAS.includes(perfil.carrera) ? perfil.carrera : null;
  const semestreValido = perfil.semestre >= 1 && perfil.semestre <= 12 ? perfil.semestre : null;
  const fotoUrl = resolverUrlPerfil(perfil) || null;

  const estado = {
    uid,
    email,
    original: {
      nombre: perfil.nombre ?? '',
      usuario: perfil.nombre_usuario ?? '',
      presentacion: perfil.presentacion ?? '',
      instagram: perfil.instagram_url ?? '',
      facebook: perfil.facebook_url ?? '',
      tiktok: perfil.tiktok_url ?? '',
      carrera: carreraValida,
      semestre: semestreValido,
    },
    carrera: carreraValida,
    semestre: semestreValido,
    fotoUrl,
    fotoOriginalUrl: fotoUrl, // siempre limpia, sin ?v=timestamp
    imagenLocal: null, // File pendiente de subir
    fotoEliminada: false,
    isSaving: false,
  };

  _pintar(root, estado, onGuardado);
}

function _hayCambios(estado, valores) {
  const o = estado.original;
  return (
    valores.nombre !== o.nombre ||
    valores.usuario !== o.usuario ||
    valores.presentacion !== o.presentacion ||
    valores.instagram !== o.instagram ||
    valores.facebook !== o.facebook ||
    valores.tiktok !== o.tiktok ||
    estado.carrera !== o.carrera ||
    estado.semestre !== o.semestre ||
    estado.imagenLocal !== null ||
    estado.fotoEliminada
  );
}

// ─────────────────────────────────────────────────────────────────
// PINTADO
// ─────────────────────────────────────────────────────────────────
function _pintar(root, estado, onGuardado) {
  root.innerHTML = `
    <header class="perfil-appbar">
      <button type="button" class="btn-volver" id="ep-cerrar">‹</button>
      <h1><span>Mi</span><strong>Perfil</strong></h1>
      <button type="button" class="perfil-btn primary ep-guardar-appbar" id="ep-guardar-top" hidden>Guardar</button>
    </header>

    <main class="editar-perfil-body">
      <section class="perfil-card ep-avatar-card">
        <button type="button" class="ep-avatar" id="ep-avatar">
          ${_htmlAvatarContenido(estado)}
        </button>
        <input type="file" accept="image/*" id="ep-avatar-input" hidden />
        <p class="ep-nombre-preview" id="ep-nombre-preview">${_escapeHtml(estado.original.nombre || 'Tu nombre')}</p>
        <p class="ep-usuario-preview" id="ep-usuario-preview">@${_escapeHtml(estado.original.usuario || 'usuario')}</p>
      </section>

      <section class="ep-section-title">INFORMACIÓN PERSONAL</section>
      <section class="perfil-card ep-form-card">
        <label class="ep-row">
          <span class="ep-row-label">Nombre</span>
          <input type="text" id="ep-nombre" class="ep-input" placeholder="Tu nombre completo" value="${_escapeAttr(estado.original.nombre)}" />
        </label>
        <div class="ep-divider"></div>
        <label class="ep-row">
          <span class="ep-row-label">Usuario</span>
          <input type="text" id="ep-usuario" class="ep-input" placeholder="nombre_usuario" value="${_escapeAttr(estado.original.usuario)}" />
        </label>
        <div class="ep-divider"></div>
        <div class="ep-row">
          <span class="ep-row-label">Correo</span>
          <span class="ep-readonly">${_escapeHtml(estado.email || 'No disponible')} 🔒</span>
        </div>
      </section>
      <p class="ep-hint">El usuario no puede tener espacios ni acentos. Letras, números, guion bajo y punto (el punto no va al inicio, al final ni repetido).</p>

      <section class="ep-section-title">PRESENTACIÓN</section>
      <section class="perfil-card ep-form-card">
        <textarea id="ep-presentacion" class="ep-textarea" maxlength="300" placeholder="Cuéntale algo a tus compañeros...">${_escapeHtml(estado.original.presentacion)}</textarea>
        <span class="ep-counter" id="ep-contador">${estado.original.presentacion.length}/300</span>
      </section>

      <section class="ep-section-title">INFORMACIÓN ACADÉMICA</section>
      <section class="perfil-card ep-form-card">
        <label class="ep-row">
          <span class="ep-row-label">Carrera</span>
          <select id="ep-carrera" class="ep-select" style="text-align-last: right;">
            <option value="" ${!estado.carrera ? 'selected' : ''}>Seleccionar</option>
            ${CARRERAS.map((c) => `<option value="${_escapeAttr(c)}" ${estado.carrera === c ? 'selected' : ''}>${_escapeHtml(c)}</option>`).join('')}
          </select>
        </label>
        <div class="ep-divider"></div>
        <label class="ep-row">
          <span class="ep-row-label">Semestre</span>
          <select id="ep-semestre" class="ep-select" style="text-align-last: right;">
            <option value="" ${!estado.semestre ? 'selected' : ''}>Seleccionar</option>
            ${SEMESTRES.map((s) => `<option value="${s}" ${estado.semestre === s ? 'selected' : ''}>${s}° Semestre</option>`).join('')}
          </select>
        </label>
      </section>

      <section class="ep-section-title">
        REDES SOCIALES
        <span class="ep-section-subtitle">Opcional — pega el link completo (no solo tu @usuario).</span>
      </section>
      <section class="perfil-card ep-form-card">
        <label class="ep-row">
          <img class="ep-social-icon" src="assets/icons/instagram.webp" alt="Instagram" />
          <input type="url" id="ep-instagram" class="ep-input" placeholder="Pega aquí tu link de Instagram" value="${_escapeAttr(estado.original.instagram)}" />
        </label>
        <div class="ep-divider"></div>
        <label class="ep-row">
          <img class="ep-social-icon" src="assets/icons/facebook.png" alt="Facebook" />
          <input type="url" id="ep-facebook" class="ep-input" placeholder="Pega aquí tu link de Facebook" value="${_escapeAttr(estado.original.facebook)}" />
        </label>
        <div class="ep-divider"></div>
        <label class="ep-row">
          <img class="ep-social-icon" src="assets/icons/tiktok.png" alt="TikTok" />
          <input type="url" id="ep-tiktok" class="ep-input" placeholder="Pega aquí tu link de TikTok" value="${_escapeAttr(estado.original.tiktok)}" />
        </label>
      </section>

      <button type="button" class="ep-guardar-full" id="ep-guardar-bottom">Guardar cambios</button>

      <section class="perfil-card ep-logout-card">
        <button type="button" class="ep-logout" id="ep-logout">Cerrar sesión</button>
      </section>
    </main>
  `;

  _wire(root, estado, onGuardado);
}

function _htmlAvatarContenido(estado) {
  if (estado.imagenLocal) {
    return `<img src="${_escapeAttr(URL.createObjectURL(estado.imagenLocal))}" alt="" />`;
  }
  if (estado.fotoUrl) {
    return `<img src="${_escapeAttr(estado.fotoUrl)}" alt="" />`;
  }
  return `<span class="ep-avatar-placeholder">👤</span>`;
}

// ─────────────────────────────────────────────────────────────────
// EVENTOS
// ─────────────────────────────────────────────────────────────────
function _wire(root, estado, onGuardado) {
  const $ = (sel) => root.querySelector(sel);

  const campos = () => ({
    nombre: $('#ep-nombre').value.trim(),
    usuario: $('#ep-usuario').value.trim(),
    presentacion: $('#ep-presentacion').value.trim(),
    instagram: $('#ep-instagram').value.trim(),
    facebook: $('#ep-facebook').value.trim(),
    tiktok: $('#ep-tiktok').value.trim(),
  });

  const btnTop = $('#ep-guardar-top');
  const actualizarBotonGuardar = () => {
    const dirty = _hayCambios(estado, campos());
    btnTop.hidden = !dirty;
  };

  ['#ep-nombre', '#ep-usuario', '#ep-presentacion', '#ep-instagram', '#ep-facebook', '#ep-tiktok'].forEach((sel) => {
    $(sel).addEventListener('input', actualizarBotonGuardar);
  });
  $('#ep-nombre').addEventListener('input', (e) => {
    $('#ep-nombre-preview').textContent = e.target.value.trim() || 'Tu nombre';
  });
  $('#ep-usuario').addEventListener('input', (e) => {
    $('#ep-usuario-preview').textContent = `@${e.target.value.trim() || 'usuario'}`;
  });
  $('#ep-presentacion').addEventListener('input', (e) => {
    $('#ep-contador').textContent = `${e.target.value.length}/300`;
  });
  $('#ep-carrera').addEventListener('change', (e) => {
    estado.carrera = e.target.value || null;
    actualizarBotonGuardar();
  });
  $('#ep-semestre').addEventListener('change', (e) => {
    estado.semestre = e.target.value ? Number(e.target.value) : null;
    actualizarBotonGuardar();
  });

  // ── Avatar ──
  const input = $('#ep-avatar-input');
  $('#ep-avatar').addEventListener('click', () => _menuAvatar(root, estado, { input, onCambio: actualizarBotonGuardar }));
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    estado.imagenLocal = file;
    estado.fotoEliminada = false;
    $('#ep-avatar').innerHTML = _htmlAvatarContenido(estado);
    actualizarBotonGuardar();
  });

  // ── Salir ──
  const intentarCerrar = async () => {
    if (_hayCambios(estado, campos())) {
      const salir = confirm('Tienes cambios sin guardar. ¿Deseas salir?');
      if (!salir) return;
    }
    root.remove();
  };
  $('#ep-cerrar').addEventListener('click', intentarCerrar);

  // ── Guardar ──
  const guardar = () => _guardar(root, estado, campos(), onGuardado);
  $('#ep-guardar-top').addEventListener('click', guardar);
  $('#ep-guardar-bottom').addEventListener('click', guardar);

  // ── Cerrar sesión ──
  // No hacemos location.reload(): router.js ya escucha los cambios
  // de authState (actualizado por auth.js vía onAuthStateChange) y
  // redirige solo a /login. Este overlay vive en document.body, fuera
  // de #app, así que hay que quitarlo a mano o quedaría flotando
  // encima de la pantalla de login tras el redibujado del router.
  $('#ep-logout').addEventListener('click', async () => {
    if (!confirm('¿Estás seguro que deseas cerrar tu sesión?')) return;
    try {
      await supabase.auth.signOut();
      root.remove();
    } catch (e) {
      console.error('editar-perfil.js – cerrar sesión:', e);
      alert('Error al cerrar sesión.');
    }
  });
}

function _menuAvatar(root, estado, { input, onCambio }) {
  root.querySelector('.ep-avatar-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'ep-avatar-menu';
  menu.innerHTML = `
    <button type="button" data-accion="cambiar">Cambiar foto</button>
    ${estado.fotoUrl || estado.imagenLocal ? '<button type="button" class="ep-danger" data-accion="eliminar">Eliminar foto</button>' : ''}
    <button type="button" data-accion="cancelar">Cancelar</button>
  `;
  document.body.appendChild(menu);

  menu.querySelector('[data-accion="cambiar"]').addEventListener('click', () => {
    menu.remove();
    input.click();
  });
  menu.querySelector('[data-accion="eliminar"]')?.addEventListener('click', () => {
    estado.imagenLocal = null;
    estado.fotoUrl = null;
    estado.fotoEliminada = true;
    root.querySelector('#ep-avatar').innerHTML = _htmlAvatarContenido(estado);
    menu.remove();
    onCambio();
  });
  menu.querySelector('[data-accion="cancelar"]').addEventListener('click', () => menu.remove());
}

// ─────────────────────────────────────────────────────────────────
// GUARDAR
// ─────────────────────────────────────────────────────────────────
async function _guardar(root, estado, valores, onGuardado) {
  const { nombre, usuario, presentacion, instagram, facebook, tiktok } = valores;

  if (!nombre) return _toast('El nombre no puede estar vacío');
  if (!usuario) return _toast('El nombre de usuario no puede estar vacío');
  if (!REGEX_USUARIO.test(usuario)) {
    return _toast('Usuario inválido: sin espacios ni acentos, solo letras, números, guion bajo y punto (3–20 caracteres).');
  }
  if (!estado.carrera || !estado.semestre) return _toast('Selecciona carrera y semestre');

  const btns = root.querySelectorAll('#ep-guardar-top, #ep-guardar-bottom');
  btns.forEach((b) => (b.disabled = true));

  try {
    if (usuario !== estado.original.usuario) {
      const { data: existe, error } = await supabase
        .from('perfiles')
        .select('id')
        .eq('nombre_usuario', usuario)
        .maybeSingle();
      if (error) throw error;
      if (existe) {
        _toast('Ese nombre de usuario ya está en uso');
        return;
      }
    }

    let cdnUrl = null;
    if (estado.imagenLocal) {
      cdnUrl = await subirFotoPerfil(estado.imagenLocal, estado.uid);
    }

    // Único caso donde hay que borrar el archivo de R2 explícitamente:
    // el usuario eliminó la foto sin subir una nueva que la sobrescriba.
    if (estado.fotoEliminada && !cdnUrl && estado.fotoOriginalUrl) {
      try {
        const path = estado.fotoOriginalUrl.split('?')[0].replace(`${DOMINIOS.perfil}/`, '');
        await eliminarDeR2(BUCKETS.perfil, path);
      } catch (e) {
        console.warn('editar-perfil.js – borrar foto en R2:', e);
      }
    }

    const updateData = {
      nombre,
      nombre_usuario: usuario,
      carrera: estado.carrera,
      semestre: estado.semestre,
      presentacion,
      instagram_url: _normalizarUrl(instagram),
      facebook_url: _normalizarUrl(facebook),
      tiktok_url: _normalizarUrl(tiktok),
    };
    if (cdnUrl) updateData.cdn_foto_perfil = cdnUrl;
    else if (estado.fotoEliminada) updateData.cdn_foto_perfil = null;

    const { error: errUpdate } = await supabase.from('perfiles').update(updateData).eq('id', estado.uid);
    if (errUpdate) throw errUpdate;

    _toast('Perfil actualizado ✓');
    root.remove();
    onGuardado?.();
  } catch (e) {
    console.error('editar-perfil.js – guardar:', e);
    _toast('Error al guardar los cambios');
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

function _normalizarUrl(valor) {
  const v = (valor || '').trim();
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `https://${v}`;
}

function _toast(msg) {
  const el = document.createElement('div');
  el.className = 'ep-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}


