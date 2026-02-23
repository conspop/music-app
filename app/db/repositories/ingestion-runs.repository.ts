import { and, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { ingestionRuns } from "~/db/schema";

export function insertIngestionRun(
  db: DrizzleDb,
  data: typeof ingestionRuns.$inferInsert,
) {
  return db.insert(ingestionRuns).values(data).returning().get();
}

export function findLastIngestionRun(
  db: DrizzleDb,
  artistId: string,
  type: string,
) {
  return db
    .select()
    .from(ingestionRuns)
    .where(
      and(
        eq(ingestionRuns.artistId, artistId),
        eq(ingestionRuns.type, type),
      ),
    )
    .orderBy(desc(ingestionRuns.ranAt))
    .limit(1)
    .get();
}

export function findLastIngestionRunForArtist(
  db: DrizzleDb,
  artistId: string,
): { ranAt: Date } | undefined {
  return db
    .select({ ranAt: ingestionRuns.ranAt })
    .from(ingestionRuns)
    .where(eq(ingestionRuns.artistId, artistId))
    .orderBy(desc(ingestionRuns.ranAt))
    .limit(1)
    .get();
}

export function findLastIngestionRunsForArtists(
  db: DrizzleDb,
  artistIds: string[],
): Record<string, Date> {
  if (artistIds.length === 0) return {};

  const runs = db
    .select({ artistId: ingestionRuns.artistId, ranAt: ingestionRuns.ranAt })
    .from(ingestionRuns)
    .where(inArray(ingestionRuns.artistId, artistIds))
    .orderBy(desc(ingestionRuns.ranAt))
    .all();

  const result: Record<string, Date> = {};
  for (const run of runs) {
    if (!(run.artistId in result)) {
      result[run.artistId] = run.ranAt;
    }
  }
  return result;
}
