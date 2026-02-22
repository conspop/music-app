// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSessionStorage } from "./session.server";

const SECRET = "test-secret-at-least-32-chars-long!!";

function makeRequest(setCookieHeader?: string) {
  const headers = new Headers();
  if (setCookieHeader) {
    // Set-Cookie has attributes (Path, HttpOnly, etc.); Cookie header only needs name=value
    headers.set("Cookie", setCookieHeader.split(";")[0]);
  }
  return new Request("http://localhost/", { headers });
}

describe("session storage", () => {
  it("round-trips a userId through set and get", async () => {
    const sessions = createSessionStorage(SECRET);

    const setCookie = await sessions.setUserId(
      makeRequest(),
      "user-123",
    );
    const userId = await sessions.getUserId(makeRequest(setCookie));

    expect(userId).toBe("user-123");
  });

  it("returns null when no userId is set", async () => {
    const sessions = createSessionStorage(SECRET);

    const userId = await sessions.getUserId(makeRequest());

    expect(userId).toBeNull();
  });

  it("round-trips an OAuth state through set and get", async () => {
    const sessions = createSessionStorage(SECRET);

    const setCookie = await sessions.setOAuthState(
      makeRequest(),
      "random-state",
    );
    const state = await sessions.getOAuthState(makeRequest(setCookie));

    expect(state).toBe("random-state");
  });

  it("returns null when no OAuth state is set", async () => {
    const sessions = createSessionStorage(SECRET);

    const state = await sessions.getOAuthState(makeRequest());

    expect(state).toBeNull();
  });

  it("clears the session on destroy", async () => {
    const sessions = createSessionStorage(SECRET);

    const setCookie = await sessions.setUserId(
      makeRequest(),
      "user-123",
    );
    const destroyCookie = await sessions.destroy(makeRequest(setCookie));
    const userId = await sessions.getUserId(makeRequest(destroyCookie));

    expect(userId).toBeNull();
  });
});
