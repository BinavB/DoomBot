function readText(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface AiProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
}

function readList(name: string, fallback: string): string[] {
  return readText(name, fallback)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const providerCatalog: Record<string, () => AiProvider> = {
  gemini: () => ({
    name: "gemini",
    apiKey: readText("GEMINI_API_KEY", ""),
    baseUrl: readText(
      "GEMINI_BASE_URL",
      "https://generativelanguage.googleapis.com/v1beta/openai",
    ),
    models: [
      ...new Set([
        readText("GEMINI_MODEL", "gemini-3.5-flash"),
        ...readList(
          "GEMINI_FALLBACK_MODELS",
          "gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.6-flash",
        ),
      ]),
    ],
  }),
  deepseek: () => ({
    name: "deepseek",
    apiKey: readText("DEEPSEEK_API_KEY", ""),
    baseUrl: readText("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    models: [readText("DEEPSEEK_MODEL", "deepseek-chat")],
  }),
};

function readProviders(): AiProvider[] {
  return readText("AI_PROVIDERS", "gemini,deepseek")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name in providerCatalog)
    .map((name) => providerCatalog[name]());
}

export const config = {
  aiProviders: readProviders(),
  timezone: readText("APP_TIMEZONE", "Asia/Dubai"),
  briefingTime: readText("BRIEFING_TIME", "07:00"),
  cityName: readText("WEATHER_CITY", "Dubai"),
  latitude: readNumber("WEATHER_LATITUDE", 25.2048),
  longitude: readNumber("WEATHER_LONGITUDE", 55.2708),
  dailyTokenLimit: readNumber("DAILY_TOKEN_LIMIT", 200000),
  databasePath: readText("DATABASE_PATH", "data/agent.db"),
  notesDirectory: readText("NOTES_DIRECTORY", "data/notes"),
  googleClientId: readText("GOOGLE_CLIENT_ID", ""),
  googleClientSecret: readText("GOOGLE_CLIENT_SECRET", ""),
  ownerEmail: readText("OWNER_EMAIL", "").toLowerCase(),
  appUrl: readText("APP_URL", "http://localhost:3000").replace(/\/+$/, ""),
};
