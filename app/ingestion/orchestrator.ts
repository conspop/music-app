import type { DrizzleDb } from "~/db/connection";
import { findAllContentItemIds } from "~/db/repositories/content-items.repository";
import { markPreExistingItemsAsSeen } from "~/db/repositories/content-item-seen.repository";
import { findFollowedArtists } from "~/db/repositories/follows.repository";
import { createLogger } from "~/lib/logger";
import type { ContentExtractor } from "./content-extractor";
import type { IngestionConfig } from "./config";
import type { Geocoder } from "~/lib/geocoder";
import type { IngestionProgressTracker } from "./ingest-artist";
import { ingestArtist } from "./ingest-artist";

const log = createLogger("ingestion");

export interface IngestionDeps {
  db: DrizzleDb;
  contentExtractor: ContentExtractor;
  geocoder?: Geocoder;
  config: IngestionConfig;
  ingestionProgress?: IngestionProgressTracker;
}

export interface IngestionSummary {
  artistsProcessed: number;
  totalInserted: number;
  totalSkippedDupes: number;
  totalSkippedLowConfidence: number;
  totalErrors: number;
}

export async function runIngestion(deps: IngestionDeps): Promise<IngestionSummary> {
  const { db, contentExtractor, geocoder, config, ingestionProgress } = deps;

  const preExistingItemIds = findAllContentItemIds(db);
  const artists = findFollowedArtists(db);
  const capped = artists.slice(0, config.MAX_ARTISTS_PER_RUN);

  log.info(
    `starting run for ${capped.length} artist(s): ${capped.map((a) => a.name).join(", ")}`,
  );

  const summary: IngestionSummary = {
    artistsProcessed: 0,
    totalInserted: 0,
    totalSkippedDupes: 0,
    totalSkippedLowConfidence: 0,
    totalErrors: 0,
  };

  for (const artist of capped) {
    log.info(`processing "${artist.name}" (${artist.id})`);

    const result = await ingestArtist({
      db,
      contentExtractor,
      geocoder,
      config,
      artist,
      ingestionProgress,
    });

    summary.artistsProcessed++;
    summary.totalInserted += result.inserted;
    summary.totalSkippedDupes += result.skippedDupes;
    summary.totalSkippedLowConfidence += result.skippedLowConfidence;
    summary.totalErrors += result.errors;
  }

  log.info(
    `complete: ${summary.artistsProcessed} artists, ${summary.totalInserted} inserted, ${summary.totalSkippedDupes} dupes, ${summary.totalErrors} errors`,
  );

  markPreExistingItemsAsSeen(db, preExistingItemIds);

  return summary;
}
