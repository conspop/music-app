import { eq, like } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists } from "~/db/schema";

export function insertArtist(
  db: DrizzleDb,
  data: typeof artists.$inferInsert,
) {
  return db.insert(artists).values(data).returning().get();
}

export function findArtistById(db: DrizzleDb, id: string) {
  return db.select().from(artists).where(eq(artists.id, id)).get();
}

export function findArtistByName(db: DrizzleDb, name: string) {
  return db
    .select()
    .from(artists)
    .where(like(artists.name, `%${name}%`))
    .all();
}
