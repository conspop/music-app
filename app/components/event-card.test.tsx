import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventCard } from "./event-card";

const mockEvent = {
  id: "1",
  type: "EVENT" as const,
  artistId: "a1",
  artistName: "Radiohead",
  title: "Radiohead Live",
  url: "https://example.com/event/1",
  summary: null,
  imageUrl: null,
  confidence: 0.9,
  publishedAt: null,
  eventDate: new Date("2026-03-15T20:00:00"),
  eventVenue: "Madison Square Garden",
  eventCity: "New York",
  eventLat: null,
  eventLng: null,
  createdAt: new Date("2026-02-01"),
};

describe("EventCard", () => {
  it("renders the title", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText("Radiohead Live")).toBeInTheDocument();
  });

  it("renders the artist name", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders the venue", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(/Madison Square Garden/)).toBeInTheDocument();
  });

  it("renders the city", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(/New York/)).toBeInTheDocument();
  });

  it("links to the event URL", () => {
    render(<EventCard event={mockEvent} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/event/1");
  });

  it("renders without a link when url is null", () => {
    render(<EventCard event={{ ...mockEvent, url: null }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("handles missing venue gracefully", () => {
    render(<EventCard event={{ ...mockEvent, eventVenue: null }} />);
    expect(screen.getByText("Radiohead Live")).toBeInTheDocument();
  });
});
