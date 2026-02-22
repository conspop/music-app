import { and, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists, contentItems, follows } from "~/db/schema";

export interface FeedOptions {
  artistIds?: string[];
  limit?: number;
  offset?: number;
}

export function findFeedItems(
  db: DrizzleDb,
  userId: string,
  opts: FeedOptions = {},
) {
  let query = db
    .select({
      id: contentItems.id,
      type: contentItems.type,
      artistId: contentItems.artistId,
      artistName: artists.name,
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
    .innerJoin(artists, eq(contentItems.artistId, artists.id))
    .where(
      and(
        eq(follows.userId, userId),
        eq(contentItems.type, "RELEASE"),
        opts.artistIds?.length
          ? inArray(contentItems.artistId, opts.artistIds)
          : undefined,
      ),
    )
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
