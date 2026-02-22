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

      const recent = albums.filter((a) => a.release_date >= cutoff);
      console.log(`${tag} ${recent.length} releases within the last year`);

      return recent.map(albumToExtractedItem);
    },
  };
}
