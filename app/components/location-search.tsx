import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/ui/popover";
import { MapPin } from "lucide-react";
import type { GeocoderResult } from "~/lib/geocoder";

interface LocationSearchProps {
  onSelect: (result: GeocoderResult) => void;
}

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fetcher = useFetcher<{ results: GeocoderResult[] }>();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const results = fetcher.data?.results ?? [];
  const isLoading = fetcher.state === "loading";

  const debouncedSearch = useCallback(
    (value: string) => {
      clearTimeout(debounceRef.current);
      if (!value.trim()) return;
      debounceRef.current = setTimeout(() => {
        fetcher.load(`/api/geocode?q=${encodeURIComponent(value)}`);
      }, 300);
    },
    [fetcher],
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (value.trim()) {
      setOpen(true);
      debouncedSearch(value);
    } else {
      setOpen(false);
    }
  }

  function handleSelect(displayName: string) {
    const result = results.find((r) => r.displayName === displayName);
    if (result) {
      onSelect(result);
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false} className="rounded-lg border">
        <PopoverAnchor asChild>
          <CommandInput
            placeholder="Search for a city or postal code..."
            value={query}
            onValueChange={handleInputChange}
            onFocus={() => {
              if (query.trim() && results.length > 0) setOpen(true);
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
          sideOffset={2}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isLoading && query.trim() && results.length === 0 && (
              <CommandEmpty>No locations found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.lat},${result.lng}`}
                    value={result.displayName}
                    onSelect={handleSelect}
                    className="flex items-center gap-3 py-2"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{result.displayName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
