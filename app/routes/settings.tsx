import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/settings";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { updateUserLocation } from "~/db/repositories/users.repository";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { LocationSearch } from "~/components/location-search";
import { MapPin } from "lucide-react";
import type { GeocoderResult } from "~/lib/geocoder";
import type { IngestionSummary } from "~/ingestion/orchestrator";
import { ALLOWED_INGEST_EMAIL } from "./api.ingest";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings — Music App" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      locationCity: user.locationCity,
      locationRegion: user.locationRegion,
      locationCountry: user.locationCountry,
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      locationRadiusKm: user.locationRadiusKm,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const formData = await request.formData();

  const city = formData.get("city");
  const region = formData.get("region");
  const country = formData.get("country");
  const latStr = formData.get("lat");
  const lngStr = formData.get("lng");
  const radiusStr = formData.get("radiusKm");

  if (typeof city !== "string" || !city.trim()) {
    return { error: "City is required" };
  }
  if (typeof region !== "string" || !region.trim()) {
    return { error: "Region is required" };
  }
  if (typeof country !== "string" || !country.trim()) {
    return { error: "Country is required" };
  }

  const lat = parseFloat(latStr as string);
  const lng = parseFloat(lngStr as string);
  const radiusKm = parseInt(radiusStr as string, 10);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90" };
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180" };
  }
  if (isNaN(radiusKm) || radiusKm < 1) {
    return { error: "Radius must be at least 1 km" };
  }

  updateUserLocation(ctx.db, user.id, {
    city: city.trim(),
    region: region.trim(),
    country: country.trim(),
    lat,
    lng,
    radiusKm,
  });

  return { success: true };
}

const RADIUS_OPTIONS = [10, 25, 50, 100, 200, 500];

function IngestionTrigger() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<IngestionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/ingest", { method: "POST" });
      if (!response.ok) {
        setError("Ingestion failed. Check the server logs for details.");
        return;
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch {
      setError("Ingestion failed. Check the server logs for details.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Ingestion</h2>
        <p className="text-sm text-muted-foreground">
          Manually trigger the content ingestion pipeline for all followed
          artists.
        </p>
      </div>

      <Button onClick={handleRun} disabled={running} variant="outline">
        {running ? "Running..." : "Run Ingestion"}
      </Button>

      {summary && (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <p className="font-medium">
            {summary.artistsProcessed} artists processed
          </p>
          <p>{summary.totalInserted} items inserted</p>
          {summary.totalSkippedDupes > 0 && (
            <p className="text-muted-foreground">
              {summary.totalSkippedDupes} duplicates skipped
            </p>
          )}
          {summary.totalSkippedLowConfidence > 0 && (
            <p className="text-muted-foreground">
              {summary.totalSkippedLowConfidence} low-confidence items skipped
            </p>
          )}
          {summary.totalErrors > 0 && (
            <p className="text-destructive">
              {summary.totalErrors} errors encountered
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface SelectedLocation {
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

function userToSelected(user: {
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
}): SelectedLocation | null {
  if (user.locationCity && user.locationLat != null && user.locationLng != null) {
    return {
      city: user.locationCity,
      region: user.locationRegion ?? "",
      country: user.locationCountry ?? "",
      lat: user.locationLat,
      lng: user.locationLng,
    };
  }
  return null;
}

function formatLocationSummary(loc: SelectedLocation): string {
  return [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const [selected, setSelected] = useState<SelectedLocation | null>(
    userToSelected(user),
  );
  const [isSearching, setIsSearching] = useState(!selected);

  function handleLocationSelect(result: GeocoderResult) {
    setSelected({
      city: result.city,
      region: result.region,
      country: result.country,
      lat: result.lat,
      lng: result.lng,
    });
    setIsSearching(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your home location for nearby event discovery.
        </p>
      </div>

      {actionData && "success" in actionData && actionData.success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Location saved successfully.
        </p>
      )}

      {actionData && "error" in actionData && (
        <p className="text-sm text-destructive">{actionData.error}</p>
      )}

      <Form method="post" className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label>Location</Label>
          {isSearching ? (
            <LocationSearch onSelect={handleLocationSelect} />
          ) : selected ? (
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm">
                {formatLocationSummary(selected)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsSearching(true)}
              >
                Change
              </Button>
            </div>
          ) : null}
        </div>

        {selected && (
          <>
            <input type="hidden" name="city" value={selected.city} />
            <input type="hidden" name="region" value={selected.region} />
            <input type="hidden" name="country" value={selected.country} />
            <input type="hidden" name="lat" value={selected.lat} />
            <input type="hidden" name="lng" value={selected.lng} />
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="radiusKm">Search radius (km)</Label>
          <select
            id="radiusKm"
            name="radiusKm"
            defaultValue={user.locationRadiusKm ?? 50}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={isSubmitting || !selected}>
          {isSubmitting ? "Saving..." : "Save location"}
        </Button>
      </Form>

      {user.email === ALLOWED_INGEST_EMAIL && (
        <>
          <hr className="border-border" />
          <IngestionTrigger />
        </>
      )}
    </div>
  );
}
