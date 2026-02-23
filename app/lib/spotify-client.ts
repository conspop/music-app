const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const MAX_429_RETRIES = 3;
const TOKEN_BUFFER_SEC = 60;

let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

export function clearSpotifyTokenCache(): void {
  tokenCache = null;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const response = await fetch(url, init);
    if (response.status !== 429) return response;
    lastResponse = response;
    const retryAfter = response.headers.get("Retry-After");
    const waitSec = retryAfter ? Math.min(parseInt(retryAfter, 10) || 60, 300) : 60;
    if (attempt < MAX_429_RETRIES) {
      console.warn(`[spotify] 429 rate limit, waiting ${waitSec}s before retry (${attempt + 1}/${MAX_429_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
  return lastResponse!;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface SpotifyArtistResult {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const key = `${clientId}:${clientSecret}`;
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache?.key === key && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const response = await fetchWithRetry(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;
  const expiresIn = data.expires_in ?? 3600;
  tokenCache = {
    key,
    token: data.access_token,
    expiresAt: now + expiresIn - TOKEN_BUFFER_SEC,
  };
  return data.access_token;
}

export async function searchArtists(
  token: string,
  query: string,
  limit = 8,
): Promise<SpotifyArtistResult[]> {
  const params = new URLSearchParams({
    q: query,
    type: "artist",
    limit: String(limit),
  });

  const response = await fetchWithRetry(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    artists: { items: SpotifyArtistResult[] };
  };
  return data.artists.items;
}
