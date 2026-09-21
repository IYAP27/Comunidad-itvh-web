import { abrirPdfViewer } from '../pdf-viewer-screen.js';

// ── Ordinales en español, igual que _ordinal en cada _SemestreExpansion ──
const ORDINAL = ['', '1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no'];

/** Barra de acento + texto — equivalente a _SectionTitle. */
export function crearSectionTitle(texto, color) {
  const div = document.createElement('div');
  div.className = 'section-title';
  div.innerHTML = `<span class="section-title-bar" style="background:${color}"></span><h3>${texto}</h3>`;
  return div;
}

/** Card compacta con ícono/color — equivalente a _InfoCard. */
export function crearInfoCard({ icono, titulo, contenido, color }) {
  const div = document.createElement('div');
  div.className = 'info-card';
  div.style.setProperty('--card-color', color);
  div.innerHTML = `
    <span class="info-card-icono">${icono}</span>
    <p class="info-card-titulo">${titulo}</p>
    <p class="info-card-contenido">${contenido}</p>
  `;
  return div;
}

/** Fila numerada — equivalente a _ObjetivoItem. */
export function crearObjetivoItem(numero, titulo, descripcion, color) {
  const div = document.createElement('div');
  div.className = 'objetivo-item';
  div.innerHTML = `
    <span class="objetivo-numero" style="color:${color};background:${color}22">${numero}</span>
    <div><p class="objetivo-titulo">${titulo}</p><p class="objetivo-desc">${descripcion}</p></div>
  `;
  return div;
}

/** Lista de bullets — equivalente a _PerfilSection. */
export function crearPerfilSection(items, color) {
  const div = document.createElement('div');
  div.className = 'perfil-section';
  div.innerHTML = items.map((item) =>
    `<div class="perfil-item"><span class="perfil-dot" style="background:${color}"></span><p>${item}</p></div>`
  ).join('');
  return div;
}

/** Card de retícula tappable — equivalente a _ReticulaItem. */
export function crearReticulaItem(reticula, color) {
  const div = document.createElement('div');
  div.className = 'reticula-item';
  div.innerHTML = `
    <div class="reticula-icono" style="background:${color}22;color:${color}">▦</div>
    <div class="reticula-info"><p class="reticula-nombre">${reticula.nombre}</p><p class="reticula-clave">${reticula.clave}</p></div>
    <span class="reticula-pdf-icono" style="color:${color}88">📄</span>
  `;
  div.addEventListener('click', () => abrirPdfViewer(reticula.nombre, reticula.url));
  return div;
}

/** Fila tappable de materia — equivalente a _MateriaItem (maneja hasUrl). */
export function crearMateriaItem(materia, color) {
  const hasUrl = !!materia.url;
  const div = document.createElement('div');
  div.className = `materia-item ${hasUrl ? '' : 'sin-url'}`;
  div.innerHTML = `
    <span class="materia-icono" style="color:${color}88">${hasUrl ? '📄' : 'ℹ️'}</span>
    <p class="materia-nombre">${materia.nombre}</p>
    ${hasUrl ? '<span class="materia-chevron">›</span>' : ''}
  `;
  if (hasUrl) div.addEventListener('click', () => abrirPdfViewer(materia.nombre, materia.url));
  return div;
}

/** Fila de solo texto (9no semestre sin PDF) — equivalente a _MateriaInfoItem. */
export function crearMateriaInfoItem(nombre, color) {
  const div = document.createElement('div');
  div.className = 'materia-item sin-url';
  div.innerHTML = `<span class="materia-icono" style="color:${color}77">ℹ️</span><p class="materia-nombre">${nombre}</p>`;
  return div;
}

/** Tile expandible de semestre — equivalente a _SemestreExpansion. */
export function crearSemestreExpansion(semestre, color) {
  const ord = ORDINAL[semestre.numero];
  const details = document.createElement('details');
  details.className = 'expansion-tile';
  const cuerpo = document.createElement('div');
  cuerpo.className = 'expansion-body';

  const materias = semestre.soloInformativo
    ? semestre.materias.map((m) => crearMateriaInfoItem(m.nombre, color))
    : semestre.materias.map((m) => crearMateriaItem(m, color));
  materias.forEach((el) => cuerpo.appendChild(el));

  details.innerHTML = `
    <summary class="expansion-header" style="background:${color}0D;border-color:${color}1F">
      <span class="expansion-numero" style="background:${color}1F;color:${color}">${semestre.numero}</span>
      <div><p class="expansion-titulo">${ord} Semestre</p><p class="expansion-sub">${semestre.materias.length} ${semestre.soloInformativo ? 'actividades' : 'materias'}</p></div>
    </summary>
  `;
  details.appendChild(cuerpo);
  return details;
}

/** Tile expandible de especialidad — equivalente a _EspecialidadExpansion. */
export function crearEspecialidadExpansion(especialidad, color) {
  const details = document.createElement('details');
  details.className = 'expansion-tile';
  const cuerpo = document.createElement('div');
  cuerpo.className = 'expansion-body';
  especialidad.materias.forEach((m) => cuerpo.appendChild(crearMateriaItem(m, color)));

  const subInfo = especialidad.clave
    ? `${especialidad.materias.length} materias · ${especialidad.clave}`
    : `${especialidad.materias.length} materias`;

  details.innerHTML = `
    <summary class="expansion-header" style="background:${color}0D;border-color:${color}26">
      <span class="expansion-icono" style="background:${color}1F;color:${color}">${especialidad.icono ?? '🎓'}</span>
      <div><p class="expansion-titulo">${especialidad.nombre}</p><p class="expansion-sub">${subInfo}</p></div>
    </summary>
  `;
  details.appendChild(cuerpo);
  return details;
}

/** Card ámbar de aviso — equivalente a _AvisoCard (usada en IAMB). */
export function crearAvisoCard() {
  const div = document.createElement('div');
  div.className = 'aviso-card';
  div.innerHTML = `
    <span class="aviso-icono">🔍</span>
    <div>
      <p class="aviso-titulo">¿Las materias no coinciden con tu retícula?</p>
      <p class="aviso-texto">Existe un cruce de datos en el backend del portal que muestra claves o nombres de asignaturas incorrectos en los bloques de especialidad de algunas carreras.</p>
      <p class="aviso-nota">Nota: Los PDF oficiales de las retículas selladas son el único documento válido para tu plan de estudios actual.</p>
    </div>
  `;
  return div;
}