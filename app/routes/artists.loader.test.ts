// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { insertArtist } from "~/db/repositories/artists.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { insertIngestionRun } from "~/db/repositories/ingestion-runs.repository";
import { loader } from "./artists";
import { ingestionProgress } from "~/ingestion/ingestion-progress";

const SECRET = "test-secret-at-least-32-chars-long!!";

function parseCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { getAppContext } from "~/server/context";
const mockedGetAppContext = vi.mocked(getAppContext);

describe("artists loader", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    ingestionProgress._clearForTest();
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
    insertArtist(db, {
      id: "a2",
      name: "Bjork",
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

  it("returns follows with lastIngestedAt when ingestion runs exist", async () => {
    insertIngestionRun(db, {
      id: "r1",
      artistId: "a1",
      type: "RELEASE",
      ranAt: new Date("2025-06-15T12:00:00Z"),
      itemsFound: 3,
    });

    const request = await authedRequest("http://localhost/artists");
    const result = await callLoader(request);

    const radiohead = result.follows.find((f) => f.artistId === "a1");
    expect(radiohead).toBeDefined();
    expect(radiohead!.lastIngestedAt).toEqual(new Date("2025-06-15T12:00:00Z"));

    const bjork = result.follows.find((f) => f.artistId === "a2");
    expect(bjork).toBeDefined();
    expect(bjork!.lastIngestedAt).toBeNull();
  });

  it("returns follows with lastIngestedAt as most recent across types", async () => {
    insertIngestionRun(db, {
      id: "r1",
      artistId: "a1",
      type: "RELEASE",
      ranAt: new Date("2025-06-01T12:00:00Z"),
      itemsFound: 1,
    });
    insertIngestionRun(db, {
      id: "r2",
      artistId: "a1",
      type: "EVENT",
      ranAt: new Date("2025-06-15T12:00:00Z"),
      itemsFound: 2,
    });

    const request = await authedRequest("http://localhost/artists");
    const result = await callLoader(request);

    const radiohead = result.follows.find((f) => f.artistId === "a1");
    expect(radiohead!.lastIngestedAt).toEqual(new Date("2025-06-15T12:00:00Z"));
  });

  it("returns isIngesting true when artist is in ingestion progress", async () => {
    ingestionProgress.add("a1");

    const request = await authedRequest("http://localhost/artists");
    const result = await callLoader(request);

    const radiohead = result.follows.find((f) => f.artistId === "a1");
    expect(radiohead!.isIngesting).toBe(true);

    const bjork = result.follows.find((f) => f.artistId === "a2");
    expect(bjork!.isIngesting).toBe(false);
  });
});
