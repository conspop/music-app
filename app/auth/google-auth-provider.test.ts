// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createGoogleAuthProvider } from "./google-auth-provider";

function createTestIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.fake-signature`;
}

const TEST_CLAIMS = {
  sub: "google-user-42",
  email: "alice@example.com",
  name: "Alice Smith",
};

const server = setupServer(
  http.post("https://oauth2.googleapis.com/token", () => {
    return HttpResponse.json({
      access_token: "fake-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: createTestIdToken(TEST_CLAIMS),
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("createGoogleAuthProvider", () => {
  const provider = createGoogleAuthProvider(
    "test-client-id",
    "test-client-secret",
    "http://localhost:3000/auth/google/callback",
  );

  describe("createAuthorizationURL", () => {
    it("returns a URL pointing to Google accounts", () => {
      const url = provider.createAuthorizationURL("test-state", "test-verifier");

      expect(url.origin).toBe("https://accounts.google.com");
      expect(url.pathname).toBe("/o/oauth2/v2/auth");
    });

    it("includes state, PKCE, and scopes", () => {
      const url = provider.createAuthorizationURL("my-state", "my-verifier");
      const params = url.searchParams;

      expect(params.get("state")).toBe("my-state");
      expect(params.get("code_challenge_method")).toBe("S256");
      expect(params.get("response_type")).toBe("code");
      expect(params.get("scope")).toContain("openid");
      expect(params.get("scope")).toContain("email");
    });

    it("includes the redirect URI", () => {
      const url = provider.createAuthorizationURL("s", "v");
      expect(url.searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/auth/google/callback",
      );
    });
  });

  describe("validateAuthorizationCode", () => {
    it("exchanges code for user profile via ID token", async () => {
      const user = await provider.validateAuthorizationCode(
        "auth-code",
        "code-verifier",
      );

      expect(user).toEqual({
        googleId: "google-user-42",
        email: "alice@example.com",
        name: "Alice Smith",
      });
    });

    it("returns null name when not present in claims", async () => {
      server.use(
        http.post("https://oauth2.googleapis.com/token", () => {
          return HttpResponse.json({
            access_token: "fake-access-token",
            token_type: "Bearer",
            expires_in: 3600,
            id_token: createTestIdToken({
              sub: "google-user-99",
              email: "bob@example.com",
            }),
          });
        }),
      );

      const user = await provider.validateAuthorizationCode(
        "auth-code",
        "code-verifier",
      );

      expect(user.name).toBeNull();
    });
  });
});
