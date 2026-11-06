import { createHash, randomBytes } from "node:crypto";
import type { GoogleProfile } from "@/lib/auth/users";
import { config } from "@/lib/config";
import { AgentError } from "@/lib/errors";
import { requestGoogleToken, requireGoogleClient } from "@/lib/google/oauth";

export const loginCookieName = "doombot_login";
export const loginCookiePath = "/api/auth/google";
export const loginLifetimeSeconds = 10 * 60;
export const loginRedirectPath = "/api/auth/google/callback";

const googleIssuers = ["https://accounts.google.com", "accounts.google.com"];

export interface LoginAttempt {
  state: string;
  verifier: string;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export function startLogin(): { url: string; attempt: LoginAttempt } {
  const { clientId } = requireGoogleClient();
  const attempt = {
    state: randomBytes(24).toString("hex"),
    verifier: randomBytes(48).toString("base64url"),
  };
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${config.appUrl}${loginRedirectPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", attempt.state);
  url.searchParams.set("code_challenge", createHash("sha256").update(attempt.verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString(), attempt };
}

export function parseLoginAttempt(raw: string | undefined): LoginAttempt | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<LoginAttempt>;
    return typeof value.state === "string" && typeof value.verifier === "string"
      ? { state: value.state, verifier: value.verifier }
      : null;
  } catch {
    return null;
  }
}

function readClaims(idToken: string): IdTokenClaims {
  const payload = idToken.split(".")[1];
  if (!payload) {
    throw new AgentError("Google sign-in failed. Try again.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdTokenClaims;
}

export async function finishLogin(code: string, attempt: LoginAttempt): Promise<GoogleProfile> {
  const { clientId } = requireGoogleClient();
  const tokens = await requestGoogleToken({
    code,
    code_verifier: attempt.verifier,
    redirect_uri: `${config.appUrl}${loginRedirectPath}`,
    grant_type: "authorization_code",
  });
  if (!tokens.id_token) {
    throw new AgentError("Google sign-in failed. Try again.");
  }
  const claims = readClaims(tokens.id_token);
  const valid =
    claims.aud === clientId &&
    claims.iss !== undefined &&
    googleIssuers.includes(claims.iss) &&
    typeof claims.exp === "number" &&
    claims.exp > Date.now() / 1000 &&
    typeof claims.sub === "string" &&
    typeof claims.email === "string" &&
    claims.email_verified === true;
  if (!valid || !claims.sub || !claims.email) {
    throw new AgentError("Google could not confirm your email. Try again with another account.");
  }
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name ?? claims.email,
    picture: claims.picture ?? null,
  };
}
