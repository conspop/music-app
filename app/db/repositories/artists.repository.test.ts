import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import {
  insertArtist,
  findArtistById,
  findArtistBySpotifyId,
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

    it("inserts an artist with a spotifyId", () => {
      const artist = insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        spotifyId: "sp-radio",
        createdAt: new Date("2025-01-01"),
      });

      expect(artist).toMatchObject({
        id: "a1",
        name: "Radiohead",
        spotifyId: "sp-radio",
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

  describe("findArtistBySpotifyId", () => {
    it("returns the artist when found", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        spotifyId: "sp-radio",
        createdAt: new Date("2025-01-01"),
      });

      const found = findArtistBySpotifyId(db, "sp-radio");
      expect(found).toMatchObject({ id: "a1", spotifyId: "sp-radio" });
    });

    it("returns undefined when not found", () => {
      const found = findArtistBySpotifyId(db, "nonexistent");
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
    it("deduplicates by spotifyId when provided", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        spotifyId: "sp-radio",
        createdAt: new Date("2025-01-01"),
      });

      const { artist, isNew } = findOrCreateArtist(db, {
        name: "Radiohead",
        spotifyId: "sp-radio",
      });
      expect(artist).toMatchObject({ id: "a1", spotifyId: "sp-radio" });
      expect(isNew).toBe(false);
    });

    it("falls back to name match when no spotifyId provided", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        createdAt: new Date("2025-01-01"),
      });

      const { artist, isNew } = findOrCreateArtist(db, {
        name: "Radiohead",
      });
      expect(artist).toMatchObject({ id: "a1", name: "Radiohead" });
      expect(isNew).toBe(false);
    });

    it("creates a new artist with spotifyId when not found", () => {
      const { artist, isNew } = findOrCreateArtist(db, {
        name: "Bjork",
        spotifyId: "sp-bjork",
      });
      expect(artist.name).toBe("Bjork");
      expect(artist.spotifyId).toBe("sp-bjork");
      expect(artist.id).toBeTruthy();
      expect(isNew).toBe(true);
    });

    it("creates a new artist without spotifyId when name does not exist", () => {
      const { artist, isNew } = findOrCreateArtist(db, { name: "Bjork" });
      expect(artist.name).toBe("Bjork");
      expect(artist.spotifyId).toBeNull();
      expect(isNew).toBe(true);

      const found = findArtistById(db, artist.id);
      expect(found).toMatchObject({ name: "Bjork" });
    });

    it("matches by spotifyId even when names differ", () => {
      insertArtist(db, {
        id: "a1",
        name: "Radiohead",
        spotifyId: "sp-radio",
        createdAt: new Date("2025-01-01"),
      });

      const { artist, isNew } = findOrCreateArtist(db, {
        name: "radiohead",
        spotifyId: "sp-radio",
      });
      expect(artist.id).toBe("a1");
      expect(isNew).toBe(false);
    });
  });
});
