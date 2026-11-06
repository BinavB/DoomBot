import { createChatCompletion } from "@/lib/ai";
import { avatarOptions } from "@/lib/bots/look";
import { normalizeBotInput, type BotInput } from "@/lib/bots/validate";

export interface DesignableTool {
  name: string;
  description: string;
}

const maxDesignedBots = 3;

function designInstructions(tools: DesignableTool[]): string {
  const toolList = tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n");
  return [
    "You design Doombots: small focused assistants for one person in Dubai.",
    `From the user's preferences, design 1 to ${maxDesignedBots} Doombots. Each has one clear job.`,
    'Name each one "Doombot <Word>", with a short, memorable word.',
    "Write instructions in the second person, saying what the Doombot does and how to answer.",
    `Give each Doombot an avatar: one robot style that suits its job, chosen from: ${avatarOptions.map((option) => option.id).join(", ")}`,
    "Pick only tools from this list that the job needs:",
    toolList,
    "If the user wants something done on a schedule, add routineTime as 24-hour Dubai time (HH:MM), routineInstruction as the task, routineFrequency as one of hourly, daily, weekdays, weekly, monthly, and routineDay as a weekday 0 (Sunday) to 6 (Saturday) for weekly or a date 1 to 28 for monthly (otherwise null). Otherwise set all four to null.",
    'Reply with JSON only, in this shape: {"bots":[{"name":"","avatar":"","instructions":"","toolNames":[],"routineTime":null,"routineInstruction":null,"routineFrequency":null,"routineDay":null}]}',
  ].join("\n");
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function designBots(preferences: string, tools: DesignableTool[]): Promise<BotInput[]> {
  const completion = await createChatCompletion([
    { role: "system", content: designInstructions(tools) },
    { role: "user", content: preferences },
  ]);

  const parsed = extractJson(completion.content ?? "");
  const drafts =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { bots?: unknown }).bots)
      ? ((parsed as { bots: unknown[] }).bots as unknown[])
      : [];

  const allowed = new Set(tools.map((tool) => tool.name));
  return drafts
    .filter((draft): draft is Record<string, unknown> => typeof draft === "object" && draft !== null)
    .map((draft) => normalizeBotInput(draft, allowed))
    .filter((draft): draft is BotInput => typeof draft !== "string")
    .slice(0, maxDesignedBots);
}
