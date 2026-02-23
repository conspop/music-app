import type { DrizzleDb } from "~/db/connection";
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

  for (const artist of capped) {
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

  return summary;
}
