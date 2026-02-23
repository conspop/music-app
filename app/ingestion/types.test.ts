import { describe, it, expect } from "vitest";
import {
  extractedReleaseItemSchema,
  extractedEventItemSchema,
  extractedItemSchema,
  CONTENT_TYPES,
} from "./types";

describe("ingestion types", () => {
  describe("CONTENT_TYPES", () => {
    it("contains RELEASE and EVENT", () => {
      expect(CONTENT_TYPES).toEqual(["RELEASE", "EVENT"]);
    });
  });

  describe("extractedReleaseItemSchema", () => {
    const validRelease = {
      title: "New Album - Deluxe Edition",
      url: "https://example.com/releases/album",
      summary: "Remastered with bonus tracks.",
      publishedAt: "2025-07-15",
      confidence: 0.88,
    };

    it("accepts a valid release item", () => {
      const result = extractedReleaseItemSchema.safeParse(validRelease);
      expect(result.success).toBe(true);
    });

    it("accepts release without optional fields", () => {
      const { summary, ...minimal } = validRelease;
      const result = extractedReleaseItemSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it("rejects missing title", () => {
      const { title, ...noTitle } = validRelease;
      const result = extractedReleaseItemSchema.safeParse(noTitle);
      expect(result.success).toBe(false);
    });

    it("rejects confidence outside 0-1 range", () => {
      const result = extractedReleaseItemSchema.safeParse({
        ...validRelease,
        confidence: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL", () => {
      const result = extractedReleaseItemSchema.safeParse({
        ...validRelease,
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing confidence", () => {
      const { confidence, ...noConf } = validRelease;
      const result = extractedReleaseItemSchema.safeParse(noConf);
      expect(result.success).toBe(false);
    });

    it("accepts null for optional fields (imageUrl, summary)", () => {
      const result = extractedReleaseItemSchema.safeParse({
        ...validRelease,
        imageUrl: null,
        summary: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrl).toBeUndefined();
        expect(result.data.summary).toBeUndefined();
      }
    });

    it("accepts a valid releaseType", () => {
      for (const rt of ["album", "single", "ep", "compilation"]) {
        const result = extractedReleaseItemSchema.safeParse({
          ...validRelease,
          releaseType: rt,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.releaseType).toBe(rt);
      }
    });

    it("accepts null releaseType", () => {
      const result = extractedReleaseItemSchema.safeParse({
        ...validRelease,
        releaseType: null,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.releaseType).toBeUndefined();
    });

    it("accepts omitted releaseType", () => {
      const result = extractedReleaseItemSchema.safeParse(validRelease);
      expect(result.success).toBe(true);
    });

    it("rejects invalid releaseType value", () => {
      const result = extractedReleaseItemSchema.safeParse({
        ...validRelease,
        releaseType: "mixtape",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("extractedEventItemSchema", () => {
    const validEvent = {
      title: "Summer Festival 2025",
      url: "https://example.com/events/fest",
      summary: "Headlining the main stage.",
      eventDate: "2025-08-20",
      eventVenue: "Madison Square Garden",
      eventCity: "New York",
      eventLat: 40.7505,
      eventLng: -73.9934,
      confidence: 0.95,
    };

    it("accepts a valid event item", () => {
      const result = extractedEventItemSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("accepts event without optional lat/lng", () => {
      const { eventLat, eventLng, ...noCoords } = validEvent;
      const result = extractedEventItemSchema.safeParse(noCoords);
      expect(result.success).toBe(true);
    });

    it("rejects missing eventDate", () => {
      const { eventDate, ...noDate } = validEvent;
      const result = extractedEventItemSchema.safeParse(noDate);
      expect(result.success).toBe(false);
    });

    it("rejects missing eventVenue", () => {
      const { eventVenue, ...noVenue } = validEvent;
      const result = extractedEventItemSchema.safeParse(noVenue);
      expect(result.success).toBe(false);
    });
  });

  describe("extractedItemSchema", () => {
    it("accepts a release item via discriminated union", () => {
      const result = extractedItemSchema.safeParse({
        type: "RELEASE",
        title: "Test",
        url: "https://example.com",
        summary: "Summary",
        publishedAt: "2025-06-01",
        confidence: 0.9,
      });
      expect(result.success).toBe(true);
    });

    it("accepts an event item via discriminated union", () => {
      const result = extractedItemSchema.safeParse({
        type: "EVENT",
        title: "Concert",
        url: "https://example.com",
        summary: "Live show",
        eventDate: "2025-08-01",
        eventVenue: "The Venue",
        eventCity: "London",
        confidence: 0.85,
      });
      expect(result.success).toBe(true);
    });

    it("rejects unknown type", () => {
      const result = extractedItemSchema.safeParse({
        type: "UNKNOWN",
        title: "Test",
        url: "https://example.com",
        confidence: 0.9,
      });
      expect(result.success).toBe(false);
    });
  });
});
