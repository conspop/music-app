// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { insertArtist } from "~/db/repositories/artists.repository";
import { followArtist } from "~/db/repositories/follows.repository";
import { loader, action } from "./api.follows";

const SECRET = "test-secret-at-least-32-chars-long!!";

function parseCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

vi.mock("~/ingestion/ingest-artist", () => ({
  ingestArtist: vi.fn().mockResolvedValue({
    inserted: 0,
    skippedDupes: 0,
    skippedLowConfidence: 0,
    errors: 0,
  }),
}));

import { getAppContext } from "~/server/context";
import { ingestArtist } from "~/ingestion/ingest-artist";
const mockedGetAppContext = vi.mocked(getAppContext);
const mockedIngestArtist = vi.mocked(ingestArtist);

describe("api/follows", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;
  const fakeContentExtractor = { extract: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    fakeContentExtractor.extract.mockClear();
    mockedIngestArtist.mockClear();
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: fakeContentExtractor as any,
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
  });

  async function authedRequest(
    url: string,
    init?: RequestInit,
  ): Promise<Request> {
    const setCookie = await sessions.setUserId(
      new Request("http://localhost/"),
      "u1",
    );
    const headers = new Headers(init?.headers);
    headers.set("Cookie", parseCookie(setCookie));
    return new Request(url, { ...init, headers });
  }

  function callLoader(request: Request) {
    return loader({ request, params: {}, context: {} } as any);
  }

  function callAction(request: Request) {
    return action({ request, params: {}, context: {} } as any);
  }

  describe("loader", () => {
    it("returns followed artists for the user", async () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const request = await authedRequest("http://localhost/api/follows");
      const response = await callLoader(request);
      const body = await response.json();

      expect(body.follows).toHaveLength(1);
      expect(body.follows[0]).toMatchObject({
        artistId: "a1",
        artistName: "Radiohead",
      });
    });

    it("returns empty array when user has no follows", async () => {
      const request = await authedRequest("http://localhost/api/follows");
      const response = await callLoader(request);
      const body = await response.json();

      expect(body.follows).toEqual([]);
    });

    it("redirects unauthenticated requests to /login", async () => {
      const request = new Request("http://localhost/api/follows");
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

  describe("action - follow", () => {
    it("creates a follow for an existing artist", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({
          intent: "follow",
          artistName: "Radiohead",
        }),
      });

      const response = await callAction(request);
      const body = await response.json();

      expect(body.follow).toMatchObject({ artistId: "a1" });
      expect(body.artist).toMatchObject({ name: "Radiohead" });
    });

    it("creates a new artist if name does not exist", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({
          intent: "follow",
          artistName: "Portishead",
        }),
      });

      const response = await callAction(request);
      const body = await response.json();

      expect(body.artist).toMatchObject({ name: "Portishead" });
      expect(body.follow.artistId).toBe(body.artist.id);
    });

    it("triggers ingestion for a newly created artist", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({
          intent: "follow",
          artistName: "Portishead",
        }),
      });

      await callAction(request);

      expect(mockedIngestArtist).toHaveBeenCalledOnce();
      expect(mockedIngestArtist).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: expect.objectContaining({ name: "Portishead" }),
        }),
      );
    });

    it("does not trigger ingestion for an existing artist", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({
          intent: "follow",
          artistName: "Radiohead",
        }),
      });

      await callAction(request);

      expect(mockedIngestArtist).not.toHaveBeenCalled();
    });

    it("returns 400 when artistName is missing", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({ intent: "follow" }),
      });

      const response = await callAction(request);
      expect(response.status).toBe(400);
    });
  });

  describe("action - unfollow", () => {
    it("removes a follow", async () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({ intent: "unfollow", artistId: "a1" }),
      });

      const response = await callAction(request);
      const body = await response.json();
      expect(body).toEqual({ ok: true });
    });

    it("returns 400 when artistId is missing", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({ intent: "unfollow" }),
      });

      const response = await callAction(request);
      expect(response.status).toBe(400);
    });
  });

  describe("action - bad intent", () => {
    it("returns 400 for unknown intent", async () => {
      const request = await authedRequest("http://localhost/api/follows", {
        method: "POST",
        body: new URLSearchParams({ intent: "nope" }),
      });

      const response = await callAction(request);
      expect(response.status).toBe(400);
    });
  });
});
