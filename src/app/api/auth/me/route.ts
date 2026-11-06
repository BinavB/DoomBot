import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth/context";
import { withUser } from "@/lib/auth/route";
import { findUser } from "@/lib/auth/users";

export const GET = withUser(async () => NextResponse.json({ user: findUser(currentUserId()) }));
