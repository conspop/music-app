import { find } from "geo-tz";
import { lookupViaCity } from "city-timezones";

/**
 * Resolve IANA timezone for an event venue from coordinates or city name.
 * Used to parse event times as venue-local and to display times in venue timezone.
 */
export function resolveEventTimezone(opts: {
  eventCity: string | null;
  eventLat?: number | null;
  eventLng?: number | null;
}): string | null {
  const { eventCity, eventLat, eventLng } = opts;

  // Prefer coordinates when available (most accurate)
  if (eventLat != null && eventLng != null) {
    const zones = find(eventLat, eventLng);
    if (zones?.length) return zones[0];
  }

  // Fallback: lookup by city name
  if (eventCity?.trim()) {
    const matches = lookupViaCity(eventCity.trim());
    if (matches?.length) {
      // Prefer match with highest population when ambiguous (e.g. Toronto ON vs Toronto OH)
      const sorted = [...matches].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0));
      return sorted[0]?.timezone ?? null;
    }
  }

  return null;
}
