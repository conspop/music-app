function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv() {
  return {
    GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
    SESSION_SECRET: required("SESSION_SECRET"),
    OPENAI_API_KEY: required("OPENAI_API_KEY"),
  };
}
