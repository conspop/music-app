import type { Route } from "./+types/api.ingest";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { runIngestion } from "~/ingestion/orchestrator";
import { INGESTION_CONFIG } from "~/ingestion/config";

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();
  await requireUser(request, ctx.db, ctx.sessions);

  const summary = await runIngestion({
    db: ctx.db,
    contentExtractor: ctx.contentExtractor,
    config: INGESTION_CONFIG,
  });

  return Response.json({ summary });
}
