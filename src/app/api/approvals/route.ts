import { NextResponse } from "next/server";
import { decideApproval, listPendingApprovals } from "@/lib/agent/approvals";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  return NextResponse.json({ approvals: listPendingApprovals() });
});

export const POST = withUser(async (request: Request) => {
  const body = (await request.json()) as { id?: unknown; decision?: unknown };
  if (typeof body.id !== "number" || (body.decision !== "approve" && body.decision !== "deny")) {
    return NextResponse.json({ error: "Send a numeric id and a decision of approve or deny." }, { status: 400 });
  }

  const approval = await decideApproval(body.id, body.decision);
  if (!approval) {
    return NextResponse.json({ error: "That approval is no longer pending." }, { status: 404 });
  }
  return NextResponse.json({ approval });
});
