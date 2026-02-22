import { and, eq, asc } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists, follows } from "~/db/schema";

export function findFollowedArtists(db: DrizzleDb) {
  return db
    .selectDistinct({ id: artists.id, name: artists.name })
    .from(artists)
    .innerJoin(follows, eq(artists.id, follows.artistId))
    .orderBy(asc(artists.name))
    .all();
}

export function followArtist(
  db: DrizzleDb,
  data: typeof follows.$inferInsert,
) {
  return db.insert(follows).values(data).returning().get();
}

export function unfollowArtist(
  db: DrizzleDb,
  userId: string,
  artistId: string,
) {
  return db
    .delete(follows)
    .where(and(eq(follows.userId, userId), eq(follows.artistId, artistId)))
    .returning()
    .get();
}

export function findFollowsByUser(db: DrizzleDb, userId: string) {
  return db.select().from(follows).where(eq(follows.userId, userId)).all();
}

export function findFollowsByArtist(db: DrizzleDb, artistId: string) {
  return db
    .select()
    .from(follows)
    .where(eq(follows.artistId, artistId))
    .all();
}

export function findFollowsWithArtists(db: DrizzleDb, userId: string) {
  return db
    .select({
      followId: follows.id,
      artistId: artists.id,
      artistName: artists.name,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(artists, eq(follows.artistId, artists.id))
    .where(eq(follows.userId, userId))
    .orderBy(asc(artists.name))
    .all();
}
