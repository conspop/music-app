import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { insertArtist } from "~/db/repositories/artists.repository";
import { insertUser } from "~/db/repositories/users.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { findContentItemsByArtist } from "~/db/repositories/content-items.repository";
import type { ContentExtractor } from "./content-extractor";
import type { ExtractedItem } from "./types";
import { INGESTION_CONFIG } from "./config";
import { runIngestion } from "./orchestrator";

function fakeExtractor(
  itemsByArtist: Record<string, Record<string, ExtractedItem[]>>,
): ContentExtractor {
  return {
    async extract({ artistName, type }) {
      return itemsByArtist[artistName]?.[type] ?? [];
    },
  };
}

describe("runIngestion", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a1",
      name: "Radiohead",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a2",
      name: "Bjork",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a3",
      name: "Portishead",
      createdAt: new Date("2025-01-01"),
    });
  });

  it("ingests content for all followed artists", async () => {
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f2",
      userId: "u1",
      artistId: "a2",
      createdAt: new Date("2025-01-01"),
    });

    const extractor = fakeExtractor({
      Radiohead: {
        NEWS: [
          {
            type: "NEWS",
            title: "Radiohead News",
            url: "https://example.com/rh",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
      Bjork: {
        RELEASE: [
          {
            type: "RELEASE",
            title: "Bjork Release",
            url: "https://example.com/bj",
            publishedAt: "2025-06-01",
            confidence: 0.85,
          },
        ],
      },
    });

    const summary = await runIngestion({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
    });

    expect(summary.totalInserted).toBe(2);
    expect(summary.artistsProcessed).toBe(2);

    const rhItems = findContentItemsByArtist(db, "a1");
    expect(rhItems).toHaveLength(1);

    const bjItems = findContentItemsByArtist(db, "a2");
    expect(bjItems).toHaveLength(1);
  });

  it("skips artists with no followers", async () => {
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });

    const extractor = fakeExtractor({
      Radiohead: {
        NEWS: [
          {
            type: "NEWS",
            title: "News",
            url: "https://example.com/news",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
      Portishead: {
        NEWS: [
          {
            type: "NEWS",
            title: "Should Not Appear",
            url: "https://example.com/nope",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
    });

    const summary = await runIngestion({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
    });

    expect(summary.artistsProcessed).toBe(1);
    const psItems = findContentItemsByArtist(db, "a3");
    expect(psItems).toHaveLength(0);
  });

  it("caps the number of artists per run", async () => {
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f2",
      userId: "u1",
      artistId: "a2",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f3",
      userId: "u1",
      artistId: "a3",
      createdAt: new Date("2025-01-01"),
    });

    const extractor = fakeExtractor({
      Radiohead: {
        NEWS: [
          {
            type: "NEWS",
            title: "RH",
            url: "https://example.com/1",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
      Bjork: {
        NEWS: [
          {
            type: "NEWS",
            title: "BJ",
            url: "https://example.com/2",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
      Portishead: {
        NEWS: [
          {
            type: "NEWS",
            title: "PH",
            url: "https://example.com/3",
            publishedAt: "2025-06-01",
            confidence: 0.9,
          },
        ],
      },
    });

    const summary = await runIngestion({
      db,
      contentExtractor: extractor,
      config: { ...INGESTION_CONFIG, MAX_ARTISTS_PER_RUN: 2 },
    });

    expect(summary.artistsProcessed).toBe(2);
  });

  it("returns empty summary when no artists are followed", async () => {
    const extractor = fakeExtractor({});

    const summary = await runIngestion({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
    });

    expect(summary.artistsProcessed).toBe(0);
    expect(summary.totalInserted).toBe(0);
  });

  it("aggregates errors from individual artist ingestions", async () => {
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });

    const extractor: ContentExtractor = {
      async extract() {
        throw new Error("API failure");
      },
    };

    const summary = await runIngestion({
      db,
      contentExtractor: extractor,
      config: INGESTION_CONFIG,
    });

    expect(summary.artistsProcessed).toBe(1);
    expect(summary.totalErrors).toBeGreaterThan(0);
  });
});
