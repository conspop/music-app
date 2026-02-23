#!/usr/bin/env node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL ?? "./sqlite.db";
const db = drizzle(new Database(dbPath));

migrate(db, {
  migrationsFolder: path.join(__dirname, "..", "drizzle"),
});
