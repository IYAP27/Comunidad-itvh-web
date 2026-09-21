const FOTOS_GALERIA = [
  { path: 'assets/images/galeria_imagen1.webp', thumb: 'assets/images/galeria_imagen1_thumb.webp', descripcion: 'Vista del campus del ITVH' },
  { path: 'assets/images/galeria_imagen2.webp', thumb: 'assets/images/galeria_imagen2_thumb.webp', descripcion: 'Instalaciones del plantel' },
  { path: 'assets/images/galeria_imagen3.webp', thumb: 'assets/images/galeria_imagen3_thumb.webp', descripcion: 'Áreas académicas del ITVH' },
  { path: 'assets/images/galeria_imagen4.webp', thumb: 'assets/images/galeria_imagen4_thumb.webp', descripcion: 'Espacios de aprendizaje' },
  { path: 'assets/images/galeria_imagen5.webp', thumb: 'assets/images/galeria_imagen5_thumb.webp', descripcion: 'Infraestructura del campus' },
  { path: 'assets/images/galeria_imagen6.webp', thumb: 'assets/images/galeria_imagen6_thumb.webp', descripcion: 'Exterior del ITVH' },
  { path: 'assets/images/galeria_imagen7.webp', thumb: 'assets/images/galeria_imagen7_thumb.webp', descripcion: 'Instituto Tecnológico de Villahermosa' },
];

const VALORES = ['Honestidad', 'Responsabilidad', 'Respeto', 'Innovación', 'Compromiso', 'Excelencia', 'Trabajo en equipo', 'Sustentabilidad'];

function abrirUrl(url) {
  window.open(url, '_blank');
}

export function renderConocePlantel(root, onVolver) {
  root.innerHTML = `
    <header class="appbar-hero">
      <button class="btn-volver-hero">‹</button>
    </header>

    <div class="hero-plantel">
      <img src="assets/images/logo_itvh.png" class="logo-itvh" onerror="this.style.display='none'">
      <p class="hero-subtitulo">Instituto Tecnológico de Villahermosa</p>
    </div>

    <section class="seccion-plantel ficha-rapida">
      <h1>Instituto Tecnológico de Villahermosa</h1>
      <p class="acento">ITVH · TecNM</p>
      <div class="ficha-row"><span class="ficha-icono">📍</span><span class="ficha-label">Ubicación</span><span class="ficha-valor">Carretera Villahermosa–Frontera km 3.5, Col. Tecnológico, Villahermosa, Tab.</span></div>
      <div class="ficha-row"><span class="ficha-icono">📅</span><span class="ficha-label">Fundación</span><span class="ficha-valor">1974</span></div>
      <div class="ficha-row"><span class="ficha-icono">🏛️</span><span class="ficha-label">Tipo</span><span class="ficha-valor">Institución pública de educación superior</span></div>
      <div class="ficha-row link" id="ficha-web"><span class="ficha-icono">🌐</span><span class="ficha-label">Sitio web</span><span class="ficha-valor acento">villahermosa.tecnm.mx</span></div>
      <hr class="divisor">
    </section>

    <section class="seccion-plantel">
      <h2 class="titulo-seccion">Acerca del plantel</h2>
      <p class="parrafo">El Instituto Tecnológico de Villahermosa (ITVH) es una institución pública de educación superior perteneciente al Tecnológico Nacional de México (TecNM), dependiente de la Secretaría de Educación Pública (SEP). Fundado en 1974, ha formado durante más de cinco décadas a miles de profesionistas en diversas disciplinas de ingeniería y ciencias.</p>
      <p class="parrafo">El ITVH se distingue por su enfoque en la vinculación con el sector productivo de la región sureste de México, contribuyendo activamente al desarrollo económico, científico y tecnológico del estado de Tabasco y del país.</p>
    </section>

    <section class="seccion-plantel">
      <h2 class="titulo-seccion">Galería del campus</h2>
      <div id="galeria-plantel"></div>
    </section>

    <section class="seccion-plantel">
      <h2 class="titulo-seccion">Misión y Visión</h2>
      <div class="tarjeta-mv tarjeta-mision">
        <p class="mv-titulo">🚩 Misión</p>
        <p class="mv-texto">Formar profesionistas de excelencia en ciencias y tecnología, con valores éticos y humanistas, capaces de contribuir al desarrollo sustentable del país, a través de la docencia, investigación y vinculación con los sectores productivo y social.</p>
      </div>
      <div class="tarjeta-mv tarjeta-vision">
        <p class="mv-titulo">👁️ Visión</p>
        <p class="mv-texto">Ser reconocida como una institución de educación superior de calidad, acreditada nacional e internacionalmente, líder en innovación tecnológica y en la formación integral de profesionistas competitivos, comprometidos con el desarrollo sostenible de la región y del país.</p>
      </div>
      <h3 class="titulo-seccion">Valores institucionales</h3>
      <div class="chips-valores">${VALORES.map((v) => `<span class="chip-valor">${v}</span>`).join('')}</div>
    </section>

    <section class="seccion-plantel">
      <h2 class="titulo-seccion">Contacto y Ubicación</h2>
      <div class="contacto-tile" id="contacto-direccion"><span class="contacto-icono rojo">📍</span><div><p class="contacto-titulo">Dirección</p><p class="contacto-sub">Carretera Villahermosa–Frontera km 3.5, Col. Tecnológico, C.P. 86010, Villahermosa, Tabasco, México.</p></div></div>
      <div class="contacto-tile" id="contacto-tel"><span class="contacto-icono verde">📞</span><div><p class="contacto-titulo">Teléfono</p><p class="contacto-sub">(993) 354-2020</p></div></div>
      <div class="contacto-tile" id="contacto-email"><span class="contacto-icono azul">✉️</span><div><p class="contacto-titulo">Correo institucional</p><p class="contacto-sub">difusion@villahermosa.tecnm.mx</p></div></div>
      <div class="contacto-tile" id="contacto-sitio"><span class="contacto-icono morado">🌐</span><div><p class="contacto-titulo">Sitio web oficial</p><p class="contacto-sub">villahermosa.tecnm.mx</p></div></div>
      <div class="mapa-placeholder" id="mapa-placeholder">🗺️ <span class="btn-ver-mapa">Ver en Google Maps</span></div>
    </section>

    <p class="pie-fuente">Información con fines informativos.<br>Fuente: TecNM / ITVH</p>
  `;

  root.querySelector('.btn-volver-hero').addEventListener('click', onVolver);
  root.querySelector('#ficha-web').addEventListener('click', () => abrirUrl('https://villahermosa.tecnm.mx'));
  root.querySelector('#contacto-direccion').addEventListener('click', () => abrirUrl('https://maps.google.com/?q=Instituto+Tecnologico+de+Villahermosa'));
  root.querySelector('#contacto-tel').addEventListener('click', () => abrirUrl('tel:+529933542020'));
  root.querySelector('#contacto-email').addEventListener('click', () => abrirUrl('mailto:difusion@villahermosa.tecnm.mx'));
  root.querySelector('#contacto-sitio').addEventListener('click', () => abrirUrl('https://villahermosa.tecnm.mx'));
  root.querySelector('#mapa-placeholder').addEventListener('click', () => abrirUrl('https://maps.google.com/?q=Instituto+Tecnologico+de+Villahermosa'));

  renderGaleria(root.querySelector('#galeria-plantel'));
}

function renderGaleria(contenedor) {
  let indice = 0;

  function pintar() {
    contenedor.innerHTML = `
      <div class="galeria-principal">
        <img src="${FOTOS_GALERIA[indice].path}" class="galeria-imagen-grande" decoding="async" fetchpriority="high">
        <span class="galeria-contador">${indice + 1} / ${FOTOS_GALERIA.length}</span>
        <button class="nav-arrow izq ${indice === 0 ? 'oculta' : ''}">‹</button>
        <button class="nav-arrow der ${indice === FOTOS_GALERIA.length - 1 ? 'oculta' : ''}">›</button>
      </div>
      <p class="galeria-descripcion">${FOTOS_GALERIA[indice].descripcion}</p>
      <div class="galeria-miniaturas">
        ${FOTOS_GALERIA.map((f, i) => `<img src="${f.thumb}" class="miniatura ${i === indice ? 'activa' : ''}" data-i="${i}" loading="lazy" decoding="async">`).join('')}
      </div>
      <div class="galeria-dots">
        ${FOTOS_GALERIA.map((_, i) => `<span class="dot ${i === indice ? 'activo' : ''}"></span>`).join('')}
      </div>
    `;
    contenedor.querySelector('.nav-arrow.izq')?.addEventListener('click', () => { if (indice > 0) { indice--; pintar(); } });
    contenedor.querySelector('.nav-arrow.der')?.addEventListener('click', () => { if (indice < FOTOS_GALERIA.length - 1) { indice++; pintar(); } });
    contenedor.querySelectorAll('.miniatura').forEach((img) => img.addEventListener('click', () => { indice = Number(img.dataset.i); pintar(); }));
  }
  pintar();
}