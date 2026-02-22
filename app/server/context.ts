import { getEnv } from "~/env.server";
import { createDb } from "~/db/connection";
import { createSessionStorage } from "~/auth/session.server";
import { createGoogleAuthProvider } from "~/auth/google-auth-provider";
import { createOpenAIContentExtractor } from "~/ingestion/content-extractor";
import { createSpotifyReleaseProvider } from "~/ingestion/release-provider";
import type { AuthDeps } from "~/auth/auth-handlers";
import type { ContentExtractor } from "~/ingestion/content-extractor";
import type { ReleaseProvider } from "~/ingestion/release-provider";

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
}

export interface AppContext extends AuthDeps {
  contentExtractor: ContentExtractor;
  releaseProvider?: ReleaseProvider;
  spotifyCredentials?: SpotifyCredentials;
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

  const spotifyCredentials =
    env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
      ? { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET }
      : undefined;

  const releaseProvider = spotifyCredentials
    ? createSpotifyReleaseProvider(spotifyCredentials.clientId, spotifyCredentials.clientSecret)
    : undefined;

  cached = { db, sessions, authProvider, contentExtractor, releaseProvider, spotifyCredentials };
  return cached;
}
