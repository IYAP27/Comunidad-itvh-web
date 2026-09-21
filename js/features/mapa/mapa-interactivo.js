// ═════════════════════════════════════════════════════════════════
// mapa-interactivo.js — traducción de mapa_interactivo.dart.dart
//
// Carga assets/mapas/campus_data.geojson y dibuja los edificios
// (polígonos) y puntos de interés del campus sobre un mapa Leaflet,
// con buscador y detalle por edificio. Mismo flujo que la versión
// Flutter (que usa Google Maps):
//   1. Leer y decodificar el GeoJSON.
//   2. Por cada Feature Polygon: calcular centroide, pintar el
//      polígono, y poner un marcador "globito" con el nombre encima.
//   3. Por cada Feature Point: marcador de color según categoría
//      (accesos=verde, deportes=naranja, genérico=azul).
//   4. Buscador: filtra edificios por nombre; al elegir uno, la
//      cámara anima hacia su centroide y se abre el detalle.
//
// Se usa Leaflet (gratis, sin API key) en vez de Google Maps — el
// resto de la lógica (geojson, buscador, bottom sheet) es la misma.
// ═════════════════════════════════════════════════════════════════

import { escapeHtml as _escapeHtml } from '../../core/html-utils.js';
const GEOJSON_URL = 'assets/mapas/campus_data.geojson';
const CENTRO_CAMPUS = [18.0234, -92.9040];

let _leafletCargando = null;

/// Inyecta el CSS + JS de Leaflet desde CDN una sola vez (lazy: solo
/// se paga ese costo si el usuario realmente abre el mapa).
function _cargarLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletCargando) return _leafletCargando;

  _leafletCargando = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(script);
  });
  return _leafletCargando;
}

export async function renderMapaInteractivo(root, onVolver) {
  root.innerHTML = `
    <div class="mapa-pantalla">
      <header class="mapa-appbar">
        <button type="button" class="btn-volver" id="mapa-btn-volver">‹</button>
        <span class="mapa-appbar-titulo">Mapa interactivo del ITVH</span>
      </header>
      <div class="mapa-cuerpo">
        <div class="mapa-leaflet" id="mapa-leaflet"></div>
        <div class="mapa-cargando" id="mapa-cargando"><div class="mapa-spinner"></div></div>
        <div class="mapa-buscador-wrap" id="mapa-buscador-wrap" hidden>
          <div class="mapa-buscador-campo">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
            <input type="text" class="mapa-buscador-input" id="mapa-buscador-input" placeholder="Buscar edificio...">
          </div>
          <div class="mapa-buscador-resultados" id="mapa-buscador-resultados" hidden></div>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#mapa-btn-volver').addEventListener('click', () => onVolver?.());

  try {
    await _cargarLeaflet();
  } catch (e) {
    root.querySelector('#mapa-cargando').innerHTML = `<p style="color:var(--texto-medio);padding:0 24px;text-align:center;">No se pudo cargar el mapa. Revisa tu conexión.</p>`;
    return;
  }

  const L = window.L;
  const mapa = L.map(root.querySelector('#mapa-leaflet'), {
    center: CENTRO_CAMPUS,
    zoom: 17.5,
    minZoom: 15,
    maxZoom: 20,
    zoomControl: false,
  });

  // Capa satelital (equivalente a MapType.hybrid de Google Maps) vía Esri,
  // gratuita para este volumen de uso.
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: 'Tiles &copy; Esri',
  }).addTo(mapa);

  L.control.zoom({ position: 'bottomright' }).addTo(mapa);

  // Ubicación del usuario (equivalente a myLocationEnabled).
  if (navigator.geolocation) {
    mapa.locate({ setView: false, enableHighAccuracy: true });
    mapa.on('locationfound', (e) => {
      L.circleMarker(e.latlng, {
        radius: 8, color: '#fff', weight: 2,
        fillColor: '#0A84FF', fillOpacity: 1,
      }).addTo(mapa);
    });
  }

  const edificios = await _cargarGeoJson(mapa, L, root, onVolver);

  root.querySelector('#mapa-cargando').remove();
  const buscadorWrap = root.querySelector('#mapa-buscador-wrap');
  buscadorWrap.hidden = false;

  _wireBuscador(root, mapa, L, edificios);

  // Tap en el mapa vacío → cerrar resultados del buscador.
  mapa.on('click', () => _colapsarBuscador(root));
}

/// Lee el GeoJSON, dibuja polígonos + marcadores, y arma la lista de
/// edificios que usa el buscador. Devuelve esa lista.
async function _cargarGeoJson(mapa, L, root, onVolver) {
  const edificios = [];
  let marcadorDestino = null;

  try {
    const resp = await fetch(GEOJSON_URL);
    const geojson = await resp.json();

    for (const feature of geojson.features) {
      const { geometry, properties } = feature;
      const nombre = properties?.Name || 'Sin nombre';
      const descripcionRaw = properties?.description || '';
      const descripcion = descripcionRaw || '<p>Sin descripción disponible.</p>';
      const esLarga = _esDescripcionLarga(descripcion);
      const snippet = esLarga ? 'Toca para ver más información' : _limpiarHtml(descripcion);

      if (geometry.type === 'Polygon') {
        // GeoJSON: [lng, lat] → Leaflet: [lat, lng]
        const anillo = geometry.coordinates[0];
        const puntos = anillo.map(([lng, lat]) => [lat, lng]);
        const centroide = puntos.reduce(
          (acc, [lat, lng]) => [acc[0] + lat / puntos.length, acc[1] + lng / puntos.length],
          [0, 0],
        );

        const poligono = L.polygon(puntos, {
          color: '#1B365D',
          weight: 2,
          fillColor: '#1B365D',
          fillOpacity: 0.3,
        }).addTo(mapa);

        const marcador = L.marker(centroide, {
          icon: L.divIcon({
            className: 'mapa-marker-edificio-wrap',
            html: `<div class="mapa-marker-edificio">${_escapeHtml(nombre)}</div>`,
            iconSize: null,
            iconAnchor: [0, 28],
          }),
        }).addTo(mapa);

        const abrirDetalle = () => {
          if (esLarga) {
            _mostrarDetalleEdificio(root, nombre, descripcion);
          } else {
            marcador.bindPopup(_htmlPopup(nombre, snippet)).openPopup();
          }
        };
        poligono.on('click', abrirDetalle);
        marcador.on('click', abrirDetalle);
        if (!esLarga) marcador.bindPopup(_htmlPopup(nombre, snippet));

        edificios.push({ nombre, descripcion, centroide, esLarga });
      }

      if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates;
        const marcador = L.marker([lat, lng], {
          icon: _iconoPorTipo(L, nombre),
        }).addTo(mapa);
        marcador.bindPopup(_htmlPopup(nombre, snippet));
        if (esLarga) {
          marcador.on('click', () => _mostrarDetalleEdificio(root, nombre, descripcion));
        }
      }
    }
  } catch (e) {
    console.error('Error al cargar el mapa del campus:', e);
  }

  return edificios;
}

/// Marcador de color de Leaflet vía divIcon (mismo criterio que
/// _colorPorTipo en la versión Flutter).
function _iconoPorTipo(L, nombre) {
  const n = nombre.toLowerCase();
  let color = '#3388ff'; // azul (genérico)
  if (n.includes('acceso')) color = '#34C759'; // verde
  else if (n.includes('cancha') || n.includes('gimnasio') || n.includes('deporti')) color = '#FF9500'; // naranja

  return L.divIcon({
    className: 'mapa-marker-punto-wrap',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function _htmlPopup(nombre, snippet) {
  return `<div class="mapa-popup-titulo">${_escapeHtml(nombre)}</div>${snippet ? `<div class="mapa-popup-snippet">${_escapeHtml(snippet)}</div>` : ''}`;
}

function _esDescripcionLarga(descripcion) {
  return descripcion.includes('<li>') || descripcion.includes('<b>') || descripcion.includes('<p>') || descripcion.length > 80;
}
function _limpiarHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/// Bottom sheet con el detalle del edificio (equivalente al
/// DraggableScrollableSheet + flutter_html de la versión móvil).
function _mostrarDetalleEdificio(root, nombre, descripcionHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'mapa-detalle-overlay';
  overlay.innerHTML = `
    <div class="mapa-detalle-hoja">
      <div class="mapa-detalle-agarradera"></div>
      <p class="mapa-detalle-nombre">${_escapeHtml(nombre)}</p>
      <div class="mapa-detalle-cuerpo">${descripcionHtml}</div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  root.appendChild(overlay);
}

/// Buscador: filtra por nombre, muestra resultados, y al elegir uno
/// anima la cámara y abre el detalle — mismo flujo que
/// _seleccionarEdificio en la versión Flutter.
function _wireBuscador(root, mapa, L, edificios) {
  const input = root.querySelector('#mapa-buscador-input');
  const resultadosEl = root.querySelector('#mapa-buscador-resultados');
  let marcadorDestino = null;

  input.addEventListener('focus', () => {
    if (input.value.trim()) resultadosEl.hidden = false;
  });

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      resultadosEl.hidden = true;
      resultadosEl.innerHTML = '';
      return;
    }
    const coincidencias = edificios.filter((e) => e.nombre.toLowerCase().includes(query));
    resultadosEl.hidden = false;
    resultadosEl.innerHTML = coincidencias.length
      ? coincidencias.map((e, i) => `<button type="button" class="mapa-resultado-item" data-idx="${i}">${_escapeHtml(e.nombre)}</button>`).join('')
      : `<p class="mapa-resultado-vacio">Sin resultados</p>`;

    resultadosEl.querySelectorAll('.mapa-resultado-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const edificio = coincidencias[Number(btn.dataset.idx)];
        _seleccionarEdificio(root, mapa, L, edificio, (m) => { marcadorDestino = m; }, () => marcadorDestino);
        input.value = '';
        resultadosEl.hidden = true;
        resultadosEl.innerHTML = '';
        input.blur();
      });
    });
  });
}

function _seleccionarEdificio(root, mapa, L, edificio, setMarcadorDestino, getMarcadorDestino) {
  const anterior = getMarcadorDestino();
  if (anterior) mapa.removeLayer(anterior);

  const marcador = L.marker(edificio.centroide, {
    icon: L.divIcon({
      className: 'mapa-marker-destino-wrap',
      html: `<span style="display:block;width:20px;height:20px;border-radius:50%;background:#FF3B30;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),
  }).addTo(mapa);
  setMarcadorDestino(marcador);

  mapa.flyTo(edificio.centroide, 19.5, { duration: 0.6 });

  setTimeout(() => {
    if (edificio.esLarga) {
      _mostrarDetalleEdificio(root, edificio.nombre, edificio.descripcion);
    } else {
      marcador.bindPopup(_htmlPopup(edificio.nombre, `📍 ${edificio.nombre}`)).openPopup();
    }
  }, 600);
}

function _colapsarBuscador(root) {
  const resultadosEl = root.querySelector('#mapa-buscador-resultados');
  if (resultadosEl) {
    resultadosEl.hidden = true;
    resultadosEl.innerHTML = '';
  }
}

