// Controlador aislado de notas de voz para JaguarChat.
// Mantiene MediaRecorder, stream, temporizador y limpieza fuera de la pantalla.

export function crearControladorAudio({
  boton,
  indicador,
  tiempoEl,
  panelEmoji = null,
  onAudioListo,
  onError,
}) {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let inicio = 0;
  let timer = null;
  let cancelando = false;
  let destruido = false;

  function _limpiarUI() {
    clearInterval(timer);
    timer = null;
    indicador.hidden = true;
    boton.classList.remove('grabando');
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function _actualizarTiempo() {
    const segundos = Math.floor((Date.now() - inicio) / 1000);
    tiempoEl.textContent = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  }

  async function iniciar() {
    if (destruido) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.(new Error('MediaRecorder no está disponible'), 'Este navegador no permite grabar notas de voz.');
      return;
    }

    try {
      cancelando = false;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (destruido) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        return;
      }

      const preferidos = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = preferidos.find((tipo) => MediaRecorder.isTypeSupported?.(tipo)) || '';
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];

      recorder.ondataavailable = (evento) => {
        if (evento.data?.size) chunks.push(evento.data);
      };

      recorder.onstop = async () => {
        const duracionMs = Date.now() - inicio;
        const recorderActual = recorder;
        _limpiarUI();

        if (cancelando || destruido || duracionMs < 650 || !chunks.length) {
          chunks = [];
          return;
        }

        const tipo = recorderActual?.mimeType || chunks[0]?.type || 'audio/webm';
        const extension = tipo.includes('ogg') ? 'ogg' : tipo.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(chunks, { type: tipo });
        chunks = [];
        const file = new File([blob], `nota-voz-${Date.now()}.${extension}`, { type: tipo });

        try {
          await onAudioListo?.({ file, duracionMs });
        } catch (error) {
          onError?.(error, 'No se pudo enviar la nota de voz.');
        }
      };

      recorder.start(250);
      inicio = Date.now();
      indicador.hidden = false;
      boton.classList.add('grabando');
      if (panelEmoji) panelEmoji.hidden = true;
      _actualizarTiempo();
      timer = setInterval(_actualizarTiempo, 250);
    } catch (error) {
      _limpiarUI();
      onError?.(error, 'No se pudo acceder al micrófono. Revisa el permiso del navegador.');
    }
  }

  function detener() {
    if (recorder?.state === 'recording') recorder.stop();
  }

  function alternar() {
    if (recorder?.state === 'recording') detener();
    else iniciar();
  }

  function cancelar() {
    cancelando = true;
    if (recorder?.state === 'recording') {
      try { recorder.stop(); } catch { _limpiarUI(); }
    } else {
      _limpiarUI();
    }
  }

  function destruir() {
    destruido = true;
    cancelar();
    recorder = null;
  }

  return {
    alternar,
    iniciar,
    detener,
    cancelar,
    destruir,
    estaGrabando: () => recorder?.state === 'recording',
  };
}
