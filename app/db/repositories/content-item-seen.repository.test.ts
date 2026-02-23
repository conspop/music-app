import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertUser } from "./users.repository";
import { insertArtist } from "./artists.repository";
import { insertContentItem } from "./content-items.repository";
import { followArtist } from "./follows.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { contentItemSeen } from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  markAsSeen,
  markPreExistingItemsAsSeen,
} from "./content-item-seen.repository";

describe("content-item-seen repository", () => {
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
      name: "Artist",
      createdAt: new Date("2025-01-01"),
    });
    insertContentItem(db, {
      id: "ci1",
      type: "RELEASE",
      artistId: "a1",
      title: "Album",
      confidence: 0.9,
      dedupeHash: computeDedupeHash("RELEASE", "a1", "https://example.com/1"),
      createdAt: new Date("2025-01-01"),
    });
    insertContentItem(db, {
      id: "ci2",
      type: "EVENT",
      artistId: "a1",
      title: "Concert",
      confidence: 0.9,
      dedupeHash: computeDedupeHash("EVENT", "a1", "https://example.com/2"),
      createdAt: new Date("2025-01-01"),
    });
  });

  it("inserts seen records for each content item id", () => {
    markAsSeen(db, "u1", ["ci1", "ci2"]);

    const rows = db
      .select()
      .from(contentItemSeen)
      .where(eq(contentItemSeen.userId, "u1"))
      .all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.contentItemId).sort()).toEqual(["ci1", "ci2"]);
  });

  it("does nothing when contentItemIds is empty", () => {
    markAsSeen(db, "u1", []);

    const rows = db.select().from(contentItemSeen).all();
    expect(rows).toHaveLength(0);
  });

  it("is idempotent - calling twice does not create duplicates", () => {
    markAsSeen(db, "u1", ["ci1"]);
    markAsSeen(db, "u1", ["ci1"]);

    const rows = db
      .select()
      .from(contentItemSeen)
      .where(eq(contentItemSeen.userId, "u1"))
      .all();
    expect(rows).toHaveLength(1);
  });

  it("markPreExistingItemsAsSeen marks items for all followers of their artists", () => {
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });
    insertUser(db, {
      id: "u2",
      googleId: "g2",
      email: "b@c.com",
      name: "User 2",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f2",
      userId: "u2",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });

    markPreExistingItemsAsSeen(db, ["ci1"]);

    const rows = db.select().from(contentItemSeen).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.userId).sort()).toEqual(["u1", "u2"]);
  });

  it("allows same content item seen by different users", () => {
    insertUser(db, {
      id: "u2",
      googleId: "g2",
      email: "b@c.com",
      name: "User 2",
      createdAt: new Date("2025-01-01"),
    });

    markAsSeen(db, "u1", ["ci1"]);
    markAsSeen(db, "u2", ["ci1"]);

    const rows = db.select().from(contentItemSeen).all();
    expect(rows).toHaveLength(2);
  });
});
