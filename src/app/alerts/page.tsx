import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AlertsView } from "@/app/alerts/_components/alerts-view";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Results from your Doombots and urgent alerts",
};

export default function AlertsPage() {
  return (
    <AppShell title="Alerts">
      <AlertsView />
    </AppShell>
  );
}
