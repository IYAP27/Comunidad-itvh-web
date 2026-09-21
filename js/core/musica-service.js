// musica-service.js — migración de `musica_service.dart`
// Provee: buscar(term), getTrending(limit), lookupById(id)

async function _fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function buscar(term, { limit = 25, country = 'mx' } = {}) {
  if (!term || term.trim().length === 0) return [];
  const q = encodeURIComponent(term.trim());
  const url = `https://itunes.apple.com/search?term=${q}&entity=song&media=music&limit=${limit}&country=${country}`;
  try {
    const data = await _fetchJson(url);
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((t) => t.previewUrl)
      .map(_fromItunes)
      .filter(Boolean);
  } catch (e) {
    console.error('musica-service.buscar error', e);
    return [];
  }
}

export async function lookupById(trackId, { country = 'mx' } = {}) {
  if (!trackId) return null;
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&country=${country}`;
  try {
    const data = await _fetchJson(url);
    const r = Array.isArray(data.results) && data.results[0];
    return r ? _fromItunes(r) : null;
  } catch (e) {
    console.error('musica-service.lookupById error', e);
    return null;
  }
}

export async function getTrending(limit = 10, { country = 'mx' } = {}) {
  // Usamos el feed RSS de iTunes para Top Songs como fuente de "trending".
  const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=${limit}/json`;
  try {
    const data = await _fetchJson(url);
    const entries = data?.feed?.entry || [];
    return entries.map((e) => {
      const id = e?.id?.attributes?.['im:id'] || null;
      const title = e?.['im:name']?.label || '';
      const artist = e?.['im:artist']?.label || '';
      const images = e?.['im:image'] || [];
      const artwork = images.length ? images[images.length - 1].label : null;
      return { id, title, artist, artwork };
    });
  } catch (e) {
    console.error('musica-service.getTrending error', e);
    return [];
  }
}

function _fromItunes(t) {
  if (!t) return null;
  const cover = (t.artworkUrl100 || '').replace('100x100', '250x250');
  return {
    id: t.trackId || t.collectionId || null,
    title: t.trackName || t.collectionName || '',
    artist: t.artistName || '',
    album: t.collectionName || '',
    artwork: cover,
    previewUrl: t.previewUrl || null,
    duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
  };
}

export default { buscar, getTrending, lookupById };
