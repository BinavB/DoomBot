import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export async function POST() {
  createNotification({
    botId: null,
    title: "Test alert",
    body: "Phone alerts are working.",
    urgent: false,
  });
  return NextResponse.json({ ok: true });
}
