import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import {
  insertArtist,
  findArtistById,
  findArtistByName,
  findOrCreateArtist,
} from "./artists.repository";

describe("artists repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe("insertArtist", () => {
    it("inserts and returns the artist", () => {
      const artist = insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });

      expect(artist).toMatchObject({
        id: "a1",
        name: "Radiohead",
      });
    });
  });

  describe("findArtistById", () => {
    it("returns the artist when found", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });

      const found = findArtistById(db, "a1");
      expect(found).toMatchObject({ id: "a1", name: "Radiohead" });
    });

    it("returns undefined when not found", () => {
      const found = findArtistById(db, "nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("findArtistByName", () => {
    it("returns matching artists (case-insensitive)", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });
      insertArtist(db, {
        id: "a2",
        name: "Radio Moscow",
        createdAt: new Date("2025-01-01"),
      });

      const results = findArtistByName(db, "radio");
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no match", () => {
      const results = findArtistByName(db, "nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("findOrCreateArtist", () => {
    it("returns existing artist with isNew false when name matches exactly", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });

      const { artist, isNew } = findOrCreateArtist(db, "Radiohead");
      expect(artist).toMatchObject({ id: "a1", name: "Radiohead" });
      expect(isNew).toBe(false);
    });

    it("creates a new artist with isNew true when name does not exist", () => {
      const { artist, isNew } = findOrCreateArtist(db, "Bjork");
      expect(artist.name).toBe("Bjork");
      expect(artist.id).toBeTruthy();
      expect(isNew).toBe(true);

      const found = findArtistById(db, artist.id);
      expect(found).toMatchObject({ name: "Bjork" });
    });

    it("is case-sensitive for exact matching", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });

      const { artist, isNew } = findOrCreateArtist(db, "radiohead");
      expect(artist.id).not.toBe("a1");
      expect(isNew).toBe(true);
    });
  });
});
