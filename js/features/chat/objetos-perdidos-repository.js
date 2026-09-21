// ═════════════════════════════════════════════════════════════════
// objetos-perdidos-repository.js — traducción de la capa de datos en
// CosasPerdidasPrincipal.dart
// ═════════════════════════════════════════════════════════════════

import { supabase } from '../../core/supabase-client.js';
import * as StorageR2 from '../../core/storage-r2.js';
import { objetoPerdidoFromJson } from './objeto-perdido.js';

const TABLA = 'objetos_perdidos';

export const ObjetosPerdidosRepository = {
  /// Solo reportes que no han expirado (igual que el .gt('expira_en', now())
  /// de Dart) — la limpieza real de filas vencidas la hace un cron job en
  /// Supabase, esto es nada más el filtro de lectura.
  async cargar() {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*, perfiles(nombre, cdn_foto_perfil, nombre_usuario)')
      .gt('expira_en', new Date().toISOString())
      .order('creado_en', { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data || []).map(objetoPerdidoFromJson);
  },



  /// Carga un reporte concreto por id. Se usa en la pantalla de detalle y
  /// cuando se abre la tarjeta contextual desde JaguarChat. A diferencia de
  /// cargar(), aquí no filtramos por expira_en: si ya fue eliminado devuelve
  /// null y la UI muestra "ya no está disponible".
  async cargarPorId(id) {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*, perfiles(nombre, cdn_foto_perfil, nombre_usuario)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? objetoPerdidoFromJson(data) : null;
  },

  /// Sube la imagen (si hay) y crea el reporte. expira_en lo pone la
  /// base de datos sola (default now() + 7 días).
  async crear({ descripcion, lugar, file, autorId }) {
    let imagenUrl = null;
    let r2Path = null;

    if (file) {
      const objetoId = crypto.randomUUID();
      const subido = await StorageR2.subirImagenObjetoPerdido(file, autorId, objetoId);
      imagenUrl = subido.url;
      r2Path = subido.path;
    }

    const { error } = await supabase.from(TABLA).insert({
      autor_id: autorId,
      descripcion,
      lugar: lugar || null,
      imagen_url: imagenUrl,
      r2_path: r2Path,
    });
    if (error) throw error;
  },

  /// Borra el reporte y, si tenía imagen, también el archivo en R2.
  async eliminar(objeto) {
    const { error } = await supabase.from(TABLA).delete().eq('id', objeto.id);
    if (error) throw error;

    if (objeto.r2Path) {
      try {
        await StorageR2.eliminarDeR2('itvh-cosas-perdidas', objeto.r2Path);
      } catch (e) {
        // El reporte ya se borró; que falle la limpieza del archivo en R2
        // no debe bloquear al usuario ni deshacer el delete.
        console.warn('ObjetosPerdidosRepository.eliminar — no se pudo borrar de R2:', e);
      }
    }
  },
};
