import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof createDb>;

function toDbPath(url: string): string {
  return url.startsWith("file://") ? url.slice(7) : url;
}

export function createDb(url: string) {
  return drizzle(toDbPath(url), { schema });
}
