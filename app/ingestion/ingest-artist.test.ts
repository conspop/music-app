import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { insertArtist } from "~/db/repositories/artists.repository";
import { findContentItemsByArtist } from "~/db/repositories/content-items.repository";
import { findLastIngestionRun } from "~/db/repositories/ingestion-runs.repository";
import { insertIngestionRun } from "~/db/repositories/ingestion-runs.repository";
import type { ContentExtractor } from "./content-extractor";
import type { ExtractedItem } from "./types";
import { INGESTION_CONFIG } from "./config";
import { ingestArtist } from "./ingest-artist";

function fakeExtractor(
  items: Record<string, ExtractedItem[]>,
): ContentExtractor {
  return {
    async extract({ type }) {
      return items[type] ?? [];
    },
  };
}

describe("ingestArtist", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    insertArtist(db, {
      id: "a1",
      name: "Radiohead",
      createdAt: new Date("2025-01-01"),
    });
  });

  it("extracts and inserts items for all three content types", async () => {
    const extractor = fakeExtractor({
      NEWS: [
        {
          type: "NEWS",
          title: "Tour Announced",
          url: "https://example.com/news/1",
          publishedAt: "2025-06-01",
          confidence: 0.9,
        },
      ],
      RELEASE: [
        {
          type: "RELEASE",
          title: "New Album",
          url: "https://example.com/release/1",
          publishedAt: "2025-06-15",
          confidence: 0.85,
        },
      ],
      EVENT: [
        {
          type: "EVENT",
          title: "Live in NYC",
          url: "https://example.com/event/1",
          eventDate: "2025-09-01",
          eventVenue: "MSG",
          eventCity: "New York",
          confidence: 0.95,
        },
      ],
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(3);
    expect(result.inserted).toBe(3);
  });

  it("records an ingestion run per type", async () => {
    const extractor = fakeExtractor({
      NEWS: [
        {
          type: "NEWS",
          title: "Article",
          url: "https://example.com/n/1",
          publishedAt: "2025-06-01",
          confidence: 0.9,
        },
      ],
      RELEASE: [],
      EVENT: [],
    });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const newsRun = findLastIngestionRun(db, "a1", "NEWS");
    const releaseRun = findLastIngestionRun(db, "a1", "RELEASE");
    const eventRun = findLastIngestionRun(db, "a1", "EVENT");

    expect(newsRun).toBeDefined();
    expect(newsRun!.itemsFound).toBe(1);
    expect(releaseRun).toBeDefined();
    expect(releaseRun!.itemsFound).toBe(0);
    expect(eventRun).toBeDefined();
    expect(eventRun!.itemsFound).toBe(0);
  });

  it("filters out items below MIN_CONFIDENCE", async () => {
    const extractor = fakeExtractor({
      NEWS: [
        {
          type: "NEWS",
          title: "High Confidence",
          url: "https://example.com/n/high",
          publishedAt: "2025-06-01",
          confidence: 0.9,
        },
        {
          type: "NEWS",
          title: "Low Confidence",
          url: "https://example.com/n/low",
          publishedAt: "2025-06-01",
          confidence: 0.3,
        },
      ],
      RELEASE: [],
      EVENT: [],
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("High Confidence");
    expect(result.inserted).toBe(1);
    expect(result.skippedLowConfidence).toBe(1);
  });

  it("skips duplicate items via dedupe hash", async () => {
    const newsItem: ExtractedItem = {
      type: "NEWS",
      title: "Same Article",
      url: "https://example.com/n/same",
      publishedAt: "2025-06-01",
      confidence: 0.9,
    };
    const extractor = fakeExtractor({
      NEWS: [newsItem],
      RELEASE: [],
      EVENT: [],
    });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(1);
    expect(result.inserted).toBe(0);
    expect(result.skippedDupes).toBe(1);
  });

  it("uses 30-day backfill for NEWS when no prior ingestion run exists", async () => {
    const capturedSinces: Record<string, Date> = {};
    const extractor: ContentExtractor = {
      async extract({ type, since }) {
        capturedSinces[type] = since;
        return [];
      },
    };

    const now = new Date("2025-07-15T12:00:00Z");
    vi.setSystemTime(now);

    await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    vi.useRealTimers();

    const expectedNewsSince = new Date("2025-06-15T12:00:00Z");
    expect(capturedSinces["NEWS"]!.getTime()).toBe(expectedNewsSince.getTime());
  });

  it("uses last ingestion run date for incremental NEWS extraction", async () => {
    const lastRunDate = new Date("2025-07-01");
    insertIngestionRun(db, {
      id: "run-1",
      artistId: "a1",
      type: "NEWS",
      ranAt: lastRunDate,
      itemsFound: 5,
    });

    const capturedSinces: Record<string, Date> = {};
    const extractor: ContentExtractor = {
      async extract({ type, since }) {
        capturedSinces[type] = since;
        return [];
      },
    };

    await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    expect(capturedSinces["NEWS"]).toEqual(lastRunDate);
  });

  it("uses 1-year window for RELEASE and today for EVENT", async () => {
    const capturedSinces: Record<string, Date> = {};
    const extractor: ContentExtractor = {
      async extract({ type, since }) {
        capturedSinces[type] = since;
        return [];
      },
    };

    const now = new Date("2025-07-15T12:00:00Z");
    vi.setSystemTime(now);

    await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    vi.useRealTimers();

    const releaseYear = capturedSinces["RELEASE"]!.getFullYear();
    expect(releaseYear).toBe(2024);

    const eventDate = capturedSinces["EVENT"]!;
    expect(eventDate.toISOString().slice(0, 10)).toBe("2025-07-15");
  });

  it("caps items per type at MAX_ITEMS_PER_TYPE", async () => {
    const manyItems: ExtractedItem[] = Array.from({ length: 30 }, (_, i) => ({
      type: "NEWS" as const,
      title: `Article ${i}`,
      url: `https://example.com/n/${i}`,
      publishedAt: "2025-06-01",
      confidence: 0.9,
    }));

    const extractor = fakeExtractor({
      NEWS: manyItems,
      RELEASE: [],
      EVENT: [],
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: { ...INGESTION_CONFIG, MAX_ITEMS_PER_TYPE: 5 },
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(5);
    expect(result.inserted).toBe(5);
  });

  it("handles items without a URL gracefully (skips them)", async () => {
    const extractor = fakeExtractor({
      NEWS: [
        {
          type: "NEWS",
          title: "No URL Item",
          url: "https://example.com/valid",
          publishedAt: "2025-06-01",
          confidence: 0.9,
        },
      ],
      RELEASE: [],
      EVENT: [],
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    expect(result.inserted).toBe(1);
  });
});
