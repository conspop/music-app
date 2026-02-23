function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function getEnv() {
  return {
    GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
    SESSION_SECRET: required("SESSION_SECRET"),
    OPENAI_API_KEY: required("OPENAI_API_KEY"),
    SPOTIFY_CLIENT_ID: optional("SPOTIFY_CLIENT_ID"),
    SPOTIFY_CLIENT_SECRET: optional("SPOTIFY_CLIENT_SECRET"),
    GOOGLE_MAPS_API_KEY: optional("GOOGLE_MAPS_API_KEY"),
    APP_URL: optional("APP_URL"),
    CRON_SECRET: optional("CRON_SECRET"),
  };
}
