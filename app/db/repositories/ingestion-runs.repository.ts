import { and, desc, eq } from "drizzle-orm";
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
