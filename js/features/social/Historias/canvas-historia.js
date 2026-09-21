// Utilidades de captura en canvas para historias (imagen + texto)

import { pintarFondoEnCanvas } from './datos/fondos-historia.js';
import { aplicarFuenteEnCanvas } from './datos/fuentes-historia.js';

export const LIENZO_ANCHO = 1080;
export const LIENZO_ALTO = 1920;

function _wrapText(ctx, text, maxWidth) {
  const palabras = text.split(/\s+/).filter(Boolean);
  const lineas = [];
  let linea = '';
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxWidth && linea) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = prueba;
    }
  }
  if (linea) lineas.push(linea);
  return lineas;
}

function _pintarDescripcion(ctx, descripcion, ancho, alto) {
  const texto = descripcion.trim();
  if (!texto) return;

  const padding = 48;
  const maxAncho = ancho - padding * 2;
  const fontSize = 36;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const lineas = _wrapText(ctx, texto, maxAncho);
  const lineHeight = fontSize * 1.35;
  const bloqueAlto = lineas.length * lineHeight + 28;
  const yBase = alto - 120;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  const boxW = Math.min(maxAncho + 40, ancho - 80);
  const boxX = (ancho - boxW) / 2;
  const boxY = yBase - bloqueAlto;
  ctx.fillRect(boxX, boxY, boxW, bloqueAlto);

  ctx.fillStyle = '#fff';
  lineas.forEach((linea, i) => {
    const y = yBase - (lineas.length - 1 - i) * lineHeight - 14;
    ctx.fillText(linea, ancho / 2, y);
  });
}

function _dibujarImagenEncuadre(ctx, img, ancho, alto, modoCubrir) {
  const escala = modoCubrir
    ? Math.max(ancho / img.width, alto / img.height)
    : Math.min(ancho / img.width, alto / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  const x = (ancho - w) / 2;
  const y = (alto - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

export async function capturarImagenConDescripcion({ source, descripcion, modoCubrir = false }) {
  const img = source instanceof HTMLImageElement
    ? source
    : await _cargarImagen(source);

  const canvas = document.createElement('canvas');
  canvas.width = LIENZO_ANCHO;
  canvas.height = LIENZO_ALTO;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  _dibujarImagenEncuadre(ctx, img, canvas.width, canvas.height, modoCubrir);
  _pintarDescripcion(ctx, descripcion, canvas.width, canvas.height);

  return _canvasABlob(canvas, 'image/png');
}

export async function capturarTextoComoPng({ texto, fondo, fuente }) {
  const canvas = document.createElement('canvas');
  canvas.width = LIENZO_ANCHO;
  canvas.height = LIENZO_ALTO;
  const ctx = canvas.getContext('2d');

  pintarFondoEnCanvas(ctx, fondo, canvas.width, canvas.height);

  const colorTexto = fondo?.id === 'blanco' || fondo?.id === 'amarillo' ? '#111' : '#fff';
  aplicarFuenteEnCanvas(ctx, fuente, colorTexto);

  const maxAncho = canvas.width - 160;
  const lineas = _wrapText(ctx, texto.trim(), maxAncho);
  const fontSize = fuente?.fontSize ?? 30;
  const lineHeight = fontSize * 1.35;
  const bloqueAlto = lineas.length * lineHeight;
  let y = (canvas.height - bloqueAlto) / 2 + fontSize / 2;

  lineas.forEach((linea) => {
    ctx.fillText(linea, canvas.width / 2, y);
    y += lineHeight;
  });

  return _canvasABlob(canvas, 'image/png');
}

export async function obtenerDuracionVideoMs(file, maxMs = 30000) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(Math.min(Math.round(video.duration * 1000) || maxMs, maxMs));
    });
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer el video'));
    });
  });
}

function _cargarImagen(source) {
  if (source instanceof HTMLImageElement && source.complete && source.naturalWidth) {
    return Promise.resolve(source);
  }

  return new Promise((resolve, reject) => {
    const img = source instanceof HTMLImageElement ? source : new Image();
    const cleanup = () => {
      if (source instanceof Blob && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    };
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('No se pudo cargar la imagen'));
    };
    if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else if (!(source instanceof HTMLImageElement)) {
      img.src = source;
    }
  });
}

function _canvasABlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Error al capturar lienzo'))), type);
  });
}
