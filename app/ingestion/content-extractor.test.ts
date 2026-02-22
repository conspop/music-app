// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createOpenAIContentExtractor } from "./content-extractor";

function responsesBody(items: unknown[]) {
  return { output_text: JSON.stringify(items) };
}

const RESPONSES_URL = "https://api.openai.com/v1/responses";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("createOpenAIContentExtractor", () => {
  const extractor = createOpenAIContentExtractor("test-api-key");

  describe("extract RELEASE", () => {
    it("sends o4-mini with web_search_preview and high search_context_size", async () => {
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post(RESPONSES_URL, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(responsesBody([]));
        }),
      );

      await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(capturedBody).toMatchObject({
        model: "o4-mini",
        tools: [{ type: "web_search_preview", search_context_size: "high" }],
      });
    });

    it("sends the API key as Bearer token", async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.post(RESPONSES_URL, ({ request }) => {
          capturedAuth = request.headers.get("Authorization");
          return HttpResponse.json(responsesBody([]));
        }),
      );

      await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(capturedAuth).toBe("Bearer test-api-key");
    });

    it("returns validated release items", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json(
            responsesBody([
              {
                type: "RELEASE",
                title: "New Album - OK Computer Remastered",
                url: "https://example.com/releases/ok",
                summary: "25th anniversary remaster.",
                publishedAt: "2025-07-01",
                confidence: 0.88,
              },
            ]),
          );
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ type: "RELEASE", confidence: 0.88 });
    });
  });

  describe("extract EVENT", () => {
    it("sends o4-mini with web_search_preview and high search_context_size", async () => {
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post(RESPONSES_URL, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(responsesBody([]));
        }),
      );

      await extractor.extract({
        artistName: "Radiohead",
        type: "EVENT",
        since: new Date("2025-06-01"),
      });

      expect(capturedBody).toMatchObject({
        model: "o4-mini",
        tools: [{ type: "web_search_preview", search_context_size: "high" }],
      });
    });

    it("returns validated event items", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json(
            responsesBody([
              {
                type: "EVENT",
                title: "Radiohead Live in London",
                url: "https://example.com/events/london",
                summary: "Full band performance.",
                eventDate: "2025-09-15",
                eventVenue: "O2 Arena",
                eventCity: "London",
                eventLat: 51.503,
                eventLng: 0.003,
                confidence: 0.95,
              },
            ]),
          );
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "EVENT",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "EVENT",
        title: "Radiohead Live in London",
        eventVenue: "O2 Arena",
      });
    });

    it("parses o4-mini response with reasoning blocks and nested message", async () => {
      const items = [
        {
          type: "EVENT",
          title: "Songs at Close Range: NQ Arbuckle",
          url: "https://example.com/events/burdock",
          summary: "Multi-artist bill at Burdock Music Hall.",
          eventDate: "2026-02-26",
          eventVenue: "Burdock Music Hall",
          eventCity: "Toronto",
          confidence: 0.95,
        },
      ];
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json({
            output: [
              { type: "reasoning", id: "r_1" },
              { type: "web_search_call", id: "ws_1", status: "completed" },
              { type: "reasoning", id: "r_2" },
              { type: "web_search_call", id: "ws_2", status: "completed" },
              { type: "reasoning", id: "r_3" },
              {
                type: "message",
                id: "msg_1",
                role: "assistant",
                content: [
                  { type: "output_text", text: JSON.stringify(items) },
                ],
              },
            ],
          });
        }),
      );

      const results = await extractor.extract({
        artistName: "NQ Arbuckle",
        type: "EVENT",
        since: new Date("2026-02-22"),
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "EVENT",
        title: "Songs at Close Range: NQ Arbuckle",
        eventVenue: "Burdock Music Hall",
        eventCity: "Toronto",
      });
    });
  });

  describe("validation and error handling", () => {
    it("discards items that fail Zod validation", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json(
            responsesBody([
              {
                type: "RELEASE",
                title: "Valid Item",
                url: "https://example.com/valid",
                publishedAt: "2025-06-15",
                confidence: 0.9,
              },
              {
                type: "RELEASE",
                title: "",
                url: "not-a-url",
                confidence: 2.0,
              },
            ]),
          );
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Valid Item");
    });

    it("returns empty array when output_text is not valid JSON", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json({
            output_text: "I couldn't find any results for that query.",
          });
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toEqual([]);
    });

    it("handles JSON wrapped in markdown code fences", async () => {
      const items = [
        {
          type: "RELEASE",
          title: "Fenced Item",
          url: "https://example.com/fenced",
          publishedAt: "2025-06-15",
          confidence: 0.9,
        },
      ];
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json({
            output_text: "```json\n" + JSON.stringify(items) + "\n```",
          });
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Fenced Item");
    });

    it("extracts text from nested output array when output_text is null", async () => {
      const items = [
        {
          type: "RELEASE",
          title: "Nested Item",
          url: "https://example.com/nested",
          publishedAt: "2025-06-15",
          confidence: 0.9,
        },
      ];
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json({
            output_text: null,
            output: [
              { type: "web_search_call", id: "ws_1", status: "completed" },
              {
                type: "message",
                id: "msg_1",
                status: "completed",
                role: "assistant",
                content: [
                  { type: "output_text", text: JSON.stringify(items) },
                ],
              },
            ],
          });
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Nested Item");
    });

    it("salvages complete items from truncated JSON arrays", async () => {
      const truncatedJson =
        '[{"type":"EVENT","title":"Show A","url":"https://example.com/a","eventDate":"2025-09-01","eventVenue":"Venue A","eventCity":"City A","confidence":0.9},{"type":"EVENT","title":"Show B","url":"https://example.com/b","eventDate":"2025-09-02","eventVenue":"Venue B","eventCity":"City B","confidence":0.9},{"type":"EVENT","title":"Truncated","url":"https://example.com/c","eventDa';
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json({ output_text: truncatedJson });
        }),
      );

      const results = await extractor.extract({
        artistName: "Alabama Shakes",
        type: "EVENT",
        since: new Date("2025-06-01"),
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Show A");
      expect(results[1].title).toBe("Show B");
    });

    it("returns empty array when API returns an error status", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toEqual([]);
    });

    it("returns empty array when response is an empty array", async () => {
      server.use(
        http.post(RESPONSES_URL, () => {
          return HttpResponse.json(responsesBody([]));
        }),
      );

      const results = await extractor.extract({
        artistName: "Radiohead",
        type: "RELEASE",
        since: new Date("2025-06-01"),
      });

      expect(results).toEqual([]);
    });
  });
});
