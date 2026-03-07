import { describe, it, expect } from "vitest";
import { parseEventDateAsVenueLocal } from "./parse-event-date";

describe("parseEventDateAsVenueLocal", () => {
  it("parses date-time as venue-local and converts to UTC", () => {
    // 8 PM Toronto (America/Toronto) on Feb 26, 2026
    const result = parseEventDateAsVenueLocal(
      "2026-02-26T20:00",
      "America/Toronto",
    );
    expect(result).not.toBeNull();
    // 8 PM ET = 01:00 UTC next day (EST is UTC-5)
    expect(result!.toISOString()).toMatch(/2026-02-27T01:00/);
  });

  it("parses date-only as 20:00 venue-local", () => {
    const result = parseEventDateAsVenueLocal(
      "2026-02-26",
      "America/Toronto",
    );
    expect(result).not.toBeNull();
    // Feb 26 20:00 Toronto = Feb 27 01:00 UTC
    expect(result!.toISOString()).toMatch(/2026-02-27T01:00/);
  });

  it("parses ISO 8601 with timezone offset directly", () => {
    const result = parseEventDateAsVenueLocal(
      "2026-02-26T20:00-05:00",
      "America/Toronto",
    );
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe("2026-02-27T01:00:00.000Z");
  });

  it("returns null when timezone is null and string has no offset", () => {
    expect(parseEventDateAsVenueLocal("2026-02-26T20:00", null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseEventDateAsVenueLocal("", "America/Toronto")).toBeNull();
  });

  it("parses UTC suffix correctly", () => {
    const result = parseEventDateAsVenueLocal(
      "2026-02-26T20:00:00Z",
      "America/Toronto",
    );
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe("2026-02-26T20:00:00.000Z");
  });
});
