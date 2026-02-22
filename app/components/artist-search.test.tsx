import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockLoad = vi.fn();
let fetcherData: { results: { spotifyId: string; name: string; imageUrl: string | null }[] } | undefined;

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      load: mockLoad,
      get data() { return fetcherData; },
      state: "idle",
    }),
  };
});

import { ArtistSearch } from "./artist-search";

describe("ArtistSearch", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onSelect.mockClear();
    mockLoad.mockClear();
    fetcherData = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the search input", () => {
    render(<ArtistSearch onSelect={onSelect} />);
    expect(
      screen.getByPlaceholderText(/search for an artist/i),
    ).toBeInTheDocument();
  });

  it("triggers a debounced search when user types", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArtistSearch onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/search for an artist/i);
    await user.type(input, "radio");

    await vi.advanceTimersByTimeAsync(350);

    expect(mockLoad).toHaveBeenCalledWith(
      expect.stringContaining("/api/spotify-search?q=radio"),
    );
  });

  it("does not search when input is blank", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArtistSearch onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/search for an artist/i);
    await user.type(input, "   ");

    await vi.advanceTimersByTimeAsync(350);

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it("displays results and calls onSelect when clicked", async () => {
    fetcherData = {
      results: [
        { spotifyId: "sp1", name: "Radiohead", imageUrl: null },
        { spotifyId: "sp2", name: "Radio Moscow", imageUrl: null },
      ],
    };

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArtistSearch onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/search for an artist/i);
    await user.type(input, "radio");
    await vi.advanceTimersByTimeAsync(350);

    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Radio Moscow")).toBeInTheDocument();

    await user.click(screen.getByText("Radiohead"));

    expect(onSelect).toHaveBeenCalledWith({
      spotifyId: "sp1",
      name: "Radiohead",
      imageUrl: null,
    });
  });
});
