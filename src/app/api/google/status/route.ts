import { connection, NextResponse } from "next/server";
import { isGoogleConnected } from "@/lib/google/oauth";

export async function GET() {
  await connection();
  return NextResponse.json({ connected: isGoogleConnected() });
}
