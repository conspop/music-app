import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertArtist, findArtistById, findArtistByName } from "./artists.repository";

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
});
