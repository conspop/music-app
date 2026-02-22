import type { DrizzleDb } from "~/db/connection";
import { computeDedupeHash } from "~/db/dedupe";
import {
  insertContentItem,
  findContentItemByDedupeHash,
} from "~/db/repositories/content-items.repository";
import {
  insertIngestionRun,
} from "~/db/repositories/ingestion-runs.repository";
import type { ContentExtractor } from "./content-extractor";
import type { ReleaseProvider } from "./release-provider";
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
  releaseProvider?: ReleaseProvider;
  config: IngestionConfig;
  artist: { id: string; name: string; spotifyId?: string | null };
}

export interface IngestArtistResult {
  inserted: number;
  skippedDupes: number;
  skippedLowConfidence: number;
  errors: number;
}

function getSinceDate(type: ContentType): Date {
  if (type === "RELEASE") {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  // EVENT: from today onwards
  return new Date();
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

async function fetchItemsForType(
  deps: IngestArtistDeps,
  type: ContentType,
  since: Date,
): Promise<ExtractedItem[]> {
  const { contentExtractor, releaseProvider, artist } = deps;
  const tag = `[ingest:${type}:${artist.name}]`;

  if (type === "RELEASE" && releaseProvider) {
    let providerItems: ExtractedItem[] = [];
    try {
      providerItems = await releaseProvider.fetchReleases(artist);
      console.log(`${tag} ${providerItems.length} items from Spotify`);
    } catch (err) {
      console.error(`${tag} Spotify provider threw:`, err);
    }

    let aiItems: ExtractedItem[] = [];
    try {
      aiItems = await contentExtractor.extract({
        artistName: artist.name,
        type,
        since,
      });
      console.log(`${tag} ${aiItems.length} items from OpenAI`);
    } catch (err) {
      console.error(`${tag} OpenAI extraction threw:`, err);
    }

    return [...providerItems, ...aiItems];
  }

  return contentExtractor.extract({
    artistName: artist.name,
    type,
    since,
  });
}

export async function ingestArtist(
  deps: IngestArtistDeps,
): Promise<IngestArtistResult> {
  const { db, config, artist } = deps;
  const totals: IngestArtistResult = {
    inserted: 0,
    skippedDupes: 0,
    skippedLowConfidence: 0,
    errors: 0,
  };

  for (const type of CONTENT_TYPES) {
    const since = getSinceDate(type);
    const tag = `[ingest:${type}:${artist.name}]`;
    console.log(`${tag} since=${since.toISOString().slice(0, 10)}`);

    let items: ExtractedItem[];
    try {
      items = await fetchItemsForType(deps, type, since);
    } catch (err) {
      console.error(`${tag} extraction threw:`, err);
      totals.errors++;
      continue;
    }

    console.log(`${tag} ${items.length} items total`);

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
