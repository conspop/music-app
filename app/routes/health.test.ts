// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "./health";

vi.mock("~/server/context", () => ({
  getAppContext: vi.fn(),
}));

import { getAppContext } from "~/server/context";

describe("health loader", () => {
  beforeEach(() => {
    vi.mocked(getAppContext).mockReturnValue({
      db: {
        $client: {
          prepare: vi.fn().mockReturnValue({
            run: vi.fn(),
          }),
        },
      },
    } as never);
  });

  it("returns 200 with status ok when DB is reachable", async () => {
    const response = await loader({} as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ status: "ok", db: "connected" });
  });

  it("returns 503 when DB is unreachable", async () => {
    vi.mocked(getAppContext).mockReturnValue({
      db: {
        $client: {
          prepare: vi.fn().mockReturnValue({
            run: vi.fn().mockImplementation(() => {
              throw new Error("DB connection failed");
            }),
          }),
        },
      },
    } as never);

    const response = await loader({} as never);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual({ status: "error", db: "unreachable" });
  });
});
