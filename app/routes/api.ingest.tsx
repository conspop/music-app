import type { Route } from "./+types/api.ingest";
import { getAppContext } from "~/server/context";
import { getEnv } from "~/env.server";
import { requireUser } from "~/auth/require-user";
import { runIngestion } from "~/ingestion/orchestrator";
import { ingestionProgress } from "~/ingestion/ingestion-progress";
import { INGESTION_CONFIG } from "~/ingestion/config";

function isCronAuthenticated(request: Request): boolean {
  const cronSecret = getEnv().CRON_SECRET;
  if (!cronSecret) return false;

  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  return token === cronSecret;
}

export const ALLOWED_INGEST_EMAIL = "seb.beitel@gmail.com";

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();

  if (!isCronAuthenticated(request)) {
    const user = await requireUser(request, ctx.db, ctx.sessions);
    if (user.email !== ALLOWED_INGEST_EMAIL) {
      return Response.json(
        { error: "Forbidden: only allowed users can run ingestion" },
        { status: 403 },
      );
    }
  }

  const summary = await runIngestion({
    db: ctx.db,
    contentExtractor: ctx.contentExtractor,
    geocoder: ctx.geocoder,
    config: INGESTION_CONFIG,
    ingestionProgress,
  });

  return Response.json({ summary });
}
