import { describe, it, expect } from "vitest";
import { createTestDb } from "../../tests/db-helpers";
import { insertUser } from "./repositories/users.repository";
import { insertArtist } from "./repositories/artists.repository";
import { insertContentItem } from "./repositories/content-items.repository";
import { computeDedupeHash } from "./dedupe";
import { contentItemSeen } from "~/db/schema";
import { eq } from "drizzle-orm";

describe("content_item_seen migration", () => {
  it("applies migration and allows insert/query of content_item_seen", () => {
    const db = createTestDb();

    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "test@example.com",
      name: "Test",
      createdAt: new Date(),
    });
    insertArtist(db, {
      id: "a1",
      name: "Artist",
      createdAt: new Date(),
    });
    insertContentItem(db, {
      id: "ci1",
      type: "RELEASE",
      artistId: "a1",
      title: "Title",
      confidence: 0.9,
      dedupeHash: computeDedupeHash("RELEASE", "a1", "https://example.com/1"),
      createdAt: new Date(),
    });

    const seenAt = new Date();
    db.insert(contentItemSeen).values({
      id: crypto.randomUUID(),
      userId: "u1",
      contentItemId: "ci1",
      seenAt,
    }).run();

    const rows = db
      .select()
      .from(contentItemSeen)
      .where(eq(contentItemSeen.userId, "u1"))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].contentItemId).toBe("ci1");
    expect(rows[0].userId).toBe("u1");
  });
});
