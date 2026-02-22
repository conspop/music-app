import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertArtist } from "./artists.repository";
import {
  insertIngestionRun,
  findLastIngestionRun,
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
        type: "NEWS",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 5,
      });

      expect(run).toMatchObject({
        id: "r1",
        artistId: "a1",
        type: "NEWS",
        itemsFound: 5,
      });
    });
  });

  describe("findLastIngestionRun", () => {
    it("returns the most recent run for artist + type", () => {
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "NEWS",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a1",
        type: "NEWS",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 7,
      });

      const last = findLastIngestionRun(db, "a1", "NEWS");
      expect(last).toMatchObject({ id: "r2", itemsFound: 7 });
    });

    it("does not mix up types", () => {
      insertIngestionRun(db, {
        id: "r1",
        artistId: "a1",
        type: "NEWS",
        ranAt: new Date("2025-06-02T02:00:00Z"),
        itemsFound: 3,
      });
      insertIngestionRun(db, {
        id: "r2",
        artistId: "a1",
        type: "RELEASE",
        ranAt: new Date("2025-06-01T02:00:00Z"),
        itemsFound: 1,
      });

      const lastRelease = findLastIngestionRun(db, "a1", "RELEASE");
      expect(lastRelease).toMatchObject({ id: "r2", type: "RELEASE" });
    });

    it("returns undefined when no runs exist", () => {
      const last = findLastIngestionRun(db, "a1", "NEWS");
      expect(last).toBeUndefined();
    });
  });
});
