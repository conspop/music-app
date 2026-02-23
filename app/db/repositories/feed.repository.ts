import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists, contentItemSeen, contentItems, follows } from "~/db/schema";

export interface FeedOptions {
  artistIds?: string[];
  newOnly?: boolean;
  releaseTypes?: string[];
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
      releaseType: contentItems.releaseType,
      confidence: contentItems.confidence,
      publishedAt: contentItems.publishedAt,
      createdAt: contentItems.createdAt,
      seenAt: contentItemSeen.seenAt,
    })
    .from(contentItems)
    .innerJoin(follows, eq(contentItems.artistId, follows.artistId))
    .innerJoin(artists, eq(contentItems.artistId, artists.id))
    .leftJoin(
      contentItemSeen,
      and(
        eq(contentItems.id, contentItemSeen.contentItemId),
        eq(contentItemSeen.userId, userId),
      ),
    )
    .where(
      and(
        eq(follows.userId, userId),
        eq(contentItems.type, "RELEASE"),
        opts.artistIds?.length
          ? inArray(contentItems.artistId, opts.artistIds)
          : undefined,
        opts.releaseTypes?.length
          ? inArray(contentItems.releaseType, opts.releaseTypes)
          : undefined,
        opts.newOnly ? isNull(contentItemSeen.seenAt) : undefined,
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
