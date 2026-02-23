import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    googleId: text("google_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    locationCity: text("location_city"),
    locationRegion: text("location_region"),
    locationCountry: text("location_country"),
    locationLat: real("location_lat"),
    locationLng: real("location_lng"),
    locationRadiusKm: integer("location_radius_km").default(50),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("users_google_id_idx").on(table.googleId),
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

export const artists = sqliteTable(
  "artists",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    spotifyId: text("spotify_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("artists_spotify_id_idx").on(table.spotifyId)],
);

export const follows = sqliteTable(
  "follows",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("follows_user_artist_idx").on(table.userId, table.artistId),
    index("follows_user_id_idx").on(table.userId),
    index("follows_artist_id_idx").on(table.artistId),
  ],
);

export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id),
    title: text("title").notNull(),
    url: text("url"),
    summary: text("summary"),
    imageUrl: text("image_url"),
    confidence: real("confidence").notNull(),
    dedupeHash: text("dedupe_hash").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    eventDate: integer("event_date", { mode: "timestamp" }),
    eventVenue: text("event_venue"),
    eventCity: text("event_city"),
    releaseType: text("release_type"),
    eventLat: real("event_lat"),
    eventLng: real("event_lng"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("content_items_dedupe_hash_idx").on(table.dedupeHash),
    index("content_items_artist_id_idx").on(table.artistId),
    index("content_items_type_idx").on(table.type),
    index("content_items_published_at_idx").on(table.publishedAt),
    index("content_items_event_date_idx").on(table.eventDate),
  ],
);

export const ingestionRuns = sqliteTable(
  "ingestion_runs",
  {
    id: text("id").primaryKey(),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id),
    type: text("type").notNull(),
    ranAt: integer("ran_at", { mode: "timestamp" }).notNull(),
    itemsFound: integer("items_found").notNull(),
  },
  (table) => [
    index("ingestion_runs_artist_type_idx").on(table.artistId, table.type),
  ],
);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  follows: many(follows),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  follows: many(follows),
  contentItems: many(contentItems),
  ingestionRuns: many(ingestionRuns),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, { fields: [follows.userId], references: [users.id] }),
  artist: one(artists, {
    fields: [follows.artistId],
    references: [artists.id],
  }),
}));

export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  artist: one(artists, {
    fields: [contentItems.artistId],
    references: [artists.id],
  }),
}));

export const ingestionRunsRelations = relations(ingestionRuns, ({ one }) => ({
  artist: one(artists, {
    fields: [ingestionRuns.artistId],
    references: [artists.id],
  }),
}));
