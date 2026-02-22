import { getEnv } from "~/env.server";
import { createDb } from "~/db/connection";
import { createSessionStorage } from "~/auth/session.server";
import { createGoogleAuthProvider } from "~/auth/google-auth-provider";
import { createOpenAIContentExtractor } from "~/ingestion/content-extractor";
import { createSpotifyReleaseProvider } from "~/ingestion/release-provider";
import type { AuthDeps } from "~/auth/auth-handlers";
import type { ContentExtractor } from "~/ingestion/content-extractor";
import type { ReleaseProvider } from "~/ingestion/release-provider";

export interface AppContext extends AuthDeps {
  contentExtractor: ContentExtractor;
  releaseProvider?: ReleaseProvider;
}

let cached: AppContext | null = null;

export function getAppContext(): AppContext {
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
  const contentExtractor = createOpenAIContentExtractor(env.OPENAI_API_KEY);

  const releaseProvider =
    env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
      ? createSpotifyReleaseProvider(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET)
      : undefined;

  cached = { db, sessions, authProvider, contentExtractor, releaseProvider };
  return cached;
}
