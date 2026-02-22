import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

import { useSearchParams } from "react-router";
import { ArtistFilter } from "./artist-filter";

const mockSetSearchParams = vi.fn();
const mockUseSearchParams = vi.mocked(useSearchParams);

const follows = [
  { followId: "f1", artistId: "a1", artistName: "Radiohead", createdAt: new Date() },
  { followId: "f2", artistId: "a2", artistName: "Bjork", createdAt: new Date() },
  { followId: "f3", artistId: "a3", artistName: "Portishead", createdAt: new Date() },
];

describe("ArtistFilter", () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(),
      mockSetSearchParams,
    ] as never);
  });

  it("renders a filter button", () => {
    render(<ArtistFilter follows={follows} />);
    expect(
      screen.getByRole("button", { name: /all artists/i }),
    ).toBeInTheDocument();
  });

  it("shows 'All artists' label when no filter is active", () => {
    render(<ArtistFilter follows={follows} />);
    expect(screen.getByText(/all artists/i)).toBeInTheDocument();
  });

  it("shows the count of selected artists when filter is active", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("artists=a1,a2"),
      mockSetSearchParams,
    ] as never);

    render(<ArtistFilter follows={follows} />);
    expect(screen.getByText(/2 artists/i)).toBeInTheDocument();
  });
});
