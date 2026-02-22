import { redirect } from "react-router";
import type { DrizzleDb } from "~/db/connection";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { createSessionStorage } from "./session.server";

type SessionStorage = ReturnType<typeof createSessionStorage>;

export async function requireUser(
  request: Request,
  db: DrizzleDb,
  sessions: SessionStorage,
) {
  const userId = await sessions.getUserId(request);
  if (!userId) throw redirect("/login");

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw redirect("/login");

  return user;
}
