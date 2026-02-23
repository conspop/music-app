import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { MapPin, Calendar, ExternalLink } from "lucide-react";

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
  eventLat: number | null;
  eventLng: number | null;
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
  const titleContent = (
    <h3 className="font-semibold leading-tight">{event.title}</h3>
  );

  return (
    <Card>
      <CardHeader className="space-y-1">
        {event.url ? (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {titleContent}
          </a>
        ) : (
          titleContent
        )}
        <p className="text-sm text-muted-foreground">{event.artistName}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {event.eventDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatTime(event.eventDate)}
          </span>
        )}
        {(event.eventVenue || event.eventCity) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {[event.eventVenue, event.eventCity].filter(Boolean).join(", ")}
          </span>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tickets / More Info
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
