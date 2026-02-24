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
  const today = new Date().toISOString().slice(0, 10);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);

  const sinceStr = since.toISOString().slice(0, 10);

  const typeInstructions: Record<ContentType, string> = {
    RELEASE: `Find upcoming and recently announced music releases for the artist "${artistName}". Today is ${today}. Search for:
- Upcoming albums, singles, and EPs that have been announced but not yet released (release date in the future)
- Recent releases (since ${sinceStr}) from music news, reviews, and announcements

Sources: music news sites, artist announcements, Pitchfork, Rolling Stone, Billboard, NME, press releases, etc.

CRITICAL: publishedAt must be the ACTUAL RELEASE DATE (when the album/single/EP comes out), NOT the announcement date. If an article says "announced Feb 4, 2026" and "will be released April 17, 2026" or "out April 17, 2026", use 2026-04-17 for publishedAt. The announcement date belongs only in the summary text if relevant.

For each release found return: title (album/single/EP name only, e.g. "Between Us" not "Arkells Announce Between Us"), url (link to the news article or announcement — prefer authoritative sources), summary (brief 1-2 sentence description; can mention announcement context here), publishedAt (YYYY-MM-DD — the release date when the music comes out, never the announcement date), releaseType ("album" | "single" | "ep" | "compilation" when identifiable, or null), imageUrl (cover art URL if available from the article), and a confidence score (0-1).`,
    EVENT: `Find upcoming concerts, shows, and live performances for the artist "${artistName}". Today is ${today}.

Date range: Include events with eventDate from today through the next year. Prioritize finding events in the next 1–2 months. Actively search for events happening in the next 2–4 weeks — check venue calendars, ticket sites (Ticketmaster, Songkick, Bandsintown) with date filters, and local event listings, not just tour announcements.

Important: "${artistName}" may appear as part of a multi-artist bill, opening act, or festival lineup — not just as the headliner. Search broadly: event listings, venue calendars, multi-artist shows, and the artist's own tour page.

Return events ordered by eventDate ascending (soonest first).

For each event found return: title, url (required — prefer a direct ticket-purchase or official event page URL; if none found, use the venue website, artist tour page, or event listing URL from your search; never return null), summary (a short description of the event), eventDate (YYYY-MM-DDTHH:mm format — include the start time when available, otherwise default to T20:00), eventVenue, eventCity, eventOtherArtists (comma-separated names of other artists on the bill, or null if solo show), eventLat (optional), eventLng (optional), and a confidence score (0-1) indicating how relevant and reliable the item is.`,
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

function repairTruncatedJsonArray(text: string): unknown[] | null {
  if (!text.startsWith("[")) return null;

  let lastCloseBrace = -1;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) lastCloseBrace = i;
    }
  }

  if (lastCloseBrace === -1) return null;

  const repaired = text.slice(0, lastCloseBrace + 1) + "]";
  try {
    const parsed = JSON.parse(repaired);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createOpenAIContentExtractor(apiKey: string): ContentExtractor {
  return {
    async extract({ artistName, type, since }) {
      const tag = `[extract:${type}:${artistName}]`;
      console.log(`${tag} requesting since=${since.toISOString().slice(0, 10)}`);

      const reqBody = {
        model: "o4-mini",
        input: buildPrompt(artistName, type, since),
        tools: [{ type: "web_search_preview", search_context_size: "high" }],
      };
      console.log(`${tag} model=${reqBody.model}`);

      let response: Response;
      try {
        response = await fetch(OPENAI_RESPONSES_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(reqBody),
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

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          const repaired = repairTruncatedJsonArray(content);
          if (repaired && repaired.length > 0) {
            console.warn(`${tag} JSON was truncated, salvaged ${repaired.length} complete item(s)`);
            parsed = repaired;
          } else {
            throw new Error("Could not parse or repair JSON response");
          }
        }

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
