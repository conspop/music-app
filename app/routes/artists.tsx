import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/artists";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import {
  findFollowsWithArtists,
  followArtist,
  unfollowArtist,
} from "~/db/repositories/follows.repository";
import { findOrCreateArtist } from "~/db/repositories/artists.repository";
import { ingestArtist } from "~/ingestion/ingest-artist";
import { INGESTION_CONFIG } from "~/ingestion/config";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Music, X } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Artists — Music App" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const follows = findFollowsWithArtists(ctx.db, user.id);
  return { follows };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "follow") {
    const artistName = formData.get("artistName");
    if (typeof artistName !== "string" || !artistName.trim()) {
      return { error: "Artist name is required" };
    }

    const { artist, isNew } = findOrCreateArtist(ctx.db, artistName.trim());
    followArtist(ctx.db, {
      id: crypto.randomUUID(),
      userId: user.id,
      artistId: artist.id,
      createdAt: new Date(),
    });

    if (isNew) {
      ingestArtist({
        db: ctx.db,
        contentExtractor: ctx.contentExtractor,
        config: INGESTION_CONFIG,
        artist,
      }).catch((err) => console.error(`[follow] ingestion failed for "${artist.name}":`, err));
    }

    return { ok: true };
  }

  if (intent === "unfollow") {
    const artistId = formData.get("artistId");
    if (typeof artistId !== "string" || !artistId.trim()) {
      return { error: "Artist ID is required" };
    }
    unfollowArtist(ctx.db, user.id, artistId);
    return { ok: true };
  }

  return { error: "Unknown intent" };
}

export default function Artists() {
  const { follows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the artists you follow.
        </p>
      </div>

      <Form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="follow" />
        <Input
          name="artistName"
          placeholder="Artist name"
          required
          className="max-w-xs"
        />
        <Button type="submit" disabled={isSubmitting}>
          Follow
        </Button>
      </Form>

      {actionData && "error" in actionData && (
        <p className="text-sm text-destructive">{actionData.error}</p>
      )}

      {follows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Music className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">
            Not following any artists
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an artist above to start getting updates.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {follows.map((f) => (
            <Card key={f.followId}>
              <CardContent className="flex items-center justify-between py-3">
                <span className="font-medium">{f.artistName}</span>
                <Form method="post">
                  <input type="hidden" name="intent" value="unfollow" />
                  <input type="hidden" name="artistId" value={f.artistId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Unfollow
                  </Button>
                </Form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
