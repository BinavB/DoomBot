import { NextResponse } from "next/server";
import { botAllowedToolInfos } from "@/lib/agent/tools";

export async function GET() {
  return NextResponse.json({ tools: botAllowedToolInfos() });
}
