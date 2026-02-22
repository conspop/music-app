import { and, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { contentItems, follows } from "~/db/schema";

export interface FeedOptions {
  type?: "NEWS" | "RELEASE";
  limit?: number;
  offset?: number;
}

const FEED_TYPES = ["NEWS", "RELEASE"];

export function findFeedItems(
  db: DrizzleDb,
  userId: string,
  opts: FeedOptions = {},
) {
  const types = opts.type ? [opts.type] : FEED_TYPES;

  let query = db
    .select({
      id: contentItems.id,
      type: contentItems.type,
      artistId: contentItems.artistId,
      title: contentItems.title,
      url: contentItems.url,
      summary: contentItems.summary,
      imageUrl: contentItems.imageUrl,
      confidence: contentItems.confidence,
      publishedAt: contentItems.publishedAt,
      createdAt: contentItems.createdAt,
    })
    .from(contentItems)
    .innerJoin(follows, eq(contentItems.artistId, follows.artistId))
    .where(and(eq(follows.userId, userId), inArray(contentItems.type, types)))
    .orderBy(desc(contentItems.publishedAt))
    .$dynamic();

  if (opts.limit != null) {
    query = query.limit(opts.limit);
  }
  if (opts.offset != null) {
    query = query.offset(opts.offset);
  }

  return query.all();
}
