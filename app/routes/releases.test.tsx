import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockSetSearchParams = vi.fn();
vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useSearchParams: vi.fn(() => [
      new URLSearchParams(),
      mockSetSearchParams,
    ]),
  };
});

import { useLoaderData } from "react-router";
import Releases from "./releases";

const mockUseLoaderData = vi.mocked(useLoaderData);

describe("Releases", () => {
  it("renders release items", () => {
    mockUseLoaderData.mockReturnValue({
      items: [
        {
          id: "1",
          type: "RELEASE",
          artistId: "a1",
          artistName: "Bjork",
          title: "Bjork — New Single",
          url: "https://example.com/1",
          summary: "A brand new single out now.",
          imageUrl: null,
          confidence: 0.85,
          publishedAt: new Date("2026-02-18"),
          createdAt: new Date("2026-02-18"),
        },
      ],
    });

    render(<Releases />);
    expect(screen.getByText("Bjork — New Single")).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    mockUseLoaderData.mockReturnValue({ items: [] });

    render(<Releases />);
    expect(screen.getByText(/no releases yet/i)).toBeInTheDocument();
  });
});
