import "dotenv/config";
import {
  getAccessToken,
  searchArtists,
  getArtistAlbums,
} from "~/lib/spotify-client";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  process.exit(1);
}

const artistName = process.argv[2] ?? "Noah Kahan";
console.log(`Searching for "${artistName}"...\n`);

const token = await getAccessToken(clientId, clientSecret);
const artists = await searchArtists(token, artistName, 5);

if (artists.length === 0) {
  console.error("No artists found");
  process.exit(1);
}

const artist = artists[0];
console.log(`Artist: ${artist.name} (${artist.id})\n`);

const all = await getArtistAlbums(token, artist.id);
console.log(`\n=== All ${all.length} releases ===\n`);
console.log(JSON.stringify(all, null, 2));
