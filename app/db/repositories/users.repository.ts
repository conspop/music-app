import { eq } from "drizzle-orm";
import type { DrizzleDb } from "~/db/connection";
import { users } from "~/db/schema";

export function insertUser(db: DrizzleDb, data: typeof users.$inferInsert) {
  return db.insert(users).values(data).returning().get();
}

export function findUserByGoogleId(db: DrizzleDb, googleId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .get();
}

export function findUserByEmail(db: DrizzleDb, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export interface LocationUpdate {
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export function updateUserLocation(
  db: DrizzleDb,
  userId: string,
  location: LocationUpdate,
) {
  return db
    .update(users)
    .set({
      locationCity: location.city,
      locationRegion: location.region,
      locationCountry: location.country,
      locationLat: location.lat,
      locationLng: location.lng,
      locationRadiusKm: location.radiusKm,
    })
    .where(eq(users.id, userId))
    .returning()
    .get();
}
