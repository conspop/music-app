import { createHash } from "node:crypto";

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
