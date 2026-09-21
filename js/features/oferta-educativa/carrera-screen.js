import {
  crearSectionTitle, crearInfoCard, crearObjetivoItem, crearPerfilSection,
  crearReticulaItem, crearSemestreExpansion, crearEspecialidadExpansion, crearAvisoCard,
} from './shared/componentes-carrera.js';

/**
 * Renderer único para las 12 pantallas de carrera. Recibe el objeto
 * de datos (uno por carrera, en datos/*.js) y arma la pantalla completa
 * — equivalente a que cada XxxxScreen.dart comparta la misma estructura,
 * variando solo datos/color/ícono.
 */
export async function renderCarreraScreen(root, siglas, onVolver) {
  root.innerHTML = `<div class="carrera-loading"><div class="spinner"></div></div>`;

  // Import dinámico: solo se carga el archivo de datos de la carrera
  // que el usuario realmente abrió.
  const modulo = await import(`./datos/${siglas.toLowerCase()}.js`);
  const d = modulo.default;

  root.innerHTML = `
    <div class="carrera-screen">
      <div class="carrera-hero" style="background:${d.color}1F">
        <button class="btn-volver-hero">‹</button>
        <span class="carrera-hero-icono" style="color:${d.color}12">${d.iconoFondo ?? '🎓'}</span>
        <div class="carrera-hero-texto">
          <span class="chip-depto" style="background:${d.color}26;color:${d.color}">${d.departamento}</span>
          <h1>${d.nombreCompleto}</h1>
        </div>
      </div>
      <div class="carrera-contenido"></div>
    </div>
  `;
  root.querySelector('.btn-volver-hero').addEventListener('click', onVolver);
  const cont = root.querySelector('.carrera-contenido');

  // ── Misión/Visión o Objetivo/CampoLaboral resumen (opcional) ──
  if (d.cardsResumen?.length) {
    const row = document.createElement('div');
    row.className = 'cards-resumen-row';
    d.cardsResumen.forEach((c) => row.appendChild(crearInfoCard(c)));
    cont.appendChild(row);
  }

  // ── Objetivo General ──
  cont.appendChild(crearSectionTitle(d.objetivoTitulo ?? 'Objetivo General', d.color));
  const objBox = document.createElement('div');
  objBox.className = 'objetivo-box';
  objBox.style.setProperty('--obj-color', d.color);
  objBox.innerHTML = `<p>${d.objetivoGeneral}</p>`;
  cont.appendChild(objBox);

  // ── Objetivos/Propósitos Específicos (opcional) ──
  if (d.objetivosEspecificos?.length) {
    cont.appendChild(crearSectionTitle(d.objetivosEspecificosTitulo ?? 'Objetivos Específicos', d.color));
    d.objetivosEspecificos.forEach(([num, titulo, desc]) =>
      cont.appendChild(crearObjetivoItem(num, titulo, desc, d.color)));
  }

  // ── Perfil de Ingreso ──
  cont.appendChild(crearSectionTitle('Perfil de Ingreso', d.color));
  cont.appendChild(crearPerfilSection(d.perfilIngreso, d.colorIngreso ?? d.color));

  // ── Perfil de Egreso ──
  cont.appendChild(crearSectionTitle('Perfil de Egreso', d.color));
  cont.appendChild(crearPerfilSection(d.perfilEgreso, d.colorEgreso ?? d.color));

  // ── Campo Laboral (opcional) ──
  if (d.campoLaboral?.length) {
    cont.appendChild(crearSectionTitle('Campo Laboral', d.color));
    cont.appendChild(crearPerfilSection(d.campoLaboral, d.colorCampoLaboral ?? d.color));
  }

  // ── Aviso especial (solo IAMB) ──
  if (d.aviso) cont.appendChild(crearAvisoCard());

  // ── Retículas ──
  cont.appendChild(crearSectionTitle(d.reticulasTitulo ?? 'Retículas', d.color));
  d.reticulas.forEach((r) => cont.appendChild(crearReticulaItem(r, d.color)));

  // ── Plan de Estudios ──
  cont.appendChild(crearSectionTitle('Plan de Estudios', d.color));
  d.semestres.forEach((s) => cont.appendChild(crearSemestreExpansion(s, d.color)));

  // ── Especialidad(es) (opcional — ICDA no tiene) ──
  if (d.especialidades?.length) {
    cont.appendChild(crearSectionTitle(d.especialidades.length > 1 ? 'Especialidades' : 'Especialidad', d.color));
    d.especialidades.forEach((esp) => cont.appendChild(crearEspecialidadExpansion(esp, esp.color ?? d.color)));
  }
}