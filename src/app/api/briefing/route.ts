import { connection, NextResponse } from "next/server";
import { findBriefing, generateBriefing } from "@/lib/briefing/generate";
import { AgentError } from "@/lib/errors";
import { currentDay } from "@/lib/time";

export async function GET() {
  await connection();
  return NextResponse.json({ briefing: findBriefing(currentDay()) });
}

export async function POST() {
  try {
    const briefing = await generateBriefing();
    return NextResponse.json({ briefing });
  } catch (error) {
    const message = error instanceof AgentError ? error.message : "Briefing could not be created.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
