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

export async function getArtistAlbums(
  token: string,
  artistId: string,
): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({
    include_groups: "album,single",
    limit: "50",
  });

  const response = await fetch(
    `${SPOTIFY_API_BASE}/artists/${artistId}/albums?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) return [];

  const data = (await response.json()) as { items: SpotifyAlbum[] };
  return data.items;
}
