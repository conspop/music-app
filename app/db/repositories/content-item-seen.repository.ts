import { eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { contentItemSeen, contentItems, follows } from "~/db/schema";

/**
 * Marks pre-existing content items as seen for all users who follow their
 * artists. Called after ingestion runs so items stay "new" until the next run.
 */
export function markPreExistingItemsAsSeen(
  db: DrizzleDb,
  contentItemIds: string[],
): void {
  if (contentItemIds.length === 0) return;

  const pairs = db
    .select({
      contentItemId: contentItems.id,
      userId: follows.userId,
    })
    .from(contentItems)
    .innerJoin(follows, eq(contentItems.artistId, follows.artistId))
    .where(inArray(contentItems.id, contentItemIds))
    .all();

  const seenAt = new Date();
  for (const { contentItemId, userId } of pairs) {
    db.insert(contentItemSeen)
      .values({
        id: crypto.randomUUID(),
        userId,
        contentItemId,
        seenAt,
      })
      .onConflictDoNothing({
        target: [contentItemSeen.userId, contentItemSeen.contentItemId],
      })
      .run();
  }
}

export function markAsSeen(
  db: DrizzleDb,
  userId: string,
  contentItemIds: string[],
): void {
  if (contentItemIds.length === 0) return;

  const seenAt = new Date();
  for (const contentItemId of contentItemIds) {
    db.insert(contentItemSeen)
      .values({
        id: crypto.randomUUID(),
        userId,
        contentItemId,
        seenAt,
      })
      .onConflictDoNothing({
        target: [contentItemSeen.userId, contentItemSeen.contentItemId],
      })
      .run();
  }
}
