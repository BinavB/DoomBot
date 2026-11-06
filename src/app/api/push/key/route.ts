import { connection, NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  await connection();
  return NextResponse.json({ publicKey: vapidPublicKey() });
}
