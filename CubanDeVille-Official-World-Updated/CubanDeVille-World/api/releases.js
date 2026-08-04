// /api/releases.js
// Reads Cuban DeVille's public Spotify catalogue server-side and returns the
// newest official release plus recent releases. Spotify credentials remain in
// Vercel environment variables and are never exposed to the browser.

const DEFAULT_ARTIST_ID = '6oTMQhViChy06Mf5vsYTk0';
const DEFAULT_MARKET = 'ZA';
const TOKEN_SAFETY_WINDOW_MS = 60 * 1000;
const RELEASE_CACHE_MS = 15 * 60 * 1000;
const RELEASE_CACHE_CONTROL = 'public, max-age=120, s-maxage=900, stale-while-revalidate=86400';

let tokenCache = { value: '', expiresAt: 0 };
let releaseCache = { value: null, expiresAt: 0 };

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(clientId, clientSecret, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && tokenCache.value && tokenCache.expiresAt > now + TOKEN_SAFETY_WINDOW_MS) {
    return tokenCache.value;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const response = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`Spotify token request failed with ${response.status}`);
  }

  const expiresInSeconds = Number(payload.expires_in) || 3600;
  tokenCache = {
    value: payload.access_token,
    expiresAt: now + (expiresInSeconds * 1000)
  };
  return tokenCache.value;
}

function releaseTimestamp(dateValue = '', precision = 'day') {
  const [year = '0', month = '1', day = '1'] = String(dateValue).split('-');
  const safeMonth = precision === 'year' ? '1' : month || '1';
  const safeDay = precision === 'day' ? day || '1' : '1';
  const timestamp = Date.parse(`${year}-${safeMonth.padStart(2, '0')}-${safeDay.padStart(2, '0')}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function releaseType(item) {
  if (item.album_type === 'album') return 'Album';
  if (item.album_type === 'compilation') return 'Compilation';
  return 'Single';
}

function normaliseRelease(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const artists = Array.isArray(item.artists)
    ? item.artists.map((artist) => artist && artist.name).filter(Boolean)
    : [];

  return {
    id: String(item.id || ''),
    name: String(item.name || '').trim(),
    url: String(item.external_urls && item.external_urls.spotify || ''),
    image: String(images[0] && images[0].url || ''),
    date: String(item.release_date || ''),
    precision: String(item.release_date_precision || 'day'),
    type: releaseType(item),
    totalTracks: Number(item.total_tracks) || 0,
    artists
  };
}

function uniqueReleases(items) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const release = normaliseRelease(item);
    if (!release.id || !release.name || !release.url) continue;

    // Spotify can return clean, explicit or market variants. Keep one visible
    // entry per title and release date so the website never shows duplicates.
    const key = `${release.name.toLocaleLowerCase('en')}|${release.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(release);
  }

  return output.sort((left, right) => {
    const dateDifference = releaseTimestamp(right.date, right.precision) - releaseTimestamp(left.date, left.precision);
    if (dateDifference !== 0) return dateDifference;
    return right.name.localeCompare(left.name, 'en');
  });
}

async function fetchArtistReleases({ artistId, market, clientId, clientSecret }) {
  let accessToken = await getAccessToken(clientId, clientSecret);
  const endpoint = new URL(`https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/albums`);
  endpoint.searchParams.set('include_groups', 'album,single');
  endpoint.searchParams.set('market', market);
  endpoint.searchParams.set('limit', '10');
  endpoint.searchParams.set('offset', '0');

  const request = () => fetchWithTimeout(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  let response = await request();
  if (response.status === 401) {
    accessToken = await getAccessToken(clientId, clientSecret, true);
    response = await request();
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.items)) {
    throw new Error(`Spotify catalogue request failed with ${response.status}`);
  }

  const releases = uniqueReleases(payload.items);
  if (!releases.length) throw new Error('Spotify returned no public releases');

  return {
    ok: true,
    artist: {
      id: artistId,
      name: releases[0].artists[0] || 'Cuban DeVille',
      url: `https://open.spotify.com/artist/${artistId}`
    },
    latest: releases[0],
    recent: releases.slice(1, 6),
    updatedAt: new Date().toISOString()
  };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const artistId = String(process.env.SPOTIFY_ARTIST_ID || DEFAULT_ARTIST_ID).trim();
  const market = String(process.env.SPOTIFY_MARKET || DEFAULT_MARKET).trim().toUpperCase();

  if (!clientId || !clientSecret) {
    return res.status(503).json({
      ok: false,
      error: 'Live Spotify catalogue is not configured. The curated website fallback remains active.'
    });
  }

  const now = Date.now();
  if (releaseCache.value && releaseCache.expiresAt > now) {
    res.setHeader('Cache-Control', RELEASE_CACHE_CONTROL);
    return res.status(200).json(releaseCache.value);
  }

  try {
    const data = await fetchArtistReleases({ artistId, market, clientId, clientSecret });
    releaseCache = { value: data, expiresAt: now + RELEASE_CACHE_MS };
    res.setHeader('Cache-Control', RELEASE_CACHE_CONTROL);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Spotify release sync failed:', error instanceof Error ? error.message : error);
    return res.status(502).json({
      ok: false,
      error: 'Spotify catalogue is temporarily unavailable. The curated website fallback remains active.'
    });
  }
};
