import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions } from "@/lib/auth/cookies";
import { withUser } from "@/lib/auth/route";
import { config } from "@/lib/config";
import { connectRedirectPath, connectStateCookieName, exchangeCode } from "@/lib/google/oauth";

function connectionsWith(status: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/connections?google=${status}`, config.appUrl));
  response.cookies.set(connectStateCookieName, "", cookieOptions(0, connectRedirectPath));
  return response;
}

export const GET = withUser(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return connectionsWith("denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== request.cookies.get(connectStateCookieName)?.value) {
    return connectionsWith("error");
  }

  try {
    await exchangeCode(code);
    return connectionsWith("connected");
  } catch {
    return connectionsWith("error");
  }
});
