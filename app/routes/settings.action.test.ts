// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DrizzleDb } from "~/db/connection";
import { createTestDb } from "../../tests/db-helpers";
import { createSessionStorage } from "~/auth/session.server";
import { insertUser, findUserByGoogleId } from "~/db/repositories/users.repository";
import { action } from "./settings";

const SECRET = "test-secret-at-least-32-chars-long!!";

function parseCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { getAppContext } from "~/server/context";
const mockedGetAppContext = vi.mocked(getAppContext);

describe("settings action", () => {
  let db: DrizzleDb;
  let sessions: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    db = createTestDb();
    sessions = createSessionStorage(SECRET);
    mockedGetAppContext.mockReturnValue({
      db,
      sessions,
      authProvider: {} as never,
      contentExtractor: {} as any,
      geocoder: {} as any,
    });

    insertUser(db, {
      id: "u1",
      googleId: "g1",
      email: "a@b.com",
      name: "User",
      createdAt: new Date("2025-01-01"),
    });
  });

  async function authedRequest(
    url: string,
    init?: RequestInit,
  ): Promise<Request> {
    const setCookie = await sessions.setUserId(
      new Request("http://localhost/"),
      "u1",
    );
    const headers = new Headers(init?.headers);
    headers.set("Cookie", parseCookie(setCookie));
    return new Request(url, { ...init, headers });
  }

  function callAction(request: Request) {
    return action({ request, params: {}, context: {} } as never);
  }

  it("updates user location on valid submission", async () => {
    const request = await authedRequest("http://localhost/settings", {
      method: "POST",
      body: new URLSearchParams({
        city: "London",
        region: "England",
        country: "UK",
        lat: "51.5",
        lng: "-0.12",
        radiusKm: "50",
      }),
    });

    const response = await callAction(request);
    expect(response).toMatchObject({ success: true });

    const user = findUserByGoogleId(db, "g1");
    expect(user?.locationCity).toBe("London");
    expect(user?.locationLat).toBe(51.5);
    expect(user?.locationLng).toBe(-0.12);
    expect(user?.locationRadiusKm).toBe(50);
  });

  it("returns error when city is missing", async () => {
    const request = await authedRequest("http://localhost/settings", {
      method: "POST",
      body: new URLSearchParams({
        city: "",
        region: "England",
        country: "UK",
        lat: "51.5",
        lng: "-0.12",
        radiusKm: "50",
      }),
    });

    const response = await callAction(request);
    expect(response).toMatchObject({ error: "City is required" });
  });

  it("returns error when lat is out of range", async () => {
    const request = await authedRequest("http://localhost/settings", {
      method: "POST",
      body: new URLSearchParams({
        city: "London",
        region: "England",
        country: "UK",
        lat: "100",
        lng: "-0.12",
        radiusKm: "50",
      }),
    });

    const response = await callAction(request);
    expect(response).toMatchObject({
      error: "Latitude must be between -90 and 90",
    });
  });

  it("returns error when lng is out of range", async () => {
    const request = await authedRequest("http://localhost/settings", {
      method: "POST",
      body: new URLSearchParams({
        city: "London",
        region: "England",
        country: "UK",
        lat: "51.5",
        lng: "200",
        radiusKm: "50",
      }),
    });

    const response = await callAction(request);
    expect(response).toMatchObject({
      error: "Longitude must be between -180 and 180",
    });
  });
});
