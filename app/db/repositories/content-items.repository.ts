import { and, eq, gte, lte } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { contentItems } from "~/db/schema";
import { normalizeReleaseTitle } from "~/db/dedupe";

export function findAllContentItemIds(db: DrizzleDb): string[] {
  return db.select({ id: contentItems.id }).from(contentItems).all().map((r) => r.id);
}

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

export function findReleaseByArtistAndTitle(
  db: DrizzleDb,
  artistId: string,
  normalizedTitle: string,
) {
  const rows = db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.type, "RELEASE"),
        eq(contentItems.artistId, artistId),
      ),
    )
    .all();
  return rows.find(
    (r) => normalizeReleaseTitle(r.title) === normalizedTitle,
  ) ?? null;
}

export function updateContentItem(
  db: DrizzleDb,
  id: string,
  patch: {
    url?: string | null;
    summary?: string | null;
    imageUrl?: string | null;
    releaseType?: string | null;
    publishedAt?: Date | null;
    dedupeHash?: string;
    source?: string | null;
  },
) {
  return db
    .update(contentItems)
    .set(patch)
    .where(eq(contentItems.id, id))
    .returning()
    .get();
}
