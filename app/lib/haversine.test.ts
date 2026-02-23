import { describe, it, expect } from "vitest";
import { haversineKm } from "./haversine";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(51.5, -0.12, 51.5, -0.12)).toBe(0);
  });

  it("calculates London to Paris (~340 km)", () => {
    const km = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(km).toBeGreaterThan(330);
    expect(km).toBeLessThan(350);
  });

  it("calculates New York to Los Angeles (~3940 km)", () => {
    const km = haversineKm(40.7128, -74.006, 34.0522, -118.2437);
    expect(km).toBeGreaterThan(3930);
    expect(km).toBeLessThan(3960);
  });

  it("calculates short distance (~1 km)", () => {
    // ~1 degree of latitude ≈ 111 km, so 0.009° ≈ 1 km
    const km = haversineKm(51.5, -0.12, 51.509, -0.12);
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.1);
  });

  it("handles antipodal points (~20000 km)", () => {
    const km = haversineKm(0, 0, 0, 180);
    expect(km).toBeGreaterThan(20_000);
    expect(km).toBeLessThan(20_040);
  });
});
