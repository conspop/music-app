// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { insertArtist } from "~/db/repositories/artists.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { insertContentItem } from "~/db/repositories/content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { contentItemSeen } from "~/db/schema";
import { loader } from "./events";

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
function makeEvent(overrides: Record<string, unknown> = {}) {
  itemCounter++;
  const id = (overrides.id as string) ?? `ci${itemCounter}`;
  const artistId = (overrides.artistId as string) ?? "a1";
  const url =
    (overrides.url as string) ?? `https://example.com/event/${itemCounter}`;
  return {
    id,
    type: "EVENT",
    artistId,
    title: `Event ${itemCounter}`,
    url,
    summary: "A concert",
    confidence: 0.9,
    dedupeHash: computeDedupeHash("EVENT", artistId, url),
    publishedAt: new Date("2025-06-01"),
    eventDate: (overrides.eventDate as Date) ?? new Date("2025-08-15"),
    eventVenue: "The Venue",
    eventCity: "London",
    createdAt: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("events loader", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01"));

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

  afterEach(() => {
    vi.useRealTimers();
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

  it("returns events with isNew true for unseen events", async () => {
    insertContentItem(db, makeEvent());

    const request = await authedRequest("http://localhost/events");
    const result = await callLoader(request);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].isNew).toBe(true);
  });

  it("does not mark events as seen on visit - items stay new until next ingestion", async () => {
    insertContentItem(db, makeEvent());

    const request = await authedRequest("http://localhost/events");
    await callLoader(request);
    const result2 = await callLoader(request);

    expect(result2.events[0].isNew).toBe(true);
    const seen = db.select().from(contentItemSeen).all();
    expect(seen).toHaveLength(0);
  });

  it("returns events with isNew false when already in content_item_seen", async () => {
    const event = insertContentItem(db, makeEvent());
    db.insert(contentItemSeen)
      .values({
        id: crypto.randomUUID(),
        userId: "u1",
        contentItemId: event.id,
        seenAt: new Date(),
      })
      .run();

    const request = await authedRequest("http://localhost/events");
    const result = await callLoader(request);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].isNew).toBe(false);
  });
});
