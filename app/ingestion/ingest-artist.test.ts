import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { insertArtist } from "~/db/repositories/artists.repository";
import { findContentItemsByArtist } from "~/db/repositories/content-items.repository";
import { findLastIngestionRun } from "~/db/repositories/ingestion-runs.repository";
import type { ContentExtractor } from "./content-extractor";
import type { ReleaseProvider } from "./release-provider";
import type { Geocoder } from "~/lib/geocoder";
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

function fakeReleaseProvider(
  items: ExtractedItem[],
): ReleaseProvider {
  return {
    async fetchReleases() { return items; },
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

  it("inserts items for both content types", async () => {
    const releaseProvider = fakeReleaseProvider([
      {
        type: "RELEASE",
        title: "New Album",
        url: "https://example.com/release/1",
        publishedAt: "2025-06-15",
        confidence: 0.85,
      },
    ]);
    const extractor = fakeExtractor({
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
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(2);
    expect(result.inserted).toBe(2);
  });

  it("records an ingestion run per type", async () => {
    const releaseProvider = fakeReleaseProvider([
      {
        type: "RELEASE",
        title: "Album",
        url: "https://example.com/r/1",
        publishedAt: "2025-06-01",
        confidence: 0.9,
      },
    ]);
    const extractor = fakeExtractor({ EVENT: [] });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const releaseRun = findLastIngestionRun(db, "a1", "RELEASE");
    const eventRun = findLastIngestionRun(db, "a1", "EVENT");

    expect(releaseRun).toBeDefined();
    expect(releaseRun!.itemsFound).toBe(1);
    expect(eventRun).toBeDefined();
    expect(eventRun!.itemsFound).toBe(0);
  });

  it("filters out items below MIN_CONFIDENCE", async () => {
    const releaseProvider = fakeReleaseProvider([
      {
        type: "RELEASE",
        title: "High Confidence",
        url: "https://example.com/r/high",
        publishedAt: "2025-06-01",
        confidence: 0.9,
      },
      {
        type: "RELEASE",
        title: "Low Confidence",
        url: "https://example.com/r/low",
        publishedAt: "2025-06-01",
        confidence: 0.3,
      },
    ]);
    const extractor = fakeExtractor({ EVENT: [] });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
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
    const releaseItem: ExtractedItem = {
      type: "RELEASE",
      title: "Same Album",
      url: "https://example.com/r/same",
      publishedAt: "2025-06-01",
      confidence: 0.9,
    };
    const releaseProvider = fakeReleaseProvider([releaseItem]);
    const extractor = fakeExtractor({ EVENT: [] });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(1);
    expect(result.inserted).toBe(0);
    expect(result.skippedDupes).toBe(1);
  });

  it("passes today as since date for EVENT extraction", async () => {
    const capturedSince: Date[] = [];
    const extractor: ContentExtractor = {
      async extract({ since }) {
        capturedSince.push(since);
        return [];
      },
    };

    const now = new Date("2025-07-15T12:00:00Z");
    vi.setSystemTime(now);

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider: fakeReleaseProvider([]),
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    vi.useRealTimers();

    expect(capturedSince).toHaveLength(1);
    expect(capturedSince[0].toISOString().slice(0, 10)).toBe("2025-07-15");
  });

  it("caps items per type at MAX_ITEMS_PER_TYPE", async () => {
    const manyItems: ExtractedItem[] = Array.from({ length: 30 }, (_, i) => ({
      type: "RELEASE" as const,
      title: `Album ${i}`,
      url: `https://example.com/r/${i}`,
      publishedAt: "2025-06-01",
      confidence: 0.9,
    }));

    const releaseProvider = fakeReleaseProvider(manyItems);
    const extractor = fakeExtractor({ EVENT: [] });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: { ...INGESTION_CONFIG, MAX_ITEMS_PER_TYPE: 5 },
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items).toHaveLength(5);
    expect(result.inserted).toBe(5);
  });

  it("does not call OpenAI for releases", async () => {
    const extractCalls: string[] = [];
    const extractor: ContentExtractor = {
      async extract({ type }) {
        extractCalls.push(type);
        return [];
      },
    };

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider: fakeReleaseProvider([]),
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    expect(extractCalls).toEqual(["EVENT"]);
  });

  it("stores releaseType from Spotify items", async () => {
    const releaseProvider = fakeReleaseProvider([
      {
        type: "RELEASE",
        title: "My Single",
        url: "https://example.com/r/single",
        publishedAt: "2025-06-01",
        releaseType: "single",
        confidence: 1.0,
      },
      {
        type: "RELEASE",
        title: "My Album",
        url: "https://example.com/r/album",
        publishedAt: "2025-06-01",
        releaseType: "album",
        confidence: 1.0,
      },
    ]);
    const extractor = fakeExtractor({ EVENT: [] });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    const single = items.find((i) => i.title === "My Single");
    const album = items.find((i) => i.title === "My Album");
    expect(single?.releaseType).toBe("single");
    expect(album?.releaseType).toBe("album");
  });

  it("stores null releaseType when not provided", async () => {
    const releaseProvider = fakeReleaseProvider([
      {
        type: "RELEASE",
        title: "Unknown Type",
        url: "https://example.com/r/unknown",
        publishedAt: "2025-06-01",
        confidence: 1.0,
      },
    ]);
    const extractor = fakeExtractor({ EVENT: [] });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    const items = findContentItemsByArtist(db, "a1");
    expect(items[0].releaseType).toBeNull();
  });

  it("inserts no releases when Spotify provider throws", async () => {
    const releaseProvider: ReleaseProvider = {
      async fetchReleases(_artist) { throw new Error("Spotify down"); },
    };
    const extractor = fakeExtractor({ EVENT: [] });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    expect(result.inserted).toBe(0);
    const releases = findContentItemsByArtist(db, "a1").filter(i => i.type === "RELEASE");
    expect(releases).toHaveLength(0);
  });

  it("skips releases when no release provider is configured", async () => {
    const extractor = fakeExtractor({ EVENT: [] });

    const result = await ingestArtist({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
      artist: { id: "a1", name: "Radiohead" },
    });

    expect(result.inserted).toBe(0);
    const releases = findContentItemsByArtist(db, "a1").filter(i => i.type === "RELEASE");
    expect(releases).toHaveLength(0);
  });

  it("geocodes events without coordinates when geocoder is provided", async () => {
    const geocoder: Geocoder = {
      search: vi.fn().mockResolvedValue([
        {
          displayName: "Toronto, Ontario, Canada",
          city: "Toronto",
          region: "Ontario",
          country: "Canada",
          lat: 43.6532,
          lng: -79.3832,
        },
      ]),
    };
    const extractor = fakeExtractor({
      EVENT: [
        {
          type: "EVENT",
          title: "Show at Roy Thomson Hall",
          url: "https://example.com/event/toronto",
          eventDate: "2025-10-15",
          eventVenue: "Roy Thomson Hall",
          eventCity: "Toronto",
          confidence: 0.95,
        },
      ],
    });

    await ingestArtist({
      db,
      contentExtractor: extractor,
      releaseProvider: fakeReleaseProvider([]),
      geocoder,
      config: { ...INGESTION_CONFIG, GEOCODE_DELAY_MS: 0 },
      artist: { id: "a1", name: "Radiohead" },
    });

    const events = findContentItemsByArtist(db, "a1").filter((i) => i.type === "EVENT");
    expect(events).toHaveLength(1);
    expect(events[0].eventLat).toBe(43.6532);
    expect(events[0].eventLng).toBe(-79.3832);
    expect(geocoder.search).toHaveBeenCalledWith("Roy Thomson Hall, Toronto");
  });
});
