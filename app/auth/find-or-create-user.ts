import type { DrizzleDb } from "~/db/connection";
import type { GoogleUser } from "./google-auth-provider";
import { findUserByGoogleId, insertUser } from "~/db/repositories/users.repository";

export function findOrCreateUser(db: DrizzleDb, profile: GoogleUser) {
  const existing = findUserByGoogleId(db, profile.googleId);
  if (existing) return existing;

  return insertUser(db, {
    id: crypto.randomUUID(),
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    createdAt: new Date(),
  });
}
