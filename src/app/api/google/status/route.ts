import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/route";
import { isGoogleConnected } from "@/lib/google/oauth";

export const GET = withUser(async () => NextResponse.json({ connected: isGoogleConnected() }));
