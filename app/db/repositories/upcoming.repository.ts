import { and, asc, eq, gte } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { contentItems, follows } from "~/db/schema";

export interface UpcomingOptions {
  limit?: number;
  offset?: number;
}

export function findUpcomingEvents(
  db: DrizzleDb,
  userId: string,
  opts: UpcomingOptions = {},
) {
  const now = new Date();

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
      eventDate: contentItems.eventDate,
      eventVenue: contentItems.eventVenue,
      eventCity: contentItems.eventCity,
      eventLat: contentItems.eventLat,
      eventLng: contentItems.eventLng,
      createdAt: contentItems.createdAt,
    })
    .from(contentItems)
    .innerJoin(follows, eq(contentItems.artistId, follows.artistId))
    .where(
      and(
        eq(follows.userId, userId),
        eq(contentItems.type, "EVENT"),
        gte(contentItems.eventDate, now),
      ),
    )
    .orderBy(asc(contentItems.eventDate))
    .$dynamic();

  if (opts.limit != null) {
    query = query.limit(opts.limit);
  }
  if (opts.offset != null) {
    query = query.offset(opts.offset);
  }

  return query.all();
}
