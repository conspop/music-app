import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { follows } from "~/db/schema";

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
