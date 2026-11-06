import { currentUserId } from "@/lib/auth/context";
import { getDatabase } from "@/lib/database";
import { findTool, type ToolArguments } from "@/lib/agent/tools";

export interface Approval {
  id: number;
  tool: string;
  summary: string;
  status: string;
  result: string | null;
  createdAt: string;
}

interface ApprovalRow {
  id: number;
  tool: string;
  summary: string;
  arguments: string;
  status: string;
  result: string | null;
  created_at: string;
}

function toApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    tool: row.tool,
    summary: row.summary,
    status: row.status,
    result: row.result,
    createdAt: row.created_at,
  };
}

export function createApproval(tool: string, summary: string, args: ToolArguments): number {
  const row = getDatabase()
    .prepare("INSERT INTO approvals (user_id, tool, summary, arguments) VALUES (?, ?, ?, ?) RETURNING id")
    .get(currentUserId(), tool, summary, JSON.stringify(args)) as unknown as { id: number };
  return row.id;
}

export function listPendingApprovals(): Approval[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM approvals WHERE user_id = ? AND status = 'pending' ORDER BY id")
    .all(currentUserId()) as unknown as ApprovalRow[];
  return rows.map(toApproval);
}

function findPending(id: number): ApprovalRow | undefined {
  return getDatabase()
    .prepare("SELECT * FROM approvals WHERE id = ? AND user_id = ? AND status = 'pending'")
    .get(id, currentUserId()) as unknown as ApprovalRow | undefined;
}

function closeApproval(id: number, status: string, result: string): void {
  getDatabase()
    .prepare("UPDATE approvals SET status = ?, result = ?, resolved_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(status, result, id, currentUserId());
}

function parseStoredArguments(json: string): ToolArguments {
  const value: unknown = JSON.parse(json);
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ToolArguments)
    : {};
}

export async function decideApproval(id: number, decision: "approve" | "deny"): Promise<Approval | null> {
  const row = findPending(id);
  if (!row) {
    return null;
  }

  if (decision === "deny") {
    closeApproval(id, "denied", "Denied by you.");
  } else {
    const tool = findTool(row.tool);
    if (!tool) {
      closeApproval(id, "failed", `Unknown tool: ${row.tool}`);
    } else {
      try {
        closeApproval(id, "approved", await tool.run(parseStoredArguments(row.arguments)));
      } catch (error) {
        closeApproval(id, "failed", error instanceof Error ? error.message : "The action failed.");
      }
    }
  }

  const updated = getDatabase()
    .prepare("SELECT * FROM approvals WHERE id = ? AND user_id = ?")
    .get(id, currentUserId()) as unknown as ApprovalRow;
  return toApproval(updated);
}
