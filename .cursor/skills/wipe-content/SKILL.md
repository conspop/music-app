---
name: wipe-content
description: Wipe ingested content from the local SQLite database (content_items and ingestion_runs) while preserving users, artists, and follows. Use when the user asks to clear content, wipe the database, reset ingestion data, or start fresh with events/releases.
---

# Wiping Local Content

## Scope

**Wiped** (deleted):
- `content_items` — all releases, events, and news
- `ingestion_runs` — ingestion run history

**Preserved**:
- `users`, `artists`, `follows` — identity and preferences stay intact

## Script

Run the wipe script:

```bash
npm run db:wipe
```

Or: `npx tsx scripts/wipe-content.ts`

Uses `DATABASE_URL` from env (default `./sqlite.db`). Loads `.env` via dotenv.

## Implementation

The script uses Drizzle's `delete().from()`:

```typescript
db.delete(contentItems).run();
db.delete(ingestionRuns).run();
```

Order does not matter (no FK between these tables).
