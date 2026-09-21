const EVENTOS = [
  { year: '1974', title: 'Los orígenes', body: 'El ITVH nació cuando la economía tabasqueña dependía de la agricultura, ganadería, pesca y cuatro industrias clave: azucarera, chocolatera, aceitera y petrolera. La falta de mano de obra calificada limitaba el crecimiento.', icon: '🚩', image: 'assets/images/drawer_imagen2_2.webp', caption: 'Gimnasio-Auditorio en sus primeros años.', tema: 'ambar' },
  { year: '1979', title: 'Sede propia', body: 'Tras operar en instituciones prestadas, el 20 de noviembre de 1979 el Instituto se trasladó a sus instalaciones definitivas en el Km. 3.5 de la carretera Villahermosa–Frontera.', icon: '🏙️', image: 'assets/images/drawer_imagen2_1.webp', caption: 'Centro de Información (Biblioteca) en sus inicios, sin techo.', tema: 'teal' },
  { year: '1992', title: 'Modernización', body: 'Se construyó un laboratorio de cómputo de dos niveles, una unidad académica departamental y el nuevo Centro de Información. Se consolidó el SITE de Internet y se implementaron redes internas.', icon: '💻', image: 'assets/images/drawer_imagen2.webp', caption: 'Centro de cómputo en sus inicios.', tema: 'coral' },
];

export function renderHistoriaPlantel(root, onVolver) {
  root.innerHTML = `
    <header class="appbar-hero">
      <button class="btn-volver-hero">‹</button>
      <span class="appbar-titulo-hero">Un poco de historia</span>
    </header>

    <div class="hero-historia">
      <img src="assets/images/drawer_imagen2.webp" class="hero-historia-img" onerror="this.style.display='none'">
      <span class="badge-fecha">📅 Fundado el 9 de septiembre de 1974</span>
    </div>

    <section class="seccion-plantel">
      <h1>Instituto Tecnológico<br>de Villahermosa</h1>
      <p class="subtitulo-historia">Más de 50 años formando profesionistas en Tabasco.</p>
      <hr class="divisor">

      <div class="timeline">
        ${EVENTOS.map((e, i) => `
          <div class="timeline-item">
            <div class="timeline-nodo tema-${e.tema}">${e.icon}</div>
            ${i < EVENTOS.length - 1 ? '<div class="timeline-linea"></div>' : ''}
            <div class="timeline-contenido">
              <p class="timeline-year tema-${e.tema}-text">${e.year}</p>
              <p class="timeline-title">${e.title}</p>
              <p class="timeline-body">${e.body}</p>
              <div class="timeline-img-wrap tema-${e.tema}-overlay">
                <img src="${e.image}" class="timeline-img" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('sin-imagen')">
              </div>
              <p class="timeline-caption">${e.caption}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="banner-final">
        <span class="banner-icono">🎓</span>
        <div>
          <p class="banner-numero">+50 años</p>
          <p class="banner-texto">formando profesionistas en Tabasco</p>
        </div>
      </div>
    </section>
  `;
  root.querySelector('.btn-volver-hero').addEventListener('click', onVolver);
}