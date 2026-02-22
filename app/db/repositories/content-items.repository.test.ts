import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertArtist } from "./artists.repository";
import {
  insertContentItem,
  findContentItemsByArtist,
  findContentItemsByType,
  findContentItemsByDateRange,
  findContentItemByDedupeHash,
} from "./content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "ci1",
    type: "RELEASE" as const,
    artistId: "a1",
    title: "New Album Announced",
    url: "https://example.com/release/1",
    summary: "Exciting release",
    confidence: 0.95,
    dedupeHash: computeDedupeHash(
      "RELEASE",
      "a1",
      "https://example.com/release/1",
    ),
    publishedAt: new Date("2025-06-01"),
    createdAt: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("content-items repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
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
  });

  describe("insertContentItem", () => {
    it("inserts and returns the item", () => {
      const item = insertContentItem(db, makeItem());

      expect(item).toMatchObject({
        id: "ci1",
        type: "RELEASE",
        artistId: "a1",
        title: "New Album Announced",
      });
    });

    it("rejects duplicate dedupe hash", () => {
      insertContentItem(db, makeItem());

      expect(() =>
        insertContentItem(db, makeItem({ id: "ci2" })),
      ).toThrow();
    });

    it("allows same URL with different type (different hash)", () => {
      insertContentItem(db, makeItem());

      const eventItem = makeItem({
        id: "ci2",
        type: "EVENT",
        dedupeHash: computeDedupeHash(
          "EVENT",
          "a1",
          "https://example.com/release/1",
        ),
      });
      const inserted = insertContentItem(db, eventItem);
      expect(inserted.id).toBe("ci2");
    });
  });

  describe("findContentItemsByArtist", () => {
    it("returns items for the given artist", () => {
      insertContentItem(db, makeItem());
      insertContentItem(
        db,
        makeItem({
          id: "ci2",
          artistId: "a2",
          url: "https://example.com/release/2",
          dedupeHash: computeDedupeHash(
            "RELEASE",
            "a2",
            "https://example.com/release/2",
          ),
        }),
      );

      const results = findContentItemsByArtist(db, "a1");
      expect(results).toHaveLength(1);
      expect(results[0].artistId).toBe("a1");
    });
  });

  describe("findContentItemsByType", () => {
    it("returns items of the given type", () => {
      insertContentItem(db, makeItem());
      insertContentItem(
        db,
        makeItem({
          id: "ci2",
          type: "EVENT",
          url: "https://example.com/event/1",
          dedupeHash: computeDedupeHash(
            "EVENT",
            "a1",
            "https://example.com/event/1",
          ),
        }),
      );

      const releases = findContentItemsByType(db, "RELEASE");
      expect(releases).toHaveLength(1);
      expect(releases[0].type).toBe("RELEASE");

      const events = findContentItemsByType(db, "EVENT");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("EVENT");
    });
  });

  describe("findContentItemsByDateRange", () => {
    it("returns items within the date range", () => {
      insertContentItem(
        db,
        makeItem({
          id: "ci1",
          publishedAt: new Date("2025-06-01"),
        }),
      );
      insertContentItem(
        db,
        makeItem({
          id: "ci2",
          url: "https://example.com/release/2",
          dedupeHash: computeDedupeHash(
            "RELEASE",
            "a1",
            "https://example.com/release/2",
          ),
          publishedAt: new Date("2025-07-15"),
        }),
      );
      insertContentItem(
        db,
        makeItem({
          id: "ci3",
          url: "https://example.com/release/3",
          dedupeHash: computeDedupeHash(
            "RELEASE",
            "a1",
            "https://example.com/release/3",
          ),
          publishedAt: new Date("2025-08-30"),
        }),
      );

      const results = findContentItemsByDateRange(
        db,
        new Date("2025-06-15"),
        new Date("2025-08-01"),
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("ci2");
    });

    it("returns empty array when no items in range", () => {
      insertContentItem(db, makeItem());

      const results = findContentItemsByDateRange(
        db,
        new Date("2026-01-01"),
        new Date("2026-12-31"),
      );
      expect(results).toEqual([]);
    });
  });

  describe("findContentItemByDedupeHash", () => {
    it("returns the item when hash exists", () => {
      const item = makeItem();
      insertContentItem(db, item);

      const found = findContentItemByDedupeHash(db, item.dedupeHash);
      expect(found).toMatchObject({ id: "ci1", title: "New Album Announced" });
    });

    it("returns undefined when hash does not exist", () => {
      const found = findContentItemByDedupeHash(db, "nonexistent-hash");
      expect(found).toBeUndefined();
    });
  });
});
