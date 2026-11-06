import { NextResponse } from "next/server";
import { botAllowedToolInfos } from "@/lib/agent/tools";
import { createBot, getBotActivity, listBots } from "@/lib/bots/store";
import { normalizeBotInput } from "@/lib/bots/validate";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  return NextResponse.json({ bots: listBots().map((bot) => ({ ...bot, activity: getBotActivity(bot.id) })) });
});

export const POST = withUser(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const input = normalizeBotInput(body, new Set(botAllowedToolInfos().map((tool) => tool.name)));
  if (typeof input === "string") {
    return NextResponse.json({ error: input }, { status: 400 });
  }

  try {
    return NextResponse.json({ bot: createBot(input) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The bot could not be created." },
      { status: 400 },
    );
  }
});
