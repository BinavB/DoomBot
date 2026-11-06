import { NextResponse } from "next/server";
import { readLook } from "@/lib/bots/look";
import { deleteBot, getBot, updateBotProfile } from "@/lib/bots/store";
import { normalizeBotName } from "@/lib/bots/validate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = body.name === undefined ? undefined : normalizeBotName(body.name);
  if (name === null) {
    return NextResponse.json({ error: "Give the Doombot a name of 2 to 40 characters." }, { status: 400 });
  }

  return NextResponse.json({ bot: updateBotProfile(bot.id, { name, look: readLook(body) }) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bot = getBot(Number((await params).id));
  if (!bot) {
    return NextResponse.json({ error: "That Doombot does not exist." }, { status: 404 });
  }
  if (bot.builtIn) {
    return NextResponse.json({ error: "Built-in Doombots cannot be deleted." }, { status: 400 });
  }
  deleteBot(bot.id);
  return NextResponse.json({ ok: true });
}
