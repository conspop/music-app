// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { loader } from "./api.spotify-search";

const SECRET = "test-secret-at-least-32-chars-long!!";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

const msw = setupServer();

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  msw.resetHandlers();
  clearSpotifyTokenCache();
});
afterAll(() => msw.close());

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { clearSpotifyTokenCache } from "~/lib/spotify-client";
import { getAppContext } from "~/server/context";
const mockedGetAppContext = vi.mocked(getAppContext);

function mockSpotifyAuth() {
  msw.use(
    http.post(SPOTIFY_TOKEN_URL, () =>
      HttpResponse.json({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ),
  );
}

function mockArtistSearch(artists: { id: string; name: string }[]) {
  msw.use(
    http.get(`${SPOTIFY_API}/search`, () =>
      HttpResponse.json({
        artists: {
          items: artists.map((a) => ({ ...a, images: [] })),
        },
      }),
    ),
  );
}

describe("api/spotify-search", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);

    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
      spotifyCredentials: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      },
    });

    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
  });

  async function authedRequest(url: string): Promise<Request> {
    const setCookie = await sessions.setUserId(
      new Request("http://localhost/"),
      "u1",
    );
    const cookie = setCookie.split(";")[0];
    return new Request(url, {
      headers: { Cookie: cookie },
    });
  }

  function callLoader(request: Request) {
    return loader({ request, params: {}, context: {} } as any);
  }

  it("returns matching artists from Spotify", async () => {
    mockSpotifyAuth();
    mockArtistSearch([
      { id: "sp1", name: "Radiohead" },
      { id: "sp2", name: "Radio Moscow" },
    ]);

    const request = await authedRequest(
      "http://localhost/api/spotify-search?q=radio",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toEqual({
      spotifyId: "sp1",
      name: "Radiohead",
      imageUrl: null,
    });
  });

  it("returns empty results when q is missing", async () => {
    const request = await authedRequest(
      "http://localhost/api/spotify-search",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toEqual([]);
  });

  it("returns empty results when q is blank", async () => {
    const request = await authedRequest(
      "http://localhost/api/spotify-search?q=%20",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toEqual([]);
  });

  it("returns 503 when Spotify is not configured", async () => {
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
    });

    const request = await authedRequest(
      "http://localhost/api/spotify-search?q=radio",
    );
    const response = await callLoader(request);

    expect(response.status).toBe(503);
  });

  it("returns 502 when Spotify auth fails", async () => {
    msw.use(
      http.post(SPOTIFY_TOKEN_URL, () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );

    const request = await authedRequest(
      "http://localhost/api/spotify-search?q=radio",
    );
    const response = await callLoader(request);

    expect(response.status).toBe(502);
  });

  it("redirects unauthenticated requests", async () => {
    const request = new Request(
      "http://localhost/api/spotify-search?q=radio",
    );
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
