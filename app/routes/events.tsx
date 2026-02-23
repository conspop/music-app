import { useLoaderData } from "react-router";
import type { Route } from "./+types/events";
import { getAppContext } from "~/server/context";
import { requireUser } from "~/auth/require-user";
import { findUpcomingEvents } from "~/db/repositories/upcoming.repository";
import { EventCard, type EventItem } from "~/components/event-card";
import { DistanceFilter } from "~/components/distance-filter";
import { CalendarDays } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Events — Music App" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const url = new URL(request.url);

  const artistIds = url.searchParams.get("artists")?.split(",").filter(Boolean);

  const distanceParam = url.searchParams.get("distance");
  const hasLocation = user.locationLat != null && user.locationLng != null;
  const isAnyDistance = distanceParam === "any";

  const distanceOpts =
    hasLocation && !isAnyDistance
      ? {
          userLat: user.locationLat!,
          userLng: user.locationLng!,
          maxDistanceKm: distanceParam
            ? (parseInt(distanceParam, 10) || (user.locationRadiusKm ?? 50))
            : (user.locationRadiusKm ?? 50),
        }
      : {};

  const events = findUpcomingEvents(ctx.db, user.id, {
    ...(artistIds?.length ? { artistIds } : {}),
    ...distanceOpts,
  });

  return {
    events: events.map((event) => ({
      ...event,
      isNew: event.seenAt == null,
    })),
    userLocation: hasLocation
      ? { defaultRadiusKm: user.locationRadiusKm ?? 50 }
      : null,
  };
}

export interface DateGroup {
  dateKey: string;
  label: string;
  events: EventItem[];
}

export function groupEventsByDate(events: EventItem[]): DateGroup[] {
  const groups = new Map<string, EventItem[]>();

  for (const event of events) {
    const dateKey = event.eventDate
      ? toDateKey(event.eventDate)
      : "unknown";

    const list = groups.get(dateKey) ?? [];
    list.push(event);
    groups.set(dateKey, list);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: dateKey === "unknown" ? "Date TBD" : formatDateHeading(dateKey),
    events: items,
  }));
}

function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatDateHeading(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Events() {
  const { events, userLocation } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      {userLocation && (
        <DistanceFilter defaultRadiusKm={userLocation.defaultRadiusKm} />
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">No upcoming events</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow some artists to start seeing events here.
          </p>
        </div>
      ) : (
        groupEventsByDate(events).map(({ dateKey, label, events: groupEvents }) => (
          <section key={dateKey}>
            <h2 className="mb-3 text-lg font-semibold">{label}</h2>
            <div className="space-y-3">
              {groupEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
