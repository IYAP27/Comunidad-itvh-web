// Catálogo de fondos para historias de texto — traducción de fondos_historia.dart

export const FONDOS_HISTORIA = [
  { id: 'rojo', colores: ['#E53935'] },
  { id: 'naranja', colores: ['#FF9800'] },
  { id: 'amarillo', colores: ['#FDD835'] },
  { id: 'verde', colores: ['#4CAF50'] },
  { id: 'esmeralda', colores: ['#17A398'] },
  { id: 'cian', colores: ['#00BCD4'] },
  { id: 'azul', colores: ['#2E9BFF'] },
  { id: 'indigo', colores: ['#4E6BFF'] },
  { id: 'morado', colores: ['#9C27B0'] },
  { id: 'rosa', colores: ['#E91E8C'] },
  { id: 'cafe', colores: ['#6D4C41'] },
  { id: 'negro', colores: ['#1C1C1E'] },
  { id: 'gris', colores: ['#757575'] },
  { id: 'blanco', colores: ['#F5F5F5'] },
  { id: 'atardecer', colores: ['#FF9800', '#E91E8C'] },
  { id: 'oceano', colores: ['#2E9BFF', '#00E5FF'] },
  { id: 'aurora', colores: ['#9C27B0', '#E91E8C'] },
  { id: 'fuego', colores: ['#E53935', '#FDD835'] },
  { id: 'bosque', colores: ['#1B5E20', '#8BC34A'] },
  { id: 'noche', colores: ['#1C1C1E', '#4E6BFF'] },
  { id: 'algodon', colores: ['#FFB6C1', '#B39DDB'] },
  { id: 'menta', colores: ['#17A398', '#FDD835'] },
];

export const FONDO_INICIAL_INDEX = 4; // esmeralda

export function cssFondo(fondo) {
  if (!fondo) return '#17A398';
  if (fondo.colores.length === 1) return fondo.colores[0];
  return `linear-gradient(135deg, ${fondo.colores.join(', ')})`;
}

export function pintarFondoEnCanvas(ctx, fondo, ancho, alto) {
  if (!fondo || fondo.colores.length === 1) {
    ctx.fillStyle = fondo?.colores[0] ?? '#17A398';
    ctx.fillRect(0, 0, ancho, alto);
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, ancho, alto);
  grad.addColorStop(0, fondo.colores[0]);
  grad.addColorStop(1, fondo.colores[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ancho, alto);
}
