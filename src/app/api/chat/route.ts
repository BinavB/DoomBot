import { connection, NextResponse } from "next/server";
import { loadMessages, runAgent } from "@/lib/agent/run";
import { AgentError } from "@/lib/errors";

const historyDisplayLimit = 50;
const maxMessageLength = 4000;

export async function GET() {
  await connection();
  return NextResponse.json({ messages: loadMessages(historyDisplayLimit) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0 || message.length > maxMessageLength) {
    return NextResponse.json(
      { error: `Enter a message of up to ${maxMessageLength} characters.` },
      { status: 400 },
    );
  }

  try {
    const result = await runAgent(message);
    return NextResponse.json(result);
  } catch (error) {
    const text = error instanceof AgentError ? error.message : "The assistant could not answer.";
    return NextResponse.json({ error: text }, { status: 500 });
  }
}
