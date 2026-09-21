// Este catálogo referencia las 12 pantallas de carrera. Por ahora
// apunto cada una a un placeholder — cuando me pases (o confirmes)
// los 12 .dart, reemplazo cada entrada por su renderer real en
// datos/ + carrera-screen.js, tal como quedamos.
import { renderCarreraScreen } from './carrera-screen.js';

const AREAS = {
  sistemas: { label: 'Sistemas y Computación', corto: 'Sistemas', icono: '💻' },
  industrial: { label: 'Ingeniería Industrial', corto: 'Industrial', icono: '🏭' },
  economico: { label: 'Ciencias Económico-Administrativas', corto: 'Económico-Admin.', icono: '🏛️' },
  quimica: { label: 'Ing. Química, Bioquímica y Ambiental', corto: 'Química', icono: '🧪' },
  tierra: { label: 'Ciencias de la Tierra', corto: 'Tierra', icono: '🏔️' },
};

const CARRERAS = [
  { nombre: 'Ing. en Sistemas Computacionales', siglas: 'ISC', icono: '💻', area: 'sistemas', destino: 'ISC' },
  { nombre: 'Ing. en Tecnologías de la Información y Comunicaciones', siglas: 'ITIC', icono: '📶', area: 'sistemas', destino: 'ITIC' },
  { nombre: 'Ing. en Ciencias de Datos', siglas: 'ICDA', icono: '📊', area: 'sistemas', destino: 'ICDA' },
  { nombre: 'Ing. Informática', siglas: 'IINF', icono: '🧠', area: 'sistemas', destino: 'IINF' },
  { nombre: 'Ing. Industrial', siglas: 'IIND', icono: '⚙️', area: 'industrial', destino: 'IIND' },
  { nombre: 'Ing. en Gestión Empresarial', siglas: 'IGEE', icono: '💼', area: 'economico', destino: 'IGEE' },
  { nombre: 'Lic. en Administración', siglas: 'LADM', icono: '🏦', area: 'economico', destino: 'LADM' },
  { nombre: 'Ing. Química', siglas: 'IQUI', icono: '🧪', area: 'quimica', destino: 'IQUI' },
  { nombre: 'Ing. Bioquímica', siglas: 'IBQA', icono: '🧬', area: 'quimica', destino: 'IBQA' },
  { nombre: 'Ing. Ambiental', siglas: 'IAMB', icono: '🌿', area: 'quimica', destino: 'IAMB' },
  { nombre: 'Ing. Civil', siglas: 'ICIV', icono: '🏗️', area: 'tierra', destino: 'ICIV' },
  { nombre: 'Ing. Petrolera', siglas: 'IPET', icono: '🛢️', area: 'tierra', destino: 'IPET' },
];

export function renderOfertaEducativa(root, onVolver) {
  let busqueda = '';
  let areaFiltro = null;

  root.innerHTML = `
    <header class="appbar-simple"><button class="btn-volver">‹</button><h2>Oferta educativa</h2></header>

    <div class="search-bar-wrap">
      <input id="input-busqueda-carrera" placeholder="Buscar carrera o siglas..." />
    </div>

    <div class="chips-filtro-scroll" id="chips-filtro"></div>

    <div class="stats-oferta">
      <div class="stat-card stat-primary">${CARRERAS.length} <span>programas</span></div>
      <div class="stat-card stat-secondary">${Object.keys(AREAS).length} <span>áreas</span></div>
    </div>

    <div id="lista-carreras"></div>
  `;

  root.querySelector('.btn-volver').addEventListener('click', onVolver);

  const chipsWrap = root.querySelector('#chips-filtro');
  function renderChips() {
    chipsWrap.innerHTML = `<button class="filter-chip ${areaFiltro === null ? 'selected' : ''}" data-area="">Todos</button>` +
      Object.entries(AREAS).map(([key, a]) =>
        `<button class="filter-chip ${areaFiltro === key ? 'selected' : ''}" data-area="${key}">${a.corto}</button>`).join('');
    chipsWrap.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.area || null;
        areaFiltro = areaFiltro === key ? null : key;
        renderChips();
        renderLista();
      });
    });
  }

  const lista = root.querySelector('#lista-carreras');
  function renderLista() {
    const filtradas = CARRERAS.filter((c) => {
      const matchArea = !areaFiltro || c.area === areaFiltro;
      const matchBusqueda = !busqueda ||
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.siglas.toLowerCase().includes(busqueda.toLowerCase());
      return matchArea && matchBusqueda;
    });

    if (!filtradas.length) {
      lista.innerHTML = `<div class="estado-vacio">🔍<p class="vacio-msg">Sin resultados para "${busqueda}"</p></div>`;
      return;
    }

    const grupos = {};
    filtradas.forEach((c) => { (grupos[c.area] ??= []).push(c); });

    lista.innerHTML = Object.entries(grupos).map(([areaKey, arr]) => {
      const area = AREAS[areaKey];
      return `
        <div class="area-header"><span class="area-pill">${area.icono} ${area.label}</span><hr class="area-divider"></div>
        ${arr.map((c) => `
          <div class="carrera-card" data-destino="${c.destino}">
            <div class="carrera-icono">${c.icono}</div>
            <div class="carrera-info"><p class="carrera-nombre">${c.nombre}</p><p class="carrera-siglas">${c.siglas}</p></div>
            <span class="chevron">›</span>
          </div>
        `).join('')}
      `;
    }).join('');

    lista.querySelectorAll('.carrera-card').forEach((card) => {
      card.addEventListener('click', () => {
        const pushed = document.createElement('div');
        pushed.className = 'pushed-screen';
        document.body.appendChild(pushed);
        renderCarreraScreen(pushed, card.dataset.destino, () => pushed.remove());
      });
    });
  }

  root.querySelector('#input-busqueda-carrera').addEventListener('input', (e) => {
    busqueda = e.target.value;
    renderLista();
  });

  renderChips();
  renderLista();
}