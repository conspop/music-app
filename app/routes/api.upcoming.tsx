import type { Route } from "./+types/api.upcoming";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { findUpcomingEvents } from "~/db/repositories/upcoming.repository";
import type { UpcomingOptions } from "~/db/repositories/upcoming.repository";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);

  const url = new URL(request.url);
  const opts: UpcomingOptions = {};

  const limit = url.searchParams.get("limit");
  if (limit != null) {
    opts.limit = Math.max(1, parseInt(limit, 10) || 20);
  }

  const offset = url.searchParams.get("offset");
  if (offset != null) {
    opts.offset = Math.max(0, parseInt(offset, 10) || 0);
  }

  const events = findUpcomingEvents(ctx.db, user.id, opts);
  return Response.json({ events });
}
