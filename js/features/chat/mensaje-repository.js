// ═════════════════════════════════════════════════════════════════
// mensaje-repository.js
//
// Equivalente web de mensaje_repository.dart. Trae los mismos fixes
// que ya resolviste del lado mobile, porque la causa raíz es la
// misma (una fila de mensajes_pendientes procesada por dos caminos
// distintos: el canal Realtime y el catch-up manual):
//
// FIX (heredado de ago 2026 v1) — sincronizarDesdeSupabase() y
// RealtimeService pueden procesar la misma fila de mensajes_pendientes
// dos veces. Se agregó existeMensaje() para chequear, antes de
// incrementar noLeidos, si ese mensajeId ya se guardó localmente.
//
// FIX (heredado de ago 2026 v2) — sincronizarDesdeSupabase() ahora
// borra de mensajes_pendientes las filas DIRIGIDAS A MÍ que acaba de
// guardar localmente (mismo criterio que usa RealtimeService al
// procesar un mensaje), para que el catch-up no las vuelva a
// encontrar y dispare un guardarRecibido() tardío con la
// conversación ya cerrada. Los mensajes que YO envié no se tocan.
//
// FIX (heredado de jul 2026) — editar/eliminar el último mensaje de
// una conversación actualiza también el preview en la lista de
// chats vía _esUltimoMensaje() + ChatRepository.actualizarUltimoMensajeTexto().
// ═════════════════════════════════════════════════════════════════

import { db, liveQuery } from '../../core/db.js';
import { supabase } from '../../core/supabase-client.js';
import { ChatRepository } from './chat-repository.js';
import {
  TipoMensaje,
  EstadoMensaje,
  esMedia,
  empaquetarMetadata,
  desempaquetarMetadata,
  textoPreview,
  mensajeFromSupabase,
  leerReacciones,
  escribirReacciones,
} from './mensaje.js';

const LIMIT_STREAM = 60;

function nuevoId() {
  return crypto.randomUUID();
}

export const MensajeRepository = {
  // ── Streams ──────────────────────────────────────────────────────────────

  /// Últimos LIMIT_STREAM mensajes de la conversación, en orden ascendente.
  /// callback(mensajes) se llama de inmediato y en cada cambio.
  subscribeMensajes(otroUsuarioId, callback) {
    const sub = liveQuery(() =>
      db.mensajes
        .where('chatOtroUsuarioId')
        .equals(otroUsuarioId)
        .reverse()
        .sortBy('timestamp')
        .then((lista) => lista.slice(0, LIMIT_STREAM).reverse())
    ).subscribe({
      next: callback,
      error(err) {
        console.error('MensajeRepository.subscribeMensajes:', err);
      },
    });
    return () => sub.unsubscribe();
  },

  // ── Paginación ────────────────────────────────────────────────────────────

  async cargarPagina({ otroUsuarioId, antes, cantidad = 40 }) {
    const antesTime = new Date(antes).getTime();
    const resultados = await db.mensajes
      .where('chatOtroUsuarioId')
      .equals(otroUsuarioId)
      .filter((m) => new Date(m.timestamp).getTime() < antesTime)
      .reverse()
      .sortBy('timestamp');
    return resultados.slice(0, cantidad).reverse();
  },

  // ── Sincronización inicial ──────────────────────────────────────────────

  async sincronizarDesdeSupabase({ otroUsuarioId, miId }) {
    try {
      const { data: raw, error } = await supabase
        .from('mensajes_pendientes')
        .select(
          'id, remitente_id, destinatario_id, contenido, tipo, ' +
            'media_url, creado_en, ' +
            'contexto_descripcion, contexto_imagen_url, ' +
            'contexto_lugar, contexto_objeto_id, contexto_tipo, ' +
            'respuesta_a_id, respuesta_a_contenido, respuesta_a_tipo, ' +
            'respuesta_a_emisor_id, editado, eliminado'
        )
        .or(
          `and(remitente_id.eq.${miId},destinatario_id.eq.${otroUsuarioId}),` +
            `and(remitente_id.eq.${otroUsuarioId},destinatario_id.eq.${miId})`
        )
        .order('creado_en', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!raw || raw.length === 0) return;

      const idsEnRaw = raw.map((r) => r.id);
      const existentes = await db.mensajes
        .where('mensajeId')
        .anyOf(idsEnRaw)
        .primaryKeys();
      const idsExistentes = new Set(existentes);

      const nuevos = raw
        .filter((row) => !idsExistentes.has(row.id))
        .map((row) => mensajeFromSupabase(row, { miId, otroId: otroUsuarioId }));

      if (nuevos.length === 0) return;

      await db.transaction('rw', db.mensajes, async () => {
        await db.mensajes.bulkPut(nuevos);
      });

      // FIX (heredado ago 2026 v2): borrar de mensajes_pendientes las
      // filas DIRIGIDAS A MÍ que este sync acaba de guardar localmente.
      // Ver comentario largo al inicio del archivo.
      const idsParaMi = nuevos
        .filter((m) => m.emisorId === otroUsuarioId)
        .map((m) => m.mensajeId);

      if (idsParaMi.length > 0) {
        try {
          await supabase.from('mensajes_pendientes').delete().in('id', idsParaMi);
        } catch (e) {
          console.warn('MensajeRepository.sincronizarDesdeSupabase, borrado de pendientes:', e);
        }
      }
    } catch (e) {
      console.warn('MensajeRepository.sincronizarDesdeSupabase:', e);
    }
  },

  // ── Envío ─────────────────────────────────────────────────────────────────

  async enviarMensaje({
    otroUsuarioId,
    otroNombre,
    otroNombreUsuario = null,
    otroAvatarUrl = null,
    contenido = null,
    tipo = TipoMensaje.TEXTO,
    mediaUrlRemota = null,
    mediaNombreArchivo = null,
    mediaTamanioBytes = null,
    mediaDuracionMs = null,
    mediaAncho = null,
    mediaAlto = null,
    mediaThumbnailUrl = null,
    contextoDescripcion = null,
    contextoImagenUrl = null,
    contextoLugar = null,
    contextoObjetoId = null,
    contextoTipo = null,
    respuestaAMensajeId = null,
    respuestaAContenido = null,
    respuestaATipo = null,
    respuestaAEmisorId = null,
  }) {
    const miId = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : null;
    if (!miId) return;

    const mensajeId = nuevoId();
    const ahora = new Date().toISOString();

    const msg = {
      mensajeId,
      chatOtroUsuarioId: otroUsuarioId,
      emisorId: miId,
      contenido,
      tipo,
      mediaUrlRemota,
      mediaNombreArchivo,
      mediaTamanioBytes,
      mediaDuracionMs,
      mediaAncho,
      mediaAlto,
      mediaThumbnailUrl,
      timestamp: ahora,
      estado: EstadoMensaje.ENVIANDO,
      contextoDescripcion,
      contextoImagenUrl,
      contextoLugar,
      contextoObjetoId,
      contextoTipo,
      respuestaAMensajeId,
      respuestaAContenido,
      respuestaATipo,
      respuestaAEmisorId,
      editado: false,
      eliminado: false,
    };

    await db.transaction('rw', db.mensajes, async () => {
      await db.mensajes.put(msg);
    });

    await ChatRepository.actualizarPreview({
      otroUsuarioId,
      otroNombre,
      otroNombreUsuario,
      otroAvatarUrl,
      ultimoMensaje: textoPreview(msg),
      fecha: ahora,
    });

    try {
      const { error } = await supabase.from('mensajes_pendientes').insert({
        id: mensajeId,
        remitente_id: miId,
        destinatario_id: otroUsuarioId,
        contenido: this._payloadWire(msg),
        tipo,
        media_url: mediaUrlRemota,
        contexto_descripcion: contextoDescripcion,
        contexto_imagen_url: contextoImagenUrl,
        contexto_lugar: contextoLugar,
        contexto_objeto_id: contextoObjetoId,
        contexto_tipo: contextoTipo,
        respuesta_a_id: respuestaAMensajeId,
        respuesta_a_contenido: respuestaAContenido,
        respuesta_a_tipo: respuestaATipo,
        respuesta_a_emisor_id: respuestaAEmisorId,
      });
      if (error) throw error;

      await db.transaction('rw', db.mensajes, async () => {
        const guardado = await db.mensajes.get(mensajeId);
        if (guardado) {
          guardado.estado = EstadoMensaje.ENTREGADO;
          await db.mensajes.put(guardado);
        }
      });
    } catch (e) {
      console.warn('MensajeRepository.enviarMensaje Supabase error:', e);
      await db.transaction('rw', db.mensajes, async () => {
        const guardado = await db.mensajes.get(mensajeId);
        if (guardado) {
          guardado.estado = EstadoMensaje.FALLIDO;
          await db.mensajes.put(guardado);
        }
      });
    }
  },

  // ── Editar mensaje ───────────────────────────────────────────────────────

  /// Solo puede editar mensajes propios. Actualiza local de inmediato
  /// (optimista), intenta actualizar la fila si sigue pendiente en la
  /// cola, y siempre inserta una acción para que el receptor la aplique
  /// vía Realtime aunque el mensaje original ya haya sido entregado.
  async editarMensaje({ msg, nuevoContenido, otroUsuarioId }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId || msg.emisorId !== miId || msg.eliminado) return;

    const contenidoLimpio = nuevoContenido.trim();
    if (!contenidoLimpio) return;

    await db.transaction('rw', db.mensajes, async () => {
      msg.contenido = contenidoLimpio;
      msg.editado = true;
      await db.mensajes.put(msg);
    });

    // FIX heredado: si este mensaje es el último de la conversación,
    // refleja el cambio también en el preview de la lista de chats.
    if (await this._esUltimoMensaje(otroUsuarioId, msg.mensajeId)) {
      await ChatRepository.actualizarUltimoMensajeTexto({
        otroUsuarioId,
        texto: textoPreview(msg),
      });
    }

    try {
      await supabase
        .from('mensajes_pendientes')
        .update({
          contenido: this._payloadWireConCaption(msg, contenidoLimpio),
          editado: true,
        })
        .eq('id', msg.mensajeId);
    } catch {
      // Si ya no existe en la cola (ya fue entregado), no pasa nada.
    }

    try {
      await supabase.from('mensajes_acciones').insert({
        mensaje_id: msg.mensajeId,
        remitente_id: miId,
        destinatario_id: otroUsuarioId,
        accion: 'editar',
        nuevo_contenido: contenidoLimpio,
      });
    } catch (e) {
      console.warn('MensajeRepository.editarMensaje acción remota:', e);
    }
  },

  // ── Eliminar mensaje (para todos) ───────────────────────────────────────

  async eliminarMensaje({ msg, otroUsuarioId }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId || msg.emisorId !== miId || msg.eliminado) return;

    await db.transaction('rw', db.mensajes, async () => {
      msg.eliminado = true;
      await db.mensajes.put(msg);
    });

    if (await this._esUltimoMensaje(otroUsuarioId, msg.mensajeId)) {
      await ChatRepository.actualizarUltimoMensajeTexto({
        otroUsuarioId,
        texto: 'Mensaje eliminado',
      });
    }

    try {
      await supabase.from('mensajes_pendientes').update({ eliminado: true }).eq('id', msg.mensajeId);
    } catch {
      /* noop */
    }

    try {
      await supabase.from('mensajes_acciones').insert({
        mensaje_id: msg.mensajeId,
        remitente_id: miId,
        destinatario_id: otroUsuarioId,
        accion: 'eliminar',
      });
    } catch (e) {
      console.warn('MensajeRepository.eliminarMensaje acción remota:', e);
    }
  },

  // ── Aplicar edición/eliminación que llegó del otro usuario ──────────────
  // Usado por RealtimeService al recibir una fila de `mensajes_acciones`.
  async aplicarAccionRemota({ mensajeId, accion, nuevoContenido = null }) {
    const existente = await db.mensajes.get(mensajeId);
    if (!existente) return;

    await db.transaction('rw', db.mensajes, async () => {
      if (accion === 'editar' && nuevoContenido != null) {
        existente.contenido = nuevoContenido;
        existente.editado = true;
      } else if (accion === 'eliminar') {
        existente.eliminado = true;
      }
      await db.mensajes.put(existente);
    });

    if (await this._esUltimoMensaje(existente.chatOtroUsuarioId, mensajeId)) {
      const texto = accion === 'eliminar' ? 'Mensaje eliminado' : textoPreview(existente);
      await ChatRepository.actualizarUltimoMensajeTexto({
        otroUsuarioId: existente.chatOtroUsuarioId,
        texto,
      });
    }
  },

  // ── Helper (idempotencia de recepción) ───────────────────────────────────
  // Usado por RealtimeService antes de procesar una fila de
  // mensajes_pendientes, para no volver a incrementar noLeidos si esa
  // fila ya se procesó antes.
  async existeMensaje(mensajeId) {
    const existente = await db.mensajes.get(mensajeId);
    return existente != null;
  },

  // ── Reacciones ────────────────────────────────────────────────────────────
  // reaccionesRaw se guarda como JSON { usuarioId: emoji } directo en la
  // fila de Dexie (mismo contrato que reaccionesRaw en Isar/Dart) — no
  // necesita su propia tabla local porque solo se lee junto con el
  // mensaje, nunca se filtra/busca por reacción.

  /// Pone (o reemplaza) mi reacción a [mensajeId].
  async reaccionar({ mensajeId, otroUsuarioId, emoji }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId) return;

    const msg = await db.mensajes.get(mensajeId);
    if (!msg || msg.eliminado) return;

    const actuales = leerReacciones(msg);
    actuales[miId] = emoji;

    await db.transaction('rw', db.mensajes, async () => {
      msg.reaccionesRaw = escribirReacciones(actuales);
      await db.mensajes.put(msg);
    });

    try {
      await supabase.from('mensaje_reacciones').upsert(
        {
          mensaje_id: mensajeId,
          usuario_id: miId,
          chat_otro_usuario_id: otroUsuarioId,
          emoji,
        },
        { onConflict: 'mensaje_id,usuario_id' },
      );
    } catch (e) {
      console.warn('MensajeRepository.reaccionar:', e);
    }
  },

  /// Quita mi reacción actual a [mensajeId], si tengo una.
  async quitarReaccion({ mensajeId, otroUsuarioId }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId) return;

    const msg = await db.mensajes.get(mensajeId);
    if (!msg) return;

    const actuales = leerReacciones(msg);
    if (!(miId in actuales)) return;
    delete actuales[miId];

    await db.transaction('rw', db.mensajes, async () => {
      msg.reaccionesRaw = escribirReacciones(actuales);
      await db.mensajes.put(msg);
    });

    try {
      await supabase.from('mensaje_reacciones').delete().eq('mensaje_id', mensajeId).eq('usuario_id', miId);
    } catch (e) {
      console.warn('MensajeRepository.quitarReaccion:', e);
    }
  },

  /// Aplica localmente una reacción (o su eliminación, si `emoji` es
  /// null) que llegó del otro usuario vía Realtime.
  async aplicarReaccionRemota({ mensajeId, usuarioId, emoji = null }) {
    const msg = await db.mensajes.get(mensajeId);
    if (!msg) return;

    const actuales = leerReacciones(msg);
    if (emoji == null) {
      delete actuales[usuarioId];
    } else {
      actuales[usuarioId] = emoji;
    }

    await db.transaction('rw', db.mensajes, async () => {
      msg.reaccionesRaw = escribirReacciones(actuales);
      await db.mensajes.put(msg);
    });
  },

  // ── Helper ────────────────────────────────────────────────────────────
  async _esUltimoMensaje(otroUsuarioId, mensajeId) {
    const lista = await db.mensajes
      .where('chatOtroUsuarioId')
      .equals(otroUsuarioId)
      .reverse()
      .sortBy('timestamp');
    return lista.length > 0 && lista[0].mensajeId === mensajeId;
  },

  // ── Reintentos ────────────────────────────────────────────────────────────

  async reintentarFallidos({ otroUsuarioId }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId) return;

    const fallidos = await db.mensajes
      .where('chatOtroUsuarioId')
      .equals(otroUsuarioId)
      .filter((m) => m.estado === EstadoMensaje.FALLIDO)
      .sortBy('timestamp');

    if (fallidos.length === 0) return;

    for (const msg of fallidos) {
      await this._reenviar(msg, miId, otroUsuarioId);
    }
  },

  async reintentarMensajeEspecifico({ msg, otroUsuarioId }) {
    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId) return;
    await this._reenviar(msg, miId, otroUsuarioId);
  },

  async _reenviar(msg, miId, otroUsuarioId) {
    await db.transaction('rw', db.mensajes, async () => {
      msg.estado = EstadoMensaje.ENVIANDO;
      await db.mensajes.put(msg);
    });

    try {
      const { error } = await supabase.from('mensajes_pendientes').upsert(
        {
          id: msg.mensajeId,
          remitente_id: miId,
          destinatario_id: otroUsuarioId,
          contenido: this._payloadWire(msg),
          tipo: msg.tipo,
          media_url: msg.mediaUrlRemota,
          contexto_descripcion: msg.contextoDescripcion,
          contexto_imagen_url: msg.contextoImagenUrl,
          contexto_lugar: msg.contextoLugar,
          contexto_objeto_id: msg.contextoObjetoId,
          contexto_tipo: msg.contextoTipo,
          respuesta_a_id: msg.respuestaAMensajeId,
          respuesta_a_contenido: msg.respuestaAContenido,
          respuesta_a_tipo: msg.respuestaATipo,
          respuesta_a_emisor_id: msg.respuestaAEmisorId,
        },
        { onConflict: 'id' }
      );
      if (error) throw error;

      await db.transaction('rw', db.mensajes, async () => {
        const guardado = await db.mensajes.get(msg.mensajeId);
        if (guardado) {
          guardado.estado = EstadoMensaje.ENTREGADO;
          await db.mensajes.put(guardado);
        }
      });
    } catch {
      await db.transaction('rw', db.mensajes, async () => {
        const guardado = await db.mensajes.get(msg.mensajeId);
        if (guardado) {
          guardado.estado = EstadoMensaje.FALLIDO;
          await db.mensajes.put(guardado);
        }
      });
    }
  },

  _payloadWire(msg) {
    if (msg.tipo === TipoMensaje.TEXTO) return msg.contenido || '';
    return empaquetarMetadata({
      caption: msg.contenido,
      nombreArchivo: msg.mediaNombreArchivo,
      tamanioBytes: msg.mediaTamanioBytes,
      duracionMs: msg.mediaDuracionMs,
      ancho: msg.mediaAncho,
      alto: msg.mediaAlto,
      thumbnailUrl: msg.mediaThumbnailUrl,
    });
  },

  /// Igual que _payloadWire pero permite pisar el caption/texto con un
  /// valor nuevo — usado al editar.
  _payloadWireConCaption(msg, nuevoTexto) {
    if (msg.tipo === TipoMensaje.TEXTO) return nuevoTexto;
    return empaquetarMetadata({
      caption: nuevoTexto,
      nombreArchivo: msg.mediaNombreArchivo,
      tamanioBytes: msg.mediaTamanioBytes,
      duracionMs: msg.mediaDuracionMs,
      ancho: msg.mediaAncho,
      alto: msg.mediaAlto,
      thumbnailUrl: msg.mediaThumbnailUrl,
    });
  },

  // ── Recepción ─────────────────────────────────────────────────────────────

  async guardarRecibido({
    mensajeId,
    remitenteId,
    contenidoRaw,
    tipo,
    mediaUrlRemota = null,
    timestamp,
    otroNombre,
    otroNombreUsuario = null,
    otroAvatarUrl = null,
    contextoDescripcion = null,
    contextoImagenUrl = null,
    contextoLugar = null,
    contextoObjetoId = null,
    contextoTipo = null,
    respuestaAMensajeId = null,
    respuestaAContenido = null,
    respuestaATipo = null,
    respuestaAEmisorId = null,
  }) {
    const msg = {
      mensajeId,
      chatOtroUsuarioId: remitenteId,
      emisorId: remitenteId,
      tipo,
      mediaUrlRemota,
      timestamp,
      estado: EstadoMensaje.RECIBIDO,
      contextoDescripcion,
      contextoImagenUrl,
      contextoLugar,
      contextoObjetoId,
      contextoTipo,
      respuestaAMensajeId,
      respuestaAContenido,
      respuestaATipo,
      respuestaAEmisorId,
      editado: false,
      eliminado: false,
    };

    if (esMedia(tipo)) {
      const meta = desempaquetarMetadata(contenidoRaw);
      msg.contenido = meta.caption ?? null;
      msg.mediaNombreArchivo = meta.nombreArchivo ?? null;
      msg.mediaTamanioBytes = meta.tamanioBytes ?? null;
      msg.mediaDuracionMs = meta.duracionMs ?? null;
      msg.mediaAncho = meta.ancho ?? null;
      msg.mediaAlto = meta.alto ?? null;
      msg.mediaThumbnailUrl = meta.thumbnailUrl ?? null;
    } else {
      msg.contenido = contenidoRaw;
    }

    await db.transaction('rw', db.mensajes, async () => {
      await db.mensajes.put(msg);
    });

    await ChatRepository.actualizarPreview({
      otroUsuarioId: remitenteId,
      otroNombre,
      otroNombreUsuario,
      otroAvatarUrl,
      ultimoMensaje: textoPreview(msg),
      fecha: timestamp,
      incrementarNoLeidos: true,
    });
  },
};