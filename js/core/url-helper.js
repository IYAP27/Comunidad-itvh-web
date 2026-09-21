// url-helper.js
// Helper centralizado para resolver URLs públicas de medios.
// Prioridad: cdn_url (R2) → path en Supabase Storage → '' (placeholder)

import { supabase } from './supabase-client.js';
import { BUCKETS, DOMINIOS } from './r2-config.js';

export function resolverUrl(cdnUrl, supabasePath, bucket) {
  if (cdnUrl) return cdnUrl;

  if (supabasePath) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(supabasePath);
    return data.publicUrl;
  }

  return '';
}

export function resolverUrlMedio(medio) {
  return resolverUrl(medio.cdn_url, medio.url, BUCKETS.publicaciones);
}

export function resolverUrlHistoria(historia) {
  return resolverUrl(historia.cdn_url, historia.media_url, BUCKETS.historias);
}

export function resolverUrlPerfil(perfil) {
  return resolverUrl(perfil.cdn_foto_perfil, perfil.foto_perfil, BUCKETS.perfil);
}

export function resolverUrlMarketplace(imagen) {
  return imagen.r2_url ?? DOMINIOS.marketplace ?? '';
}