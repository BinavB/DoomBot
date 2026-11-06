import { NextResponse } from "next/server";
import { cookieOptions } from "@/lib/auth/cookies";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", cookieOptions(0));
  return response;
}
