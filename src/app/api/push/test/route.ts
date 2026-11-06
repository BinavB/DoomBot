import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { withUser } from "@/lib/auth/route";

export const POST = withUser(async () => {
  createNotification({
    botId: null,
    title: "Test alert",
    body: "Phone alerts are working.",
    urgent: false,
  });
  return NextResponse.json({ ok: true });
});
