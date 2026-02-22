import type { ExtractedItem } from "./types";

export interface ReleaseProvider {
  fetchReleases(artistName: string): Promise<ExtractedItem[]>;
}

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: string;
  external_urls: { spotify: string };
  images: SpotifyImage[];
  total_tracks: number;
  artists: SpotifyArtist[];
}

async function getAccessToken(
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

async function searchArtist(
  token: string,
  artistName: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: artistName,
    type: "artist",
    limit: "1",
  });

  const response = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    artists: { items: SpotifyArtist[] };
  };
  return data.artists.items[0]?.id ?? null;
}

async function getArtistAlbums(
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

function albumToExtractedItem(album: SpotifyAlbum): ExtractedItem {
  return {
    type: "RELEASE",
    title: album.name,
    url: album.external_urls.spotify,
    summary: `${album.album_type === "single" ? "Single" : "Album"} — ${album.total_tracks} track${album.total_tracks === 1 ? "" : "s"}`,
    imageUrl: album.images[0]?.url,
    publishedAt: album.release_date,
    confidence: 1.0,
  };
}

export function createSpotifyReleaseProvider(
  clientId: string,
  clientSecret: string,
): ReleaseProvider {
  return {
    async fetchReleases(artistName) {
      const tag = `[spotify:${artistName}]`;

      let token: string;
      try {
        token = await getAccessToken(clientId, clientSecret);
      } catch (err) {
        console.error(`${tag} auth failed:`, err);
        return [];
      }

      const artistId = await searchArtist(token, artistName);
      if (!artistId) {
        console.warn(`${tag} artist not found on Spotify`);
        return [];
      }

      const albums = await getArtistAlbums(token, artistId);
      console.log(`${tag} found ${albums.length} releases on Spotify`);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoff = oneYearAgo.toISOString().slice(0, 10);

      const recent = albums.filter((a) => a.release_date >= cutoff);
      console.log(`${tag} ${recent.length} releases within the last year`);

      return recent.map(albumToExtractedItem);
    },
  };
}
