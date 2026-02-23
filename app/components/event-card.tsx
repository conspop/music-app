import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { MapPin, Clock, ExternalLink, Users } from "lucide-react";

export interface EventItem {
  id: string;
  type: string;
  artistId: string;
  artistName: string;
  title: string;
  url: string | null;
  summary: string | null;
  imageUrl: string | null;
  confidence: number;
  publishedAt: Date | null;
  eventDate: Date | null;
  eventVenue: string | null;
  eventCity: string | null;
  eventOtherArtists: string | null;
  eventLat: number | null;
  eventLng: number | null;
  eventVenueMapsUrl: string | null;
  createdAt: Date;
}

function formatTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventCard({ event }: { event: EventItem }) {
  const location = [event.eventVenue, event.eventCity]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-3">
        <h3 className="text-lg font-bold leading-tight">
          {event.artistName}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {event.eventVenueMapsUrl ? (
                <a
                  href={event.eventVenueMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {location}
                </a>
              ) : (
                location
              )}
            </span>
          )}
          {event.eventDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {formatTime(event.eventDate)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {event.eventOtherArtists && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            with {event.eventOtherArtists}
          </p>
        )}
        {event.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.summary}
          </p>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tickets / More Info
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
