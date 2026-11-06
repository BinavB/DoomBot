import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";

const publicPaths = ["/login", "/api/auth/logout", "/sw.js", "/icon.svg"];
const publicPrefix = "/api/auth/google/";
const safeMethods = ["GET", "HEAD", "OPTIONS"];

function isPublic(pathname: string): boolean {
  return publicPaths.includes(pathname) || pathname.startsWith(publicPrefix);
}

function isCrossSiteWrite(request: NextRequest): boolean {
  if (safeMethods.includes(request.method)) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return true;
  }
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isCrossSiteWrite(request)) {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  if (isPublic(pathname)) {
    return NextResponse.next();
  }
  const userId = await readSessionToken(request.cookies.get(sessionCookieName)?.value);
  if (userId !== null) {
    return NextResponse.next();
  }
  if (isApi) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
