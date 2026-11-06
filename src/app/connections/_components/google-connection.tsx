"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function readGoogleResult(): string | null {
  return new URLSearchParams(window.location.search).get("google");
}

const resultMessages: Record<string, { text: string; failed: boolean }> = {
  connected: { text: "Google connected.", failed: false },
  denied: { text: "Google access was not granted. Connect again and approve access.", failed: true },
  error: { text: "Google sign-in failed. Connect again to retry.", failed: true },
};

export function GoogleConnection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const result = useSyncExternalStore(subscribeToLocation, readGoogleResult, () => null);
  const message = result ? resultMessages[result] : undefined;

  useEffect(() => {
    fetch("/api/google/status")
      .then((response) => response.json() as Promise<{ connected: boolean }>)
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      {message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${message.failed ? "border-danger/40 text-danger" : "border-doom/50"}`}
        >
          {message.text}
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Google</h2>
          {connected !== null && (
            <span className={`text-sm ${connected ? "text-doom" : "text-muted"}`}>
              {connected ? "Connected" : "Not connected"}
            </span>
          )}
        </div>
        <p className="leading-relaxed text-muted">
          DOOMBOT reads today&apos;s calendar, your unread email and your open Google Tasks. It cannot send, change or delete anything in your Google account.
        </p>
        <a
          href="/api/google/connect"
          className="w-fit rounded-xl bg-doom px-4 py-2.5 text-sm font-semibold text-canvas"
        >
          {connected ? "Reconnect Google" : "Connect Google"}
        </a>
      </section>
    </div>
  );
}
