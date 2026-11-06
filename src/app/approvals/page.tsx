import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ApprovalsView } from "@/app/approvals/_components/approvals-view";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Actions waiting for your approval",
};

export default function ApprovalsPage() {
  return (
    <AppShell title="Approvals">
      <ApprovalsView />
    </AppShell>
  );
}
