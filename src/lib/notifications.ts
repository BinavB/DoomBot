import { getDatabase } from "@/lib/database";
import { sendPushToAll } from "@/lib/push";

export interface Notification {
  id: number;
  botId: number | null;
  title: string;
  body: string;
  urgent: boolean;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: number;
  bot_id: number | null;
  title: string;
  body: string;
  urgent: number;
  read: number;
  created_at: string;
}

const listLimit = 50;

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    botId: row.bot_id,
    title: row.title,
    body: row.body,
    urgent: row.urgent === 1,
    read: row.read === 1,
    createdAt: row.created_at,
  };
}

const pushBodyLength = 160;

export function createNotification(input: { botId: number | null; title: string; body: string; urgent: boolean }): void {
  getDatabase()
    .prepare("INSERT INTO notifications (bot_id, title, body, urgent) VALUES (?, ?, ?, ?)")
    .run(input.botId, input.title, input.body, input.urgent ? 1 : 0);
  sendPushToAll({
    title: input.title,
    body: input.body.slice(0, pushBodyLength),
    url: "/alerts",
    urgent: input.urgent,
  }).catch((error: unknown) => {
    console.error("Push alert failed:", error);
  });
}

export function listNotifications(): Notification[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT ?")
    .all(listLimit) as unknown as NotificationRow[];
  return rows.map(toNotification);
}

export function unreadCount(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM notifications WHERE read = 0")
    .get() as unknown as { count: number };
  return row.count;
}

export function markAllRead(): void {
  getDatabase().prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
}
