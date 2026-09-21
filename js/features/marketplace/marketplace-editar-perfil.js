// ═════════════════════════════════════════════════════════════════
// marketplace-editar-perfil.js
// Espejo de MarketplaceEditarPerfil.dart
//
// Permite al emprendedor editar su perfil de negocio:
//   • Nombre del negocio
//   • Descripción
//
// Al guardar, invoca onGuardado() para que el padre recargue.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { escapeHtml as _escapeHtml, escapeAttr as _escapeAttr } from '../../core/html-utils.js';

let _emprendedor = null;
let _onGuardado = null;
let _guardando = false;
let _modal = null;

export async function abrirEditorPerfil(emprendedor, onGuardado) {
  _emprendedor = emprendedor;
  _onGuardado = onGuardado;
  _guardando = false;

  _render();
}

function _render() {
  if (_modal) document.body.removeChild(_modal);

  _modal = document.createElement('div');
  _modal.className = 'marketplace-editar-perfil-modal';
  _modal.innerHTML = `
    <div class="marketplace-editar-perfil-contenido">
      <div class="marketplace-editar-perfil-header">
        <button type="button" class="marketplace-editar-perfil-cerrar" aria-label="Cerrar">✕</button>
        <h3>Editar perfil de negocio</h3>
        <button type="button" id="btn-guardar-perfil" class="marketplace-editar-perfil-guardar" ${_guardando ? 'disabled' : ''}>
          ${_guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      <form id="marketplace-editar-perfil-form" class="marketplace-editar-perfil-form">
        <label class="marketplace-form-label">Nombre del negocio</label>
        <input type="text" id="editar-nombre-negocio" class="marketplace-form-input" maxlength="60"
          placeholder="Ej. Tortas Mister"
          value="${_escapeAttr(_emprendedor.nombre_negocio || '')}" required />

        <label class="marketplace-form-label">Descripción</label>
        <textarea id="editar-descripcion-negocio" class="marketplace-form-textarea" maxlength="300" rows="4"
          placeholder="Describe tu negocio, qué ofreces, horarios..."
        >${_escapeHtml(_emprendedor.descripcion || '')}</textarea>
      </form>
    </div>
  `;
  document.body.appendChild(_modal);
  _wireEventos();
}

function _wireEventos() {
  _modal.querySelector('.marketplace-editar-perfil-cerrar')?.addEventListener('click', _cerrar);
  _modal.addEventListener('click', (e) => { if (e.target === _modal) _cerrar(); });

  const form = _modal.querySelector('#marketplace-editar-perfil-form');
  const btnGuardar = _modal.querySelector('#btn-guardar-perfil');
  form.addEventListener('submit', (e) => { e.preventDefault(); _guardar(); });
  btnGuardar.addEventListener('click', _guardar);
}

async function _guardar() {
  if (_guardando) return;

  const nombreNegocio = _modal.querySelector('#editar-nombre-negocio').value.trim();
  const descripcion = _modal.querySelector('#editar-descripcion-negocio').value.trim();

  if (!nombreNegocio) {
    alert('Ingresa el nombre de tu negocio');
    return;
  }

  _guardando = true;
  _render();

  try {
    const { error } = await supabase
      .from('emprendedores')
      .update({
        nombre_negocio: nombreNegocio,
        descripcion: descripcion,
      })
      .eq('id', _emprendedor.id);

    if (error) throw error;

    _cerrar();
    if (_onGuardado) _onGuardado();
  } catch (e) {
    console.error('Error al guardar perfil:', e);
    alert(`Error al guardar: ${e.message}`);
    _guardando = false;
    _render();
  }
}

function _cerrar() {
  if (_modal) {
    document.body.removeChild(_modal);
    _modal = null;
  }
}

