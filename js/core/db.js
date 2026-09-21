// ═════════════════════════════════════════════════════════════════
// db.js
//
// Espejo web de tus colecciones Isar (Chat, Mensaje). Dexie usa la
// primera columna del string como PRIMARY KEY (equivalente a
// @Index(unique: true, replace: true) en Isar), y el resto son
// índices secundarios para poder hacer .where('campo').equals(...).
//
// chats:    llave primaria = otroUsuarioId  (igual que putByOtroUsuarioId)
// mensajes: llave primaria = mensajeId      (igual que putByMensajeId)
//           índice chatOtroUsuarioId        (igual que .chatOtroUsuarioIdEqualTo)
//           índice timestamp                (para paginación / sort)
//           índice estado                   (para filtrar fallidos en reintentos)
// ═════════════════════════════════════════════════════════════════

import Dexie, { liveQuery } from 'https://esm.sh/dexie@4';

export const db = new Dexie('ComunidadITVH');

db.version(1).stores({
  chats: 'otroUsuarioId, ultimaFecha, fijado, archivado',
  mensajes: 'mensajeId, chatOtroUsuarioId, timestamp, estado',
});

export { liveQuery };
export default db;