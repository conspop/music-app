const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

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

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: string;
  external_urls: { spotify: string };
  images: SpotifyImage[];
  total_tracks: number;
  artists: { id: string; name: string }[];
}

export async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
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

  const response = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    artists: { items: SpotifyArtistResult[] };
  };
  return data.artists.items;
}

interface SpotifyAlbumsPage {
  items: SpotifyAlbum[];
  total: number;
  next: string | null;
}

const ALBUMS_PAGE_LIMIT = 10;
const ALBUMS_MAX_PAGES = 5;

export async function getArtistAlbums(
  token: string,
  artistId: string,
): Promise<SpotifyAlbum[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const all: SpotifyAlbum[] = [];

  let url: string | null =
    `${SPOTIFY_API_BASE}/artists/${artistId}/albums` +
    `?include_groups=album,single&limit=${ALBUMS_PAGE_LIMIT}`;

  for (let page = 0; url && page < ALBUMS_MAX_PAGES; page++) {
    const response = await fetch(url, { headers });
    if (!response.ok) break;

    const data = (await response.json()) as SpotifyAlbumsPage;
    all.push(...data.items);
    url = data.next;
  }

  return all;
}
