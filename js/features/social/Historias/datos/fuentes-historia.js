// Catálogo de fuentes para historias de texto — traducción de fuentes_historia.dart

export const FUENTES_HISTORIA = [
  { id: 'clasica', etiqueta: 'Clásica', fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontStyle: 'normal', fontSize: 30 },
  { id: 'redondeada', etiqueta: 'Redondeada', fontFamily: '"Poppins", sans-serif', fontWeight: '600', fontStyle: 'normal', fontSize: 30 },
  { id: 'impacto', etiqueta: 'Impacto', fontFamily: '"Bebas Neue", sans-serif', fontWeight: '400', fontStyle: 'normal', fontSize: 34 },
  { id: 'elegante', etiqueta: 'Elegante', fontFamily: '"Playfair Display", serif', fontWeight: '600', fontStyle: 'italic', fontSize: 30 },
  { id: 'manuscrita', etiqueta: 'Manuscrita', fontFamily: '"Permanent Marker", cursive', fontWeight: '400', fontStyle: 'normal', fontSize: 26 },
  { id: 'condensada', etiqueta: 'Condensada', fontFamily: '"Oswald", sans-serif', fontWeight: '600', fontStyle: 'normal', fontSize: 30, letterSpacing: '0.06em' },
  { id: 'maquina', etiqueta: 'Máquina', fontFamily: '"Roboto Mono", monospace', fontWeight: '500', fontStyle: 'normal', fontSize: 28 },
];

export function cssFuente(fuente) {
  const f = fuente ?? FUENTES_HISTORIA[0];
  return {
    fontFamily: f.fontFamily,
    fontWeight: f.fontWeight,
    fontStyle: f.fontStyle,
    fontSize: `${f.fontSize}px`,
    letterSpacing: f.letterSpacing ?? 'normal',
  };
}

export function aplicarFuenteEnCanvas(ctx, fuente, colorTexto = '#fff') {
  const f = fuente ?? FUENTES_HISTORIA[0];
  ctx.fillStyle = colorTexto;
  ctx.font = `${f.fontStyle} ${f.fontWeight} ${f.fontSize}px ${f.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}
