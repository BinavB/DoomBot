import { connection, NextResponse } from "next/server";
import { listNotifications, markAllRead, unreadCount } from "@/lib/notifications";

export async function GET() {
  await connection();
  const notifications = listNotifications();
  return NextResponse.json({
    notifications,
    unread: unreadCount(),
    latest: notifications.find((notification) => !notification.read) ?? null,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: unknown };
  if (body.action !== "read-all") {
    return NextResponse.json({ error: "Send the action read-all." }, { status: 400 });
  }
  markAllRead();
  return NextResponse.json({ ok: true });
}
