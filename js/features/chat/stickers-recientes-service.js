// Bandeja global de stickers recientes para JaguarChat web.
// Equivalente a stickers_recientes_service.dart usando localStorage.

const CLAVE = 'jaguarchat_stickers_recientes';
const MAXIMO = 30;

function leer() {
  try {
    const raw = localStorage.getItem(CLAVE);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista.filter((s) => s?.url) : [];
  } catch {
    return [];
  }
}

function guardar(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO)));
  } catch {
    // localStorage puede estar bloqueado en modo privado; no impide enviar.
  }
}

export const StickersRecientesService = {
  obtener() {
    return leer();
  },

  agregar(sticker) {
    if (!sticker?.url) return;
    const lista = leer().filter((s) => s.url !== sticker.url);
    lista.unshift({
      url: sticker.url,
      ancho: sticker.ancho ?? null,
      alto: sticker.alto ?? null,
    });
    guardar(lista);
  },
};
