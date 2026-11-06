import { NextResponse } from "next/server";
import { getBot, setRoutine } from "@/lib/bots/store";
import { normalizeRoutine } from "@/lib/bots/validate";
import { withUser } from "@/lib/auth/route";

export const PUT = withUser(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }

  const body = (await request.json()) as {
    instruction?: unknown;
    time?: unknown;
    enabled?: unknown;
    frequency?: unknown;
    day?: unknown;
  };
  const routine = normalizeRoutine(body.instruction, body.time, body.frequency, body.day);
  if (typeof routine === "string") {
    return NextResponse.json({ error: routine }, { status: 400 });
  }
  if (routine === null) {
    return NextResponse.json({ error: "Give the routine a time and a task." }, { status: 400 });
  }

  return NextResponse.json({ bot: setRoutine(bot.id, routine, body.enabled !== false) });
});

export const DELETE = withUser(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  return NextResponse.json({ bot: setRoutine(bot.id, null, false) });
});
