// ═════════════════════════════════════════════════════════════════
// realtime-service.js
//
// Equivalente web de realtime_service.dart. Mantiene sincronizados
// los mensajes entrantes en tiempo real sobre `mensajes_pendientes`
// (mensajes nuevos) y `mensajes_acciones` (ediciones/eliminaciones).
//
// FIX heredado (ago 2026, Dart) — _procesarMensaje es idempotente:
// (a) lock en memoria (_procesando) para que dos invocaciones
// concurrentes de la MISMA fila no corran a la vez, y (b) chequeo de
// si el mensaje ya existe localmente (MensajeRepository.existeMensaje)
// antes de incrementar noLeidos.
//
// NOTA WEB: acá hay una capa extra de cuidado que en mobile no
// aplica igual — los navegadores duermen el WebSocket cuando la
// pestaña pasa a background. Por eso se re-suscribe el canal cuando
// la pestaña vuelve a foco (visibilitychange) y se vuelve a correr
// el catch-up, igual que iniciar() se re-ejecuta en Dart al volver
// del background.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import { MensajeRepository } from './mensaje-repository.js';
import { ChatRepository } from './chat-repository.js';
import { textoPreview, mensajeFromSupabase } from './mensaje.js';

const CANAL_MENSAJES_PREFIX = 'mensajes_pendientes:';
const CANAL_ACCIONES_PREFIX = 'mensajes_acciones:';
const CANAL_REACCIONES_PREFIX = 'mensaje_reacciones:';

class RealtimeServiceImpl {
  constructor() {
    this._canalMensajes = null;
    this._canalAcciones = null;
    this._canalReacciones = null;
    this._iniciado = false;
    this._miId = null;
    // Lock en memoria: mensajeId → en proceso. Evita que dos
    // invocaciones concurrentes de _procesarMensaje para la misma fila
    // (callback del canal realtime vs. catch-up) corran en paralelo.
    this._procesando = new Set();
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
  }

  async iniciar() {
    await this.detener();

    const { data: userData } = await supabase.auth.getUser();
    const miId = userData?.user?.id;
    if (!miId) return;

    this._miId = miId;
    this._iniciado = true;

    this._canalMensajes = supabase
      .channel(`${CANAL_MENSAJES_PREFIX}${miId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_pendientes',
          filter: `destinatario_id=eq.${miId}`,
        },
        (payload) => this._procesarMensaje(payload.new, miId)
      )
      .subscribe();

    this._canalAcciones = supabase
      .channel(`${CANAL_ACCIONES_PREFIX}${miId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_acciones',
          filter: `destinatario_id=eq.${miId}`,
        },
        (payload) => this._procesarAccion(payload.new)
      )
      .subscribe();

    // Reacciones que la OTRA persona hace en cualquiera de mis chats.
    // Filtrado por chat_otro_usuario_id (no por usuario_id): esa columna
    // guarda, desde la perspectiva de quien reacciona, el id del otro
    // participante — así este canal recibe eventos sin importar en cuál
    // de mis conversaciones ocurrió la reacción. A diferencia de los
    // otros dos canales, estas filas NO se borran después de procesarlas
    // (mensaje_reacciones guarda el estado actual, no es una cola de
    // entrega) y se escuchan los 3 eventos (alguien reacciona, cambia su
    // reacción, o la quita).
    this._canalReacciones = supabase
      .channel(`${CANAL_REACCIONES_PREFIX}${miId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensaje_reacciones',
          filter: `chat_otro_usuario_id=eq.${miId}`,
        },
        (payload) => this._procesarReaccion(payload)
      )
      .subscribe();

    document.addEventListener('visibilitychange', this._onVisibilityChange);

    await new Promise((r) => setTimeout(r, 500));
    await this.procesarPendientes();
    await this.procesarAccionesPendientes();
  }

  // El navegador puede haber dormido el WebSocket mientras la pestaña
  // estaba en background. Al volver a foco, re-sincronizamos por si
  // se perdió algún evento — equivalente a que iniciar() se
  // re-ejecute al volver del background en Dart.
  _onVisibilityChange() {
    if (document.visibilityState === 'visible' && this._iniciado) {
      this.procesarPendientes();
      this.procesarAccionesPendientes();
    }
  }

  async procesarPendientes() {
    const miId = this._miId;
    if (!miId) return;

    try {
      const { data: pendientes, error } = await supabase
        .from('mensajes_pendientes')
        .select()
        .eq('destinatario_id', miId)
        .neq('remitente_id', miId)
        .order('creado_en', { ascending: true });

      if (error) throw error;

      for (const fila of pendientes || []) {
        await this._procesarMensaje(fila, miId);
      }
    } catch (e) {
      console.warn('RealtimeService.procesarPendientes:', e);
    }
  }

  async procesarAccionesPendientes() {
    const miId = this._miId;
    if (!miId) return;

    try {
      const { data: pendientes, error } = await supabase
        .from('mensajes_acciones')
        .select()
        .eq('destinatario_id', miId)
        .order('creado_en', { ascending: true });

      if (error) throw error;

      for (const fila of pendientes || []) {
        await this._procesarAccion(fila);
      }
    } catch (e) {
      console.warn('RealtimeService.procesarAccionesPendientes:', e);
    }
  }

  async _procesarMensaje(fila, miId) {
    const mensajeId = fila.id;
    const remitenteId = fila.remitente_id;

    if (remitenteId === miId) return;

    // Lock: si esta misma fila ya se está procesando en otra invocación
    // concurrente (canal realtime vs. catch-up), no arrancar una segunda.
    if (this._procesando.has(mensajeId)) return;
    this._procesando.add(mensajeId);

    try {
      // Idempotencia: si el mensaje ya se guardó localmente antes
      // (reproceso duplicado de la misma fila), no se vuelve a
      // incrementar noLeidos — solo se limpia la cola remota.
      const yaGuardado = await MensajeRepository.existeMensaje(mensajeId);
      if (yaGuardado) {
        try {
          await supabase.from('mensajes_pendientes').delete().eq('id', mensajeId);
        } catch {
          /* noop */
        }
        return;
      }

      const contenidoRaw = fila.contenido || '';
      const tipo = fila.tipo || 'texto';
      const mediaUrl = fila.media_url ?? null;
      const timestamp = fila.creado_en ? new Date(fila.creado_en).toISOString() : new Date().toISOString();

      let otroNombre = 'Usuario';
      let otroNombreUsuario = null;
      let otroAvatarUrl = null;

      try {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre, nombre_usuario, cdn_foto_perfil')
          .eq('id', remitenteId)
          .single();

        if (perfil) {
          otroNombre = perfil.nombre || 'Usuario';
          otroNombreUsuario = perfil.nombre_usuario ?? null;
          otroAvatarUrl = perfil.cdn_foto_perfil ?? null;
        }
      } catch {
        /* noop */
      }

      await MensajeRepository.guardarRecibido({
        mensajeId,
        remitenteId,
        contenidoRaw,
        tipo,
        mediaUrlRemota: mediaUrl,
        timestamp,
        otroNombre,
        otroNombreUsuario,
        otroAvatarUrl,
        contextoDescripcion: fila.contexto_descripcion ?? null,
        contextoImagenUrl: fila.contexto_imagen_url ?? null,
        contextoLugar: fila.contexto_lugar ?? null,
        contextoObjetoId: fila.contexto_objeto_id ?? null,
        contextoTipo: fila.contexto_tipo ?? null,
        respuestaAMensajeId: fila.respuesta_a_id ?? null,
        respuestaAContenido: fila.respuesta_a_contenido ?? null,
        respuestaATipo: fila.respuesta_a_tipo ?? null,
        respuestaAEmisorId: fila.respuesta_a_emisor_id ?? null,
      });

      // Notificación del navegador solo si el usuario ya dio permiso y
      // el chat no está silenciado. No mostramos el prompt automáticamente.
      try {
        const chat = await ChatRepository.obtenerChat(remitenteId);
        if (!chat?.silenciado && typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
          const msgPreview = mensajeFromSupabase(fila, { miId, otroId: remitenteId });
          const n = new Notification(otroNombre, {
            body: textoPreview(msgPreview) || 'Nuevo mensaje',
            icon: otroAvatarUrl || undefined,
            tag: `jaguarchat-${remitenteId}`,
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
      } catch (e) {
        console.debug('Notificación JaguarChat omitida:', e);
      }

      try {
        await supabase.from('mensajes_pendientes').delete().eq('id', mensajeId);
      } catch {
        /* noop */
      }
    } finally {
      this._procesando.delete(mensajeId);
    }
  }

  async _procesarAccion(fila) {
    const id = fila.id;
    const mensajeId = fila.mensaje_id;
    const accion = fila.accion;
    const nuevoContenido = fila.nuevo_contenido ?? null;

    try {
      await MensajeRepository.aplicarAccionRemota({ mensajeId, accion, nuevoContenido });
    } catch (e) {
      console.warn('RealtimeService._procesarAccion:', e);
    }

    try {
      await supabase.from('mensajes_acciones').delete().eq('id', id);
    } catch {
      /* noop */
    }
  }

  async _procesarReaccion(payload) {
    try {
      if (payload.eventType === 'DELETE') {
        const anterior = payload.old;
        const mensajeId = anterior?.mensaje_id;
        const usuarioId = anterior?.usuario_id;
        if (!mensajeId || !usuarioId) return;
        await MensajeRepository.aplicarReaccionRemota({ mensajeId, usuarioId, emoji: null });
        return;
      }

      const fila = payload.new;
      await MensajeRepository.aplicarReaccionRemota({
        mensajeId: fila.mensaje_id,
        usuarioId: fila.usuario_id,
        emoji: fila.emoji,
      });
    } catch (e) {
      console.warn('RealtimeService._procesarReaccion:', e);
    }
  }

  async detener() {
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this._canalMensajes) await supabase.removeChannel(this._canalMensajes);
    if (this._canalAcciones) await supabase.removeChannel(this._canalAcciones);
    if (this._canalReacciones) await supabase.removeChannel(this._canalReacciones);
    this._canalMensajes = null;
    this._canalAcciones = null;
    this._canalReacciones = null;
    this._iniciado = false;
    this._miId = null;
  }
}

export const RealtimeService = new RealtimeServiceImpl();