"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";

interface Briefing {
  id: number;
  day: string;
  content: string;
  summarizedByAi: boolean;
  provider: string | null;
  createdAt: string;
}

export function BriefingView() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/briefing")
      .then((response) => response.json() as Promise<{ briefing: Briefing | null }>)
      .then((data) => setBriefing(data.briefing))
      .catch(() => setError("Today's briefing could not load. Reload the page to try again."))
      .finally(() => setLoaded(true));
  }, []);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/briefing", { method: "POST" });
      const data = (await response.json()) as { briefing?: Briefing; error?: string };
      if (!response.ok || !data.briefing) {
        setError(data.error ?? "The briefing could not be created. Try again in a moment.");
        return;
      }
      setBriefing(data.briefing);
    } catch {
      setError("DOOMBOT could not be reached. Check that the server is running.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {briefing ? `Created ${briefing.day}` : "Runs every morning at the set time."}
          {briefing?.provider ? `, summarized by ${briefing.provider}` : ""}
        </p>
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="h-10 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas disabled:opacity-50"
        >
          {creating ? "Creating briefing" : briefing ? "Create a new briefing" : "Create briefing now"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {briefing && (
        <article className="rounded-2xl border border-line bg-panel px-6 py-6">
          <Markdown text={briefing.content} />
        </article>
      )}

      {briefing && !briefing.summarizedByAi && (
        <p className="text-sm text-muted">
          This shows the raw sources because the AI summary failed. Check the server log and your AI keys, then create a new briefing.
        </p>
      )}

      {loaded && !briefing && !error && (
        <p className="text-muted">No briefing yet today. Create one now to see your weather, calendar, email and news.</p>
      )}
    </div>
  );
}
