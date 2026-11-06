import webpush from "web-push";
import { getDatabase } from "@/lib/database";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  urgent: boolean;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const vapidSubject = "mailto:doombot-alerts@example.com";
const pushTimeToLive = 86400;

function readVapidKeys(): VapidKeys | null {
  const rows = getDatabase()
    .prepare("SELECT key, value FROM app_settings WHERE key IN ('vapid_public_key', 'vapid_private_key')")
    .all() as unknown as { key: string; value: string }[];
  const publicKey = rows.find((row) => row.key === "vapid_public_key")?.value;
  const privateKey = rows.find((row) => row.key === "vapid_private_key")?.value;
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

function loadVapidKeys(): VapidKeys {
  const existing = readVapidKeys();
  if (existing) {
    return existing;
  }
  const generated = webpush.generateVAPIDKeys();
  getDatabase()
    .prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('vapid_public_key', ?), ('vapid_private_key', ?)")
    .run(generated.publicKey, generated.privateKey);
  return readVapidKeys() ?? generated;
}

export function vapidPublicKey(): string {
  return loadVapidKeys().publicKey;
}

export function saveSubscription(subscription: PushSubscriptionInput): void {
  getDatabase()
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .run(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
}

export function removeSubscription(endpoint: string): void {
  getDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const rows = getDatabase()
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions")
    .all() as unknown as SubscriptionRow[];
  if (rows.length === 0) {
    return;
  }
  const keys = loadVapidKeys();
  webpush.setVapidDetails(vapidSubject, keys.publicKey, keys.privateKey);
  const body = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: pushTimeToLive },
        );
      } catch (error) {
        if (error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          removeSubscription(row.endpoint);
          return;
        }
        console.error("Push alert failed:", error);
      }
    }),
  );
}
