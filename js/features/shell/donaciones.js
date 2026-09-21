// ═════════════════════════════════════════════════════════════════
// donaciones.js — traducción de DonacionesScreen.dart
//
// Donación por transferencia bancaria directa (SPEI), sin
// procesador de pagos. El usuario copia CLABE + concepto (con su
// nombre de usuario) y transfiere desde su banco; el admin concilia
// manualmente en el Panel de Control.
// ═════════════════════════════════════════════════════════════════

import { usuarioActual } from '../../core/auth.js';

const CLABE   = '012180015498920970';
const BANCO   = 'BBVA';
const TITULAR = 'Programix NaveJL';

function _formatearClabe(clabe) {
  return clabe.match(/.{1,4}/g).join(' ');
}

export function renderDonaciones(root, onVolver) {
  const usuario = usuarioActual();
  const sugerido = usuario?.user_metadata?.nombre_usuario ?? usuario?.user_metadata?.nombre ?? '';

  let usuarioTexto = sugerido;
  const conceptoSugerido = () => (usuarioTexto.trim() ? `Donación - ${usuarioTexto.trim()}` : 'Donación');

  root.innerHTML = `
    <header class="appbar-simple"><button class="btn-cerrar-x">✕</button></header>

    <div class="donaciones-contenido">
      <div class="donaciones-logo-wrap">
        <div class="donaciones-logo">
          <img src="/assets/icons/splash_foreground.png" alt="" />
        </div>
        <span class="donaciones-badge">☕</span>
      </div>

      <h1 class="donaciones-titulo">¿Nos invitas un café?</h1>
      <p class="donaciones-descripcion">
        Esta app la hacemos un grupo de estudiantes de ITVH, entre clases, tareas y desveladas.
        Si te ha servido, un cafecito nos ayuda a seguir mejorándola.<br><br>
        Cualquier cantidad se agradece con el alma — hasta $10 pesos hacen la diferencia.
      </p>

      <div class="donaciones-aviso-verde">
        <span>💰</span>
        <p>Transferencia directa — sin comisiones. Todo tu apoyo llega completo.</p>
      </div>

      <p class="donaciones-seccion-label">DATOS PARA TRANSFERIR</p>

      <button class="campo-copiable destacado" id="copiar-clabe">
        <div class="campo-copiable-texto">
          <span class="campo-copiable-label">CLABE interbancaria</span>
          <span class="campo-copiable-valor mono">${_formatearClabe(CLABE)}</span>
        </div>
        <span class="campo-copiable-icono">📋</span>
      </button>

      <div class="donaciones-datos-bloque">
        <div class="fila-dato"><span class="fila-dato-label">Banco</span><span class="fila-dato-valor">${BANCO}</span></div>
        <hr class="divider-inset" />
        <div class="fila-dato"><span class="fila-dato-label">Titular</span><span class="fila-dato-valor">${TITULAR}</span></div>
      </div>

      <p class="donaciones-seccion-label">MUY IMPORTANTE</p>

      <div class="donaciones-caja-ambar">
        <div class="donaciones-caja-titulo">✏️ <span>Pon tu usuario en el concepto</span></div>
        <p class="donaciones-caja-texto">
          Así podemos identificar tu donación y darte tu insignia dentro de la app.
          Sin esto no hay forma de saber quién donó.
        </p>

        <input type="text" id="input-usuario-donacion" class="input-usuario-donacion"
               placeholder="Tu usuario" value="${usuarioTexto}" />

        <button class="campo-copiable" id="copiar-concepto">
          <span class="campo-copiable-valor" id="texto-concepto">${conceptoSugerido()}</span>
          <span class="campo-copiable-icono">📋</span>
        </button>
      </div>

      <button class="btn-outline-accent" id="copiar-todo">📤 Copiar todos los datos</button>

      <button class="btn-primario-donaciones" id="btn-listo">✔ Listo, ya transferí</button>
      <button class="btn-texto-link" id="btn-ahora-no">Ahora no</button>
    </div>
  `;

  root.querySelector('.btn-cerrar-x').addEventListener('click', onVolver);
  root.querySelector('#btn-listo').addEventListener('click', onVolver);
  root.querySelector('#btn-ahora-no').addEventListener('click', onVolver);

  root.querySelector('#input-usuario-donacion').addEventListener('input', (e) => {
    usuarioTexto = e.target.value;
    root.querySelector('#texto-concepto').textContent = conceptoSugerido();
  });

  root.querySelector('#copiar-clabe').addEventListener('click', () => _copiar(CLABE, 'CLABE copiada', root.querySelector('#copiar-clabe')));
  root.querySelector('#copiar-concepto').addEventListener('click', () => _copiar(conceptoSugerido(), 'Concepto copiado', root.querySelector('#copiar-concepto')));

  root.querySelector('#copiar-todo').addEventListener('click', () => {
    const texto = `Datos para donar a ${TITULAR}:\nCLABE: ${CLABE}\nBanco: ${BANCO}\nConcepto: ${conceptoSugerido()}`;
    if (navigator.share) {
      navigator.share({ text: texto }).catch(() => {});
    } else {
      _copiar(texto, 'Datos completos copiados');
    }
  });
}

function _copiar(valor, mensaje, botonEl) {
  navigator.clipboard.writeText(valor).then(() => {
    _mostrarToast(mensaje);
    if (botonEl) {
      const icono = botonEl.querySelector('.campo-copiable-icono');
      if (icono) {
        icono.textContent = '✅';
        setTimeout(() => { icono.textContent = '📋'; }, 2000);
      }
    }
  });
}

function _mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'toast-simple';
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 200);
  }, 1200);
}