import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "@/lib/config";

const ownerDefinition = "INTEGER NOT NULL DEFAULT 0";

export const userOwnedTables = [
  "messages",
  "todos",
  "approvals",
  "briefings",
  "usage",
  "bots",
  "bot_messages",
  "bot_memories",
  "bot_tasks",
  "notifications",
  "push_subscriptions",
  "google_tokens",
];

function botsTable(name: string): string {
  return `
    CREATE TABLE ${name} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      tool_names TEXT NOT NULL,
      built_in INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      routine TEXT,
      routine_time TEXT,
      routine_enabled INTEGER NOT NULL DEFAULT 0,
      routine_last_day TEXT,
      avatar TEXT,
      color TEXT,
      routine_frequency TEXT NOT NULL DEFAULT 'daily',
      routine_day INTEGER,
      UNIQUE (user_id, slug)
    )`;
}

function googleTokensTable(name: string): string {
  return `
    CREATE TABLE ${name} (
      user_id INTEGER PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`;
}

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    tool TEXT NOT NULL,
    summary TEXT NOT NULL,
    arguments TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    result TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS briefings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    day TEXT NOT NULL,
    content TEXT NOT NULL,
    summarized_by_ai INTEGER NOT NULL,
    provider TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    day TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    bot_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS bot_messages_bot_index ON bot_messages (bot_id, id);

  CREATE TABLE IF NOT EXISTS bot_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    bot_id INTEGER NOT NULL,
    fact TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS bot_memories_bot_index ON bot_memories (bot_id, id);

  CREATE TABLE IF NOT EXISTS bot_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    bot_id INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    result TEXT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
  );
  CREATE INDEX IF NOT EXISTS bot_tasks_bot_index ON bot_tasks (bot_id, id);

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    bot_id INTEGER,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    urgent INTEGER NOT NULL DEFAULT 0,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  ${botsTable("IF NOT EXISTS bots")};
  ${googleTokensTable("IF NOT EXISTS google_tokens")};
`;

const indexes = `
  CREATE INDEX IF NOT EXISTS messages_user_conversation_index ON messages (user_id, conversation_id, id);
  CREATE INDEX IF NOT EXISTS todos_user_index ON todos (user_id, id);
  CREATE INDEX IF NOT EXISTS approvals_user_status_index ON approvals (user_id, status, id);
  CREATE INDEX IF NOT EXISTS briefings_user_day_index ON briefings (user_id, day);
  CREATE INDEX IF NOT EXISTS usage_user_day_index ON usage (user_id, day);
  CREATE INDEX IF NOT EXISTS notifications_user_read_index ON notifications (user_id, read, id);
  CREATE INDEX IF NOT EXISTS push_subscriptions_user_index ON push_subscriptions (user_id);
`;

const globalForDatabase = globalThis as unknown as {
  agentDatabase?: DatabaseSync;
};

function hasColumn(database: DatabaseSync, table: string, column: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[];
  return columns.some((existing) => existing.name === column);
}

function ensureColumn(database: DatabaseSync, table: string, column: string, definition: string): void {
  if (!hasColumn(database, table, column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function addMissingColumns(database: DatabaseSync): void {
  ensureColumn(database, "briefings", "provider", "TEXT");
  ensureColumn(database, "bots", "routine", "TEXT");
  ensureColumn(database, "bots", "routine_time", "TEXT");
  ensureColumn(database, "bots", "routine_enabled", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "bots", "routine_last_day", "TEXT");
  ensureColumn(database, "bots", "avatar", "TEXT");
  ensureColumn(database, "bots", "color", "TEXT");
  ensureColumn(database, "bots", "routine_frequency", "TEXT NOT NULL DEFAULT 'daily'");
  ensureColumn(database, "bots", "routine_day", "INTEGER");
}

function rebuildBotsTable(database: DatabaseSync): void {
  database.exec("ALTER TABLE bots RENAME TO bots_before_users");
  database.exec(botsTable("bots"));
  database.exec(`
    INSERT INTO bots (id, user_id, slug, name, instructions, tool_names, built_in, created_at, routine, routine_time,
                      routine_enabled, routine_last_day, avatar, color, routine_frequency, routine_day)
    SELECT id, 0, slug, name, instructions, tool_names, built_in, created_at, routine, routine_time,
           routine_enabled, routine_last_day, avatar, color, routine_frequency, routine_day
    FROM bots_before_users
  `);
  database.exec("DROP TABLE bots_before_users");
}

function rebuildGoogleTokensTable(database: DatabaseSync): void {
  database.exec("ALTER TABLE google_tokens RENAME TO google_tokens_before_users");
  database.exec(googleTokensTable("google_tokens"));
  database.exec(`
    INSERT INTO google_tokens (user_id, refresh_token, updated_at)
    SELECT 0, refresh_token, updated_at FROM google_tokens_before_users
  `);
  database.exec("DROP TABLE google_tokens_before_users");
}

function migrateToUserOwnership(database: DatabaseSync): void {
  database.exec("BEGIN");
  try {
    addMissingColumns(database);
    for (const table of userOwnedTables) {
      if (table !== "bots" && table !== "google_tokens") {
        ensureColumn(database, table, "user_id", ownerDefinition);
      }
    }
    if (!hasColumn(database, "bots", "user_id")) {
      rebuildBotsTable(database);
    }
    if (!hasColumn(database, "google_tokens", "user_id")) {
      rebuildGoogleTokensTable(database);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function openDatabase(): DatabaseSync {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  const database = new DatabaseSync(config.databasePath);
  database.exec("PRAGMA journal_mode = WAL");
  database.exec(schema);
  migrateToUserOwnership(database);
  database.exec(indexes);
  database.exec(
    "UPDATE bot_tasks SET status = 'failed', result = 'Interrupted by a server restart.', finished_at = datetime('now') WHERE status = 'running'",
  );
  return database;
}

export function getDatabase(): DatabaseSync {
  globalForDatabase.agentDatabase ??= openDatabase();
  return globalForDatabase.agentDatabase;
}
