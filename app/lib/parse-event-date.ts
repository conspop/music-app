import { fromZonedTime } from "date-fns-tz";

/**
 * Parse an event date string as venue-local time and convert to UTC.
 * Handles:
 * - ISO 8601 with timezone (e.g. "2026-02-26T20:00-05:00") - parses correctly via Date
 * - ISO 8601 without timezone (e.g. "2026-02-26T20:00") - interprets as venue-local via timezone
 */
export function parseEventDateAsVenueLocal(
  dateStr: string | undefined,
  timezone: string | null,
): Date | null {
  if (!dateStr?.trim()) return null;

  const trimmed = dateStr.trim();

  // If the string has a timezone offset (Z or ±HH:mm), Date parses it correctly
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // No timezone: interpret as venue-local
  if (!timezone) return null;

  const match =
    trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/) ??
    trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d, h, min, sec] = match;
  const hour = h != null ? parseInt(h, 10) : 20;
  const minute = min != null ? parseInt(min, 10) : 0;
  const second = sec != null ? parseInt(sec, 10) : 0;
  const date = new Date(
    parseInt(y!, 10),
    parseInt(m!, 10) - 1,
    parseInt(d!, 10),
    hour,
    minute,
    second,
  );

  if (isNaN(date.getTime())) return null;

  return fromZonedTime(date, timezone);
}
