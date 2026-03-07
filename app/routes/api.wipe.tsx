import type { Route } from "./+types/api.wipe";
import { getAppContext } from "~/server/context";
import { getEnv } from "~/env.server";
import { contentItemSeen, contentItems, ingestionRuns } from "~/db/schema";

function isCronAuthenticated(request: Request): boolean {
  const cronSecret = getEnv().CRON_SECRET;
  if (!cronSecret) return false;

  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  return token === cronSecret;
}

export async function action({ request }: Route.ActionArgs) {
  if (!isCronAuthenticated(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = getAppContext();

  const seenResult = ctx.db.delete(contentItemSeen).run();
  const contentResult = ctx.db.delete(contentItems).run();
  const runsResult = ctx.db.delete(ingestionRuns).run();

  return Response.json({
    wiped: {
      contentItemSeen: seenResult.changes,
      contentItems: contentResult.changes,
      ingestionRuns: runsResult.changes,
    },
  });
}
