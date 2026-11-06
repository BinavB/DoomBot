import { NextResponse } from "next/server";
import { botAllowedToolInfos } from "@/lib/agent/tools";
import { designBots } from "@/lib/bots/design";
import { createBot, type Bot } from "@/lib/bots/store";
import { AgentError } from "@/lib/errors";

const preferenceLimits = { min: 10, max: 2000 };

export async function POST(request: Request) {
  const body = (await request.json()) as { preferences?: unknown };
  const preferences = typeof body.preferences === "string" ? body.preferences.trim() : "";
  if (preferences.length < preferenceLimits.min || preferences.length > preferenceLimits.max) {
    return NextResponse.json(
      { error: `Describe what you want in ${preferenceLimits.min} to ${preferenceLimits.max} characters.` },
      { status: 400 },
    );
  }

  try {
    const drafts = await designBots(preferences, botAllowedToolInfos());
    if (drafts.length === 0) {
      return NextResponse.json(
        { error: "No Doombots could be designed from that. Add more detail about what you want done." },
        { status: 422 },
      );
    }

    const created: Bot[] = [];
    const skipped: string[] = [];
    for (const draft of drafts) {
      try {
        created.push(createBot(draft));
      } catch (error) {
        skipped.push(`${draft.name}: ${error instanceof Error ? error.message : "could not be created"}`);
      }
    }
    return NextResponse.json({ bots: created, skipped }, { status: created.length > 0 ? 201 : 400 });
  } catch (error) {
    const message = error instanceof AgentError ? error.message : "Designing Doombots failed. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
