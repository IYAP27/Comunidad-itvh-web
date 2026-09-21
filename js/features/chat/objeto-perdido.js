// ═════════════════════════════════════════════════════════════════
// objeto-perdido.js — traducción del modelo ObjetoPerdido en
// CosasPerdidasPrincipal.dart
// ═════════════════════════════════════════════════════════════════

export function objetoPerdidoFromJson(j) {
  const perfil = j.perfiles || {};
  return {
    id: j.id,
    autorId: j.autor_id,
    descripcion: j.descripcion,
    lugar: j.lugar ?? null,
    imagenUrl: j.imagen_url ?? null,
    r2Path: j.r2_path ?? null,
    creadoEn: j.creado_en,
    expiraEn: j.expira_en,
    autorNombre: perfil.nombre || 'Estudiante',
    autorAvatar: perfil.cdn_foto_perfil ?? null,
    autorNombreUsuario: perfil.nombre_usuario ?? null,
  };
}
