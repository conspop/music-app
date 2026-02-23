import { and, asc, eq, gte, inArray } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { artists, contentItems, follows } from "~/db/schema";
import { haversineKm } from "~/lib/haversine";

export interface UpcomingOptions {
  artistIds?: string[];
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
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
      artistName: artists.name,
      title: contentItems.title,
      url: contentItems.url,
      summary: contentItems.summary,
      imageUrl: contentItems.imageUrl,
      confidence: contentItems.confidence,
      publishedAt: contentItems.publishedAt,
      eventDate: contentItems.eventDate,
      eventVenue: contentItems.eventVenue,
      eventCity: contentItems.eventCity,
      eventOtherArtists: contentItems.eventOtherArtists,
      eventLat: contentItems.eventLat,
      eventLng: contentItems.eventLng,
      createdAt: contentItems.createdAt,
    })
    .from(contentItems)
    .innerJoin(follows, eq(contentItems.artistId, follows.artistId))
    .innerJoin(artists, eq(contentItems.artistId, artists.id))
    .where(
      and(
        eq(follows.userId, userId),
        eq(contentItems.type, "EVENT"),
        gte(contentItems.eventDate, now),
        opts.artistIds?.length
          ? inArray(contentItems.artistId, opts.artistIds)
          : undefined,
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

  const rows = query.all();

  if (
    opts.maxDistanceKm != null &&
    opts.userLat != null &&
    opts.userLng != null
  ) {
    return rows.filter((row) => {
      if (row.eventLat == null || row.eventLng == null) return false;
      return (
        haversineKm(opts.userLat!, opts.userLng!, row.eventLat, row.eventLng) <=
        opts.maxDistanceKm!
      );
    });
  }

  return rows;
}
