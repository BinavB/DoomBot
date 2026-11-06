export const sessionCookieName = "doombot_session";
export const sessionLifetimeSeconds = 30 * 24 * 60 * 60;

const minimumSecretLength = 32;
const encoder = new TextEncoder();

function readSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret && secret.length >= minimumSecretLength ? secret : null;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function sameText(first: string, second: string): boolean {
  if (first.length !== second.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < first.length; index++) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

export async function createSessionToken(userId: number): Promise<string> {
  const secret = readSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + sessionLifetimeSeconds;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function readSessionToken(token: string | undefined): Promise<number | null> {
  const secret = readSecret();
  if (!token || !secret) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [userText, expiryText, signature] = parts;
  if (!sameText(signature, await sign(`${userText}.${expiryText}`, secret))) {
    return null;
  }
  const userId = Number(userText);
  const expiresAt = Number(expiryText);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isFinite(expiresAt)) {
    return null;
  }
  return expiresAt > Date.now() / 1000 ? userId : null;
}
