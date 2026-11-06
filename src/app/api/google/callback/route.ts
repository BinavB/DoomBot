import { NextResponse, type NextRequest } from "next/server";
import { consumeState, exchangeCode } from "@/lib/google/oauth";

function homeWith(request: NextRequest, status: string): NextResponse {
  return NextResponse.redirect(new URL(`/connections?google=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return homeWith(request, "denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !consumeState(state)) {
    return homeWith(request, "error");
  }

  try {
    await exchangeCode(code);
    return homeWith(request, "connected");
  } catch {
    return homeWith(request, "error");
  }
}
