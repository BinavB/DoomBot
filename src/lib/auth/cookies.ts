import { config } from "@/lib/config";

export function cookieOptions(maxAgeSeconds: number, path = "/") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https://"),
    path,
    maxAge: maxAgeSeconds,
  };
}
