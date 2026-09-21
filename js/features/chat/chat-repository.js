// ═════════════════════════════════════════════════════════════════
// chat-repository.js
//
// Equivalente web de chat_repository.dart. Capa de datos de la LISTA
// de chats (no de los mensajes dentro de uno — eso es
// mensaje-repository.js). Igual que en Dart, guarda/lee la "colección"
// `chats` de Dexie: preview del último mensaje, no leídos, fijado,
// silenciado, archivado.
//
// FIX (heredado de jul 2026, v2, Dart) — toggleArchivado NO resetea
// noLeidos al archivar. subscribeTotalNoLeidos ya excluye archivados
// del total visible, así que el badge global no se ve afectado por
// chats archivados de todos modos. Se mantiene la misma lógica aquí
// para que el comportamiento sea idéntico entre mobile y web.
// ═════════════════════════════════════════════════════════════════

import { db, liveQuery } from '../../core/db.js';

function compararChats(a, b) {
  if (a.fijado !== b.fijado) return a.fijado ? -1 : 1;
  const fa = a.ultimaFecha;
  const fb = b.ultimaFecha;
  if (!fa && !fb) return 0;
  if (!fa) return 1;
  if (!fb) return -1;
  return new Date(fb) - new Date(fa);
}

export const ChatRepository = {
  // ── Streams (liveQuery = equivalente a .watch(fireImmediately: true)) ───

  /// Solo chats NO archivados, fijados primero, luego por fecha descendente.
  /// callback(chats) se llama de inmediato y en cada cambio. Devuelve una
  /// función para desuscribirse (llámala en el cleanup de tu vista).
  subscribeChats(callback) {
    const sub = liveQuery(() => db.chats.toArray()).subscribe({
      next(chats) {
        const visibles = chats.filter((c) => !c.archivado);
        visibles.sort(compararChats);
        callback(visibles);
      },
      error(err) {
        console.error('ChatRepository.subscribeChats:', err);
      },
    });
    return () => sub.unsubscribe();
  },

  /// Suma total de mensajes no leídos entre todos los chats visibles
  /// (excluye archivados, igual que subscribeChats).
  subscribeTotalNoLeidos(callback) {
    const sub = liveQuery(() => db.chats.toArray()).subscribe({
      next(chats) {
        const total = chats
          .filter((c) => !c.archivado)
          .reduce((suma, c) => suma + (c.noLeidos || 0), 0);
        callback(total);
      },
      error(err) {
        console.error('ChatRepository.subscribeTotalNoLeidos:', err);
      },
    });
    return () => sub.unsubscribe();
  },

  // ── Escritura ────────────────────────────────────────────────────────────

  async actualizarPreview({
    otroUsuarioId,
    otroNombre,
    otroNombreUsuario = null,
    otroAvatarUrl = null,
    ultimoMensaje = null,
    fecha = null,
    incrementarNoLeidos = false,
  }) {
    await db.transaction('rw', db.chats, async () => {
      const existente = await db.chats.get(otroUsuarioId);
      const chat = existente || {
        otroUsuarioId,
        noLeidos: 0,
        fijado: false,
        silenciado: false,
        archivado: false,
      };

      chat.otroUsuarioId = otroUsuarioId;
      chat.otroNombre = otroNombre;
      chat.otroNombreUsuario = otroNombreUsuario;
      chat.otroAvatarUrl = otroAvatarUrl;

      if (ultimoMensaje != null) chat.ultimoMensaje = ultimoMensaje;
      if (fecha != null) chat.ultimaFecha = fecha;

      if (incrementarNoLeidos) {
        chat.noLeidos = (chat.noLeidos || 0) + 1;
      }

      await db.chats.put(chat);
    });
  },

  /// Pisa SOLO el texto del último mensaje mostrado en la lista de chats —
  /// no toca fecha, no-leídos, ni datos del otro usuario.
  async actualizarUltimoMensajeTexto({ otroUsuarioId, texto }) {
    await db.transaction('rw', db.chats, async () => {
      const chat = await db.chats.get(otroUsuarioId);
      if (!chat) return;
      chat.ultimoMensaje = texto;
      await db.chats.put(chat);
    });
  },

  async marcarComoLeido(otroUsuarioId) {
    await db.transaction('rw', db.chats, async () => {
      const chat = await db.chats.get(otroUsuarioId);
      if (!chat || chat.noLeidos === 0) return;
      chat.noLeidos = 0;
      await db.chats.put(chat);
    });
  },

  async toggleFijado(otroUsuarioId) {
    await db.transaction('rw', db.chats, async () => {
      const chat = await db.chats.get(otroUsuarioId);
      if (!chat) return;
      chat.fijado = !chat.fijado;
      await db.chats.put(chat);
    });
  },

  async toggleSilenciado(otroUsuarioId) {
    await db.transaction('rw', db.chats, async () => {
      const chat = await db.chats.get(otroUsuarioId);
      if (!chat) return;
      chat.silenciado = !chat.silenciado;
      await db.chats.put(chat);
    });
  },

  // ← archivar / desarchivar (igual que WhatsApp)
  async toggleArchivado(otroUsuarioId) {
    await db.transaction('rw', db.chats, async () => {
      const chat = await db.chats.get(otroUsuarioId);
      if (!chat) return;
      chat.archivado = !chat.archivado;
      // FIX heredado: ya NO se resetea noLeidos al archivar. Se preserva
      // el conteo real; subscribeTotalNoLeidos ya excluye archivados del
      // total visible.
      await db.chats.put(chat);
    });
  },

  // ← cuántos chats hay archivados (para el badge en Configuración)
  async contarArchivados() {
    return db.chats.filter((c) => c.archivado === true).count();
  },

  // ← lista completa de archivados
  async obtenerArchivados() {
    const lista = await db.chats.filter((c) => c.archivado === true).toArray();
    lista.sort((a, b) => {
      const fa = a.ultimaFecha;
      const fb = b.ultimaFecha;
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return new Date(fb) - new Date(fa);
    });
    return lista;
  },

  async eliminarChat(otroUsuarioId, { borrarMensajes = true } = {}) {
    await db.transaction('rw', db.chats, db.mensajes, async () => {
      await db.chats.delete(otroUsuarioId);
      if (borrarMensajes) {
        await db.mensajes.where('chatOtroUsuarioId').equals(otroUsuarioId).delete();
      }
    });
  },

  // ── Lecturas puntuales ───────────────────────────────────────────────────

  async obtenerChat(otroUsuarioId) {
    return db.chats.get(otroUsuarioId);
  },

  async obtenerTodos() {
    return db.chats.toArray();
  },
};