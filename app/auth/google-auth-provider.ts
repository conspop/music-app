import * as arctic from "arctic";

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string | null;
}

export interface GoogleAuthProvider {
  createAuthorizationURL(state: string, codeVerifier: string): URL;
  validateAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<GoogleUser>;
}

export function createGoogleAuthProvider(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): GoogleAuthProvider {
  const google = new arctic.Google(clientId, clientSecret, redirectUri);

  return {
    createAuthorizationURL(state, codeVerifier) {
      return google.createAuthorizationURL(state, codeVerifier, [
        "openid",
        "profile",
        "email",
      ]);
    },

    async validateAuthorizationCode(code, codeVerifier) {
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const idToken = tokens.idToken();
      const claims = arctic.decodeIdToken(idToken) as Record<string, unknown>;
      return {
        googleId: claims.sub as string,
        email: claims.email as string,
        name: (claims.name as string) ?? null,
      };
    },
  };
}

export function generateState(): string {
  return arctic.generateState();
}

export function generateCodeVerifier(): string {
  return arctic.generateCodeVerifier();
}
