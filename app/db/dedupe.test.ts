import { describe, it, expect } from "vitest";
import { computeDedupeHash } from "./dedupe";

describe("computeDedupeHash", () => {
  it("returns a hex string", () => {
    const hash = computeDedupeHash("NEWS", "artist-1", "https://example.com");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces the same hash for identical inputs", () => {
    const a = computeDedupeHash("NEWS", "artist-1", "https://example.com");
    const b = computeDedupeHash("NEWS", "artist-1", "https://example.com");
    expect(a).toBe(b);
  });

  it("differs when type changes", () => {
    const news = computeDedupeHash("NEWS", "artist-1", "https://example.com");
    const release = computeDedupeHash(
      "RELEASE",
      "artist-1",
      "https://example.com",
    );
    expect(news).not.toBe(release);
  });

  it("differs when artistId changes", () => {
    const a = computeDedupeHash("NEWS", "artist-1", "https://example.com");
    const b = computeDedupeHash("NEWS", "artist-2", "https://example.com");
    expect(a).not.toBe(b);
  });

  it("normalizes trailing slashes", () => {
    const a = computeDedupeHash("NEWS", "a1", "https://example.com/page/");
    const b = computeDedupeHash("NEWS", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes www prefix", () => {
    const a = computeDedupeHash("NEWS", "a1", "https://www.example.com/page");
    const b = computeDedupeHash("NEWS", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes to lowercase", () => {
    const a = computeDedupeHash("NEWS", "a1", "https://Example.COM/Page");
    const b = computeDedupeHash("NEWS", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });

  it("normalizes http vs https", () => {
    const a = computeDedupeHash("NEWS", "a1", "http://example.com/page");
    const b = computeDedupeHash("NEWS", "a1", "https://example.com/page");
    expect(a).toBe(b);
  });
});
