import { config } from "@/lib/config";
import { getDatabase, userOwnedTables } from "@/lib/database";

export interface User {
  id: number;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  picture: string | null;
}

const activeWindowDays = 14;
const seenRefreshMinutes = 60;

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

function claimLegacyData(userId: number): void {
  const database = getDatabase();
  for (const table of userOwnedTables) {
    database.prepare(`UPDATE OR IGNORE ${table} SET user_id = ? WHERE user_id = 0`).run(userId);
  }
}

function isOwner(profile: GoogleProfile): boolean {
  return config.ownerEmail.length > 0 && profile.email.toLowerCase() === config.ownerEmail;
}

export function upsertGoogleUser(profile: GoogleProfile): User {
  const database = getDatabase();
  const existing = database.prepare("SELECT id FROM users WHERE google_sub = ?").get(profile.sub) as unknown as
    | { id: number }
    | undefined;
  if (existing) {
    const row = database
      .prepare(
        "UPDATE users SET email = ?, name = ?, picture = ?, last_seen_at = datetime('now') WHERE id = ? RETURNING id, email, name, picture",
      )
      .get(profile.email, profile.name, profile.picture, existing.id) as unknown as UserRow;
    if (isOwner(profile)) {
      claimLegacyData(row.id);
    }
    return toUser(row);
  }
  const row = database
    .prepare("INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?) RETURNING id, email, name, picture")
    .get(profile.sub, profile.email, profile.name, profile.picture) as unknown as UserRow;
  if (isOwner(profile)) {
    claimLegacyData(row.id);
  }
  return toUser(row);
}

export function findUser(userId: number): User | null {
  const database = getDatabase();
  const row = database.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").get(userId) as unknown as
    | UserRow
    | undefined;
  if (!row) {
    return null;
  }
  database
    .prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ? AND last_seen_at < datetime('now', ?)")
    .run(userId, `-${seenRefreshMinutes} minutes`);
  return toUser(row);
}

export function listActiveUserIds(): number[] {
  const rows = getDatabase()
    .prepare("SELECT id FROM users WHERE last_seen_at >= datetime('now', ?) ORDER BY id")
    .all(`-${activeWindowDays} days`) as unknown as { id: number }[];
  return rows.map((row) => row.id);
}
