import "dotenv/config";
import { createDb } from "~/db/connection";
import { contentItemSeen, contentItems, ingestionRuns } from "~/db/schema";

const db = createDb(process.env.DATABASE_URL ?? "./sqlite.db");

const seenResult = db.delete(contentItemSeen).run();
const contentResult = db.delete(contentItems).run();
const runsResult = db.delete(ingestionRuns).run();

console.log(
  `Wiped ${seenResult.changes} seen records, ${contentResult.changes} content items, and ${runsResult.changes} ingestion runs.`,
);
