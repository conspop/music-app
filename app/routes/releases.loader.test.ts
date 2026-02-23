// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { insertArtist } from "~/db/repositories/artists.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { insertContentItem } from "~/db/repositories/content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { contentItemSeen } from "~/db/schema";
import { loader } from "./releases";

const SECRET = "test-secret-at-least-32-chars-long!!";

function parseCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { getAppContext } from "~/server/context";
const mockedGetAppContext = vi.mocked(getAppContext);

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

describe("releases loader", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    itemCounter = 0;
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
      geocoder: {} as any,
    });

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
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });
  });

  async function authedRequest(url: string): Promise<Request> {
    const setCookie = await sessions.setUserId(
      new Request("http://localhost/"),
      "u1",
    );
    return new Request(url, {
      headers: { Cookie: parseCookie(setCookie) },
    });
  }

  async function callLoader(request: Request) {
    return loader({ request, params: {}, context: {} } as any);
  }

  it("returns items with isNew true for unseen items", async () => {
    insertContentItem(db, makeItem({ type: "RELEASE" }));

    const request = await authedRequest("http://localhost/releases");
    const result = await callLoader(request);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].isNew).toBe(true);
  });

  it("does not mark items as seen on visit - items stay new until next ingestion", async () => {
    insertContentItem(db, makeItem({ type: "RELEASE" }));

    const request = await authedRequest("http://localhost/releases");
    await callLoader(request);
    const result2 = await callLoader(request);

    expect(result2.items[0].isNew).toBe(true);
    const seen = db.select().from(contentItemSeen).all();
    expect(seen).toHaveLength(0);
  });

  it("returns items with isNew false when already in content_item_seen", async () => {
    const item = insertContentItem(db, makeItem({ type: "RELEASE" }));
    db.insert(contentItemSeen)
      .values({
        id: crypto.randomUUID(),
        userId: "u1",
        contentItemId: item.id,
        seenAt: new Date(),
      })
      .run();

    const request = await authedRequest("http://localhost/releases");
    const result = await callLoader(request);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].isNew).toBe(false);
  });

  it("filters to new items when ?new=1", async () => {
    const seenItem = insertContentItem(db, makeItem({ type: "RELEASE" }));
    insertContentItem(db, makeItem({ type: "RELEASE" }));
    db.insert(contentItemSeen)
      .values({
        id: crypto.randomUUID(),
        userId: "u1",
        contentItemId: seenItem.id,
        seenAt: new Date(),
      })
      .run();

    const request = await authedRequest("http://localhost/releases?new=1");
    const result = await callLoader(request);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).not.toBe(seenItem.id);
    expect(result.items[0].isNew).toBe(true);
  });

  it("filters by release type when ?types=album", async () => {
    insertContentItem(
      db,
      makeItem({ type: "RELEASE", releaseType: "album" }),
    );
    insertContentItem(
      db,
      makeItem({ type: "RELEASE", releaseType: "single" }),
    );

    const request = await authedRequest("http://localhost/releases?types=album");
    const result = await callLoader(request);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].releaseType).toBe("album");
  });
});
