// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { insertUser } from "~/db/repositories/users.repository";
import { createSessionStorage } from "./session.server";
import { requireUser } from "./require-user";

const SECRET = "test-secret-at-least-32-chars-long!!";

async function makeAuthedRequest(
  sessions: ReturnType<typeof createSessionStorage>,
  userId: string,
) {
  const setCookie = await sessions.setUserId(
    new Request("http://localhost/"),
    userId,
  );
  return new Request("http://localhost/", {
    headers: { Cookie: setCookie.split(";")[0] },
  });
}

describe("requireUser", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
  });

  it("returns the user when session is valid", async () => {
    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "Alice",
      createdAt: new Date(),
    });

    const request = await makeAuthedRequest(sessions, "u1");
    const user = await requireUser(request, db, sessions);

    expect(user.id).toBe("u1");
    expect(user.email).toBe("a@b.com");
  });

  it("redirects to /login when no session exists", async () => {
    const request = new Request("http://localhost/");

    try {
      await requireUser(request, db, sessions);
      expect.fail("should have thrown a redirect");
    } catch (response: unknown) {
      expect(response).toBeInstanceOf(Response);
      const res = response as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/login");
    }
  });

  it("redirects to /login when userId in session has no matching DB row", async () => {
    const request = await makeAuthedRequest(sessions, "nonexistent-user");

    try {
      await requireUser(request, db, sessions);
      expect.fail("should have thrown a redirect");
    } catch (response: unknown) {
      expect(response).toBeInstanceOf(Response);
      const res = response as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/login");
    }
  });
});
