import { currentUserId } from "@/lib/auth/context";
import { avatarOptions, builtInLooks, colorOptions, defaultLook, type BotLook } from "@/lib/bots/look";
import type { Frequency } from "@/lib/bots/frequency";
import type { BotInput, BotRoutineInput } from "@/lib/bots/validate";
import { getDatabase } from "@/lib/database";

export type TaskSource = "chat" | "assigned" | "routine";

export interface BotRoutine {
  instruction: string;
  time: string;
  enabled: boolean;
  frequency: Frequency;
  day: number | null;
  lastRun: string | null;
}

export interface Bot {
  id: number;
  userId: number;
  slug: string;
  name: string;
  instructions: string;
  toolNames: string[];
  builtIn: boolean;
  routine: BotRoutine | null;
  look: BotLook;
}

export interface BotTask {
  id: number;
  botId: number;
  instruction: string;
  status: string;
  result: string | null;
  source: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface BotMemory {
  id: number;
  botId: number;
  fact: string;
  createdAt: string;
}

export interface BotMessage {
  role: "user" | "assistant";
  content: string;
}

interface BotRow {
  id: number;
  user_id: number;
  slug: string;
  name: string;
  instructions: string;
  tool_names: string;
  built_in: number;
  routine: string | null;
  routine_time: string | null;
  routine_enabled: number;
  routine_frequency: string;
  routine_day: number | null;
  routine_last_day: string | null;
  avatar: string | null;
  color: string | null;
}

interface TaskRow {
  id: number;
  bot_id: number;
  instruction: string;
  status: string;
  result: string | null;
  source: string;
  created_at: string;
  finished_at: string | null;
}

interface MemoryRow {
  id: number;
  bot_id: number;
  fact: string;
  created_at: string;
}

const maxBots = 20;

const builtInBots = [
  {
    slug: "calendar",
    name: "Doombot Chronos",
    instructions:
      "You are Doombot Chronos, the calendar specialist. Use list_calendar_today to answer. Give times and titles only. If nothing is found, say so.",
    toolNames: ["list_calendar_today"],
  },
  {
    slug: "email",
    name: "Doombot Herald",
    instructions:
      "You are Doombot Herald, the email specialist. Use list_unread_emails to answer. Summarize senders and subjects. You cannot send, reply or delete.",
    toolNames: ["list_unread_emails"],
  },
];

function toBot(row: BotRow): Bot {
  const fallback = builtInLooks[row.slug] ?? defaultLook(row.id);
  const validAvatar = avatarOptions.some((option) => option.id === row.avatar);
  const validColor = colorOptions.some((option) => option.id === row.color);
  return {
    look: {
      avatar: validAvatar && row.avatar ? row.avatar : fallback.avatar,
      color: validColor && row.color ? row.color : fallback.color,
    },
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    instructions: row.instructions,
    toolNames: JSON.parse(row.tool_names) as string[],
    builtIn: row.built_in === 1,
    routine:
      row.routine && row.routine_time
        ? {
            instruction: row.routine,
            time: row.routine_time,
            enabled: row.routine_enabled === 1,
            frequency: row.routine_frequency as Frequency,
            day: row.routine_day,
            lastRun: row.routine_last_day,
          }
        : null,
  };
}

function toTask(row: TaskRow): BotTask {
  return {
    id: row.id,
    botId: row.bot_id,
    instruction: row.instruction,
    status: row.status,
    result: row.result,
    source: row.source,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function seedBuiltInBots(): void {
  const insert = getDatabase().prepare(
    "INSERT OR IGNORE INTO bots (user_id, slug, name, instructions, tool_names, built_in) VALUES (?, ?, ?, ?, ?, 1)",
  );
  const userId = currentUserId();
  for (const bot of builtInBots) {
    insert.run(userId, bot.slug, bot.name, bot.instructions, JSON.stringify(bot.toolNames));
  }
}

export function listBots(): Bot[] {
  seedBuiltInBots();
  const rows = getDatabase()
    .prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY built_in DESC, id")
    .all(currentUserId()) as unknown as BotRow[];
  return rows.map(toBot);
}

export function getBot(id: number): Bot | null {
  seedBuiltInBots();
  const row = getDatabase()
    .prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?")
    .get(id, currentUserId()) as unknown as BotRow | undefined;
  return row ? toBot(row) : null;
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return slug.length > 0 ? slug : "bot";
}

export function createBot(input: BotInput): Bot {
  const existing = listBots();
  if (existing.length >= maxBots) {
    throw new Error(`You can have up to ${maxBots} Doombots. Delete one first.`);
  }
  const taken = new Set(existing.map((bot) => bot.slug));
  const base = slugify(input.name);
  let slug = base;
  for (let counter = 2; taken.has(slug); counter++) {
    slug = `${base}_${counter}`;
  }
  const look = { ...defaultLook(existing.length), ...input.look };
  const row = getDatabase()
    .prepare(
      `INSERT INTO bots (user_id, slug, name, instructions, tool_names, built_in, routine, routine_time, routine_enabled, routine_frequency, routine_day, avatar, color)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(
      currentUserId(),
      slug,
      input.name,
      input.instructions,
      JSON.stringify(input.toolNames),
      input.routine?.instruction ?? null,
      input.routine?.time ?? null,
      input.routine ? 1 : 0,
      input.routine?.frequency ?? "daily",
      input.routine?.day ?? null,
      look.avatar,
      look.color,
    ) as unknown as BotRow;
  return toBot(row);
}

export interface BotProfileChange {
  name?: string;
  look: Partial<BotLook>;
}

export function updateBotProfile(botId: number, change: BotProfileChange): Bot | null {
  const current = getBot(botId);
  if (!current) {
    return null;
  }
  const look = { ...current.look, ...change.look };
  getDatabase()
    .prepare("UPDATE bots SET name = ?, avatar = ?, color = ? WHERE id = ? AND user_id = ?")
    .run(change.name ?? current.name, look.avatar, look.color, botId, currentUserId());
  return getBot(botId);
}

export function setRoutine(botId: number, routine: BotRoutineInput | null, enabled: boolean): Bot | null {
  getDatabase()
    .prepare(
      "UPDATE bots SET routine = ?, routine_time = ?, routine_enabled = ?, routine_frequency = ?, routine_day = ? WHERE id = ? AND user_id = ?",
    )
    .run(
      routine?.instruction ?? null,
      routine?.time ?? null,
      routine && enabled ? 1 : 0,
      routine?.frequency ?? "daily",
      routine?.day ?? null,
      botId,
      currentUserId(),
    );
  return getBot(botId);
}

export function updateBotDetails(
  botId: number,
  change: { instructions?: string; toolNames?: string[] },
): Bot | null {
  const current = getBot(botId);
  if (!current) {
    return null;
  }
  getDatabase()
    .prepare("UPDATE bots SET instructions = ?, tool_names = ? WHERE id = ? AND user_id = ?")
    .run(
      change.instructions ?? current.instructions,
      JSON.stringify(change.toolNames ?? current.toolNames),
      botId,
      currentUserId(),
    );
  return getBot(botId);
}

export function listRoutineBots(): Bot[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM bots WHERE routine_enabled = 1 AND routine IS NOT NULL AND routine_time IS NOT NULL")
    .all() as unknown as BotRow[];
  return rows.map(toBot);
}

export function markRoutineRan(botId: number, period: string): void {
  getDatabase().prepare("UPDATE bots SET routine_last_day = ? WHERE id = ?").run(period, botId);
}

export function deleteBot(id: number): void {
  const database = getDatabase();
  const userId = currentUserId();
  database.prepare("DELETE FROM bot_messages WHERE bot_id = ? AND user_id = ?").run(id, userId);
  database.prepare("DELETE FROM bot_memories WHERE bot_id = ? AND user_id = ?").run(id, userId);
  database.prepare("DELETE FROM bot_tasks WHERE bot_id = ? AND user_id = ?").run(id, userId);
  database.prepare("DELETE FROM bots WHERE id = ? AND user_id = ? AND built_in = 0").run(id, userId);
}

export function createTask(botId: number, instruction: string, source: TaskSource): BotTask {
  const row = getDatabase()
    .prepare("INSERT INTO bot_tasks (user_id, bot_id, instruction, source) VALUES (?, ?, ?, ?) RETURNING *")
    .get(currentUserId(), botId, instruction, source) as unknown as TaskRow;
  return toTask(row);
}

export function finishTask(id: number, status: "done" | "failed", result: string): BotTask {
  const row = getDatabase()
    .prepare(
      "UPDATE bot_tasks SET status = ?, result = ?, finished_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING *",
    )
    .get(status, result, id, currentUserId()) as unknown as TaskRow;
  return toTask(row);
}

export interface BotActivity {
  running: number;
  total: number;
  failed: number;
  lastStatus: string | null;
  lastAt: string | null;
}

export function getBotActivity(botId: number): BotActivity {
  const database = getDatabase();
  const counts = database
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'running'), 0) AS running,
              COALESCE(SUM(status = 'failed'), 0) AS failed, MAX(COALESCE(finished_at, created_at)) AS last_at
       FROM bot_tasks WHERE bot_id = ? AND user_id = ?`,
    )
    .get(botId, currentUserId()) as unknown as { total: number; running: number; failed: number; last_at: string | null };
  const last = database
    .prepare("SELECT status FROM bot_tasks WHERE bot_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1")
    .get(botId, currentUserId()) as unknown as { status: string } | undefined;
  return {
    running: counts.running,
    total: counts.total,
    failed: counts.failed,
    lastStatus: last?.status ?? null,
    lastAt: counts.last_at,
  };
}

export function getTask(id: number): BotTask | null {
  const row = getDatabase().prepare("SELECT * FROM bot_tasks WHERE id = ? AND user_id = ?").get(id, currentUserId()) as unknown as
    | TaskRow
    | undefined;
  return row ? toTask(row) : null;
}

export function deleteTask(id: number): void {
  getDatabase().prepare("DELETE FROM bot_tasks WHERE id = ? AND user_id = ?").run(id, currentUserId());
}

export function resetTask(id: number, instruction: string): BotTask {
  const row = getDatabase()
    .prepare(
      "UPDATE bot_tasks SET instruction = ?, status = 'running', result = NULL, finished_at = NULL WHERE id = ? AND user_id = ? RETURNING *",
    )
    .get(instruction, id, currentUserId()) as unknown as TaskRow;
  return toTask(row);
}

export function listRecentTasks(limit: number, botId: number | null): BotTask[] {
  const rows = (
    botId === null
      ? getDatabase()
          .prepare("SELECT * FROM bot_tasks WHERE user_id = ? ORDER BY id DESC LIMIT ?")
          .all(currentUserId(), limit)
      : getDatabase()
          .prepare("SELECT * FROM bot_tasks WHERE user_id = ? AND bot_id = ? ORDER BY id DESC LIMIT ?")
          .all(currentUserId(), botId, limit)
  ) as unknown as TaskRow[];
  return rows.map(toTask);
}

export function listTasks(botId: number, limit: number): BotTask[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM bot_tasks WHERE bot_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?")
    .all(botId, currentUserId(), limit) as unknown as TaskRow[];
  return rows.map(toTask);
}

export function listMemories(botId: number): BotMemory[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM bot_memories WHERE bot_id = ? AND user_id = ? ORDER BY id")
    .all(botId, currentUserId()) as unknown as MemoryRow[];
  return rows.map((row) => ({
    id: row.id,
    botId: row.bot_id,
    fact: row.fact,
    createdAt: row.created_at,
  }));
}

export function addMemory(botId: number, fact: string): void {
  getDatabase()
    .prepare("INSERT INTO bot_memories (user_id, bot_id, fact) VALUES (?, ?, ?)")
    .run(currentUserId(), botId, fact);
}

export function deleteMemory(botId: number, memoryId: number): void {
  getDatabase()
    .prepare("DELETE FROM bot_memories WHERE id = ? AND bot_id = ? AND user_id = ?")
    .run(memoryId, botId, currentUserId());
}

export function loadBotMessages(botId: number, limit: number): BotMessage[] {
  const rows = getDatabase()
    .prepare("SELECT role, content FROM bot_messages WHERE bot_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?")
    .all(botId, currentUserId(), limit) as unknown as BotMessage[];
  return rows.reverse();
}

export function saveBotMessage(botId: number, role: "user" | "assistant", content: string): void {
  getDatabase()
    .prepare("INSERT INTO bot_messages (user_id, bot_id, role, content) VALUES (?, ?, ?, ?)")
    .run(currentUserId(), botId, role, content);
}
