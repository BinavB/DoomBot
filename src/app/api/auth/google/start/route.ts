import { connection, NextResponse } from "next/server";
import { cookieOptions } from "@/lib/auth/cookies";
import { loginCookieName, loginCookiePath, loginLifetimeSeconds, startLogin } from "@/lib/auth/google-login";
import { config } from "@/lib/config";

export async function GET() {
  await connection();
  try {
    const { url, attempt } = startLogin();
    const response = NextResponse.redirect(url);
    response.cookies.set(
      loginCookieName,
      JSON.stringify(attempt),
      cookieOptions(loginLifetimeSeconds, loginCookiePath),
    );
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=setup", config.appUrl));
  }
}
