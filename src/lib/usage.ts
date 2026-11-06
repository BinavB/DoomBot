import { getDatabase } from "@/lib/database";
import { currentDay } from "@/lib/time";

export function recordUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): void {
  getDatabase()
    .prepare(
      "INSERT INTO usage (day, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?)",
    )
    .run(currentDay(), model, promptTokens, completionTokens);
}

export function tokensUsedToday(): number {
  const row = getDatabase()
    .prepare(
      "SELECT COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS total FROM usage WHERE day = ?",
    )
    .get(currentDay()) as { total: number };
  return row.total;
}
