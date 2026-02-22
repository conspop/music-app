import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "~/db/schema";
import type { DrizzleDb } from "~/db/connection";
import path from "node:path";

export function createTestDb(): DrizzleDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.resolve(import.meta.dirname, "../drizzle"),
  });
  return db;
}
