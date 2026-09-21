// ═════════════════════════════════════════════════════════════════
// jaguar-chat.js
//
// Módulo que shell.js carga para la pestaña "Jaguares" (contrato
// estándar de pestaña: export function render(contenedor)). Arma el
// shell de JaguarChatPrincipal (appbar + 4 páginas + pill flotante)
// con Chats, Maestros, Cosas Perdidas y Ajustes conectados.
//
// También es responsable de arrancar/detener RealtimeService: debe
// correr mientras el usuario esté dentro de este tab (los mensajes
// entrantes se escriben en Dexie vía Realtime, y la UI reacciona sola
// porque subscribeMensajes/subscribeChats son liveQuery).
// ═════════════════════════════════════════════════════════════════

import { esOscuroActual } from '../../core/theme.js';
import { JaguarChatPrincipal } from './jaguar-chat-principal.js';
import { ChatsScreen } from './chats-screen.js';
import { MaestrosScreen } from './maestros-screen.js';
import { CosasPerdidasScreen } from './cosas-perdidas-screen.js';
import { AjustesChatScreen } from './ajustes-chat-screen.js';
import { RealtimeService } from './realtime-service.js';
import { PresenceService } from './presence-service.js';

let _instanciaActual = null;

export function render(contenedor) {
  // Si ya había una instancia (el usuario salió y volvió a entrar al
  // tab), se destruye limpio antes de crear la nueva.
  _instanciaActual?.destroy();

  // JaguarChat necesita más ancho que el resto de la app (lista +
  // conversación lado a lado en escritorio) — el resto de las
  // pestañas usan la columna centrada normal de ~680px, pero aquí se
  // ensancha solo mientras este tab esté activo. Se pone en <html>
  // (no en `contenedor`) porque --app-max-width también controla el
  // grid de la sidebar (.shell-app), que es ANCESTRO de `contenedor`
  // — un override puesto en un descendiente no afecta a su ancestro.
  // shell.js resetea esta propiedad antes de cargar cualquier otra
  // pestaña, así que no se queda pegada si el usuario se va a
  // Comunidad/Market/etc.
  document.documentElement.style.setProperty('--app-max-width', '1100px');

  RealtimeService.iniciar();

  _instanciaActual = new JaguarChatPrincipal({
    container: contenedor,
    isDark: esOscuroActual(),
    screens: {
      chats: ChatsScreen,
      maestros: MaestrosScreen,
      perdidas: CosasPerdidasScreen,
      ajustes: AjustesChatScreen,
    },
  });
}

/// shell.js no llama esto todavía (no tiene un hook de "salir de tab"
/// genérico), pero queda expuesto por si se agrega más adelante para
/// no dejar el canal de Realtime corriendo de más cuando el usuario
/// se mueve a otra pestaña principal (Comunidad, Market, etc.).
export function destruir() {
  _instanciaActual?.destroy();
  _instanciaActual = null;
  RealtimeService.detener();
  PresenceService.detenerPresencia?.();
}
