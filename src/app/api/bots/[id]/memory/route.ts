import { connection, NextResponse } from "next/server";
import { deleteMemory, getBot, listMemories } from "@/lib/bots/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  return NextResponse.json({ memories: listMemories(bot.id) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  const body = (await request.json()) as { memoryId?: unknown };
  if (typeof body.memoryId !== "number") {
    return NextResponse.json({ error: "Send a numeric memoryId." }, { status: 400 });
  }
  deleteMemory(bot.id, body.memoryId);
  return NextResponse.json({ ok: true });
}
