import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { findOrCreateUser } from "./find-or-create-user";

describe("findOrCreateUser", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it("creates a new user when none exists", () => {
    const user = findOrCreateUser(db, {
      googleId: "google-123",
      email: "alice@example.com",
      name: "Alice",
    });

    expect(user.googleId).toBe("google-123");
    expect(user.email).toBe("alice@example.com");
    expect(user.name).toBe("Alice");
    expect(user.id).toBeTruthy();
  });

  it("returns the existing user on second call", () => {
    const first = findOrCreateUser(db, {
      googleId: "google-123",
      email: "alice@example.com",
      name: "Alice",
    });

    const second = findOrCreateUser(db, {
      googleId: "google-123",
      email: "alice@example.com",
      name: "Alice",
    });

    expect(second.id).toBe(first.id);
  });

  it("handles null name", () => {
    const user = findOrCreateUser(db, {
      googleId: "google-456",
      email: "bob@example.com",
      name: null,
    });

    expect(user.name).toBeNull();
  });
});
