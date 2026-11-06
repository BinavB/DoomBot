import { randomBytes } from "node:crypto";
import { currentUserId } from "@/lib/auth/context";
import { getDatabase } from "@/lib/database";
import { config } from "@/lib/config";
import { AgentError } from "@/lib/errors";

export const googleScopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
];

export const connectRedirectPath = "/api/google/callback";
export const connectStateCookieName = "doombot_google_state";
export const connectStateLifetimeSeconds = 10 * 60;

const tokenEndpoint = "https://oauth2.googleapis.com/token";
const accessTokenCache = new Map<number, { token: string; expiresAt: number }>();

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

export function requireGoogleClient(): { clientId: string; clientSecret: string } {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new AgentError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing in the environment.");
  }
  return { clientId: config.googleClientId, clientSecret: config.googleClientSecret };
}

export function createAuthorizationUrl(loginHint: string): { url: string; state: string } {
  const { clientId } = requireGoogleClient();
  const state = randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${config.appUrl}${connectRedirectPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("login_hint", loginHint);
  url.searchParams.set("state", state);
  return { url: url.toString(), state };
}

export async function requestGoogleToken(params: Record<string, string>): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requireGoogleClient();
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new AgentError(`Google sign-in failed (${response.status}). Try again.`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

export async function exchangeCode(code: string): Promise<void> {
  const userId = currentUserId();
  const tokens = await requestGoogleToken({
    code,
    redirect_uri: `${config.appUrl}${connectRedirectPath}`,
    grant_type: "authorization_code",
  });
  if (!tokens.refresh_token) {
    throw new AgentError("Google did not return a refresh token. Connect again and approve access.");
  }
  getDatabase()
    .prepare(
      `INSERT INTO google_tokens (user_id, refresh_token, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET refresh_token = excluded.refresh_token, updated_at = excluded.updated_at`,
    )
    .run(userId, tokens.refresh_token);
  accessTokenCache.set(userId, { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
}

function storedRefreshToken(userId: number): string | null {
  const row = getDatabase()
    .prepare("SELECT refresh_token FROM google_tokens WHERE user_id = ?")
    .get(userId) as unknown as { refresh_token: string } | undefined;
  return row ? row.refresh_token : null;
}

export function isGoogleConnected(): boolean {
  return storedRefreshToken(currentUserId()) !== null;
}

export async function getAccessToken(): Promise<string> {
  const userId = currentUserId();
  const cached = accessTokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }
  const refreshToken = storedRefreshToken(userId);
  if (!refreshToken) {
    throw new AgentError("Google is not connected yet. Connect it from the Connections page.");
  }
  const tokens = await requestGoogleToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
  accessTokenCache.set(userId, { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
  return tokens.access_token;
}
