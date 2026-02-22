// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { insertArtist } from "~/db/repositories/artists.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { insertContentItem } from "~/db/repositories/content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { loader } from "./api.upcoming";

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

describe("api/upcoming", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    itemCounter = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01"));

    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
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

  function callLoader(request: Request) {
    return loader({ request, params: {}, context: {} } as any);
  }

  it("returns upcoming events for followed artists", async () => {
    insertContentItem(
      db,
      makeEvent({ eventDate: new Date("2025-08-15") }),
    );

    const request = await authedRequest("http://localhost/api/upcoming");
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("EVENT");
  });

  it("excludes past events", async () => {
    insertContentItem(
      db,
      makeEvent({ eventDate: new Date("2025-05-01") }),
    );

    const request = await authedRequest("http://localhost/api/upcoming");
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.events).toEqual([]);
  });

  it("supports limit and offset query params", async () => {
    for (let i = 0; i < 5; i++) {
      insertContentItem(
        db,
        makeEvent({ eventDate: new Date(`2025-08-0${i + 1}`) }),
      );
    }

    const request = await authedRequest(
      "http://localhost/api/upcoming?limit=2&offset=0",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.events).toHaveLength(2);
  });

  it("returns empty array when no events", async () => {
    const request = await authedRequest("http://localhost/api/upcoming");
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.events).toEqual([]);
  });

  it("redirects unauthenticated requests to /login", async () => {
    const request = new Request("http://localhost/api/upcoming");
    try {
      await callLoader(request);
      expect.fail("should have thrown a redirect");
    } catch (response: unknown) {
      const res = response as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/login");
    }
  });
});
