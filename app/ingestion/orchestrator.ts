import type { DrizzleDb } from "~/db/connection";
import { findAllContentItemIds } from "~/db/repositories/content-items.repository";
import { markPreExistingItemsAsSeen } from "~/db/repositories/content-item-seen.repository";
import { findFollowedArtists } from "~/db/repositories/follows.repository";
import type { ContentExtractor } from "./content-extractor";
import type { ReleaseProvider } from "./release-provider";
import type { IngestionConfig } from "./config";
import type { Geocoder } from "~/lib/geocoder";
import { ingestArtist } from "./ingest-artist";

export interface IngestionDeps {
  db: DrizzleDb;
  contentExtractor: ContentExtractor;
  releaseProvider?: ReleaseProvider;
  geocoder?: Geocoder;
  config: IngestionConfig;
}

export interface IngestionSummary {
  artistsProcessed: number;
  totalInserted: number;
  totalSkippedDupes: number;
  totalSkippedLowConfidence: number;
  totalErrors: number;
}

export async function runIngestion(deps: IngestionDeps): Promise<IngestionSummary> {
  const { db, contentExtractor, releaseProvider, geocoder, config } = deps;

  const preExistingItemIds = findAllContentItemIds(db);
  const artists = findFollowedArtists(db);
  const capped = artists.slice(0, config.MAX_ARTISTS_PER_RUN);

  console.log(
    `[ingestion] starting run for ${capped.length} artist(s): ${capped.map((a) => a.name).join(", ")}`,
  );
  if (releaseProvider) console.log("[ingestion] Spotify release provider active");

  const summary: IngestionSummary = {
    artistsProcessed: 0,
    totalInserted: 0,
    totalSkippedDupes: 0,
    totalSkippedLowConfidence: 0,
    totalErrors: 0,
  };

  for (let i = 0; i < capped.length; i++) {
    const artist = capped[i];
    if (releaseProvider && i > 0) {
      await new Promise((r) =>
        setTimeout(r, config.SPOTIFY_ARTIST_DELAY_MS),
      );
    }
    console.log(`[ingestion] processing "${artist.name}" (${artist.id})`);

    const result = await ingestArtist({
      db,
      contentExtractor,
      releaseProvider,
      geocoder,
      config,
      artist,
    });

    summary.artistsProcessed++;
    summary.totalInserted += result.inserted;
    summary.totalSkippedDupes += result.skippedDupes;
    summary.totalSkippedLowConfidence += result.skippedLowConfidence;
    summary.totalErrors += result.errors;
  }

  console.log(
    `[ingestion] complete: ${summary.artistsProcessed} artists, ${summary.totalInserted} inserted, ${summary.totalSkippedDupes} dupes, ${summary.totalErrors} errors`,
  );

  markPreExistingItemsAsSeen(db, preExistingItemIds);

  return summary;
}
