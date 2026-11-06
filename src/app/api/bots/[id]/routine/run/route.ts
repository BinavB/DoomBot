import { NextResponse } from "next/server";
import { startTask } from "@/lib/bots/run";
import { getBot } from "@/lib/bots/store";
import { withUser } from "@/lib/auth/route";

export const POST = withUser(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  if (!bot.routine) {
    return NextResponse.json({ error: "This Doombot has no routine yet." }, { status: 400 });
  }

  const { task, completion } = startTask(bot, bot.routine.instruction, "routine");
  completion.catch((error: unknown) => {
    console.error("Doombot routine failed:", error);
  });
  return NextResponse.json({ task }, { status: 202 });
});
