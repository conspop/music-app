import { describe, it, expect, afterEach } from "vitest";
import { getEnv } from "./env.server";

describe("getEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function setAllEnvVars() {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.SESSION_SECRET = "session-secret";
    process.env.OPENAI_API_KEY = "openai-key";
  }

  it("returns env vars when all are set", () => {
    setAllEnvVars();

    const env = getEnv();

    expect(env).toEqual({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      SESSION_SECRET: "session-secret",
      OPENAI_API_KEY: "openai-key",
    });
  });

  it("throws when GOOGLE_CLIENT_ID is missing", () => {
    setAllEnvVars();
    delete process.env.GOOGLE_CLIENT_ID;

    expect(() => getEnv()).toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_ID",
    );
  });

  it("throws when GOOGLE_CLIENT_SECRET is missing", () => {
    setAllEnvVars();
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(() => getEnv()).toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_SECRET",
    );
  });

  it("throws when SESSION_SECRET is missing", () => {
    setAllEnvVars();
    delete process.env.SESSION_SECRET;

    expect(() => getEnv()).toThrow(
      "Missing required environment variable: SESSION_SECRET",
    );
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    setAllEnvVars();
    delete process.env.OPENAI_API_KEY;

    expect(() => getEnv()).toThrow(
      "Missing required environment variable: OPENAI_API_KEY",
    );
  });
});
