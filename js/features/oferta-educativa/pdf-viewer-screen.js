/**
 * Visor de PDF vía Google Docs Viewer embebido en un <iframe>.
 * Equivalente a PdfViewerScreen (WebView + reintentos + descarga/compartir).
 */
export function abrirPdfViewer(titulo, url) {
  const overlay = document.createElement('div');
  overlay.className = 'pdf-viewer-overlay';
  overlay.innerHTML = `
    <header class="appbar-simple">
      <button class="btn-volver">‹</button>
      <h2 class="pdf-titulo">${titulo}</h2>
      <button class="btn-compartir" title="Compartir">📤</button>
      <button class="btn-descargar" title="Descargar">⬇️</button>
    </header>
    <div class="pdf-body">
      <div id="pdf-loading" class="pdf-loading"><div class="spinner"></div><p>Cargando PDF…</p></div>
      <div id="pdf-error" class="pdf-error hidden">
        <p>⚠️ No se pudo cargar el PDF</p>
        <p class="pdf-error-sub">Verifica tu conexión e intenta de nuevo.</p>
        <button id="btn-reintentar">Reintentar</button>
      </div>
      <iframe id="pdf-iframe" src="" class="pdf-iframe"></iframe>
    </div>
  `;
  document.body.appendChild(overlay);

  const iframe = overlay.querySelector('#pdf-iframe');
  const loading = overlay.querySelector('#pdf-loading');
  const errorBox = overlay.querySelector('#pdf-error');
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  let timeoutId = null;
  let intentos = 0;
  const maxIntentos = 3;

  function cargar() {
    loading.classList.remove('hidden');
    errorBox.classList.add('hidden');
    iframe.src = viewerUrl;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (intentos < maxIntentos) {
        intentos++;
        cargar();
      } else {
        loading.classList.add('hidden');
        errorBox.classList.remove('hidden');
      }
    }, 4000);
  }

  iframe.addEventListener('load', () => {
    clearTimeout(timeoutId);
    intentos = 0;
    loading.classList.add('hidden');
  });

  overlay.querySelector('.btn-volver').addEventListener('click', () => {
    clearTimeout(timeoutId);
    overlay.remove();
  });
  overlay.querySelector('#btn-reintentar').addEventListener('click', () => { intentos = 0; cargar(); });

  // Compartir/descargar: en web, abrir el PDF original en pestaña nueva
  // es el equivalente más directo (el navegador ya ofrece su propio
  // botón de descarga/imprimir dentro del visor nativo si aplica).
  overlay.querySelector('.btn-compartir').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: titulo, url }); } catch {}
    } else {
      window.open(url, '_blank');
    }
  });
  overlay.querySelector('.btn-descargar').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, '')}.pdf`;
    a.target = '_blank';
    a.click();
  });

  cargar();
}