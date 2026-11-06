"use client";

import { useCallback, useEffect, useState } from "react";
import { announceApprovalsChanged, approvalsChangedEvent } from "@/components/events";

interface PendingApproval {
  id: number;
  tool: string;
  summary: string;
  createdAt: string;
}

interface DecidedApproval {
  id: number;
  status: string;
  result: string | null;
  summary: string;
}

export function ApprovalsView() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastDecision, setLastDecision] = useState<DecidedApproval | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/approvals")
      .then((response) => response.json() as Promise<{ approvals: PendingApproval[] }>)
      .then((data) => setApprovals(data.approvals))
      .catch(() => setError("Approvals could not load. Reload the page to try again."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(approvalsChangedEvent, load);
    return () => window.removeEventListener(approvalsChangedEvent, load);
  }, [load]);

  async function decide(id: number, decision: "approve" | "deny") {
    setError(null);
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = (await response.json()) as { approval?: DecidedApproval; error?: string };
    if (!response.ok || !data.approval) {
      setError(data.error ?? "That action is no longer waiting.");
    } else {
      setLastDecision(data.approval);
    }
    announceApprovalsChanged();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      <p className="text-sm text-muted">
        DOOMBOT asks before it sends messages, spends money or changes files. Nothing here happens until you approve it.
      </p>

      {lastDecision && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            lastDecision.status === "approved" ? "border-doom/50" : "border-line"
          }`}
        >
          {lastDecision.status === "approved" && `Approved: ${lastDecision.result ?? lastDecision.summary}`}
          {lastDecision.status === "denied" && `Denied: ${lastDecision.summary}`}
          {lastDecision.status === "failed" && `Approved, but it failed: ${lastDecision.result ?? "unknown error"}`}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loaded && approvals.length === 0 && !error && <p className="text-muted">Nothing is waiting for you.</p>}

      {approvals.length > 0 && (
        <ul className="flex flex-col gap-3">
          {approvals.map((approval) => (
            <li key={approval.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
              <p className="leading-relaxed">{approval.summary}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void decide(approval.id, "approve")}
                  className="h-10 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void decide(approval.id, "deny")}
                  className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
                >
                  Deny
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
