// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser } from "~/db/repositories/users.repository";
import { loader } from "./api.geocode";
import type { Geocoder, GeocoderResult } from "~/lib/geocoder";

const SECRET = "test-secret-at-least-32-chars-long!!";

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { getAppContext } from "~/server/context";
const mockedGetAppContext = vi.mocked(getAppContext);

function createMockGeocoder(results: GeocoderResult[] = []): Geocoder {
  return {
    search: vi.fn().mockResolvedValue(results),
  };
}

describe("api/geocode", () => {
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
      geocoder: createMockGeocoder(),
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
    return loader({ request, params: {}, context: {} } as never);
  }

  it("returns geocoded results", async () => {
    const mockResults: GeocoderResult[] = [
      {
        displayName: "London, England, United Kingdom",
        city: "London",
        region: "England",
        country: "United Kingdom",
        lat: 51.5074,
        lng: -0.1278,
      },
    ];
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
      geocoder: createMockGeocoder(mockResults),
    });

    const request = await authedRequest(
      "http://localhost/api/geocode?q=London",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toHaveLength(1);
    expect(body.results[0].city).toBe("London");
    expect(body.results[0].lat).toBe(51.5074);
  });

  it("returns empty results when q is missing", async () => {
    const request = await authedRequest("http://localhost/api/geocode");
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toEqual([]);
  });

  it("returns empty results when q is blank", async () => {
    const request = await authedRequest(
      "http://localhost/api/geocode?q=%20",
    );
    const response = await callLoader(request);
    const body = await response.json();

    expect(body.results).toEqual([]);
  });

  it("returns 502 when geocoder throws", async () => {
    const failingGeocoder: Geocoder = {
      search: vi.fn().mockRejectedValue(new Error("Network error")),
    };
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as any,
      contentExtractor: {} as any,
      geocoder: failingGeocoder,
    });

    const request = await authedRequest(
      "http://localhost/api/geocode?q=London",
    );
    const response = await callLoader(request);

    expect(response.status).toBe(502);
  });

  it("redirects unauthenticated requests", async () => {
    const request = new Request("http://localhost/api/geocode?q=London");
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
