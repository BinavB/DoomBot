import { NextResponse } from "next/server";
import { startTask } from "@/lib/bots/run";
import { getBot, listTasks } from "@/lib/bots/store";
import { withUser } from "@/lib/auth/route";

const taskHistoryLimit = 30;
const maxInstructionLength = 2000;

export const GET = withUser(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  return NextResponse.json({ tasks: listTasks(bot.id, taskHistoryLimit) });
});

export const POST = withUser(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }

  const body = (await request.json()) as { instruction?: unknown };
  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (instruction.length === 0 || instruction.length > maxInstructionLength) {
    return NextResponse.json(
      { error: `Describe the task in up to ${maxInstructionLength} characters.` },
      { status: 400 },
    );
  }

  const { task, completion } = startTask(bot, instruction, "assigned");
  completion.catch((error: unknown) => {
    console.error("Doombot task failed:", error);
  });
  return NextResponse.json({ task }, { status: 202 });
});
