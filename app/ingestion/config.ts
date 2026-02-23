export interface IngestionConfig {
  MIN_CONFIDENCE: number;
  BACKFILL_DAYS: number;
  MAX_ARTISTS_PER_RUN: number;
  MAX_ITEMS_PER_TYPE: number;
  GEOCODE_DELAY_MS: number;
}

export const INGESTION_CONFIG: IngestionConfig = {
  MIN_CONFIDENCE: 0.7,
  BACKFILL_DAYS: 30,
  MAX_ARTISTS_PER_RUN: 50,
  MAX_ITEMS_PER_TYPE: 20,
  GEOCODE_DELAY_MS: 1100,
};
