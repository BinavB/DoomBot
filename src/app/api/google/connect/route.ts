import { NextResponse } from "next/server";
import { cookieOptions } from "@/lib/auth/cookies";
import { currentUserId } from "@/lib/auth/context";
import { withUser } from "@/lib/auth/route";
import { findUser } from "@/lib/auth/users";
import { config } from "@/lib/config";
import {
  connectRedirectPath,
  connectStateCookieName,
  connectStateLifetimeSeconds,
  createAuthorizationUrl,
} from "@/lib/google/oauth";

export const GET = withUser(async () => {
  try {
    const user = findUser(currentUserId());
    const { url, state } = createAuthorizationUrl(user?.email ?? "");
    const response = NextResponse.redirect(url);
    response.cookies.set(
      connectStateCookieName,
      state,
      cookieOptions(connectStateLifetimeSeconds, connectRedirectPath),
    );
    return response;
  } catch {
    return NextResponse.redirect(new URL("/connections?google=error", config.appUrl));
  }
});
