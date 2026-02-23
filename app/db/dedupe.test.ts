import { describe, it, expect } from "vitest";
import { computeDedupeHash, normalizeReleaseTitle } from "./dedupe";

describe("normalizeReleaseTitle", () => {
  it("lowercases and trims", () => {
    expect(normalizeReleaseTitle("  Stick Season  ")).toBe("stick season");
  });

  it("strips (Official Video) suffix", () => {
    expect(normalizeReleaseTitle("Stick Season (Official Video)")).toBe("stick season");
  });

  it("strips (2024) suffix", () => {
    expect(normalizeReleaseTitle("Album Name (2024)")).toBe("album name");
  });

  it("strips - Single suffix", () => {
    expect(normalizeReleaseTitle("Track Name - Single")).toBe("track name");
  });

  it("keeps meaningful parentheticals like (Forever)", () => {
    expect(normalizeReleaseTitle("Stick Season (Forever)")).toBe("stick season (forever)");
  });

  it("distinguishes Stick Season from Stick Season (Forever)", () => {
    expect(normalizeReleaseTitle("Stick Season")).toBe("stick season");
    expect(normalizeReleaseTitle("Stick Season (Forever)")).toBe("stick season (forever)");
    expect(normalizeReleaseTitle("Stick Season")).not.toBe(normalizeReleaseTitle("Stick Season (Forever)"));
  });
});

describe("computeDedupeHash", () => {
  it("returns a hex string", () => {
    const hash = computeDedupeHash("RELEASE", "artist-1", "https://example.com");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces the same hash for identical inputs", () => {
    const a = computeDedupeHash("RELEASE", "artist-1", "https://example.com");
    const b = computeDedupeHash("RELEASE", "artist-1", "https://example.com");
    expect(a).toBe(b);
  });

  it("differs when type changes", () => {
    const release = computeDedupeHash("RELEASE", "artist-1", "https://example.com");
    const event = computeDedupeHash(
      "EVENT",
      "artist-1",
      "https://example.com",
    );
    expect(release).not.toBe(event);
  });

  it("differs when artistId changes", () => {
    const a = computeDedupeHash("RELEASE", "artist-1", "https://example.com");
    const b = computeDedupeHash("RELEASE", "artist-2", "https://example.com");
    expect(a).not.toBe(b);
  });

  it("normalizes trailing slashes", () => {
    const a = computeDedupeHash("RELEASE", "a1", "https://example.com/page/");
    const b = computeDedupeHash("RELEASE", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes www prefix", () => {
    const a = computeDedupeHash("RELEASE", "a1", "https://www.example.com/page");
    const b = computeDedupeHash("RELEASE", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes to lowercase", () => {
    const a = computeDedupeHash("RELEASE", "a1", "https://Example.COM/Page");
    const b = computeDedupeHash("RELEASE", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes http vs https", () => {
    const a = computeDedupeHash("RELEASE", "a1", "http://example.com/page");
    const b = computeDedupeHash("RELEASE", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });
});
