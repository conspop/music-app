import { describe, it, expect } from "vitest";
import { resolveEventTimezone } from "./event-timezone";

describe("resolveEventTimezone", () => {
  it("returns timezone from coordinates when available", () => {
    expect(
      resolveEventTimezone({
        eventCity: "Toronto",
        eventLat: 43.6532,
        eventLng: -79.3832,
      }),
    ).toBe("America/Toronto");
  });

  it("returns timezone from city when no coordinates", () => {
    expect(
      resolveEventTimezone({
        eventCity: "Toronto",
        eventLat: null,
        eventLng: null,
      }),
    ).toBe("America/Toronto");
  });

  it("returns timezone for New York", () => {
    expect(
      resolveEventTimezone({
        eventCity: "New York",
        eventLat: null,
        eventLng: null,
      }),
    ).toBe("America/New_York");
  });

  it("returns timezone for London", () => {
    expect(
      resolveEventTimezone({
        eventCity: "London",
        eventLat: null,
        eventLng: null,
      }),
    ).toBe("Europe/London");
  });

  it("returns null when city is empty", () => {
    expect(
      resolveEventTimezone({
        eventCity: null,
        eventLat: null,
        eventLng: null,
      }),
    ).toBeNull();
  });

  it("returns null for unknown city", () => {
    expect(
      resolveEventTimezone({
        eventCity: "XyzUnknownCity123",
        eventLat: null,
        eventLng: null,
      }),
    ).toBeNull();
  });
});
