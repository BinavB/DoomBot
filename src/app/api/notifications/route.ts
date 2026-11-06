import { NextResponse } from "next/server";
import { listNotifications, markAllRead, unreadCount } from "@/lib/notifications";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  const notifications = listNotifications();
  return NextResponse.json({
    notifications,
    unread: unreadCount(),
    latest: notifications.find((notification) => !notification.read) ?? null,
  });
});

export const POST = withUser(async (request: Request) => {
  const body = (await request.json()) as { action?: unknown };
  if (body.action !== "read-all") {
    return NextResponse.json({ error: "Send the action read-all." }, { status: 400 });
  }
  markAllRead();
  return NextResponse.json({ ok: true });
});
