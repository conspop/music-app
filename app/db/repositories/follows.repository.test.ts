import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertUser } from "./users.repository";
import { insertArtist } from "./artists.repository";
import {
  followArtist,
  unfollowArtist,
  findFollowsByUser,
  findFollowsByArtist,
  findFollowsWithArtists,
  findFollowedArtists,
} from "./follows.repository";

describe("follows repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a1",
      name: "Radiohead",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a2",
      name: "Bjork",
      createdAt: new Date("2025-01-01"),
    });
  });

  describe("followArtist", () => {
    it("creates a follow relationship", () => {
      const follow = followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      expect(follow).toMatchObject({
        id: "f1",
        userId: "u1",
        artistId: "a1",
      });
    });

    it("rejects duplicate follows via unique constraint", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      expect(() =>
        followArtist(db, {
          id: "f2",
          userId: "u1",
          artistId: "a1",
          createdAt: new Date("2025-01-02"),
        }),
      ).toThrow();
    });
  });

  describe("unfollowArtist", () => {
    it("removes the follow relationship", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const deleted = unfollowArtist(db, "u1", "a1");
      expect(deleted).toMatchObject({ id: "f1" });

      const remaining = findFollowsByUser(db, "u1");
      expect(remaining).toHaveLength(0);
    });

    it("returns undefined when nothing to delete", () => {
      const deleted = unfollowArtist(db, "u1", "a1");
      expect(deleted).toBeUndefined();
    });
  });

  describe("findFollowsByUser", () => {
    it("returns all follows for a user", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f2",
        userId: "u1",
        artistId: "a2",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowsByUser(db, "u1");
      expect(results).toHaveLength(2);
    });

    it("returns empty array when user follows nobody", () => {
      const results = findFollowsByUser(db, "u1");
      expect(results).toEqual([]);
    });
  });

  describe("findFollowsByArtist", () => {
    it("returns all followers of an artist", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowsByArtist(db, "a1");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ userId: "u1" });
    });
  });

  describe("findFollowsWithArtists", () => {
    it("returns follows joined with artist details, ordered by artist name", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f2",
        userId: "u1",
        artistId: "a2",
        createdAt: new Date("2025-01-02"),
      });

      const results = findFollowsWithArtists(db, "u1");
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        followId: "f2",
        artistId: "a2",
        artistName: "Bjork",
      });
      expect(results[1]).toMatchObject({
        followId: "f1",
        artistId: "a1",
        artistName: "Radiohead",
      });
    });

    it("returns empty array when user follows nobody", () => {
      const results = findFollowsWithArtists(db, "u1");
      expect(results).toEqual([]);
    });

    it("does not include follows from other users", () => {
      insertUser(db, {
        id: "u2",
        googleId: "g2",
        email: "b@c.com",
        name: "Other",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f2",
        userId: "u2",
        artistId: "a2",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowsWithArtists(db, "u1");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ artistName: "Radiohead" });
    });
  });

  describe("findFollowedArtists", () => {
    it("returns distinct artists that have at least one follower", () => {
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f2",
        userId: "u1",
        artistId: "a2",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowedArtists(db);
      expect(results).toHaveLength(2);
      expect(results.map((a) => a.name).sort()).toEqual(["Bjork", "Radiohead"]);
    });

    it("returns each artist only once even with multiple followers", () => {
      insertUser(db, {
        id: "u2",
        googleId: "g2",
        email: "b@c.com",
        name: "Other",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f2",
        userId: "u2",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowedArtists(db);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ id: "a1", name: "Radiohead" });
    });

    it("returns empty array when no artists are followed", () => {
      const results = findFollowedArtists(db);
      expect(results).toEqual([]);
    });

    it("does not return unfollowed artists", () => {
      insertArtist(db, {
        id: "a3",
        name: "Portishead",
        createdAt: new Date("2025-01-01"),
      });
      followArtist(db, {
        id: "f1",
        userId: "u1",
        artistId: "a1",
        createdAt: new Date("2025-01-01"),
      });

      const results = findFollowedArtists(db);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: "Radiohead" });
    });
  });
});
