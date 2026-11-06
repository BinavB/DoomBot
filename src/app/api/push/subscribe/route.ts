import { NextResponse } from "next/server";
import { removeSubscription, saveSubscription } from "@/lib/push";

const pushServiceHosts = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
];

function isPushServiceHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return pushServiceHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function readEndpoint(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && isPushServiceHost(url.hostname) ? value : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  };
  const endpoint = readEndpoint(body.subscription?.endpoint);
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (!endpoint || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Send a valid push subscription." }, { status: 400 });
  }
  saveSubscription({ endpoint, keys: { p256dh, auth } });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { endpoint?: unknown };
  const endpoint = readEndpoint(body.endpoint);
  if (!endpoint) {
    return NextResponse.json({ error: "Send the subscription endpoint." }, { status: 400 });
  }
  removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
