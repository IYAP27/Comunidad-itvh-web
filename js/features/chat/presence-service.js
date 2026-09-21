// ═════════════════════════════════════════════════════════════════
// presence-service.js
//
// Equivalente web de presence_service.dart. Servicio de presencia en
// línea usando Supabase Realtime Presence. No requiere columna
// "last_seen" en la BD: Supabase detecta la desconexión
// automáticamente (heartbeat interno del canal) — igual en web que
// en mobile, incluso cuando se cierra la pestaña sin avisar.
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';

const NOMBRE_CANAL = 'presencia-global';

class PresenceServiceImpl {
  constructor() {
    this._canal = null;
    this._usuariosEnLinea = new Set();
    this._listeners = new Set();
    this._yaIniciado = false;
  }

  /// Snapshot inmediato del estado actual.
  get usuariosEnLineaActual() {
    return new Set(this._usuariosEnLinea);
  }

  /// Suscríbete a cambios en el set de UIDs en línea. callback(set) se
  /// llama de inmediato con el snapshot actual y en cada cambio.
  /// Devuelve una función para desuscribirte.
  subscribe(callback) {
    callback(this.usuariosEnLineaActual);
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  estaEnLinea(uid) {
    return this._usuariosEnLinea.has(uid);
  }

  /// Se une al canal de presencia y comienza a trackear al usuario
  /// actual como "en línea". Llamar justo después del login (o al
  /// abrir la app con sesión activa), igual que en main.dart.
  async iniciarPresencia() {
    if (this._yaIniciado) return;

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      console.debug('🔴 PresenceService: no hay uid, no se inicia');
      return;
    }
    console.debug('🟢 PresenceService: iniciando para uid=' + uid);

    this._canal = supabase.channel(NOMBRE_CANAL, {
      config: { presence: { key: uid } },
    });

    this._canal
      .on('presence', { event: 'sync' }, () => this._actualizarDesdePresenceState())
      .on('presence', { event: 'join' }, () => this._actualizarDesdePresenceState())
      .on('presence', { event: 'leave' }, () => this._actualizarDesdePresenceState())
      .subscribe(async (status) => {
        console.debug('🟡 PresenceService: status=' + status);
        if (status === 'SUBSCRIBED') {
          await this._canal.track({
            uid,
            conectado_desde: new Date().toISOString(),
          });
          console.debug('🟢 PresenceService: track() enviado para ' + uid);
        }
      });

    this._yaIniciado = true;
  }

  _actualizarDesdePresenceState() {
    if (!this._canal) return;
    const estado = this._canal.presenceState();

    this._usuariosEnLinea.clear();
    for (const presencias of Object.values(estado)) {
      for (const p of presencias) {
        if (p.uid) this._usuariosEnLinea.add(p.uid);
      }
    }
    console.debug('🔵 PresenceService: usuarios en línea ahora =', this._usuariosEnLinea);

    const snapshot = this.usuariosEnLineaActual;
    for (const listener of this._listeners) listener(snapshot);
  }

  /// Deja de trackear al usuario actual. Llamar al cerrar sesión, junto
  /// a RealtimeService.detener().
  async detenerPresencia() {
    if (this._canal) {
      await this._canal.untrack();
      await supabase.removeChannel(this._canal);
      this._canal = null;
    }
    this._yaIniciado = false;
    this._usuariosEnLinea.clear();
  }
}

export const PresenceService = new PresenceServiceImpl();