import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export interface FeedItem {
  id: string;
  type: string;
  artistId: string;
  artistName: string;
  title: string;
  url: string | null;
  summary: string | null;
  imageUrl: string | null;
  releaseType: string | null;
  confidence: number;
  publishedAt: Date | null;
  createdAt: Date;
}

const RELEASE_TYPE_LABELS: Record<string, string> = {
  album: "Album",
  single: "Single",
  ep: "EP",
  compilation: "Compilation",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeedCard({ item }: { item: FeedItem }) {
  const titleContent = (
    <h3 className="font-semibold leading-tight">{item.title}</h3>
  );

  const badgeLabel =
    item.releaseType && RELEASE_TYPE_LABELS[item.releaseType]
      ? RELEASE_TYPE_LABELS[item.releaseType]
      : item.type;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={`${item.title} cover`}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {titleContent}
            </a>
          ) : (
            titleContent
          )}
          <p className="text-sm text-muted-foreground">{item.artistName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary">{badgeLabel}</Badge>
          {item.publishedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDate(item.publishedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      {item.summary && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{item.summary}</p>
        </CardContent>
      )}
    </Card>
  );
}
