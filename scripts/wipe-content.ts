import "dotenv/config";
import { createDb } from "~/db/connection";
import { contentItems, ingestionRuns } from "~/db/schema";

const db = createDb(process.env.DATABASE_URL ?? "./sqlite.db");

const contentResult = db.delete(contentItems).run();
const runsResult = db.delete(ingestionRuns).run();

console.log(`Wiped ${contentResult.changes} content items and ${runsResult.changes} ingestion runs.`);
