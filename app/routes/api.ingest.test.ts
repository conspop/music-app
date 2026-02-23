// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { action } from "./api.ingest";

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));
vi.mock("~/env.server", () => ({
  getEnv: vi.fn(),
}));
vi.mock("~/ingestion/orchestrator", () => ({
  runIngestion: vi.fn().mockResolvedValue({
    artistsProcessed: 1,
    totalInserted: 2,
    totalSkippedDupes: 0,
    totalSkippedLowConfidence: 0,
    totalErrors: 0,
  }),
}));
vi.mock("~/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

import { getAppContext } from "~/server/context";
import { getEnv } from "~/env.server";
import { requireUser } from "~/auth/require-user";
import { runIngestion } from "~/ingestion/orchestrator";

const mockedGetAppContext = vi.mocked(getAppContext);
const mockedGetEnv = vi.mocked(getEnv);
const mockedRequireUser = vi.mocked(requireUser);
const mockedRunIngestion = vi.mocked(runIngestion);

describe("api.ingest action", () => {
  const mockContext = {
    db: {},
    sessions: {},
    contentExtractor: {},
    geocoder: {},
  };

  beforeEach(() => {
    mockedRunIngestion.mockClear();
    mockedGetAppContext.mockReturnValue(mockContext as never);
  });

  it("allows cron auth with valid Bearer token", async () => {
    mockedGetEnv.mockReturnValue({
      CRON_SECRET: "secret-cron-token",
    } as never);

    const request = new Request("https://example.com/api/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer secret-cron-token",
      },
    });

    const response = await action({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.summary).toBeDefined();
    expect(mockedRunIngestion).toHaveBeenCalled();
    expect(mockedRequireUser).not.toHaveBeenCalled();
  });

  it("rejects request without auth when CRON_SECRET is set", async () => {
    mockedGetEnv.mockReturnValue({
      CRON_SECRET: "secret-cron-token",
    } as never);
    mockedRequireUser.mockRejectedValue(new Error("redirect"));

    const request = new Request("https://example.com/api/ingest", {
      method: "POST",
    });

    await expect(action({ request } as never)).rejects.toThrow("redirect");
    expect(mockedRunIngestion).not.toHaveBeenCalled();
  });

  it("rejects request with wrong Bearer token", async () => {
    mockedGetEnv.mockReturnValue({
      CRON_SECRET: "secret-cron-token",
    } as never);
    mockedRequireUser.mockRejectedValue(new Error("redirect"));

    const request = new Request("https://example.com/api/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong-token",
      },
    });

    await expect(action({ request } as never)).rejects.toThrow("redirect");
    expect(mockedRunIngestion).not.toHaveBeenCalled();
  });
});
