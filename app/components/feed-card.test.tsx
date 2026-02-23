import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FeedCard } from "./feed-card";

const mockItem = {
  id: "1",
  type: "RELEASE" as const,
  artistId: "a1",
  artistName: "Radiohead",
  title: "Radiohead announces new album",
  url: "https://example.com/news/1",
  summary: "The band confirmed a new release for 2026.",
  imageUrl: null,
  releaseType: null as string | null,
  confidence: 0.95,
  publishedAt: new Date("2026-02-20"),
  createdAt: new Date("2026-02-20"),
};

describe("FeedCard", () => {
  it("renders the title", () => {
    render(<FeedCard item={mockItem} />);
    expect(
      screen.getByText("Radiohead announces new album"),
    ).toBeInTheDocument();
  });

  it("renders the artist name", () => {
    render(<FeedCard item={mockItem} />);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders the summary", () => {
    render(<FeedCard item={mockItem} />);
    expect(
      screen.getByText("The band confirmed a new release for 2026."),
    ).toBeInTheDocument();
  });

  it("links to the source URL", () => {
    render(<FeedCard item={mockItem} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/news/1");
  });

  it("renders without a link when url is null", () => {
    render(<FeedCard item={{ ...mockItem, url: null }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the published date", () => {
    const expected = new Date("2026-02-20").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    render(<FeedCard item={mockItem} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("handles missing summary gracefully", () => {
    render(<FeedCard item={{ ...mockItem, summary: null }} />);
    expect(
      screen.getByText("Radiohead announces new album"),
    ).toBeInTheDocument();
  });

  it("shows specific release type badge when releaseType is set", () => {
    render(<FeedCard item={{ ...mockItem, releaseType: "album" }} />);
    expect(screen.getByText("Album")).toBeInTheDocument();
  });

  it("shows 'Single' badge for single releaseType", () => {
    render(<FeedCard item={{ ...mockItem, releaseType: "single" }} />);
    expect(screen.getByText("Single")).toBeInTheDocument();
  });

  it("shows 'EP' badge for ep releaseType", () => {
    render(<FeedCard item={{ ...mockItem, releaseType: "ep" }} />);
    expect(screen.getByText("EP")).toBeInTheDocument();
  });

  it("falls back to generic type badge when releaseType is null", () => {
    render(<FeedCard item={{ ...mockItem, releaseType: null }} />);
    expect(screen.getByText("RELEASE")).toBeInTheDocument();
  });

  it("displays album art image when imageUrl is provided", () => {
    render(
      <FeedCard
        item={{ ...mockItem, imageUrl: "https://i.scdn.co/image/abc" }}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://i.scdn.co/image/abc");
  });

  it("does not render an image when imageUrl is null", () => {
    render(<FeedCard item={{ ...mockItem, imageUrl: null }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows New badge when isNew is true", () => {
    render(<FeedCard item={{ ...mockItem, isNew: true }} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("does not show New badge when isNew is false", () => {
    render(<FeedCard item={{ ...mockItem, isNew: false }} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("does not show New badge when isNew is undefined", () => {
    render(<FeedCard item={mockItem} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });
});
