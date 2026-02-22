import { z } from "zod";

export const CONTENT_TYPES = ["NEWS", "RELEASE", "EVENT"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

const nullable = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullable().transform((v) => v ?? undefined).optional();

const baseFields = {
  title: z.string().min(1),
  url: z.string().url(),
  summary: nullable(z.string()),
  imageUrl: nullable(z.string().url()),
  confidence: z.number().min(0).max(1),
};

export const extractedNewsItemSchema = z.object({
  ...baseFields,
  publishedAt: z.string(),
});

export const extractedReleaseItemSchema = z.object({
  ...baseFields,
  publishedAt: z.string(),
});

export const extractedEventItemSchema = z.object({
  ...baseFields,
  eventDate: z.string(),
  eventVenue: z.string().min(1),
  eventCity: z.string().min(1),
  eventLat: nullable(z.number()),
  eventLng: nullable(z.number()),
});

export const extractedItemSchema = z.discriminatedUnion("type", [
  extractedNewsItemSchema.extend({ type: z.literal("NEWS") }),
  extractedReleaseItemSchema.extend({ type: z.literal("RELEASE") }),
  extractedEventItemSchema.extend({ type: z.literal("EVENT") }),
]);

export type ExtractedNewsItem = z.infer<typeof extractedNewsItemSchema>;
export type ExtractedReleaseItem = z.infer<typeof extractedReleaseItemSchema>;
export type ExtractedEventItem = z.infer<typeof extractedEventItemSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;
