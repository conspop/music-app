import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Checkbox } from "~/components/ui/checkbox";
import { Filter } from "lucide-react";

interface Follow {
  followId: string;
  artistId: string;
  artistName: string;
  createdAt: Date;
}

export function ArtistFilter({ follows }: { follows: Follow[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIds = searchParams.get("artists")?.split(",").filter(Boolean) ?? [];

  function toggle(artistId: string) {
    setSearchParams((prev) => {
      const current = prev.get("artists")?.split(",").filter(Boolean) ?? [];
      const next = current.includes(artistId)
        ? current.filter((id) => id !== artistId)
        : [...current, artistId];

      const updated = new URLSearchParams(prev);
      if (next.length === 0) {
        updated.delete("artists");
      } else {
        updated.set("artists", next.join(","));
      }
      return updated;
    });
  }

  function clearAll() {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete("artists");
      return updated;
    });
  }

  const label =
    selectedIds.length === 0
      ? "All artists"
      : `${selectedIds.length} artist${selectedIds.length === 1 ? "" : "s"}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          {selectedIds.length > 0 && (
            <button
              onClick={clearAll}
              className="mb-2 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
            >
              Clear filter
            </button>
          )}
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {follows.map((f) => (
              <label
                key={f.artistId}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selectedIds.includes(f.artistId)}
                  onCheckedChange={() => toggle(f.artistId)}
                />
                {f.artistName}
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
