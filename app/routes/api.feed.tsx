import type { Route } from "./+types/api.feed";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { findFeedItems } from "~/db/repositories/feed.repository";
import type { FeedOptions } from "~/db/repositories/feed.repository";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);

  const url = new URL(request.url);
  const opts: FeedOptions = {};

  const type = url.searchParams.get("type");
  if (type === "NEWS" || type === "RELEASE") {
    opts.type = type;
  }

  const limit = url.searchParams.get("limit");
  if (limit != null) {
    opts.limit = Math.max(1, parseInt(limit, 10) || 20);
  }

  const offset = url.searchParams.get("offset");
  if (offset != null) {
    opts.offset = Math.max(0, parseInt(offset, 10) || 0);
  }

  const items = findFeedItems(ctx.db, user.id, opts);
  return Response.json({ items });
}
