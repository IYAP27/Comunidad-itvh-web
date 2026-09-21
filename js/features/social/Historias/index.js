// index.js — punto de entrada del flujo "Crear historia"
// Traducción de Crear Historias.dart + coordinación de pantallas.

import * as SeleccionarTipo from './seleccionar-tipo.js';
import * as EditarMedia from './editar-media.js';
import * as EditarTexto from './editar-texto.js';

/**
 * Abre el wizard de crear historia.
 * @param {Function} [onPublicado] — se llama tras publicar con éxito (refrescar carrusel).
 */
export function abrir(onPublicado) {
  _abrirSeleccion(onPublicado);
}

function _abrirSeleccion(onPublicado) {
  SeleccionarTipo.abrir({
    onTexto: (musica) => {
      EditarTexto.abrir({
        musica,
        onPublicado: () => onPublicado?.(),
        onVolver: () => _abrirSeleccion(onPublicado),
      });
    },
    onMedia: (file) => {
      EditarMedia.abrir(file, {
        onPublicado: () => onPublicado?.(),
        onVolver: () => _abrirSeleccion(onPublicado),
      });
    },
    onCerrar: () => {},
  });
}
