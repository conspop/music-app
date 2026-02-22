import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import {
  insertUser,
  findUserByGoogleId,
  findUserByEmail,
  updateUserLocation,
} from "./users.repository";

const baseUser = {
  id: "u1",
  googleId: "google-123",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date("2025-01-01"),
} as const;

describe("users repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe("insertUser", () => {
    it("inserts and returns the user", () => {
      const user = insertUser(db, baseUser);

      expect(user).toMatchObject({
        id: "u1",
        googleId: "google-123",
        email: "test@example.com",
        name: "Test User",
      });
    });

    it("sets default radius to 50km", () => {
      const user = insertUser(db, baseUser);
      expect(user.locationRadiusKm).toBe(50);
    });
  });

  describe("findUserByGoogleId", () => {
    it("returns the user when found", () => {
      insertUser(db, baseUser);

      const found = findUserByGoogleId(db, "google-123");
      expect(found).toMatchObject({ id: "u1", googleId: "google-123" });
    });

    it("returns undefined when not found", () => {
      const found = findUserByGoogleId(db, "nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("findUserByEmail", () => {
    it("returns the user when found", () => {
      insertUser(db, baseUser);

      const found = findUserByEmail(db, "test@example.com");
      expect(found).toMatchObject({ id: "u1", email: "test@example.com" });
    });

    it("returns undefined when not found", () => {
      const found = findUserByEmail(db, "nobody@example.com");
      expect(found).toBeUndefined();
    });
  });

  describe("updateUserLocation", () => {
    it("updates location fields", () => {
      insertUser(db, baseUser);

      const updated = updateUserLocation(db, "u1", {
        city: "Portland",
        region: "Oregon",
        country: "US",
        lat: 45.5152,
        lng: -122.6784,
        radiusKm: 100,
      });

      expect(updated).toMatchObject({
        locationCity: "Portland",
        locationRegion: "Oregon",
        locationCountry: "US",
        locationLat: 45.5152,
        locationLng: -122.6784,
        locationRadiusKm: 100,
      });
    });

    it("returns undefined for nonexistent user", () => {
      const updated = updateUserLocation(db, "nonexistent", {
        city: "Portland",
        region: "Oregon",
        country: "US",
        lat: 45.5152,
        lng: -122.6784,
        radiusKm: 50,
      });
      expect(updated).toBeUndefined();
    });
  });
});
