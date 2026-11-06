import { currentUserId } from "@/lib/auth/context";
import { getDatabase } from "@/lib/database";
import { sendPushToCurrentUser } from "@/lib/push";

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
  const userId = currentUserId();
  getDatabase()
    .prepare("INSERT INTO notifications (user_id, bot_id, title, body, urgent) VALUES (?, ?, ?, ?, ?)")
    .run(userId, input.botId, input.title, input.body, input.urgent ? 1 : 0);
  sendPushToCurrentUser({
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
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(currentUserId(), listLimit) as unknown as NotificationRow[];
  return rows.map(toNotification);
}

export function unreadCount(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0")
    .get(currentUserId()) as unknown as { count: number };
  return row.count;
}

export function markAllRead(): void {
  getDatabase().prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(currentUserId());
}
