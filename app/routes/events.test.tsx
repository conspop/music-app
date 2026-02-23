import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
  };
});

import { useLoaderData } from "react-router";
import Events, { groupEventsByDate } from "./events";

const mockUseLoaderData = vi.mocked(useLoaderData);

describe("Events", () => {
  it("renders event items", () => {
    mockUseLoaderData.mockReturnValue({
      events: [
        {
          id: "1",
          type: "EVENT",
          artistId: "a1",
          artistName: "Radiohead",
          title: "Radiohead at MSG",
          url: null,
          summary: null,
          imageUrl: null,
          confidence: 0.9,
          publishedAt: null,
          eventDate: new Date("2026-03-15T20:00:00"),
          eventVenue: "Madison Square Garden",
          eventCity: "New York",
          eventOtherArtists: null,
          eventLat: null,
          eventLng: null,
          createdAt: new Date("2026-02-01"),
        },
      ],
    });

    render(<Events />);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders empty state when no events", () => {
    mockUseLoaderData.mockReturnValue({ events: [] });

    render(<Events />);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it("groups events by date with section headings", () => {
    mockUseLoaderData.mockReturnValue({
      events: [
        {
          id: "1",
          type: "EVENT",
          artistId: "a1",
          artistName: "Radiohead",
          title: "Radiohead at MSG",
          url: null,
          summary: null,
          imageUrl: null,
          confidence: 0.9,
          publishedAt: null,
          eventDate: new Date("2026-03-15T20:00:00"),
          eventVenue: "MSG",
          eventCity: "New York",
          eventOtherArtists: null,
          eventLat: null,
          eventLng: null,
          createdAt: new Date("2026-02-01"),
        },
        {
          id: "2",
          type: "EVENT",
          artistId: "a2",
          artistName: "Bjork",
          title: "Bjork at Brooklyn Steel",
          url: null,
          summary: null,
          imageUrl: null,
          confidence: 0.9,
          publishedAt: null,
          eventDate: new Date("2026-03-16T19:00:00"),
          eventVenue: "Brooklyn Steel",
          eventCity: "Brooklyn",
          eventOtherArtists: null,
          eventLat: null,
          eventLng: null,
          createdAt: new Date("2026-02-01"),
        },
      ],
    });

    render(<Events />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(2);
  });
});

describe("groupEventsByDate", () => {
  it("groups events by their date", () => {
    const events = [
      { id: "1", eventDate: new Date("2026-03-15T20:00:00") },
      { id: "2", eventDate: new Date("2026-03-15T21:00:00") },
      { id: "3", eventDate: new Date("2026-03-16T20:00:00") },
    ];

    const grouped = groupEventsByDate(events as never[]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].events).toHaveLength(2);
    expect(grouped[1].events).toHaveLength(1);
  });

  it("handles events with null dates", () => {
    const events = [
      { id: "1", eventDate: null },
      { id: "2", eventDate: new Date("2026-03-15T20:00:00") },
    ];

    const grouped = groupEventsByDate(events as never[]);
    expect(grouped).toHaveLength(2);
  });
});
