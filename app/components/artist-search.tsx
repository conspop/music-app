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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Music } from "lucide-react";

interface SpotifyArtistResult {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
}

interface ArtistSearchProps {
  onSelect: (artist: SpotifyArtistResult) => void;
}

export function ArtistSearch({ onSelect }: ArtistSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fetcher = useFetcher<{ results: SpotifyArtistResult[] }>();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const results = fetcher.data?.results ?? [];
  const isLoading = fetcher.state === "loading";

  const debouncedSearch = useCallback(
    (value: string) => {
      clearTimeout(debounceRef.current);
      if (!value.trim()) return;
      debounceRef.current = setTimeout(() => {
        fetcher.load(`/api/spotify-search?q=${encodeURIComponent(value)}`);
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

  function handleSelect(spotifyId: string) {
    const artist = results.find((r) => r.spotifyId === spotifyId);
    if (artist) {
      onSelect(artist);
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false} className="rounded-lg border">
        <PopoverAnchor asChild>
          <CommandInput
            placeholder="Search for an artist..."
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
              <CommandEmpty>No artists found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((artist) => (
                  <CommandItem
                    key={artist.spotifyId}
                    value={artist.spotifyId}
                    onSelect={handleSelect}
                    className="flex items-center gap-3 py-2"
                  >
                    <Avatar size="sm">
                      {artist.imageUrl ? (
                        <AvatarImage
                          src={artist.imageUrl}
                          alt={artist.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        <Music className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{artist.name}</span>
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
