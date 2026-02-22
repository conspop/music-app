import { and, eq, gte, lte } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { contentItems } from "~/db/schema";

export function findContentItemByDedupeHash(db: DrizzleDb, hash: string) {
  return db
    .select()
    .from(contentItems)
    .where(eq(contentItems.dedupeHash, hash))
    .get();
}

export function insertContentItem(
  db: DrizzleDb,
  data: typeof contentItems.$inferInsert,
) {
  return db.insert(contentItems).values(data).returning().get();
}

export function findContentItemsByArtist(db: DrizzleDb, artistId: string) {
  return db
    .select()
    .from(contentItems)
    .where(eq(contentItems.artistId, artistId))
    .all();
}

export function findContentItemsByType(db: DrizzleDb, type: string) {
  return db
    .select()
    .from(contentItems)
    .where(eq(contentItems.type, type))
    .all();
}

export function findContentItemsByDateRange(
  db: DrizzleDb,
  from: Date,
  to: Date,
) {
  return db
    .select()
    .from(contentItems)
    .where(
      and(
        gte(contentItems.publishedAt, from),
        lte(contentItems.publishedAt, to),
      ),
    )
    .all();
}
