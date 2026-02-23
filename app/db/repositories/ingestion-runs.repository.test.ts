import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertArtist } from "./artists.repository";
import {
  insertIngestionRun,
  findLastIngestionRun,
  findLastIngestionRunForArtist,
  findLastIngestionRunsForArtists,
} from "./ingestion-runs.repository";

describe("ingestion-runs repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    insertArtist(db, {
      id: "a1",
      name: "Radiohead",
      createdAt: new Date("2025-01-01"),
    });
  });

  describe("insertIngestionRun", () => {
    it("inserts and returns the run", () => {
      const run = insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 5,
      });

      expect(run).toMatchObject({
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        itemsFound: 5,
      });
    });
  });

  describe("findLastIngestionRun", () => {
    it("returns the most recent run for artist + type", () => {
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 7,
      });

      const last = findLastIngestionRun(db, "a1", "RELEASE");
      expect(last).toMatchObject({ id: "r2", itemsFound: 7 });
    });

    it("does not mix up types", () => {
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a1",
        type: "EVENT",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 1,
      });

      const lastEvent = findLastIngestionRun(db, "a1", "EVENT");
      expect(lastEvent).toMatchObject({ id: "r2", type: "EVENT" });
    });

    it("returns undefined when no runs exist", () => {
      const last = findLastIngestionRun(db, "a1", "RELEASE");
      expect(last).toBeUndefined();
    });
  });

  describe("findLastIngestionRunForArtist", () => {
    it("returns the most recent run across all types", () => {
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a1",
        type: "EVENT",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 7,
      });

      const last = findLastIngestionRunForArtist(db, "a1");
      expect(last).toMatchObject({ ranAt: new Date("2025-06-02T02:00:00Z") });
    });

    it("returns undefined when no runs exist", () => {
      const last = findLastIngestionRunForArtist(db, "a1");
      expect(last).toBeUndefined();
    });
  });

  describe("findLastIngestionRunsForArtists", () => {
    it("returns last run per artist for multiple artists", () => {
      insertArtist(db, {
        id: "a2",
        name: "Bjork",
        createdAt: new Date("2025-01-01"),
      });
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a2",
        type: "EVENT",
        ranAt: new Date("2025-06-03T02:00:00Z"),
        itemsFound: 1,
      });
      insertIngestionRun(db, {
        id: "r3",
        artistId: "a1",
        type: "EVENT",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 5,
      });

      const result = findLastIngestionRunsForArtists(db, ["a1", "a2"]);
      expect(result).toEqual({
        a1: new Date("2025-06-02T02:00:00Z"),
        a2: new Date("2025-06-03T02:00:00Z"),
      });
    });

    it("returns empty object when artistIds is empty", () => {
      const result = findLastIngestionRunsForArtists(db, []);
      expect(result).toEqual({});
    });

    it("omits artists with no runs", () => {
      insertArtist(db, {
        id: "a2",
        name: "Bjork",
        createdAt: new Date("2025-01-01"),
      });
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 3,
      });

      const result = findLastIngestionRunsForArtists(db, ["a1", "a2"]);
      expect(result).toEqual({ a1: new Date("2025-06-01T02:00:00Z") });
    });
  });
});
