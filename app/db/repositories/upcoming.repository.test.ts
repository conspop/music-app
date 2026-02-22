import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../../tests/db-helpers";
import { insertUser } from "./users.repository";
import { insertArtist } from "./artists.repository";
import { followArtist } from "./follows.repository";
import { insertContentItem } from "./content-items.repository";
import { computeDedupeHash } from "~/db/dedupe";
import { findUpcomingEvents } from "./upcoming.repository";

let itemCounter = 0;
function makeEvent(overrides: Record<string, unknown> = {}) {
  itemCounter++;
  const id = (overrides.id as string) ?? `ci${itemCounter}`;
  const artistId = (overrides.artistId as string) ?? "a1";
  const url =
    (overrides.url as string) ?? `https://example.com/event/${itemCounter}`;
  return {
    id,
    type: "EVENT",
    artistId,
    title: `Event ${itemCounter}`,
    url,
    summary: "A concert",
    confidence: 0.9,
    dedupeHash: computeDedupeHash("EVENT", artistId, url),
    publishedAt: new Date("2025-06-01"),
    eventDate: (overrides.eventDate as Date) ?? new Date("2025-08-15"),
    eventVenue: "The Venue",
    eventCity: "London",
    createdAt: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("upcoming repository", () => {
  let db: DrizzleDb;

  beforeEach(() => {
    itemCounter = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01"));

    db = createTestDb();
    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
    insertUser(db, {
      id: "u2",
      googleId: "g2",
      email: "b@c.com",
      name: "Other",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a1",
      name: "Radiohead",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a2",
      name: "Bjork",
      createdAt: new Date("2025-01-01"),
    });
    insertArtist(db, {
      id: "a3",
      name: "Portishead",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f1",
      userId: "u1",
      artistId: "a1",
      createdAt: new Date("2025-01-01"),
    });
    followArtist(db, {
      id: "f2",
      userId: "u1",
      artistId: "a2",
      createdAt: new Date("2025-01-01"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns future events for followed artists", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a2", eventDate: new Date("2025-09-01") }),
    );

    const events = findUpcomingEvents(db, "u1");
    expect(events).toHaveLength(2);
  });

  it("excludes past events", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-05-01") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );

    const events = findUpcomingEvents(db, "u1");
    expect(events).toHaveLength(1);
    expect(events[0].eventDate!.getTime()).toBe(
      new Date("2025-08-15").getTime(),
    );
  });

  it("excludes non-EVENT items", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );
    insertContentItem(db, {
      id: "news1",
      type: "NEWS",
      artistId: "a1",
      title: "News",
      url: "https://example.com/news/1",
      summary: "News",
      confidence: 0.9,
      dedupeHash: computeDedupeHash(
        "NEWS",
        "a1",
        "https://example.com/news/1",
      ),
      publishedAt: new Date("2025-08-15"),
      createdAt: new Date("2025-06-01"),
    });

    const events = findUpcomingEvents(db, "u1");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("EVENT");
  });

  it("excludes events from unfollowed artists", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a3", eventDate: new Date("2025-08-15") }),
    );

    const events = findUpcomingEvents(db, "u1");
    expect(events).toHaveLength(1);
    expect(events[0].artistId).toBe("a1");
  });

  it("orders by eventDate ascending", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-09-01") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a2", eventDate: new Date("2025-08-01") }),
    );

    const events = findUpcomingEvents(db, "u1");
    expect(new Date(events[0].eventDate!).getTime()).toBeLessThan(
      new Date(events[1].eventDate!).getTime(),
    );
  });

  it("supports limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      insertContentItem(
        db,
        makeEvent({
          artistId: "a1",
          eventDate: new Date(`2025-08-0${i + 1}`),
        }),
      );
    }

    const page1 = findUpcomingEvents(db, "u1", { limit: 2, offset: 0 });
    expect(page1).toHaveLength(2);

    const page2 = findUpcomingEvents(db, "u1", { limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);

    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it("returns empty array when user has no follows", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );

    const events = findUpcomingEvents(db, "u2");
    expect(events).toEqual([]);
  });

  it("returns empty array when no events exist", () => {
    const events = findUpcomingEvents(db, "u1");
    expect(events).toEqual([]);
  });

  it("filters by artistIds when specified", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a2", eventDate: new Date("2025-08-16") }),
    );

    const events = findUpcomingEvents(db, "u1", { artistIds: ["a1"] });
    expect(events).toHaveLength(1);
    expect(events[0].artistId).toBe("a1");
  });

  it("returns events for multiple artistIds", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );
    insertContentItem(
      db,
      makeEvent({ artistId: "a2", eventDate: new Date("2025-08-16") }),
    );

    const events = findUpcomingEvents(db, "u1", {
      artistIds: ["a1", "a2"],
    });
    expect(events).toHaveLength(2);
  });

  it("includes artistName in results", () => {
    insertContentItem(
      db,
      makeEvent({ artistId: "a1", eventDate: new Date("2025-08-15") }),
    );

    const events = findUpcomingEvents(db, "u1");
    expect(events[0].artistName).toBe("Radiohead");
  });
});
