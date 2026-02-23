// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createNominatimGeocoder } from "./geocoder";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

function mockNominatimResults(results: Record<string, unknown>[]) {
  msw.use(
    http.get(NOMINATIM_URL, () => HttpResponse.json(results)),
  );
}

describe("createNominatimGeocoder", () => {
  const geocoder = createNominatimGeocoder();

  it("returns mapped results from Nominatim", async () => {
    mockNominatimResults([
      {
        display_name: "London, England, United Kingdom",
        lat: "51.5074456",
        lon: "-0.1277653",
        address: {
          city: "London",
          state: "England",
          country: "United Kingdom",
        },
      },
    ]);

    const results = await geocoder.search("London");

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      displayName: "London, England, United Kingdom",
      city: "London",
      region: "England",
      country: "United Kingdom",
      lat: 51.5074456,
      lng: -0.1277653,
    });
  });

  it("falls back to town when city is missing", async () => {
    mockNominatimResults([
      {
        display_name: "Glastonbury, Somerset, England, United Kingdom",
        lat: "51.1490",
        lon: "-2.7140",
        address: {
          town: "Glastonbury",
          county: "Somerset",
          state: "England",
          country: "United Kingdom",
        },
      },
    ]);

    const results = await geocoder.search("Glastonbury");

    expect(results[0].city).toBe("Glastonbury");
    expect(results[0].region).toBe("England");
  });

  it("falls back to village when city and town are missing", async () => {
    mockNominatimResults([
      {
        display_name: "Worthy Farm, Pilton, Somerset",
        lat: "51.155",
        lon: "-2.585",
        address: {
          village: "Pilton",
          state: "Somerset",
          country: "United Kingdom",
        },
      },
    ]);

    const results = await geocoder.search("Pilton");

    expect(results[0].city).toBe("Pilton");
  });

  it("returns empty array on API error", async () => {
    msw.use(
      http.get(NOMINATIM_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const results = await geocoder.search("London");

    expect(results).toEqual([]);
  });

  it("returns empty array when no results found", async () => {
    mockNominatimResults([]);

    const results = await geocoder.search("xyznonexistent123");

    expect(results).toEqual([]);
  });

  it("handles missing address fields gracefully", async () => {
    mockNominatimResults([
      {
        display_name: "Some Place",
        lat: "40.0",
        lon: "-74.0",
        address: {},
      },
    ]);

    const results = await geocoder.search("Some Place");

    expect(results[0]).toEqual({
      displayName: "Some Place",
      city: "",
      region: "",
      country: "",
      lat: 40.0,
      lng: -74.0,
    });
  });
});
