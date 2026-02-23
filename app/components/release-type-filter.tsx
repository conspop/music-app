import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Checkbox } from "~/components/ui/checkbox";
import { Filter } from "lucide-react";
import { RELEASE_TYPES, RELEASE_TYPE_LABELS } from "~/lib/release-types";

export function ReleaseTypeFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTypes =
    searchParams.get("types")?.split(",").filter(Boolean) ?? [];

  function toggle(releaseType: string) {
    setSearchParams((prev) => {
      const current = prev.get("types")?.split(",").filter(Boolean) ?? [];
      const next = current.includes(releaseType)
        ? current.filter((t) => t !== releaseType)
        : [...current, releaseType];

      const updated = new URLSearchParams(prev);
      if (next.length === 0) {
        updated.delete("types");
      } else {
        updated.set("types", next.join(","));
      }
      return updated;
    });
  }

  function clearAll() {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete("types");
      return updated;
    });
  }

  const label =
    selectedTypes.length === 0
      ? "All types"
      : `${selectedTypes.length} type${selectedTypes.length === 1 ? "" : "s"}`;

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
          {selectedTypes.length > 0 && (
            <button
              onClick={clearAll}
              className="mb-2 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
            >
              Clear filter
            </button>
          )}
          <div className="space-y-1">
            {RELEASE_TYPES.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => toggle(type)}
                />
                {RELEASE_TYPE_LABELS[type] ?? type}
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
