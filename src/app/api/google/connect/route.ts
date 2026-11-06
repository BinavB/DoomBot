import { NextResponse } from "next/server";
import { createAuthorizationUrl } from "@/lib/google/oauth";
import { AgentError } from "@/lib/errors";

export async function GET() {
  try {
    return NextResponse.redirect(createAuthorizationUrl());
  } catch (error) {
    const message = error instanceof AgentError ? error.message : "Google sign-in could not start.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
