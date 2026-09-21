// Utilidades compartidas para renderizar contenido dinámico de forma segura.
// Evita duplicar implementaciones de escape entre módulos del frontend.

export function escapeHtml(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

export function escapeAttr(value = '') {
  return escapeHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function errorMessage(error, fallback = 'Ocurrió un error inesperado') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();
  return fallback;
}
