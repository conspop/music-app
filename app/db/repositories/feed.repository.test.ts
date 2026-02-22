import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertUser } from "./users.repository";
import { insertArtist } from "./artists.repository";
import { followArtist } from "./follows.repository";
import { insertContentItem } from "./content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { findFeedItems } from "./feed.repository";

let itemCounter = 0;
function makeItem(overrides: Record<string, unknown> = {}) {
  itemCounter++;
  const id = (overrides.id as string) ?? `ci${itemCounter}`;
  const type = (overrides.type as string) ?? "RELEASE";
  const artistId = (overrides.artistId as string) ?? "a1";
  const url =
    (overrides.url as string) ?? `https://example.com/item/${itemCounter}`;
  return {
    id,
    type,
    artistId,
    title: `Item ${itemCounter}`,
    url,
    summary: "Summary",
    confidence: 0.9,
    dedupeHash: computeDedupeHash(type, artistId, url),
    publishedAt: (overrides.publishedAt as Date) ?? new Date("2025-06-01"),
    createdAt: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("feed repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    itemCounter = 0;
    db = createTestDb();
    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
    insertUser(db, {
      id: "u2",
      googleId: "g2",
      email: "b@c.com",
      name: "Other",
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
  });

  it("returns RELEASE items for followed artists", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));
    insertContentItem(db, makeItem({ artistId: "a2", type: "RELEASE" }));

    const items = findFeedItems(db, "u1");
    expect(items).toHaveLength(2);
  });

  it("excludes EVENT-type items", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));
    insertContentItem(db, makeItem({ artistId: "a1", type: "EVENT" }));

    const items = findFeedItems(db, "u1");
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("RELEASE");
  });

  it("excludes items from unfollowed artists", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));
    insertContentItem(db, makeItem({ artistId: "a3", type: "RELEASE" }));

    const items = findFeedItems(db, "u1");
    expect(items).toHaveLength(1);
    expect(items[0].artistId).toBe("a1");
  });

  it("orders by publishedAt descending", () => {
    insertContentItem(
      db,
      makeItem({
        artistId: "a1",
        type: "RELEASE",
        publishedAt: new Date("2025-06-01"),
      }),
    );
    insertContentItem(
      db,
      makeItem({
        artistId: "a1",
        type: "RELEASE",
        publishedAt: new Date("2025-07-01"),
      }),
    );

    const items = findFeedItems(db, "u1");
    expect(new Date(items[0].publishedAt!).getTime()).toBeGreaterThan(
      new Date(items[1].publishedAt!).getTime(),
    );
  });

  it("supports limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      insertContentItem(
        db,
        makeItem({
          artistId: "a1",
          type: "RELEASE",
          publishedAt: new Date(`2025-06-0${i + 1}`),
        }),
      );
    }

    const page1 = findFeedItems(db, "u1", { limit: 2, offset: 0 });
    expect(page1).toHaveLength(2);

    const page2 = findFeedItems(db, "u1", { limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);

    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it("returns empty array when user has no follows", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));

    const items = findFeedItems(db, "u2");
    expect(items).toEqual([]);
  });

  it("returns empty array when no content exists", () => {
    const items = findFeedItems(db, "u1");
    expect(items).toEqual([]);
  });

  it("filters by artistIds when specified", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));
    insertContentItem(db, makeItem({ artistId: "a2", type: "RELEASE" }));

    const items = findFeedItems(db, "u1", { artistIds: ["a1"] });
    expect(items).toHaveLength(1);
    expect(items[0].artistId).toBe("a1");
  });

  it("returns items for multiple artistIds", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));
    insertContentItem(db, makeItem({ artistId: "a2", type: "RELEASE" }));

    const items = findFeedItems(db, "u1", { artistIds: ["a1", "a2"] });
    expect(items).toHaveLength(2);
  });

  it("includes artistName in results", () => {
    insertContentItem(db, makeItem({ artistId: "a1", type: "RELEASE" }));

    const items = findFeedItems(db, "u1");
    expect(items[0].artistName).toBe("Radiohead");
  });
});
