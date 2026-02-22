import { getEnv } from "~/env.server";
import { createDb } from "~/db/connection";
import { createSessionStorage } from "~/auth/session.server";
import { createGoogleAuthProvider } from "~/auth/google-auth-provider";
import type { AuthDeps } from "~/auth/auth-handlers";

let cached: AuthDeps | null = null;

export function getAppContext(): AuthDeps {
  if (cached) return cached;

  const env = getEnv();
  const db = createDb(process.env.DATABASE_URL ?? "./sqlite.db");
  const sessions = createSessionStorage(env.SESSION_SECRET);
  const authProvider = createGoogleAuthProvider(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    process.env.APP_URL
      ? `${process.env.APP_URL}/auth/google/callback`
      : "http://localhost:5173/auth/google/callback",
  );

  cached = { db, sessions, authProvider };
  return cached;
}
