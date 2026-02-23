#!/usr/bin/env node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawUrl = process.env.DATABASE_URL ?? "./sqlite.db";
const dbPath = rawUrl.startsWith("file://") ? rawUrl.slice(7) : rawUrl;
const db = drizzle(new Database(dbPath));

migrate(db, {
  migrationsFolder: path.join(__dirname, "..", "drizzle"),
});
