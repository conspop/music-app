import type { Route } from "./+types/api.ingest";
import { getAppContext } from "~/server/context";
import { getEnv } from "~/env.server";
import { requireUser } from "~/auth/require-user";
import { runIngestion } from "~/ingestion/orchestrator";
import { INGESTION_CONFIG } from "~/ingestion/config";

function isCronAuthenticated(request: Request): boolean {
  const cronSecret = getEnv().CRON_SECRET;
  if (!cronSecret) return false;

  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  return token === cronSecret;
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();

  if (!isCronAuthenticated(request)) {
    await requireUser(request, ctx.db, ctx.sessions);
  }

  const summary = await runIngestion({
    db: ctx.db,
    contentExtractor: ctx.contentExtractor,
    geocoder: ctx.geocoder,
    config: INGESTION_CONFIG,
  });

  return Response.json({ summary });
}
