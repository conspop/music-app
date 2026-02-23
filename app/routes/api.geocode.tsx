import type { Route } from "./+types/api.geocode";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  await requireUser(request, ctx.db, ctx.sessions);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ results: [] });
  }

  try {
    const results = await ctx.geocoder.search(q);
    return Response.json({ results });
  } catch {
    return Response.json(
      { error: "Geocoding service unavailable" },
      { status: 502 },
    );
  }
}
