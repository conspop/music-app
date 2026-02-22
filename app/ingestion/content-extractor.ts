import { z } from "zod";
import {
  extractedItemSchema,
  type ContentType,
  type ExtractedItem,
} from "./types";

export interface ContentExtractor {
  extract(params: {
    artistName: string;
    type: ContentType;
    since: Date;
  }): Promise<ExtractedItem[]>;
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function buildPrompt(artistName: string, type: ContentType, since: Date): string {
  const sinceStr = since.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const sixMonthsOut = new Date();
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
  const untilStr = sixMonthsOut.toISOString().slice(0, 10);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);

  const typeInstructions: Record<ContentType, string> = {
    NEWS: `Search the web for recent news articles, interviews, and announcements about the music artist "${artistName}" published since ${sinceStr}. For each item return: title, url, summary, imageUrl (optional), publishedAt (YYYY-MM-DD), and a confidence score (0-1) indicating how relevant and reliable the item is.`,
    RELEASE: `Search the web for music releases (albums, singles, EPs, music videos) by the artist "${artistName}" released since ${yearAgoStr} or upcoming future releases. Include anything released in the past year or announced for release in the future. For each item return: title, url, summary, imageUrl (optional), publishedAt (YYYY-MM-DD), and a confidence score (0-1) indicating how relevant and reliable the item is.`,
    EVENT: `Search the web for upcoming concerts, festivals, and live performances by the artist "${artistName}" taking place between ${today} and ${untilStr}. Only include events with dates in the next 6 months. For each item return: title, url, summary, eventDate (YYYY-MM-DD), eventVenue, eventCity, eventLat (optional), eventLng (optional), and a confidence score (0-1) indicating how relevant and reliable the item is.`,
  };

  return `${typeInstructions[type]}

Return ONLY a JSON array. Each object must include a "type" field set to "${type}". Return an empty array [] if nothing is found. Do not include any text outside the JSON array.`;
}

const responsesSchema = z.object({
  output_text: z.string().nullish(),
  output: z
    .array(
      z.object({
        type: z.string(),
        content: z
          .array(z.object({ type: z.string(), text: z.string().optional() }))
          .optional(),
      }),
    )
    .optional(),
});

function getOutputText(body: z.infer<typeof responsesSchema>): string {
  if (body.output_text) return body.output_text;

  const message = body.output?.find((o) => o.type === "message");
  const textPart = message?.content?.find((c) => c.type === "output_text");
  return textPart?.text ?? "[]";
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

export function createOpenAIContentExtractor(apiKey: string): ContentExtractor {
  return {
    async extract({ artistName, type, since }) {
      const tag = `[extract:${type}:${artistName}]`;
      console.log(`${tag} requesting since=${since.toISOString().slice(0, 10)}`);

      let response: Response;
      try {
        response = await fetch(OPENAI_RESPONSES_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            instructions:
              "You are a music industry research assistant. You return structured JSON data only. No markdown, no explanation — just the JSON array.",
            input: buildPrompt(artistName, type, since),
            tools: [{ type: "web_search" }],
          }),
        });
      } catch (err) {
        console.error(`${tag} fetch failed:`, err);
        return [];
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "(unreadable)");
        console.error(`${tag} API returned ${response.status}: ${body}`);
        return [];
      }

      let rawItems: unknown[];
      try {
        const json = await response.json();
        const body = responsesSchema.parse(json);
        const content = extractJson(getOutputText(body));
        console.log(`${tag} raw response: ${content.slice(0, 500)}`);
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          console.warn(`${tag} response was not an array, got ${typeof parsed}`);
          return [];
        }
        rawItems = parsed;
      } catch (err) {
        console.error(`${tag} failed to parse response:`, err);
        return [];
      }

      console.log(`${tag} ${rawItems.length} raw items from API`);

      const validated: ExtractedItem[] = [];
      for (const item of rawItems) {
        const result = extractedItemSchema.safeParse(item);
        if (result.success) {
          validated.push(result.data);
        } else {
          console.warn(
            `${tag} validation failed for item:`,
            JSON.stringify(item).slice(0, 200),
            result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
          );
        }
      }

      console.log(`${tag} ${validated.length}/${rawItems.length} items passed validation`);
      return validated;
    },
  };
}
