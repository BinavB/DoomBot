import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/database";
import { config } from "@/lib/config";
import { AgentError } from "@/lib/errors";

export const googleScopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
];

const tokenEndpoint = "https://oauth2.googleapis.com/token";
const stateLifetimeMs = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export function createAuthorizationUrl(): string {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new AgentError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing in .env.local.");
  }
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, Date.now() + stateLifetimeMs);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", config.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export function consumeState(state: string): boolean {
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  return expiresAt !== undefined && expiresAt > Date.now();
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      ...params,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new AgentError(`Google sign-in failed (${response.status}). Connect Google again from the home page.`);
  }
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<void> {
  const tokens = await requestToken({
    code,
    redirect_uri: config.googleRedirectUri,
    grant_type: "authorization_code",
  });
  if (!tokens.refresh_token) {
    throw new AgentError("Google did not return a refresh token. Connect again and approve access.");
  }
  getDatabase()
    .prepare(
      `INSERT INTO google_tokens (id, refresh_token, updated_at) VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET refresh_token = excluded.refresh_token, updated_at = excluded.updated_at`,
    )
    .run(tokens.refresh_token);
  cachedAccessToken = { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
}

function storedRefreshToken(): string | null {
  const row = getDatabase()
    .prepare("SELECT refresh_token FROM google_tokens WHERE id = 1")
    .get() as unknown as { refresh_token: string } | undefined;
  return row ? row.refresh_token : null;
}

export function isGoogleConnected(): boolean {
  return storedRefreshToken() !== null;
}

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }
  const refreshToken = storedRefreshToken();
  if (!refreshToken) {
    throw new AgentError("Google is not connected yet. Connect it from the home page.");
  }
  const tokens = await requestToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
  cachedAccessToken = { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
  return tokens.access_token;
}
