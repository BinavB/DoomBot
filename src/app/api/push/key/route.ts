import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  return NextResponse.json({ publicKey: vapidPublicKey() });
});
