import { useLoaderData } from "react-router";
import type { Route } from "./+types/news";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { findFeedItems } from "~/db/repositories/feed.repository";
import { FeedCard } from "~/components/feed-card";
import { Newspaper } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "News — Music App" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const url = new URL(request.url);

  const artistIds = url.searchParams.get("artists")?.split(",").filter(Boolean);
  const items = findFeedItems(ctx.db, user.id, {
    type: "NEWS",
    ...(artistIds?.length ? { artistIds } : {}),
  });
  return { items };
}

export default function News() {
  const { items } = useLoaderData<typeof loader>();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Newspaper className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No news yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow some artists to start seeing news here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}
