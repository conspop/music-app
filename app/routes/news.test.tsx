import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
  };
});

import { useLoaderData } from "react-router";
import News from "./news";

const mockUseLoaderData = vi.mocked(useLoaderData);

describe("News", () => {
  it("renders feed items", () => {
    mockUseLoaderData.mockReturnValue({
      items: [
        {
          id: "1",
          type: "NEWS",
          artistId: "a1",
          artistName: "Radiohead",
          title: "Radiohead announces tour",
          url: "https://example.com/1",
          summary: "A big tour across Europe.",
          imageUrl: null,
          confidence: 0.9,
          publishedAt: new Date("2026-02-20"),
          createdAt: new Date("2026-02-20"),
        },
      ],
    });

    render(<News />);
    expect(screen.getByText("Radiohead announces tour")).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    mockUseLoaderData.mockReturnValue({ items: [] });

    render(<News />);
    expect(screen.getByText(/no news yet/i)).toBeInTheDocument();
  });
});
