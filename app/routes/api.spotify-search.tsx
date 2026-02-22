import type { Route } from "./+types/api.spotify-search";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { getAccessToken, searchArtists } from "~/lib/spotify-client";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  await requireUser(request, ctx.db, ctx.sessions);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ results: [] });
  }

  if (!ctx.spotifyCredentials) {
    return Response.json(
      { error: "Spotify is not configured" },
      { status: 503 },
    );
  }

  const { clientId, clientSecret } = ctx.spotifyCredentials;

  let token: string;
  try {
    token = await getAccessToken(clientId, clientSecret);
  } catch {
    return Response.json(
      { error: "Failed to authenticate with Spotify" },
      { status: 502 },
    );
  }

  const artists = await searchArtists(token, q);

  const results = artists.map((a) => ({
    spotifyId: a.id,
    name: a.name,
    imageUrl: a.images[0]?.url ?? null,
  }));

  return Response.json({ results });
}
