import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BotsView } from "@/app/bots/_components/bots-view";

export const metadata: Metadata = {
  title: "Doombots",
  description: "Create Doombots, assign them tasks and review their private memory",
};

export default function BotsPage() {
  return (
    <AppShell title="Doombots">
      <BotsView />
    </AppShell>
  );
}
