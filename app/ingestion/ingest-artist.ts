import type { DrizzleDb } from "~/db/connection";
import { computeDedupeHash } from "~/db/dedupe";
import {
  insertContentItem,
  findContentItemByDedupeHash,
} from "~/db/repositories/content-items.repository";
import {
  insertIngestionRun,
  findLastIngestionRun,
} from "~/db/repositories/ingestion-runs.repository";
import type { ContentExtractor } from "./content-extractor";
import type { IngestionConfig } from "./config";
import { CONTENT_TYPES, type ContentType, type ExtractedItem } from "./types";

function safeDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export interface IngestArtistDeps {
  db: DrizzleDb;
  contentExtractor: ContentExtractor;
  config: IngestionConfig;
  artist: { id: string; name: string };
}

export interface IngestArtistResult {
  inserted: number;
  skippedDupes: number;
  skippedLowConfidence: number;
  errors: number;
}

function getSinceDate(
  db: DrizzleDb,
  artistId: string,
  type: ContentType,
  backfillDays: number,
): Date {
  if (type === "RELEASE") {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  if (type === "EVENT") {
    return new Date();
  }

  const lastRun = findLastIngestionRun(db, artistId, type);
  if (lastRun) return lastRun.ranAt;

  const now = Date.now();
  return new Date(now - backfillDays * 24 * 60 * 60 * 1000);
}

function processItems(
  db: DrizzleDb,
  artistId: string,
  type: ContentType,
  items: ExtractedItem[],
  config: IngestionConfig,
): Pick<IngestArtistResult, "inserted" | "skippedDupes" | "skippedLowConfidence"> {
  let inserted = 0;
  let skippedDupes = 0;
  let skippedLowConfidence = 0;

  const capped = items.slice(0, config.MAX_ITEMS_PER_TYPE);

  for (const item of capped) {
    if (item.confidence < config.MIN_CONFIDENCE) {
      skippedLowConfidence++;
      continue;
    }

    const url = item.url;
    if (!url) continue;

    const dedupeHash = computeDedupeHash(type, artistId, url);
    if (findContentItemByDedupeHash(db, dedupeHash)) {
      skippedDupes++;
      continue;
    }

    insertContentItem(db, {
      id: crypto.randomUUID(),
      type,
      artistId,
      title: item.title,
      url: item.url,
      summary: item.summary ?? null,
      imageUrl: "imageUrl" in item ? (item.imageUrl ?? null) : null,
      confidence: item.confidence,
      dedupeHash,
      publishedAt:
        "publishedAt" in item
          ? safeDate(item.publishedAt)
          : null,
      eventDate:
        "eventDate" in item
          ? safeDate(item.eventDate)
          : null,
      eventVenue: "eventVenue" in item ? (item.eventVenue ?? null) : null,
      eventCity: "eventCity" in item ? (item.eventCity ?? null) : null,
      eventLat: "eventLat" in item ? (item.eventLat ?? null) : null,
      eventLng: "eventLng" in item ? (item.eventLng ?? null) : null,
      createdAt: new Date(),
    });

    inserted++;
  }

  return { inserted, skippedDupes, skippedLowConfidence };
}

export async function ingestArtist(
  deps: IngestArtistDeps,
): Promise<IngestArtistResult> {
  const { db, contentExtractor, config, artist } = deps;
  const totals: IngestArtistResult = {
    inserted: 0,
    skippedDupes: 0,
    skippedLowConfidence: 0,
    errors: 0,
  };

  for (const type of CONTENT_TYPES) {
    const since = getSinceDate(db, artist.id, type, config.BACKFILL_DAYS);
    const tag = `[ingest:${type}:${artist.name}]`;
    console.log(`${tag} since=${since.toISOString().slice(0, 10)}`);

    let items: ExtractedItem[];
    try {
      items = await contentExtractor.extract({
        artistName: artist.name,
        type,
        since,
      });
    } catch (err) {
      console.error(`${tag} extraction threw:`, err);
      totals.errors++;
      continue;
    }

    console.log(`${tag} ${items.length} items from extractor`);

    const result = processItems(db, artist.id, type, items, config);
    totals.inserted += result.inserted;
    totals.skippedDupes += result.skippedDupes;
    totals.skippedLowConfidence += result.skippedLowConfidence;

    console.log(
      `${tag} inserted=${result.inserted} dupes=${result.skippedDupes} lowConf=${result.skippedLowConfidence}`,
    );

    insertIngestionRun(db, {
      id: crypto.randomUUID(),
      artistId: artist.id,
      type,
      ranAt: new Date(),
      itemsFound: result.inserted,
    });
  }

  return totals;
}
