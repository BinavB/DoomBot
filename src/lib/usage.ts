import { currentUserId } from "@/lib/auth/context";
import { getDatabase } from "@/lib/database";
import { currentDay } from "@/lib/time";

export function recordUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): void {
  getDatabase()
    .prepare(
      "INSERT INTO usage (user_id, day, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?)",
    )
    .run(currentUserId(), currentDay(), model, promptTokens, completionTokens);
}

export function tokensUsedToday(): number {
  const row = getDatabase()
    .prepare(
      "SELECT COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS total FROM usage WHERE user_id = ? AND day = ?",
    )
    .get(currentUserId(), currentDay()) as { total: number };
  return row.total;
}
