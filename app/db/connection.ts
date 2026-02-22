import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof createDb>;

export function createDb(url: string) {
  return drizzle(url, { schema });
}
