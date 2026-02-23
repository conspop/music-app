import {
  getAccessToken,
  searchArtists,
  getArtistAlbums,
  type SpotifyAlbum,
} from "~/lib/spotify-client";
import type { ExtractedItem } from "./types";

export interface ReleaseProvider {
  fetchReleases(artist: {
    name: string;
    spotifyId?: string | null;
  }): Promise<ExtractedItem[]>;
}

function normalizeReleaseDate(date: string, precision: string): string {
  if (precision === "year") return `${date}-12-31`;
  if (precision === "month") {
    const [y, m] = date.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${date}-${String(lastDay).padStart(2, "0")}`;
  }
  return date;
}

function mapAlbumType(albumType: string): ExtractedItem["releaseType"] {
  if (albumType === "album" || albumType === "single" || albumType === "compilation") {
    return albumType;
  }
  return undefined;
}

function albumToExtractedItem(album: SpotifyAlbum): ExtractedItem {
  return {
    type: "RELEASE",
    title: album.name,
    url: album.external_urls.spotify,
    summary: `${album.total_tracks} track${album.total_tracks === 1 ? "" : "s"}`,
    imageUrl: album.images[0]?.url,
    publishedAt: album.release_date,
    releaseType: mapAlbumType(album.album_type),
    confidence: 1.0,
  };
}

export function createSpotifyReleaseProvider(
  clientId: string,
  clientSecret: string,
): ReleaseProvider {
  return {
    async fetchReleases(artist) {
      const tag = `[spotify:${artist.name}]`;

      let token: string;
      try {
        token = await getAccessToken(clientId, clientSecret);
      } catch (err) {
        console.error(`${tag} auth failed:`, err);
        return [];
      }

      let spotifyArtistId = artist.spotifyId;

      if (!spotifyArtistId) {
        const results = await searchArtists(token, artist.name, 1);
        spotifyArtistId = results[0]?.id ?? null;
        if (!spotifyArtistId) {
          console.warn(`${tag} artist not found on Spotify`);
          return [];
        }
      }

      const albums = await getArtistAlbums(token, spotifyArtistId);
      console.log(`${tag} found ${albums.length} releases on Spotify`);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoff = oneYearAgo.toISOString().slice(0, 10);

      const recent = albums.filter(
        (a) =>
          normalizeReleaseDate(a.release_date, a.release_date_precision) >= cutoff,
      );
      console.log(`${tag} ${recent.length} releases within the last year`);

      return recent.map(albumToExtractedItem);
    },
  };
}
