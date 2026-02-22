---
name: drizzle-sqlite
description: Work with Drizzle ORM and SQLite — define schemas, generate migrations, set up connections, and write repositories. Use when creating or modifying database tables, writing migrations, setting up Drizzle config, or implementing data access layers with SQLite.
---

# Drizzle ORM + SQLite

## Connection Setup

Use `better-sqlite3` for a local synchronous driver, or `libsql` if you need Turso remote support later.

```typescript
// better-sqlite3
import { drizzle } from "drizzle-orm/better-sqlite3";
const db = drizzle("./sqlite.db");

// libsql (also works with local files)
import { drizzle } from "drizzle-orm/libsql";
const db = drizzle({ connection: { url: process.env.DATABASE_URL! } });
```

## Schema Definition

Define tables with `sqliteTable` from `drizzle-orm/sqlite-core`. Keep all tables in `app/db/schema.ts` (or split into `schema/*.ts` files re-exported from a barrel).

```typescript
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);
```

### Column Types Quick Reference

| Drizzle type | SQLite storage | Modes |
|---|---|---|
| `text()` | TEXT | default, `json`, `enum` |
| `integer()` | INTEGER | `number`, `boolean`, `timestamp`, `timestamp_ms` |
| `real()` | REAL | default |
| `blob()` | BLOB | `buffer`, `json`, `bigint` |

Use `integer({ mode: "timestamp" })` for date columns — stores Unix seconds, maps to JS `Date`.

### Relations

Define relations separately from tables for Drizzle's relational query API:

```typescript
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  follows: many(follows),
}));
```

## Drizzle Config

Create `drizzle.config.ts` at the project root:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./sqlite.db",
  },
});
```

## Migration Workflow

1. Edit schema files.
2. Generate migration:
   ```bash
   npx drizzle-kit generate
   ```
   This creates a timestamped SQL file in `./drizzle/`.
3. Apply migrations:
   ```bash
   npx drizzle-kit migrate
   ```
4. For development iteration, `drizzle-kit push` applies schema changes directly (no migration file). Only use during early prototyping.

## Repository Pattern

One file per entity, export plain functions that take a `db` instance:

```typescript
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { artists } from "./schema";

export function findArtistById(db: BetterSQLite3Database, id: string) {
  return db.select().from(artists).where(eq(artists.id, id)).get();
}

export function insertArtist(db: BetterSQLite3Database, data: typeof artists.$inferInsert) {
  return db.insert(artists).values(data).returning().get();
}
```

Inject the `db` instance — never import a global singleton inside repository files. This makes testing straightforward.
