import { NextResponse } from "next/server";
import { botAllowedToolInfos } from "@/lib/agent/tools";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  return NextResponse.json({ tools: botAllowedToolInfos() });
});
