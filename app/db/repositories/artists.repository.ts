import { eq, like } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists } from "~/db/schema";

function generateId(): string {
  return crypto.randomUUID();
}

export function insertArtist(
  db: DrizzleDb,
  data: typeof artists.$inferInsert,
) {
  return db.insert(artists).values(data).returning().get();
}

export function findArtistById(db: DrizzleDb, id: string) {
  return db.select().from(artists).where(eq(artists.id, id)).get();
}

export function findArtistBySpotifyId(db: DrizzleDb, spotifyId: string) {
  return db
    .select()
    .from(artists)
    .where(eq(artists.spotifyId, spotifyId))
    .get();
}

export function findArtistByName(db: DrizzleDb, name: string) {
  return db
    .select()
    .from(artists)
    .where(like(artists.name, `%${name}%`))
    .all();
}

export function findOrCreateArtist(
  db: DrizzleDb,
  input: { name: string; spotifyId?: string },
) {
  if (input.spotifyId) {
    const existing = db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, input.spotifyId))
      .get();
    if (existing) return { artist: existing, isNew: false };
  } else {
    const existing = db
      .select()
      .from(artists)
      .where(eq(artists.name, input.name))
      .get();
    if (existing) return { artist: existing, isNew: false };
  }

  const artist = db
    .insert(artists)
    .values({
      id: generateId(),
      name: input.name,
      spotifyId: input.spotifyId ?? null,
      createdAt: new Date(),
    })
    .returning()
    .get();
  return { artist, isNew: true };
}
