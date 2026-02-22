import { redirect } from "react-router";
import type { DrizzleDb } from "~/db/connection";
import type { GoogleAuthProvider } from "./google-auth-provider";
import { generateState, generateCodeVerifier } from "./google-auth-provider";
import type { createSessionStorage } from "./session.server";
import { findOrCreateUser } from "./find-or-create-user";

export interface AuthDeps {
  db: DrizzleDb;
  sessions: ReturnType<typeof createSessionStorage>;
  authProvider: GoogleAuthProvider;
}

export async function handleGoogleRedirect(
  request: Request,
  deps: AuthDeps,
) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const session = await deps.sessions.getSession(request);
  session.set("oauth_state", state);
  session.set("code_verifier", codeVerifier);
  const cookie = await deps.sessions.commitSession(session);

  const url = deps.authProvider.createAuthorizationURL(state, codeVerifier);

  return redirect(url.toString(), {
    headers: { "Set-Cookie": cookie },
  });
}

export async function handleGoogleCallback(
  request: Request,
  deps: AuthDeps,
) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) throw redirect("/login");

  const session = await deps.sessions.getSession(request);
  const storedState = session.get("oauth_state");
  const codeVerifier = session.get("code_verifier");

  if (state !== storedState || typeof codeVerifier !== "string") {
    throw redirect("/login");
  }

  const googleUser = await deps.authProvider.validateAuthorizationCode(
    code,
    codeVerifier,
  );

  const user = findOrCreateUser(deps.db, googleUser);

  const setCookie = await deps.sessions.setUserId(request, user.id);

  return redirect("/", {
    headers: { "Set-Cookie": setCookie },
  });
}

export async function handleLogout(request: Request, deps: AuthDeps) {
  const cookie = await deps.sessions.destroy(request);
  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}
