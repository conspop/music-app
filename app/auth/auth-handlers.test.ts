// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "./session.server";
import type { GoogleAuthProvider, GoogleUser } from "./google-auth-provider";
import type { AuthDeps } from "./auth-handlers";
import {
  handleGoogleRedirect,
  handleGoogleCallback,
  handleLogout,
} from "./auth-handlers";

const SECRET = "test-secret-at-least-32-chars-long!!";

function createFakeProvider(
  user: GoogleUser = {
    googleId: "google-42",
    email: "alice@example.com",
    name: "Alice",
  },
): GoogleAuthProvider {
  return {
    createAuthorizationURL(state, _codeVerifier) {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("state", state);
      return url;
    },
    async validateAuthorizationCode() {
      return user;
    },
  };
}

function parseCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

describe("auth handlers", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;
  let deps: AuthDeps;

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    deps = { db, sessions, authProvider: createFakeProvider() };
  });

  describe("handleGoogleRedirect", () => {
    it("redirects to Google with state in session", async () => {
      const request = new Request("http://localhost/auth/google");

      const response = await handleGoogleRedirect(request, deps);

      expect(response.status).toBe(302);
      const location = response.headers.get("Location")!;
      expect(location).toContain("accounts.google.com");

      const setCookie = response.headers.get("Set-Cookie")!;
      expect(setCookie).toBeTruthy();

      const session = await sessions.getSession(
        new Request("http://localhost/", {
          headers: { Cookie: parseCookie(setCookie) },
        }),
      );
      expect(session.get("oauth_state")).toBeTruthy();
      expect(session.get("code_verifier")).toBeTruthy();
    });
  });

  describe("handleGoogleCallback", () => {
    async function makeCallbackRequest(
      code: string,
      state: string,
      sessionCookie?: string,
    ) {
      const url = `http://localhost/auth/google/callback?code=${code}&state=${state}`;
      const headers = new Headers();
      if (sessionCookie) headers.set("Cookie", parseCookie(sessionCookie));
      return new Request(url, { headers });
    }

    async function setupSessionWithState() {
      const request = new Request("http://localhost/auth/google");
      const response = await handleGoogleRedirect(request, deps);
      const setCookie = response.headers.get("Set-Cookie")!;
      const location = new URL(response.headers.get("Location")!);
      const state = location.searchParams.get("state")!;
      return { setCookie, state };
    }

    it("creates user and sets session on valid callback", async () => {
      const { setCookie, state } = await setupSessionWithState();
      const request = await makeCallbackRequest("auth-code", state, setCookie);

      const response = await handleGoogleCallback(request, deps);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");

      const newCookie = response.headers.get("Set-Cookie")!;
      const userId = await sessions.getUserId(
        new Request("http://localhost/", {
          headers: { Cookie: parseCookie(newCookie) },
        }),
      );
      expect(userId).toBeTruthy();
    });

    it("redirects to /login when code is missing", async () => {
      const request = new Request(
        "http://localhost/auth/google/callback?state=abc",
      );

      try {
        await handleGoogleCallback(request, deps);
        expect.fail("should have thrown");
      } catch (response: unknown) {
        const res = response as Response;
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/login");
      }
    });

    it("redirects to /login when state does not match", async () => {
      const { setCookie } = await setupSessionWithState();
      const request = await makeCallbackRequest(
        "auth-code",
        "wrong-state",
        setCookie,
      );

      try {
        await handleGoogleCallback(request, deps);
        expect.fail("should have thrown");
      } catch (response: unknown) {
        const res = response as Response;
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/login");
      }
    });
  });

  describe("handleLogout", () => {
    it("destroys session and redirects to /login", async () => {
      const setCookie = await sessions.setUserId(
        new Request("http://localhost/"),
        "user-1",
      );
      const request = new Request("http://localhost/auth/logout", {
        headers: { Cookie: parseCookie(setCookie) },
      });

      const response = await handleLogout(request, deps);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");

      const destroyCookie = response.headers.get("Set-Cookie")!;
      const userId = await sessions.getUserId(
        new Request("http://localhost/", {
          headers: { Cookie: parseCookie(destroyCookie) },
        }),
      );
      expect(userId).toBeNull();
    });
  });
});
