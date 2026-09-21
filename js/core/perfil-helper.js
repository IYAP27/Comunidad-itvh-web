// ═════════════════════════════════════════════════════════════════
// perfil-helper.js — traducción de perfil_helper.dart
//
// En Flutter esto navega con Navigator.push. En web, con hash
// routing, "navegar" es simplemente cambiar el hash — router.js
// (cuando le agreguemos la ruta /perfil/:id) se encarga de montar
// la pantalla correspondiente.
// ═════════════════════════════════════════════════════════════════

export function irAPerfilPublico(usuarioId) {
  window.location.hash = `#/perfil/${usuarioId}`;
}