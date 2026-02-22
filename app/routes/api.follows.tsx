import type { Route } from "./+types/api.follows";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import {
  findFollowsWithArtists,
  followArtist,
  unfollowArtist,
} from "~/db/repositories/follows.repository";
import { findOrCreateArtist } from "~/db/repositories/artists.repository";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const follows = findFollowsWithArtists(ctx.db, user.id);
  return Response.json({ follows });
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "follow") {
    const artistName = formData.get("artistName");
    if (typeof artistName !== "string" || !artistName.trim()) {
      return Response.json(
        { error: "artistName is required" },
        { status: 400 },
      );
    }

    const artist = findOrCreateArtist(ctx.db, artistName.trim());
    const follow = followArtist(ctx.db, {
      id: crypto.randomUUID(),
      userId: user.id,
      artistId: artist.id,
      createdAt: new Date(),
    });

    return Response.json({ follow, artist });
  }

  if (intent === "unfollow") {
    const artistId = formData.get("artistId");
    if (typeof artistId !== "string" || !artistId.trim()) {
      return Response.json(
        { error: "artistId is required" },
        { status: 400 },
      );
    }

    unfollowArtist(ctx.db, user.id, artistId);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown intent" }, { status: 400 });
}
