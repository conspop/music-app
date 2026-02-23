import "dotenv/config";
import { createDb } from "~/db/connection";
import { createOpenAIContentExtractor } from "~/ingestion/content-extractor";
import { runIngestion } from "~/ingestion/orchestrator";
import { INGESTION_CONFIG } from "~/ingestion/config";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const db = createDb(process.env.DATABASE_URL ?? "./sqlite.db");
const contentExtractor = createOpenAIContentExtractor(apiKey);

console.log("Starting ingestion...\n");
const start = Date.now();

const summary = await runIngestion({
  db,
  contentExtractor,
  config: INGESTION_CONFIG,
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n=== DONE in ${elapsed}s ===`);
console.log(JSON.stringify(summary, null, 2));
