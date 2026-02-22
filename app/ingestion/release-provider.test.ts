// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createSpotifyReleaseProvider } from "./release-provider";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function mockSpotifyAuth() {
  server.use(
    http.post(SPOTIFY_TOKEN_URL, () =>
      HttpResponse.json({ access_token: "test-token", token_type: "Bearer", expires_in: 3600 }),
    ),
  );
}

function mockArtistSearch(id: string, name: string) {
  server.use(
    http.get(`${SPOTIFY_API}/search`, () =>
      HttpResponse.json({ artists: { items: [{ id, name }] } }),
    ),
  );
}

function mockAlbums(artistId: string, albums: unknown[]) {
  server.use(
    http.get(`${SPOTIFY_API}/artists/${artistId}/albums`, () =>
      HttpResponse.json({ items: albums }),
    ),
  );
}

const recentAlbum = {
  id: "alb1",
  name: "New Album",
  album_type: "album",
  release_date: new Date().toISOString().slice(0, 10),
  release_date_precision: "day",
  external_urls: { spotify: "https://open.spotify.com/album/alb1" },
  images: [{ url: "https://i.scdn.co/image/abc", width: 640, height: 640 }],
  total_tracks: 12,
  artists: [{ id: "art1", name: "Test Artist" }],
};

const oldAlbum = {
  id: "alb2",
  name: "Old Album",
  album_type: "album",
  release_date: "2020-01-01",
  release_date_precision: "day",
  external_urls: { spotify: "https://open.spotify.com/album/alb2" },
  images: [{ url: "https://i.scdn.co/image/def", width: 640, height: 640 }],
  total_tracks: 10,
  artists: [{ id: "art1", name: "Test Artist" }],
};

describe("createSpotifyReleaseProvider", () => {
  const provider = createSpotifyReleaseProvider("client-id", "client-secret");

  it("fetches and maps recent releases from Spotify", async () => {
    mockSpotifyAuth();
    mockArtistSearch("art1", "Test Artist");
    mockAlbums("art1", [recentAlbum, oldAlbum]);

    const results = await provider.fetchReleases({ name: "Test Artist" });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "RELEASE",
      title: "New Album",
      url: "https://open.spotify.com/album/alb1",
      confidence: 1.0,
    });
  });

  it("skips Spotify search when spotifyId is provided", async () => {
    mockSpotifyAuth();
    mockAlbums("art1", [recentAlbum]);

    const results = await provider.fetchReleases({
      name: "Test Artist",
      spotifyId: "art1",
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("New Album");
  });

  it("sends client credentials as Basic auth for token", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.post(SPOTIFY_TOKEN_URL, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({
          access_token: "t", token_type: "Bearer", expires_in: 3600,
        });
      }),
    );
    mockArtistSearch("art1", "Test Artist");
    mockAlbums("art1", []);

    await provider.fetchReleases({ name: "Test Artist" });

    expect(capturedAuth).toBe(`Basic ${btoa("client-id:client-secret")}`);
  });

  it("returns empty array when artist not found on Spotify", async () => {
    mockSpotifyAuth();
    server.use(
      http.get(`${SPOTIFY_API}/search`, () =>
        HttpResponse.json({ artists: { items: [] } }),
      ),
    );

    const results = await provider.fetchReleases({ name: "Unknown Artist" });

    expect(results).toEqual([]);
  });

  it("returns empty array when token request fails", async () => {
    server.use(
      http.post(SPOTIFY_TOKEN_URL, () => new HttpResponse(null, { status: 401 })),
    );

    const results = await provider.fetchReleases({ name: "Test Artist" });

    expect(results).toEqual([]);
  });

  it("filters out releases older than 1 year", async () => {
    mockSpotifyAuth();
    mockArtistSearch("art1", "Test Artist");
    mockAlbums("art1", [oldAlbum]);

    const results = await provider.fetchReleases({ name: "Test Artist" });

    expect(results).toEqual([]);
  });

  it("includes imageUrl from Spotify album artwork", async () => {
    mockSpotifyAuth();
    mockArtistSearch("art1", "Test Artist");
    mockAlbums("art1", [recentAlbum]);

    const results = await provider.fetchReleases({ name: "Test Artist" });

    expect(results[0].imageUrl).toBe("https://i.scdn.co/image/abc");
  });
});
