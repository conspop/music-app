import { createHash } from "node:crypto";

/**
 * Normalizes a release title for cross-source deduplication.
 * Conservative: strips (Official Video), (2024), - Single suffix.
 * Keeps meaningful parentheticals like (Forever) to distinguish releases.
 */
export function normalizeReleaseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*-\s*single\s*$/i, "")
    .replace(/\s*\(official\s*video\)\s*$/i, "")
    .replace(/\s*\(\d{4}\)\s*$/i, "")
    .trim();
}

export function computeDedupeHash(
  type: string,
  artistId: string,
  url: string,
): string {
  const normalized = url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

  return createHash("sha256")
    .update(`${type}:${artistId}:${normalized}`)
    .digest("hex");
}
