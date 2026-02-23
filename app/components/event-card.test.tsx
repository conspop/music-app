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
  summary: "An incredible live performance",
  imageUrl: null,
  confidence: 0.9,
  publishedAt: null,
  eventDate: new Date("2026-03-15T20:00:00"),
  eventVenue: "Madison Square Garden",
  eventCity: "New York",
  eventOtherArtists: "Sonic Youth, Pavement",
  eventLat: null,
  eventLng: null,
  eventVenueMapsUrl: null,
  createdAt: new Date("2026-02-01"),
};

describe("EventCard", () => {
  it("renders the artist name prominently", () => {
    render(<EventCard event={mockEvent} />);
    const heading = screen.getByRole("heading", { name: "Radiohead" });
    expect(heading).toBeInTheDocument();
  });

  it("renders the venue and city", () => {
    render(<EventCard event={mockEvent} />);
    expect(
      screen.getByText(/Madison Square Garden, New York/),
    ).toBeInTheDocument();
  });

  it("renders the time", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(/8:00\s*PM/)).toBeInTheDocument();
  });

  it("renders other artists", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(/with Sonic Youth, Pavement/)).toBeInTheDocument();
  });

  it("does not render other artists when null", () => {
    render(
      <EventCard event={{ ...mockEvent, eventOtherArtists: null }} />,
    );
    expect(screen.queryByText(/with /)).not.toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<EventCard event={mockEvent} />);
    expect(
      screen.getByText("An incredible live performance"),
    ).toBeInTheDocument();
  });

  it("does not render description when summary is null", () => {
    render(<EventCard event={{ ...mockEvent, summary: null }} />);
    expect(
      screen.queryByText("An incredible live performance"),
    ).not.toBeInTheDocument();
  });

  it("renders a 'Tickets / More Info' link when url is present", () => {
    render(<EventCard event={mockEvent} />);
    const ticketLink = screen.getByRole("link", {
      name: /tickets/i,
    });
    expect(ticketLink).toHaveAttribute(
      "href",
      "https://example.com/event/1",
    );
  });

  it("does not render any links when url and eventVenueMapsUrl are null", () => {
    render(
      <EventCard event={{ ...mockEvent, url: null, eventVenueMapsUrl: null }} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders venue as a link to Google Maps when eventVenueMapsUrl is set", () => {
    const mapsUrl = "https://www.google.com/maps/place/?q=place_id=ChIJxyz";
    render(
      <EventCard event={{ ...mockEvent, eventVenueMapsUrl: mapsUrl }} />,
    );
    const venueLink = screen.getByRole("link", {
      name: /Madison Square Garden, New York/,
    });
    expect(venueLink).toHaveAttribute("href", mapsUrl);
    expect(venueLink).toHaveAttribute("target", "_blank");
  });

  it("handles missing venue gracefully", () => {
    render(<EventCard event={{ ...mockEvent, eventVenue: null }} />);
    expect(
      screen.getByRole("heading", { name: "Radiohead" }),
    ).toBeInTheDocument();
  });
});
